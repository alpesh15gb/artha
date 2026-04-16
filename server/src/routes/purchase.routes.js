import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { verifyBusinessOwnership } from '../middleware/businessAuth.js';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(verifyBusinessOwnership);

const purchaseItemSchema = z.object({
  itemId: z.string().uuid().optional(),
  name: z.string().optional(),
  hsnCode: z.string().optional(),
  quantity: z.number().min(1),
  rate: z.number().min(0),
  discount: z.number().min(0).default(0),
  taxRate: z.number().min(0).default(0),
  amount: z.number().min(0),
});

const createPurchaseSchema = z.object({
  businessId: z.string().uuid(),
  partyId: z.string().uuid().optional(),
  date: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1),
  subtotal: z.number().min(0),
  discount: z.number().min(0).default(0),
  totalTax: z.number().min(0).default(0),
  totalAmount: z.number().min(0),
  paidAmount: z.number().min(0).default(0),
  paymentMethod: z.enum(['CASH', 'BANK', 'UPI', 'CARD', 'CHEQUE', 'NEFT', 'RTGS']).optional(),
  bankAccountId: z.string().uuid().optional(),
  cashAccountId: z.string().uuid().optional(),
});

router.get('/business/:businessId', async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const { status, partyId, fromDate, toDate, search, page = 1, limit = 20 } = req.query;

    const where = {
      businessId,
      ...(status && { status }),
      ...(partyId && { partyId }),
      ...(fromDate && { date: { gte: new Date(fromDate) } }),
      ...(toDate && { date: { lte: new Date(toDate) } }),
      ...(search && {
        OR: [
          { purchaseNumber: { contains: search, mode: 'insensitive' } },
          { party: { name: { contains: search, mode: 'insensitive' } } },
        ]
      }),
    };

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        include: {
          items: true,
          party: { select: { id: true, name: true, gstin: true, phone: true } },
        },
        orderBy: { date: 'desc' },
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
      { totalAmount: 0, totalPaid: 0, totalDue: 0 }
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

router.post('/', async (req, res, next) => {
  try {
    const data = createPurchaseSchema.parse(req.body);
    const { items, ...purchaseData } = data;

    const latestPurchase = await prisma.purchase.findFirst({
      where: { businessId: purchaseData.businessId },
      orderBy: { purchaseNumber: 'desc' },
    });

    let nextNum = 1;
    if (latestPurchase) {
      const num = parseInt(latestPurchase.purchaseNumber.replace(/\D/g, '')) || 0;
      nextNum = num + 1;
    }
    const purchaseNumber = `PUR-${String(nextNum).padStart(5, '0')}`;

    const result = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.create({
        data: {
          ...purchaseData,
          purchaseNumber,
          date: new Date(purchaseData.date),
          dueDate: purchaseData.dueDate ? new Date(purchaseData.dueDate) : null,
          balanceDue: purchaseData.totalAmount - purchaseData.paidAmount,
          items: {
            create: items,
          },
          status: purchaseData.paidAmount >= purchaseData.totalAmount ? 'PAID' : (purchaseData.paidAmount > 0 ? 'PARTIAL' : 'DRAFT'),
        },
        include: { items: true },
      });

      for (const item of items) {
        if (item.itemId) {
          await tx.item.update({
            where: { id: item.itemId },
            data: { 
              currentStock: { increment: item.quantity }
            }
          });
        }
      }

      if (purchaseData.paidAmount > 0) {
        await tx.transaction.create({
          data: {
            businessId: purchaseData.businessId,
            date: new Date(purchaseData.date),
            type: 'PAYMENT',
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
          await tx.bankAccount.update({
            where: { id: purchaseData.bankAccountId },
            data: { currentBalance: { decrement: purchaseData.paidAmount } },
          });
        }

        if (purchaseData.cashAccountId) {
          await tx.cashAccount.update({
            where: { id: purchaseData.cashAccountId },
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

router.get('/:id', async (req, res, next) => {
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
        message: 'Purchase not found',
      });
    }

    res.json({ success: true, data: purchase });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    const check = await prisma.purchase.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });
    if (!check) return res.status(404).json({ success: false, message: 'Purchase not found' });

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

router.post('/:id/payment', async (req, res, next) => {
  try {
    const { amount, paymentMethod, reference, date, bankAccountId, cashAccountId } = req.body;

    const purchase = await prisma.purchase.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found',
      });
    }

    if (amount > purchase.balanceDue) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount exceeds balance due',
        data: { balanceDue: purchase.balanceDue },
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const newPaidAmount = purchase.paidAmount + amount;
      const newBalanceDue = purchase.totalAmount - newPaidAmount;

      await tx.purchase.update({
        where: { id: req.params.id },
        data: {
          paidAmount: newPaidAmount,
          balanceDue: Math.max(0, newBalanceDue),
          status: newBalanceDue <= 0 ? 'PAID' : 'PARTIAL',
        },
      });

      await tx.transaction.create({
        data: {
          businessId: purchase.businessId,
          date: new Date(date),
          type: 'PAYMENT',
          partyId: purchase.partyId,
          amount,
          balance: newBalanceDue,
          reference,
          narration: `Payment for purchase ${purchase.purchaseNumber}`,
          bankAccountId,
          cashAccountId,
        },
      });

      if (bankAccountId) {
        const bank = await tx.bankAccount.findFirst({
          where: { id: bankAccountId, businessId: purchase.businessId }
        });
        if (bank) {
          await tx.bankAccount.update({
            where: { id: bankAccountId },
            data: { currentBalance: bank.currentBalance - amount },
          });
        }
      }

      if (cashAccountId) {
        const cash = await tx.cashAccount.findFirst({
          where: { id: cashAccountId, businessId: purchase.businessId }
        });
        if (cash) {
          await tx.cashAccount.update({
            where: { id: cashAccountId },
            data: { currentBalance: cash.currentBalance - amount },
          });
        }
      }

      return { newPaidAmount, newBalanceDue, paymentMethod };
    });

    res.json({
      success: true,
      message: 'Payment recorded successfully',
      data: {
        purchaseId: purchase.id,
        purchaseNumber: purchase.purchaseNumber,
        totalAmount: purchase.totalAmount,
        paidAmount: result.newPaidAmount,
        balanceDue: result.newBalanceDue,
        status: result.newBalanceDue <= 0 ? 'PAID' : 'PARTIAL',
      },
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const check = await prisma.purchase.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });
    if (!check) return res.status(404).json({ success: false, message: 'Purchase not found' });

    await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({
        where: { id: req.params.id },
        include: { items: true }
      });

      if (!purchase) return;

      // Reverse stock
      for (const item of purchase.items) {
        if (item.itemId) {
          await tx.item.update({
            where: { id: item.itemId },
            data: { currentStock: { decrement: item.quantity } }
          });
        }
      }

      await tx.purchase.delete({
        where: { id: req.params.id },
      });
    });

    res.json({ success: true, message: 'Purchase deleted and stock reversed' });
  } catch (error) {
    next(error);
  }
});

export default router;
