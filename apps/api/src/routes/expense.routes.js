import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { verifyBusinessOwnership } from '../middleware/businessAuth.js';
import { checkTransactionLock } from '../middleware/transactionLock.js';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(verifyBusinessOwnership);

const updateExpenseSchema = z.object({
  category: z.string().optional(),
  description: z.string().optional(),
  amount: z.number().min(0).optional(),
  taxAmount: z.number().min(0).optional(),
  totalAmount: z.number().min(0).optional(),
  paymentMethod: z.enum(['CASH', 'BANK', 'UPI', 'CARD', 'CHEQUE', 'NEFT', 'RTGS']).optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['DRAFT', 'PAID', 'CANCELLED']).optional(),
});

const createExpenseSchema = z.object({
  businessId: z.string().uuid(),
  category: z.string().optional(),
  description: z.string().optional(),
  amount: z.number().min(0),
  taxAmount: z.number().min(0).default(0),
  totalAmount: z.number().min(0).optional(),
  paymentMethod: z.enum(['CASH', 'BANK', 'UPI', 'CARD', 'CHEQUE', 'NEFT', 'RTGS']).optional(),
  date: z.string().datetime().optional(),
  bankAccountId: z.string().uuid().optional(),
  cashAccountId: z.string().uuid().optional(),
});

router.get('/business/:businessId', async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const { category, fromDate, toDate, page = 1, limit = 20 } = req.query;

    const where = {
      businessId,
      ...(category && { category }),
      ...(fromDate && { date: { gte: new Date(fromDate) } }),
      ...(toDate && { date: { lte: new Date(toDate) } }),
    };

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.expense.count({ where }),
    ]);

    res.json({
      success: true,
      data: expenses,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', checkTransactionLock('expense'), async (req, res, next) => {
  try {
    const data = createExpenseSchema.parse(req.body);
    
    const { 
      paymentMethod, 
      bankAccountId, 
      cashAccountId,
      date,
      ...rest 
    } = data;
    
    const finalAmount = data.amount || data.totalAmount || 0;
    const finalTotal = data.totalAmount || (data.amount + (data.taxAmount || 0)) || 0;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Resolve Account if missing (Critical for Mobile Sync)
      let resolvedBankAccountId = bankAccountId;
      let resolvedCashAccountId = cashAccountId;

      if (!resolvedBankAccountId && !resolvedCashAccountId) {
        const settings = await tx.businessSettings.findUnique({
          where: { businessId: data.businessId }
        });

        if (paymentMethod === 'CASH') {
          resolvedCashAccountId = settings?.defaultCashAccountId;
          if (!resolvedCashAccountId) {
            const firstCash = await tx.cashAccount.findFirst({ where: { businessId: data.businessId, isActive: true } });
            resolvedCashAccountId = firstCash?.id;
          }
        } else {
          // Default to Bank for all other methods
          resolvedBankAccountId = settings?.defaultBankAccountId;
          if (!resolvedBankAccountId) {
            const firstBank = await tx.bankAccount.findFirst({ where: { businessId: data.businessId, isActive: true } });
            resolvedBankAccountId = firstBank?.id;
          }
        }
      }

      // 2. Generate Expense Number
      const latestExpense = await tx.expense.findFirst({
        where: { businessId: data.businessId },
        orderBy: { expenseNumber: 'desc' },
      });

      let nextNum = 1;
      if (latestExpense) {
        const num = parseInt(latestExpense.expenseNumber.replace(/\D/g, '')) || 0;
        nextNum = num + 1;
      }
      const expenseNumber = `EXP-${String(nextNum).padStart(5, '0')}`;

      // 3. Create Expense
      const expense = await tx.expense.create({
        data: {
          ...rest,
          businessId: data.businessId,
          expenseNumber,
          date: new Date(date || new Date()),
          paymentMethod: paymentMethod || 'CASH',
          amount: Math.round(finalAmount * 100) / 100,
          taxAmount: Math.round((data.taxAmount || 0) * 100) / 100,
          totalAmount: Math.round(finalTotal * 100) / 100,
          status: 'PAID',
          bankAccountId: resolvedBankAccountId,
          cashAccountId: resolvedCashAccountId,
        },
      });

      // 4. Update Account Balance & Create Transaction record
      if (resolvedBankAccountId || resolvedCashAccountId) {
        await tx.transaction.create({
          data: {
            businessId: data.businessId,
            date: new Date(date || new Date()),
            type: 'PAYMENT',
            amount: finalTotal,
            balance: 0, 
            reference: expenseNumber,
            narration: `Expense: ${rest.category || 'General'} - ${rest.description || ''}`,
            bankAccountId: resolvedBankAccountId || null,
            cashAccountId: resolvedCashAccountId || null,
          },
        });

        if (resolvedBankAccountId) {
          await tx.bankAccount.update({
            where: { id: resolvedBankAccountId },
            data: { currentBalance: { decrement: finalTotal } },
          });
        }

        if (resolvedCashAccountId) {
          await tx.cashAccount.update({
            where: { id: resolvedCashAccountId },
            data: { currentBalance: { decrement: finalTotal } },
          });
        }
      }

      return expense;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const expense = await prisma.expense.findFirst({ 
      where: { id: req.params.id, business: { userId: req.user.id } } 
    });
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', checkTransactionLock('expense'), async (req, res, next) => {
  try {
    const check = await prisma.expense.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });
    if (!check) return res.status(404).json({ success: false, message: 'Expense not found' });

    const data = updateExpenseSchema.parse(req.body);

    const expense = await prisma.expense.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
});

export default router;
