import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { verifyBusinessOwnership } from '../middleware/businessAuth.js';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(verifyBusinessOwnership);

router.use(authenticate);

router.get('/bank-accounts/business/:businessId', async (req, res, next) => {
  try {
    const accounts = await prisma.bankAccount.findMany({
      where: { businessId: req.params.businessId },
      orderBy: { bankName: 'asc' },
    });
    res.json({ success: true, data: accounts });
  } catch (error) {
    next(error);
  }
});

router.post('/bank-accounts', async (req, res, next) => {
  try {
    const account = await prisma.bankAccount.create({ data: req.body });
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
      include: { transactions: { orderBy: { date: 'desc' }, take: 50 } },
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

router.get('/cash-accounts/business/:businessId', async (req, res, next) => {
  try {
    const accounts = await prisma.cashAccount.findMany({
      where: { businessId: req.params.businessId },
    });
    res.json({ success: true, data: accounts });
  } catch (error) {
    next(error);
  }
});

router.post('/cash-accounts', async (req, res, next) => {
  try {
    const account = await prisma.cashAccount.create({ data: req.body });
    res.status(201).json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
});

router.get('/transactions/business/:businessId', async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const { type, fromDate, toDate, page = 1, limit = 50 } = req.query;

    const where = {
      businessId,
      ...(type && { type }),
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

    res.json({
      success: true,
      data: transactions,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/transactions', async (req, res, next) => {
  try {
    const { bankAccountId, cashAccountId, ...txData } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const txRecord = await tx.transaction.create({
        data: {
          ...txData,
          date: new Date(txData.date),
        },
      });

      if (bankAccountId) {
        const bank = await tx.bankAccount.findFirst({ where: { id: bankAccountId, business: { userId: req.user.id } } });
        if (bank) {
          const balanceChange = txData.type === 'RECEIPT' ? txData.amount : -txData.amount;
          await tx.bankAccount.update({
            where: { id: bankAccountId },
            data: { currentBalance: bank.currentBalance + balanceChange },
          });
        } else {
          throw new Error("Bank account not found or access denied");
        }
      }

      if (cashAccountId) {
        const cash = await tx.cashAccount.findFirst({ where: { id: cashAccountId, business: { userId: req.user.id } } });
        if (cash) {
          const balanceChange = txData.type === 'RECEIPT' ? txData.amount : -txData.amount;
          await tx.cashAccount.update({
            where: { id: cashAccountId },
            data: { currentBalance: cash.currentBalance + balanceChange },
          });
        } else {
          throw new Error("Cash account not found or access denied");
        }
      }

      return txRecord;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
