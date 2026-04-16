import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { verifyBusinessOwnership } from '../middleware/businessAuth.js';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(verifyBusinessOwnership);

const createBankAccountSchema = z.object({
  businessId: z.string().uuid(),
  bankName: z.string().min(1),
  accountName: z.string().min(1),
  accountNumber: z.string().min(1),
  ifscCode: z.string().min(1),
  branchName: z.string().optional(),
  accountType: z.string().optional(),
  openingBalance: z.number().default(0),
});

const createCashAccountSchema = z.object({
  businessId: z.string().uuid(),
  name: z.string().min(1),
  openingBalance: z.number().default(0),
});

const createTransactionSchema = z.object({
  businessId: z.string().uuid(),
  type: z.enum(['RECEIPT', 'PAYMENT', 'JOURNAL', 'CONTRA']),
  partyId: z.string().uuid().optional(),
  bankAccountId: z.string().uuid().optional(),
  cashAccountId: z.string().uuid().optional(),
  amount: z.number().min(0),
  date: z.string().datetime(),
  reference: z.string().optional(),
  narration: z.string().optional(),
  voucherType: z.string().optional(),
});

router.get('/bank-accounts/business/:businessId', async (req, res, next) => {
  try {
    const accounts = await prisma.bankAccount.findMany({
      where: { businessId: req.params.businessId, isActive: true },
      orderBy: { bankName: 'asc' },
    });
    res.json({ success: true, data: accounts });
  } catch (error) {
    next(error);
  }
});

router.post('/bank-accounts', async (req, res, next) => {
  try {
    const data = createBankAccountSchema.parse(req.body);

    const account = await prisma.bankAccount.create({
      data: {
        ...data,
        currentBalance: data.openingBalance,
      },
    });
    res.status(201).json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
});

router.get('/bank-accounts/:id', async (req, res, next) => {
  try {
    const account = await prisma.bankAccount.findFirst({
      where: {
        id: req.params.id,
        business: { userId: req.user.id }
      },
    });
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });
    res.json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
});

router.patch('/bank-accounts/:id', async (req, res, next) => {
  try {
    const account = await prisma.bankAccount.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

    const updatedAccount = await prisma.bankAccount.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ success: true, data: updatedAccount });
  } catch (error) {
    next(error);
  }
});

router.delete('/bank-accounts/:id', async (req, res, next) => {
  try {
    const account = await prisma.bankAccount.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

    await prisma.bankAccount.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true, message: 'Account archived' });
  } catch (error) {
    next(error);
  }
});

router.get('/cash-accounts/business/:businessId', async (req, res, next) => {
  try {
    const accounts = await prisma.cashAccount.findMany({
      where: { businessId: req.params.businessId, isActive: true },
    });
    res.json({ success: true, data: accounts });
  } catch (error) {
    next(error);
  }
});

router.post('/cash-accounts', async (req, res, next) => {
  try {
    const data = createCashAccountSchema.parse(req.body);

    const account = await prisma.cashAccount.create({
      data: {
        ...data,
        currentBalance: data.openingBalance,
      },
    });
    res.status(201).json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
});

router.get('/cash-accounts/:id', async (req, res, next) => {
  try {
    const account = await prisma.cashAccount.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });
    res.json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
});

router.patch('/cash-accounts/:id', async (req, res, next) => {
  try {
    const account = await prisma.cashAccount.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

    const updatedAccount = await prisma.cashAccount.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ success: true, data: updatedAccount });
  } catch (error) {
    next(error);
  }
});

router.delete('/cash-accounts/:id', async (req, res, next) => {
  try {
    const account = await prisma.cashAccount.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

    await prisma.cashAccount.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true, message: 'Account archived' });
  } catch (error) {
    next(error);
  }
});

router.get('/transactions/business/:businessId', async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const { type, fromDate, toDate, partyId, page = 1, limit = 50 } = req.query;

    const where = {
      businessId,
      ...(type && { type }),
      ...(partyId && { partyId }),
      ...(fromDate && { date: { gte: new Date(fromDate) } }),
      ...(toDate && { date: { lte: new Date(toDate) } }),
    };

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { party: true, bankAccount: true, cashAccount: true },
        orderBy: { date: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.transaction.count({ where }),
    ]);

    const summary = transactions.reduce(
      (acc, t) => ({
        totalReceipts: acc.totalReceipts + (t.type === 'RECEIPT' ? t.amount : 0),
        totalPayments: acc.totalPayments + (t.type === 'PAYMENT' ? t.amount : 0),
      }),
      { totalReceipts: 0, totalPayments: 0 }
    );

    res.json({
      success: true,
      data: transactions,
      summary,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/transactions', async (req, res, next) => {
  try {
    const data = createTransactionSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      const txRecord = await tx.transaction.create({
        data: {
          businessId: data.businessId,
          type: data.type,
          partyId: data.partyId,
          bankAccountId: data.bankAccountId,
          cashAccountId: data.cashAccountId,
          amount: data.amount,
          date: new Date(data.date),
          reference: data.reference,
          narration: data.narration,
          voucherType: data.voucherType,
          balance: data.amount,
        },
      });

      if (data.bankAccountId) {
        if (data.type === 'RECEIPT') {
          await tx.bankAccount.update({
            where: { id: data.bankAccountId },
            data: { currentBalance: { increment: data.amount } },
          });
        } else if (data.type === 'PAYMENT') {
          await tx.bankAccount.update({
            where: { id: data.bankAccountId },
            data: { currentBalance: { decrement: data.amount } },
          });
        }
      }

      if (data.cashAccountId) {
        if (data.type === 'RECEIPT') {
          await tx.cashAccount.update({
            where: { id: data.cashAccountId },
            data: { currentBalance: { increment: data.amount } },
          });
        } else if (data.type === 'PAYMENT') {
          await tx.cashAccount.update({
            where: { id: data.cashAccountId },
            data: { currentBalance: { decrement: data.amount } },
          });
        }
      }

      return txRecord;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.get('/transactions/:id', async (req, res, next) => {
  try {
    const transaction = await prisma.transaction.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
      include: { party: true, bankAccount: true, cashAccount: true },
    });
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });
    res.json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
});

router.delete('/transactions/:id', async (req, res, next) => {
  try {
    const transaction = await prisma.transaction.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });

    await prisma.$transaction(async (tx) => {
      if (transaction.bankAccountId) {
        if (transaction.type === 'RECEIPT') {
          await tx.bankAccount.update({
            where: { id: transaction.bankAccountId },
            data: { currentBalance: { decrement: transaction.amount } },
          });
        } else {
          await tx.bankAccount.update({
            where: { id: transaction.bankAccountId },
            data: { currentBalance: { increment: transaction.amount } },
          });
        }
      }

      if (transaction.cashAccountId) {
        if (transaction.type === 'RECEIPT') {
          await tx.cashAccount.update({
            where: { id: transaction.cashAccountId },
            data: { currentBalance: { decrement: transaction.amount } },
          });
        } else {
          await tx.cashAccount.update({
            where: { id: transaction.cashAccountId },
            data: { currentBalance: { increment: transaction.amount } },
          });
        }
      }

      await tx.transaction.delete({ where: { id: req.params.id } });
    });

    res.json({ success: true, message: 'Transaction deleted' });
  } catch (error) {
    next(error);
  }
});

router.get('/summary/business/:businessId', async (req, res, next) => {
  try {
    const { businessId } = req.params;

    const [bankAccounts, cashAccounts] = await Promise.all([
      prisma.bankAccount.findMany({
        where: { businessId, isActive: true },
      }),
      prisma.cashAccount.findMany({
        where: { businessId, isActive: true },
      }),
    ]);

    const totalBankBalance = bankAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
    const totalCashBalance = cashAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0);

    res.json({
      success: true,
      data: {
        bankAccounts,
        cashAccounts,
        totals: {
          totalBankBalance,
          totalCashBalance,
          totalBalance: totalBankBalance + totalCashBalance,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
