import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { ItemSchema } from "@artha/common";
import { authenticate } from "../middleware/auth.js";
import { verifyBusinessOwnership } from "../middleware/businessAuth.js";

const router = Router();

router.use(authenticate);
router.use(verifyBusinessOwnership);

const createItemSchema = ItemSchema;

router.get("/business/:businessId", async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const { search, category, inStock, page = 1, limit = 50 } = req.query;

    const where = {
      businessId,
      isActive: true,
      ...(category && { category }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { sku: { contains: search, mode: "insensitive" } },
          { hsnCode: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(inStock === "true" && { currentStock: { gt: 0 } }),
    };

    const [items, total, defaultItems] = await Promise.all([
      prisma.item.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.item.count({ where }),
      prisma.defaultItem.findMany({
        orderBy: { name: "asc" },
      }),
    ]);

    const data = [
      ...items,
      ...defaultItems.map(d => ({ ...d, id: d.id, isDefault: true })),
    ];

    res.json({
      success: true,
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: total + defaultItems.length,
        pages: Math.ceil((total + defaultItems.length) / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const data = createItemSchema.parse(req.body);

    const item = await prisma.item.create({
      data: {
        ...data,
        currentStock: data.openingStock || 0,
      },
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const item = await prisma.item.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const check = await prisma.item.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });
    if (!check)
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });

    const data = createItemSchema
      .partial()
      .omit({ businessId: true })
      .parse(req.body);

    const item = await prisma.item.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const check = await prisma.item.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });
    if (!check)
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });

    await prisma.item.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({ success: true, message: "Item archived" });
  } catch (error) {
    next(error);
  }
});

router.get("/categories/business/:businessId", async (req, res, next) => {
  try {
    const categories = await prisma.item.groupBy({
      by: ["category"],
      where: {
        businessId: req.params.businessId,
        isActive: true,
        category: { not: null },
      },
      _count: true,
    });

    res.json({
      success: true,
      data: categories.map((c) => ({
        name: c.category,
        count: c._count,
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/history", async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const check = await prisma.item.findFirst({
      where: { id, business: { userId: req.user.id } },
    });
    if (!check)
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });

    const [invoices, purchases, item] = await Promise.all([
      prisma.invoiceItem.findMany({
        where: { itemId: id },
        include: { invoice: true },
        orderBy: { invoice: { date: "desc" } },
      }),
      prisma.purchaseItem.findMany({
        where: { itemId: id },
        include: { purchase: true },
        orderBy: { purchase: { date: "desc" } },
      }),
      // Assuming we might have a StockAdjustment model, or just use manual logs if they exist
      // For now, let's just use what we have items.
      prisma.item.findUnique({ where: { id } }),
    ]);

    const history = [
      ...invoices.map((i) => ({
        id: i.id,
        date: i.invoice.date,
        type: "SALE",
        ref: i.invoice.invoiceNumber,
        qty: -i.quantity,
        party: i.invoice.partyName || "Customer",
      })),
      ...purchases.map((p) => ({
        id: p.id,
        date: p.purchase.date,
        type: "PURCHASE",
        ref: p.purchase.purchaseNumber,
        qty: p.quantity,
        party: "Supplier",
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      data: {
        item,
        history,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
