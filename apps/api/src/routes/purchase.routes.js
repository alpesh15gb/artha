import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { verifyBusinessOwnership } from "../middleware/businessAuth.js";
import { checkTransactionLock } from "../middleware/transactionLock.js";

const router = Router();

router.use(authenticate);
router.use(verifyBusinessOwnership);

const purchaseItemSchema = z.object({
  itemId: z.string().uuid().optional().nullable(),
  description: z.string().optional(),
  name: z.string().optional(),
  hsnCode: z.string().optional().nullable(),
  quantity: z.number().positive(),
  unit: z.string().default("NOS"),
  rate: z.number().min(0),
  discountPercent: z.number().min(0).default(0),
  discountAmount: z.number().min(0).default(0),
  taxableAmount: z.number().min(0).optional(),
  cgstRate: z.number().min(0).default(0),
  cgstAmount: z.number().min(0).default(0),
  sgstRate: z.number().min(0).default(0),
  sgstAmount: z.number().min(0).default(0),
  igstRate: z.number().min(0).default(0),
  igstAmount: z.number().min(0).default(0),
  cessRate: z.number().min(0).default(0),
  cessAmount: z.number().min(0).default(0),
  totalAmount: z.number().min(0).optional(),
  // Legacy fields (kept for backward compatibility)
  discount: z.number().min(0).default(0),
  taxRate: z.number().min(0).default(0),
  amount: z.number().min(0).optional(),
});

const createPurchaseSchema = z.object({
  businessId: z.string().uuid(),
  purchaseNumber: z.string().optional(),
  invoiceType: z
    .enum(["PURCHASE_INVOICE", "PURCHASE_ORDER", "DEBIT_NOTE", "CREDIT_NOTE"])
    .optional(),
  partyId: z.string().uuid(),
  date: z.string().optional(),
  dueDate: z.string().optional().nullable(),
  reverseCharge: z.boolean().optional(),
  stateOfSupply: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  items: z.array(purchaseItemSchema).min(1),
  subtotal: z.number().min(0),
  discountAmount: z.number().min(0).default(0).optional(),
  discountPercent: z.number().min(0).default(0).optional(),
  cgstAmount: z.number().min(0).default(0).optional(),
  sgstAmount: z.number().min(0).default(0).optional(),
  igstAmount: z.number().min(0).default(0).optional(),
  cessAmount: z.number().min(0).default(0).optional(),
  roundOff: z.number().default(0).optional(),
  discount: z.number().min(0).default(0),
  totalTax: z.number().min(0).default(0),
  totalAmount: z.number().min(0),
  paidAmount: z.number().min(0).default(0),
  paymentMethod: z
    .enum(["CASH", "BANK", "UPI", "CARD", "CHEQUE", "NEFT", "RTGS"])
    .optional(),
  bankAccountId: z.string().uuid().optional().nullable(),
  cashAccountId: z.string().uuid().optional().nullable(),
  status: z
    .enum(["DRAFT", "ORDERED", "RECEIVED", "PARTIAL", "PAID", "CANCELLED"])
    .optional(),
});

const recordPurchasePaymentSchema = z.object({
  amount: z.number().positive(),
  paymentMethod: z
    .enum(["CASH", "BANK", "UPI", "CARD", "CHEQUE", "NEFT", "RTGS"])
    .default("CASH"),
  reference: z.string().optional(),
  date: z.string().optional(),
  bankAccountId: z.string().uuid().optional().nullable(),
  cashAccountId: z.string().uuid().optional().nullable(),
});

router.get("/business/:businessId", async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const {
      status,
      partyId,
      fromDate,
      toDate,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const where = {
      businessId,
      ...(status && {
        status: status.includes(",") ? { in: status.split(",") } : status,
      }),
      ...(partyId && { partyId }),
      ...(fromDate &&
        !isNaN(new Date(fromDate)) && { date: { gte: new Date(fromDate) } }),
      ...(toDate &&
        !isNaN(new Date(toDate)) && { date: { lte: new Date(toDate) } }),
      ...(search && {
        OR: [
          { purchaseNumber: { contains: search, mode: "insensitive" } },
          { party: { name: { contains: search, mode: "insensitive" } } },
        ],
      }),
    };

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        include: {
          items: true,
          party: { select: { id: true, name: true, gstin: true, phone: true } },
        },
        orderBy: { date: "desc" },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.purchase.count({ where }),
    ]);

    const totals = purchases.reduce(
      (acc, pur) => ({
        totalAmount: acc.totalAmount + pur.totalAmount,
        totalPaid: acc.totalPaid + pur.paidAmount,
        totalDue: acc.totalDue + pur.balanceDue,
      }),
      { totalAmount: 0, totalPaid: 0, totalDue: 0 },
    );

    res.json({
      success: true,
      data: purchases,
      totals,
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

router.post("/", checkTransactionLock("purchase"), async (req, res, next) => {
  try {
    const data = createPurchaseSchema.parse(req.body);
    const { items, ...purchaseData } = data;
    const purchaseDate = purchaseData.date
      ? new Date(purchaseData.date)
      : new Date();

    const normalizedItems = items.map((item) => {
      const quantity = item.quantity || 0;
      const rate = item.rate || 0;
      const lineAmount = quantity * rate;
      const discountPercent = item.discountPercent || item.discount || 0;
      const discountAmount =
        item.discountAmount || (lineAmount * discountPercent) / 100;
      const taxableAmount =
        item.taxableAmount ?? Math.max(0, lineAmount - discountAmount);
      const fallbackTaxRate = item.taxRate || 0;
      const cgstRate =
        item.cgstRate || (fallbackTaxRate > 0 ? fallbackTaxRate / 2 : 0);
      const sgstRate =
        item.sgstRate || (fallbackTaxRate > 0 ? fallbackTaxRate / 2 : 0);
      const igstRate = item.igstRate || 0;
      const cessRate = item.cessRate || 0;
      const cgstAmount = item.cgstAmount || (taxableAmount * cgstRate) / 100;
      const sgstAmount = item.sgstAmount || (taxableAmount * sgstRate) / 100;
      const igstAmount = item.igstAmount || (taxableAmount * igstRate) / 100;
      const cessAmount = item.cessAmount || (taxableAmount * cessRate) / 100;
      const totalAmount =
        item.totalAmount ||
        item.amount ||
        taxableAmount + cgstAmount + sgstAmount + igstAmount + cessAmount;

      return {
        itemId: item.itemId || null,
        description: item.description || item.name || "No description",
        hsnCode: item.hsnCode || null,
        quantity,
        unit: item.unit || "NOS",
        rate,
        discountPercent,
        discountAmount,
        taxableAmount,
        cgstRate,
        cgstAmount,
        sgstRate,
        sgstAmount,
        igstRate,
        igstAmount,
        cessRate,
        cessAmount,
        totalAmount,
      };
    });

    const latestPurchase = await prisma.purchase.findFirst({
      where: { businessId: purchaseData.businessId },
      orderBy: { purchaseNumber: "desc" },
    });

    let nextNum = 1;
    if (latestPurchase) {
      const num =
        parseInt(latestPurchase.purchaseNumber.replace(/\D/g, "")) || 0;
      nextNum = num + 1;
    }
    const purchaseNumber = `PUR-${String(nextNum).padStart(5, "0")}`;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify item IDs exist
      const itemIds = normalizedItems.map(i => i.itemId).filter(Boolean);
      let validNormalizedItems = [];
      if (itemIds.length > 0) {
        const dbItems = await tx.item.findMany({
          where: { id: { in: itemIds }, businessId: purchaseData.businessId },
          select: { id: true }
        });
        const validIds = new Set(dbItems.map(i => i.id));
        validNormalizedItems = normalizedItems.map(item => ({
          ...item,
          itemId: item.itemId && validIds.has(item.itemId) ? item.itemId : null
        }));
      } else {
        validNormalizedItems = normalizedItems;
      }

      const purchase = await tx.purchase.create({
        data: {
          businessId: purchaseData.businessId,
          purchaseNumber,
          invoiceType: purchaseData.invoiceType || "PURCHASE_INVOICE",
          partyId: purchaseData.partyId,
          date: purchaseDate,
          dueDate: purchaseData.dueDate ? new Date(purchaseData.dueDate) : null,
          reverseCharge: purchaseData.reverseCharge || false,
          stateOfSupply: purchaseData.stateOfSupply || null,
          subtotal: purchaseData.subtotal,
          discountAmount:
            purchaseData.discountAmount ?? purchaseData.discount ?? 0,
          discountPercent: purchaseData.discountPercent ?? 0,
          cgstAmount:
            purchaseData.cgstAmount ?? (purchaseData.totalTax || 0) / 2,
          sgstAmount:
            purchaseData.sgstAmount ?? (purchaseData.totalTax || 0) / 2,
          igstAmount: purchaseData.igstAmount ?? 0,
          cessAmount: purchaseData.cessAmount ?? 0,
          roundOff: purchaseData.roundOff ?? 0,
          totalAmount: purchaseData.totalAmount,
          paidAmount: purchaseData.paidAmount,
          balanceDue: purchaseData.totalAmount - purchaseData.paidAmount,
          notes: purchaseData.notes || null,
          terms: purchaseData.terms || null,
          items: {
            create: validNormalizedItems,
          },
          status:
            purchaseData.paidAmount >= purchaseData.totalAmount
              ? "PAID"
              : purchaseData.paidAmount > 0
                ? "PARTIAL"
                : purchaseData.status || "RECEIVED",
        },
        include: { items: true },
      });

      for (const item of validNormalizedItems) {
        if (item.itemId) {
          await tx.item.update({
            where: { id: item.itemId },
            data: {
              currentStock: { increment: item.quantity },
            },
          });
        }
      }

      if (purchaseData.paidAmount > 0) {
        await tx.transaction.create({
          data: {
            businessId: purchaseData.businessId,
            date: purchaseDate,
            type: "PAYMENT",
            partyId: purchaseData.partyId,
            amount: purchaseData.paidAmount,
            balance: purchaseData.totalAmount - purchaseData.paidAmount,
            reference: `Against Purchase ${purchaseNumber}`,
            narration: `Paid against purchase ${purchaseNumber}`,
            bankAccountId: purchaseData.bankAccountId || null,
            cashAccountId: purchaseData.cashAccountId || null,
          },
        });

        if (purchaseData.bankAccountId) {
          await tx.bankAccount.updateMany({
            where: {
              id: purchaseData.bankAccountId,
              businessId: purchaseData.businessId,
            },
            data: { currentBalance: { decrement: purchaseData.paidAmount } },
          });
        }

        if (purchaseData.cashAccountId) {
          await tx.cashAccount.updateMany({
            where: {
              id: purchaseData.cashAccountId,
              businessId: purchaseData.businessId,
            },
            data: { currentBalance: { decrement: purchaseData.paidAmount } },
          });
        }
      }

      return purchase;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const purchase = await prisma.purchase.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
      include: {
        items: { include: { item: true } },
        party: true,
      },
    });

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found",
      });
    }

    res.json({ success: true, data: purchase });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", checkTransactionLock("purchase"), async (req, res, next) => {
  try {
    const data = createPurchaseSchema.parse(req.body);
    const { id } = req.params;
    const { items, ...purchaseData } = data;
    const purchaseDate = purchaseData.date
      ? new Date(purchaseData.date)
      : new Date();

    const existingPurchase = await prisma.purchase.findFirst({
      where: { id, business: { userId: req.user.id } },
      include: { items: true },
    });

    if (!existingPurchase) {
      return res
        .status(404)
        .json({ success: false, message: "Purchase not found" });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Reverse stock for old items
      for (const item of existingPurchase.items) {
        if (item.itemId) {
          await tx.item.update({
            where: { id: item.itemId },
            data: { currentStock: { decrement: item.quantity } },
          });
        }
      }

      // 2. Delete old items
      await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });

      // 3. Normalize new items
      const normalizedItems = items.map((item) => {
        const quantity = item.quantity || 0;
        const rate = item.rate || 0;
        const taxableAmount =
          (item.taxableAmount ?? quantity * rate) - (item.discountAmount || 0);
        return {
          itemId: item.itemId || null,
          description: item.description || "Updated item",
          quantity,
          unit: item.unit || "NOS",
          rate,
          taxableAmount,
          cgstRate: item.cgstRate || 0,
          cgstAmount: item.cgstAmount || 0,
          sgstRate: item.sgstRate || 0,
          sgstAmount: item.sgstAmount || 0,
          totalAmount:
            item.totalAmount ||
            taxableAmount + (item.cgstAmount || 0) + (item.sgstAmount || 0),
        };
      });

      // 4. Update Purchase
      const updated = await tx.purchase.update({
        where: { id },
        data: {
          partyId: purchaseData.partyId,
          date: purchaseDate,
          dueDate: purchaseData.dueDate ? new Date(purchaseData.dueDate) : null,
          subtotal: purchaseData.subtotal,
          totalAmount: purchaseData.totalAmount,
          balanceDue: purchaseData.totalAmount - (purchaseData.paidAmount || 0),
          status: purchaseData.status || "RECEIVED",
          items: { create: normalizedItems },
        },
        include: { items: true },
      });

      // 5. Update stock for new items
      for (const item of normalizedItems) {
        if (item.itemId) {
          await tx.item.update({
            where: { id: item.itemId },
            data: { currentStock: { increment: item.quantity } },
          });
        }
      }

      return updated;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/status", async (req, res, next) => {
  try {
    const check = await prisma.purchase.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });
    if (!check)
      return res
        .status(404)
        .json({ success: false, message: "Purchase not found" });

    const { status } = req.body;

    const purchase = await prisma.purchase.update({
      where: { id: req.params.id },
      data: { status },
    });

    res.json({ success: true, data: purchase });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/payment", checkTransactionLock("purchase"), async (req, res, next) => {
  try {
    const data = recordPurchasePaymentSchema.parse(req.body);
    const paymentDate = data.date ? new Date(data.date) : new Date();

    const purchase = await prisma.purchase.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found",
      });
    }

    if (data.amount > purchase.balanceDue) {
      return res.status(400).json({
        success: false,
        message: "Payment amount exceeds balance due",
        data: { balanceDue: purchase.balanceDue },
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const newPaidAmount =
        Math.round((purchase.paidAmount + data.amount) * 100) / 100;
      const newBalanceDue =
        Math.round(Math.max(0, purchase.totalAmount - newPaidAmount) * 100) /
        100;

      await tx.purchase.update({
        where: { id: req.params.id },
        data: {
          paidAmount: newPaidAmount,
          balanceDue: newBalanceDue,
          status: newBalanceDue <= 0.01 ? "PAID" : "PARTIAL",
        },
      });

      await tx.transaction.create({
        data: {
          businessId: purchase.businessId,
          date: paymentDate,
          type: "PAYMENT",
          partyId: purchase.partyId,
          amount: data.amount,
          balance: newBalanceDue,
          reference: data.reference,
          narration: `Payment for purchase ${purchase.purchaseNumber}`,
          bankAccountId: data.bankAccountId || null,
          cashAccountId: data.cashAccountId || null,
        },
      });

      if (data.bankAccountId) {
        await tx.bankAccount.updateMany({
          where: { id: data.bankAccountId, businessId: purchase.businessId },
          data: { currentBalance: { decrement: data.amount } },
        });
      }

      if (data.cashAccountId) {
        await tx.cashAccount.updateMany({
          where: { id: data.cashAccountId, businessId: purchase.businessId },
          data: { currentBalance: { decrement: data.amount } },
        });
      }

      return {
        newPaidAmount,
        newBalanceDue,
        paymentMethod: data.paymentMethod,
      };
    });

    res.json({
      success: true,
      message: "Payment recorded successfully",
      data: {
        purchaseId: purchase.id,
        purchaseNumber: purchase.purchaseNumber,
        totalAmount: purchase.totalAmount,
        paidAmount: result.newPaidAmount,
        balanceDue: result.newBalanceDue,
        status: result.newBalanceDue <= 0.01 ? "PAID" : "PARTIAL",
      },
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", checkTransactionLock("purchase"), async (req, res, next) => {
  try {
    const check = await prisma.purchase.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });
    if (!check)
      return res
        .status(404)
        .json({ success: false, message: "Purchase not found" });

    await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({
        where: { id: req.params.id },
        include: { items: true },
      });

      if (!purchase) return;

      // Reverse stock
      for (const item of purchase.items) {
        if (item.itemId) {
          await tx.item.update({
            where: { id: item.itemId },
            data: { currentStock: { decrement: item.quantity } },
          });
        }
      }

      await tx.purchase.delete({
        where: { id: req.params.id },
      });
    });

    res.json({ success: true, message: "Purchase deleted and stock reversed" });
  } catch (error) {
    next(error);
  }
});

export default router;
