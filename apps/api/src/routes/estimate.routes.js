import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { verifyBusinessOwnership } from "../middleware/businessAuth.js";

const router = Router();

router.use(authenticate);
router.use(verifyBusinessOwnership);

const estimateItemSchema = z.object({
  itemId: z.string().uuid().optional().nullable(),
  description: z.string().optional(),
  name: z.string().optional(),
  hsnCode: z.string().optional().nullable(),
  quantity: z.number().min(1),
  unit: z.string().default("NOS"),
  rate: z.number().min(0),
  discountPercent: z.number().min(0).default(0),
  discountAmount: z.number().min(0).default(0),
  taxableAmount: z.number().min(0),
  cgstRate: z.number().min(0).default(0),
  cgstAmount: z.number().min(0).default(0),
  sgstRate: z.number().min(0).default(0),
  sgstAmount: z.number().min(0).default(0),
  igstRate: z.number().min(0).default(0),
  igstAmount: z.number().min(0).default(0),
  cessRate: z.number().min(0).default(0),
  cessAmount: z.number().min(0).default(0),
  totalAmount: z.number().min(0),
});

const createEstimateSchema = z.object({
  businessId: z.string().uuid(),
  estimateNumber: z.string(),
  partyId: z.string().uuid().optional().nullable(),
  partyName: z.string().optional().nullable(),
  date: z.string().optional(),
  expiryDate: z.string().optional().nullable(),
  // Support both field names
  reference: z.string().optional().nullable(),
  poNumber: z.string().optional().nullable(),
  stateOfSupply: z.string().optional().nullable(),
  status: z
    .enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED", "CONVERTED"])
    .optional()
    .default("DRAFT"),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  isTaxInclusive: z.boolean().optional().default(false),
  items: z.array(estimateItemSchema).min(1),
  subtotal: z.number().min(0),
  discountPercent: z.number().min(0).default(0),
  discountAmount: z.number().min(0).default(0),
  totalTax: z.number().min(0).default(0),
  cgstAmount: z.number().min(0).default(0),
  sgstAmount: z.number().min(0).default(0),
  igstAmount: z.number().min(0).default(0),
  cessAmount: z.number().min(0).default(0),
  roundOff: z.number().default(0),
  totalAmount: z.number().min(0),
  amountInWords: z.string().optional().nullable(),
});

const updateEstimateStatusSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"]),
});

router.get("/business/:businessId", async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const {
      status,
      search,
      fromDate,
      toDate,
      page = 1,
      limit = 100,
    } = req.query;

    const where = {
      businessId,
      ...(status && {
        status: status.includes(",") ? { in: status.split(",") } : status,
      }),
      ...(fromDate &&
        !isNaN(new Date(fromDate)) && { date: { gte: new Date(fromDate) } }),
      ...(toDate &&
        !isNaN(new Date(toDate)) && { date: { lte: new Date(toDate) } }),
      ...(search && {
        OR: [
          { estimateNumber: { contains: search, mode: "insensitive" } },
          { partyName: { contains: search, mode: "insensitive" } },
          {
            party: {
              is: {
                name: { contains: search, mode: "insensitive" },
              },
            },
          },
        ],
      }),
    };

    const [estimates, total] = await Promise.all([
      prisma.estimate.findMany({
        where,
        orderBy: { date: "desc" },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        include: {
          party: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              address: true,
              city: true,
              state: true,
              pincode: true,
              gstin: true,
            },
          },
        },
      }),
      prisma.estimate.count({ where }),
    ]);

    res.json({
      success: true,
      data: estimates,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const data = createEstimateSchema.parse(req.body);
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify item IDs exist
      const itemIds = data.items.map(i => i.itemId).filter(Boolean);
      let validItems = [];
      if (itemIds.length > 0) {
        const dbItems = await tx.item.findMany({
          where: { id: { in: itemIds }, businessId: data.businessId },
          select: { id: true }
        });
        const validIds = new Set(dbItems.map(i => i.id));
        validItems = data.items.map(item => ({
          ...item,
          itemId: item.itemId && validIds.has(item.itemId) ? item.itemId : null
        }));
      } else {
        validItems = data.items;
      }

      const estimate = await tx.estimate.create({
        data: {
          businessId: data.businessId,
          estimateNumber: data.estimateNumber,
          partyId: data.partyId || null,
          partyName: data.partyName || null,
          status: data.status || "DRAFT",
          date: new Date(data.date || Date.now()),
          expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
          subtotal: data.subtotal,
          discountAmount: data.discountAmount || 0,
          discountPercent: data.discountPercent || 0,
          taxAmount:
            data.totalTax ||
            data.cgstAmount + data.sgstAmount + data.igstAmount ||
            0,
          totalAmount: data.totalAmount,
          notes: data.notes,
          terms: data.terms,
          amountInWords: data.amountInWords,
          items: {
            create: validItems.map((item) => ({
              itemId: item.itemId || null,
              description: item.description || item.name || "No description",
              hsnCode: item.hsnCode || null,
              quantity: item.quantity,
              unit: item.unit || "NOS",
              rate: item.rate,
              discountPercent: item.discountPercent || 0,
              discountAmount: item.discountAmount || 0,
              taxableAmount: item.taxableAmount || 0,
              cgstRate: item.cgstRate || 0,
              cgstAmount: item.cgstAmount || 0,
              sgstRate: item.sgstRate || 0,
              sgstAmount: item.sgstAmount || 0,
              igstRate: item.igstRate || 0,
              igstAmount: item.igstAmount || 0,
              cessRate: item.cessRate || 0,
              cessAmount: item.cessAmount || 0,
              totalAmount: item.totalAmount || 0,
            })),
          },
        },
        include: {
          items: true,
          party: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              address: true,
              city: true,
              state: true,
              pincode: true,
              gstin: true,
            },
          },
        },
      });
      return estimate;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const estimate = await prisma.estimate.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
      include: {
        items: true,
        party: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            state: true,
            pincode: true,
            gstin: true,
          },
        },
      },
    });
    if (!estimate)
      return res
        .status(404)
        .json({ success: false, message: "Estimate not found" });
    res.json({ success: true, data: estimate });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const check = await prisma.estimate.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });
    if (!check)
      return res
        .status(404)
        .json({ success: false, message: "Estimate not found" });

    const data = createEstimateSchema.parse(req.body);
    const { items } = data;

    const result = await prisma.$transaction(async (tx) => {
      await tx.estimateItem.deleteMany({
        where: { estimateId: req.params.id },
      });

      const updatedEstimate = await tx.estimate.update({
        where: { id: req.params.id },
        data: {
          estimateNumber: data.estimateNumber,
          partyId: data.partyId || null,
          partyName: data.partyName || null,
          status: data.status || check.status,
          date: new Date(data.date || Date.now()),
          expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
          subtotal: data.subtotal,
          discountAmount: data.discountAmount || 0,
          discountPercent: data.discountPercent || 0,
          taxAmount:
            data.totalTax ||
            data.cgstAmount + data.sgstAmount + data.igstAmount ||
            0,
          totalAmount: data.totalAmount,
          notes: data.notes,
          terms: data.terms,
          amountInWords: data.amountInWords,
          items: {
            create: items.map((item) => ({
              itemId: item.itemId || null,
              description: item.description || item.name || "No description",
              hsnCode: item.hsnCode || null,
              quantity: item.quantity || 0,
              unit: item.unit || "NOS",
              rate: item.rate || 0,
              discountPercent: item.discountPercent || 0,
              discountAmount: item.discountAmount || 0,
              taxableAmount: item.taxableAmount || 0,
              cgstRate: item.cgstRate || 0,
              cgstAmount: item.cgstAmount || 0,
              sgstRate: item.sgstRate || 0,
              sgstAmount: item.sgstAmount || 0,
              igstRate: item.igstRate || 0,
              igstAmount: item.igstAmount || 0,
              cessRate: item.cessRate || 0,
              cessAmount: item.cessAmount || 0,
              totalAmount: item.totalAmount || 0,
            })),
          },
        },
        include: {
          items: true,
          party: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              address: true,
              city: true,
              state: true,
              pincode: true,
              gstin: true,
            },
          },
        },
      });
      return updatedEstimate;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/status", async (req, res, next) => {
  try {
    const data = updateEstimateStatusSchema.parse(req.body);

    const check = await prisma.estimate.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });
    if (!check)
      return res
        .status(404)
        .json({ success: false, message: "Estimate not found" });

    const estimate = await prisma.estimate.update({
      where: { id: req.params.id },
      data: { status: data.status },
    });
    res.json({ success: true, data: estimate });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/convert-to-invoice", async (req, res, next) => {
  try {
    const estimate = await prisma.estimate.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
      include: { items: true },
    });

    if (!estimate)
      return res
        .status(404)
        .json({ success: false, message: "Estimate not found" });
    if (estimate.status === "CONVERTED") {
      return res.status(400).json({
        success: false,
        message: "Estimate already converted to invoice",
      });
    }

    if (!estimate.partyId) {
      return res.status(400).json({
        success: false,
        message: "Estimate must have a party before conversion",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const latestInvoice = await tx.invoice.findFirst({
        where: { businessId: estimate.businessId },
        orderBy: { invoiceNumber: "desc" },
      });

      const latestNumber = latestInvoice?.invoiceNumber || "";
      const numericPart =
        parseInt(latestNumber.match(/\d+/g)?.pop() || "0", 10) || 0;
      const invoiceNumber = `INV-${String(numericPart + 1).padStart(5, "0")}`;

      const taxTotals = estimate.items.reduce(
        (acc, item) => ({
          cgstAmount: acc.cgstAmount + (item.cgstAmount || 0),
          sgstAmount: acc.sgstAmount + (item.sgstAmount || 0),
          igstAmount: acc.igstAmount + (item.igstAmount || 0),
          cessAmount: acc.cessAmount + (item.cessAmount || 0),
        }),
        { cgstAmount: 0, sgstAmount: 0, igstAmount: 0, cessAmount: 0 },
      );

      const invoice = await tx.invoice.create({
        data: {
          businessId: estimate.businessId,
          invoiceNumber,
          partyId: estimate.partyId,
          date: new Date(),
          dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days default
          subtotal: estimate.subtotal,
          discountAmount: estimate.discountAmount,
          discountPercent: estimate.discountPercent,
          cgstAmount: taxTotals.cgstAmount,
          sgstAmount: taxTotals.sgstAmount,
          igstAmount: taxTotals.igstAmount,
          cessAmount: taxTotals.cessAmount,
          totalAmount: estimate.totalAmount,
          balanceDue: estimate.totalAmount,
          status: "SENT",
          notes: estimate.notes,
          terms: estimate.terms,
          items: {
            create: estimate.items.map((item) => ({
              itemId: item.itemId || null,
              description: item.description || "No description",
              hsnCode: item.hsnCode || null,
              quantity: item.quantity || 0,
              unit: item.unit || "NOS",
              rate: item.rate || 0,
              discountPercent: item.discountPercent || 0,
              discountAmount: item.discountAmount || 0,
              taxableAmount: item.taxableAmount || 0,
              cgstRate: item.cgstRate || 0,
              cgstAmount: item.cgstAmount || 0,
              sgstRate: item.sgstRate || 0,
              sgstAmount: item.sgstAmount || 0,
              igstRate: item.igstRate || 0,
              igstAmount: item.igstAmount || 0,
              cessRate: item.cessRate || 0,
              cessAmount: item.cessAmount || 0,
              totalAmount: item.totalAmount || 0,
            })),
          },
        },
      });

      for (const item of estimate.items) {
        if (item.itemId) {
          await tx.item.update({
            where: { id: item.itemId },
            data: {
              currentStock: { decrement: item.quantity },
            },
          });
        }
      }

      await tx.estimate.update({
        where: { id: estimate.id },
        data: {
          status: "CONVERTED",
        },
      });

      return invoice;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const check = await prisma.estimate.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });
    if (!check)
      return res
        .status(404)
        .json({ success: false, message: "Estimate not found" });

    await prisma.estimate.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: "Estimate deleted" });
  } catch (error) {
    next(error);
  }
});

export default router;
