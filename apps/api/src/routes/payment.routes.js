import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { verifyBusinessOwnership } from "../middleware/businessAuth.js";

const router = Router();

router.use(authenticate);
router.use(verifyBusinessOwnership);

const createPaymentSchema = z.object({
  businessId: z.string().uuid(),
  partyId: z.string().uuid(),
  date: z.string().optional(),
  amount: z.number().positive(),
  paymentMethod: z
    .enum(["CASH", "BANK", "UPI", "CARD", "CHEQUE", "NEFT", "RTGS"])
    .optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  bankAccountId: z.string().uuid().optional().nullable(),
  cashAccountId: z.string().uuid().optional().nullable(),
  adjustments: z
    .array(
      z.object({
        invoiceId: z.string().uuid().optional().nullable(),
        purchaseId: z.string().uuid().optional().nullable(),
        amount: z.number().positive(),
      }),
    )
    .optional(),
});

router.get("/business/:businessId", async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const { fromDate, toDate, search, page = 1, limit = 20 } = req.query;

    const where = {
      businessId,
      ...(fromDate &&
        !isNaN(new Date(fromDate)) && { date: { gte: new Date(fromDate) } }),
      ...(toDate &&
        !isNaN(new Date(toDate)) && { date: { lte: new Date(toDate) } }),
      ...(search && {
        OR: [
          { paymentNumber: { contains: search, mode: "insensitive" } },
          { reference: { contains: search, mode: "insensitive" } },
          { party: { name: { contains: search, mode: "insensitive" } } },
        ],
      }),
    };

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          adjustments: {
            include: {
              invoice: { select: { invoiceNumber: true } },
              purchase: { select: { purchaseNumber: true } },
            },
          },
        },
        orderBy: { date: "desc" },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.payment.count({ where }),
    ]);

    res.json({
      success: true,
      data: payments,
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
    const data = createPaymentSchema.parse(req.body);
    const { adjustments, ...paymentData } = data;
    const paymentDate = paymentData.date
      ? new Date(paymentData.date)
      : new Date();

    // Total adjusted amount validation
    const totalAdjusted = (adjustments || []).reduce(
      (sum, adj) => sum + adj.amount,
      0,
    );

    if (totalAdjusted > paymentData.amount + 0.01) {
      return res.status(400).json({
        success: false,
        message: "Adjusted amount cannot exceed payment amount",
      });
    }

    const settings = await prisma.businessSettings.findUnique({
      where: { businessId: paymentData.businessId },
    });

    const prefix = settings?.paymentPrefix || "PAY";
    const startNum = settings?.paymentStartNumber || 1;
    const count = await prisma.payment.count({
      where: { businessId: paymentData.businessId },
    });

    const paymentNumber = `${prefix}-${String(startNum + count).padStart(5, "0")}`;
    const paymentReference = paymentData.reference || paymentNumber;

    const result = await prisma.$transaction(async (tx) => {
      // Determine Transaction Type (RECEIPT for customer, PAYMENT for supplier)
      const party = await tx.party.findUnique({
        where: { id: paymentData.partyId },
      });
      const isSupplier = party?.partyType === "SUPPLIER";
      const hasPurchases = adjustments?.some((a) => a.purchaseId);
      const isPaymentToSupplier = isSupplier || hasPurchases;
      const txnType = isPaymentToSupplier ? "PAYMENT" : "RECEIPT";

      // Resolve Account if missing (Default logic)
      let resolvedBankAccountId = paymentData.bankAccountId;
      let resolvedCashAccountId = paymentData.cashAccountId;

      if (!resolvedBankAccountId && !resolvedCashAccountId) {
        const settings = await tx.businessSettings.findUnique({
          where: { businessId: paymentData.businessId },
        });

        if (paymentData.paymentMethod === "CASH") {
          resolvedCashAccountId = settings?.defaultCashAccountId;
        } else {
          resolvedBankAccountId = settings?.defaultBankAccountId;
        }
      }

      const payment = await tx.payment.create({
        data: {
          ...paymentData,
          paymentNumber,
          reference: paymentReference,
          date: paymentDate,
          isAdjusted: !!(adjustments && adjustments.length > 0),
          bankAccountId: resolvedBankAccountId,
          cashAccountId: resolvedCashAccountId,
        },
      });

      if (adjustments && adjustments.length > 0) {
        for (const adj of adjustments) {
          if (adj.invoiceId) {
            const invoice = await tx.invoice.findFirst({
              where: { id: adj.invoiceId, businessId: paymentData.businessId },
            });
            if (invoice) {
              const newPaidAmount =
                Math.round((invoice.paidAmount + adj.amount) * 100) / 100;
              const newBalanceDue = Math.max(
                0,
                invoice.totalAmount - newPaidAmount,
              );
              await tx.invoice.update({
                where: { id: adj.invoiceId },
                data: {
                  paidAmount: newPaidAmount,
                  balanceDue: newBalanceDue,
                  status: newBalanceDue <= 0.01 ? "PAID" : "PARTIAL",
                },
              });
              await tx.paymentAdjustment.create({
                data: {
                  paymentId: payment.id,
                  invoiceId: adj.invoiceId,
                  amount: adj.amount,
                },
              });
            }
          } else if (adj.purchaseId) {
            const purchase = await tx.purchase.findFirst({
              where: { id: adj.purchaseId, businessId: paymentData.businessId },
            });
            if (purchase) {
              const newPaidAmount =
                Math.round((purchase.paidAmount + adj.amount) * 100) / 100;
              const newBalanceDue = Math.max(
                0,
                purchase.totalAmount - newPaidAmount,
              );
              await tx.purchase.update({
                where: { id: adj.purchaseId },
                data: {
                  paidAmount: newPaidAmount,
                  balanceDue: newBalanceDue,
                  status: newBalanceDue <= 0.01 ? "PAID" : "PARTIAL",
                },
              });
              await tx.paymentAdjustment.create({
                data: {
                  paymentId: payment.id,
                  purchaseId: adj.purchaseId,
                  amount: adj.amount,
                },
              });
            }
          }
        }
      }

      // Create Ledger Transaction
      await tx.transaction.create({
        data: {
          businessId: paymentData.businessId,
          date: paymentDate,
          type: txnType,
          partyId: paymentData.partyId,
          amount: paymentData.amount,
          balance: 0,
          reference: paymentReference,
          bankAccountId: resolvedBankAccountId || null,
          cashAccountId: resolvedCashAccountId || null,
        },
      });

      // Update Cash/Bank balance
      const balanceChange =
        txnType === "RECEIPT" ? paymentData.amount : -paymentData.amount;
      if (resolvedBankAccountId) {
        await tx.bankAccount.updateMany({
          where: {
            id: resolvedBankAccountId,
            businessId: paymentData.businessId,
          },
          data: { currentBalance: { increment: balanceChange } },
        });
      }
      if (resolvedCashAccountId) {
        await tx.cashAccount.updateMany({
          where: {
            id: resolvedCashAccountId,
            businessId: paymentData.businessId,
          },
          data: { currentBalance: { increment: balanceChange } },
        });
      }

      return payment;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const payment = await prisma.payment.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
      include: {
        adjustments: {
          include: {
            invoice: { select: { id: true, invoiceNumber: true } },
            purchase: { select: { id: true, purchaseNumber: true } },
          },
        },
      },
    });
    if (!payment)
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    res.json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const payment = await prisma.payment.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
      include: { adjustments: true },
    });
    if (!payment)
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });

    await prisma.$transaction(async (tx) => {
      // Reverse Adjustments
      for (const adj of payment.adjustments) {
        if (adj.invoiceId) {
          const doc = await tx.invoice.findFirst({
            where: { id: adj.invoiceId },
          });
          if (doc) {
            const newPaid = Math.max(0, doc.paidAmount - adj.amount);
            await tx.invoice.update({
              where: { id: adj.invoiceId },
              data: {
                paidAmount: newPaid,
                balanceDue: doc.totalAmount - newPaid,
                status:
                  doc.totalAmount - newPaid <= 0.01
                    ? "PAID"
                    : newPaid > 0
                      ? "PARTIAL"
                      : "SENT",
              },
            });
          }
        } else if (adj.purchaseId) {
          const doc = await tx.purchase.findFirst({
            where: { id: adj.purchaseId },
          });
          if (doc) {
            const newPaid = Math.max(0, doc.paidAmount - adj.amount);
            await tx.purchase.update({
              where: { id: adj.purchaseId },
              data: {
                paidAmount: newPaid,
                balanceDue: doc.totalAmount - newPaid,
                status:
                  doc.totalAmount - newPaid <= 0.01
                    ? "PAID"
                    : newPaid > 0
                      ? "PARTIAL"
                      : "RECEIVED",
              },
            });
          }
        }
      }

      // Reverse and Delete Transaction
      const transaction = await tx.transaction.findFirst({
        where: {
          businessId: payment.businessId,
          reference: payment.reference,
          partyId: payment.partyId,
          amount: payment.amount,
        },
      });

      if (transaction) {
        const balanceReverse =
          transaction.type === "RECEIPT" ? -payment.amount : payment.amount;
        if (transaction.bankAccountId) {
          await tx.bankAccount.updateMany({
            where: { id: transaction.bankAccountId },
            data: { currentBalance: { increment: balanceReverse } },
          });
        }
        if (transaction.cashAccountId) {
          await tx.cashAccount.updateMany({
            where: { id: transaction.cashAccountId },
            data: { currentBalance: { increment: balanceReverse } },
          });
        }
        await tx.transaction.delete({ where: { id: transaction.id } });
      }

      await tx.payment.delete({ where: { id: payment.id } });
    });

    res.json({
      success: true,
      message: "Payment deleted and balances reversed",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
