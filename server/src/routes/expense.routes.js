import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { verifyBusinessOwnership } from '../middleware/businessAuth.js';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(verifyBusinessOwnership);

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

router.post('/', async (req, res, next) => {
  try {
    const { businessId, paymentMode, ...rest } = req.body;
    
    const latestExpense = await prisma.expense.findFirst({
      where: { businessId },
      orderBy: { expenseNumber: 'desc' },
    });

    let nextNum = 1;
    if (latestExpense) {
      const num = parseInt(latestExpense.expenseNumber.replace(/\D/g, '')) || 0;
      nextNum = num + 1;
    }
    const expenseNumber = `EXP-${String(nextNum).padStart(5, '0')}`;

    const expenseData = {
      ...rest,
      businessId,
      expenseNumber,
      date: new Date(req.body.date),
      paymentMethod: paymentMode || 'CASH',
      totalAmount: rest.amount || rest.totalAmount,
    };

    const expense = await prisma.expense.create({
      data: expenseData,
    });
    res.status(201).json({ success: true, data: expense });
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

router.patch('/:id', async (req, res, next) => {
  try {
    const check = await prisma.expense.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });
    if (!check) return res.status(404).json({ success: false, message: 'Expense not found' });

    const expense = await prisma.expense.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
});

export default router;
