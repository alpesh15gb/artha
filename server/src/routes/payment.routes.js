import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { verifyBusinessOwnership } from '../middleware/businessAuth.js';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(verifyBusinessOwnership);

const createPaymentSchema = z.object({
  businessId: z.string().uuid(),
  partyId: z.string().uuid().optional(),
  date: z.string().datetime().optional(),
  amount: z.number().min(0),
  paymentMethod: z.enum(['CASH', 'BANK', 'UPI', 'CARD', 'CHEQUE', 'NEFT', 'RTGS']).optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  bankAccountId: z.string().uuid().optional(),
  cashAccountId: z.string().uuid().optional(),
  adjustments: z.array(z.object({
    invoiceId: z.string().uuid(),
    amount: z.number().min(0),
  })).optional(),
});

router.get('/business/:businessId', async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const { fromDate, toDate, page = 1, limit = 20 } = req.query;

    const where = {
      businessId,
      ...(fromDate && { date: { gte: new Date(fromDate) } }),
      ...(toDate && { date: { lte: new Date(toDate) } }),
    };

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.payment.count({ where }),
    ]);

    res.json({
      success: true,
      data: payments,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const data = createPaymentSchema.parse(req.body);
    const { adjustments, ...paymentData } = data;

    const latestPayment = await prisma.payment.findFirst({
      where: { businessId: paymentData.businessId },
      orderBy: { paymentNumber: 'desc' },
    });

    let nextNum = 1;
    if (latestPayment) {
      const num = parseInt(latestPayment.paymentNumber.replace(/\D/g, '')) || 0;
      nextNum = num + 1;
    }
    const paymentNumber = `PAY-${String(nextNum).padStart(5, '0')}`;

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          ...paymentData,
          paymentNumber,
          date: new Date(paymentData.date),
        },
      });

      if (adjustments && adjustments.length > 0) {
        for (const adj of adjustments) {
          const invoice = await tx.invoice.findFirst({ where: { id: adj.invoiceId, business: { userId: req.user.id } } });
          if (invoice) {
            const newPaidAmount = invoice.paidAmount + adj.amount;
            const newBalanceDue = Math.max(0, invoice.totalAmount - newPaidAmount);
            await tx.invoice.update({
              where: { id: adj.invoiceId },
              data: {
                paidAmount: newPaidAmount,
                balanceDue: newBalanceDue,
                status: newBalanceDue <= 0 ? 'PAID' : 'PARTIAL',
              },
            });
          }

          await tx.paymentAdjustment.create({
            data: {
              paymentId: payment.id,
              invoiceId: adj.invoiceId,
              amount: adj.amount,
            },
          });
        }
      }

      await tx.transaction.create({
        data: {
          businessId: paymentData.businessId,
          date: new Date(paymentData.date),
          type: 'RECEIPT',
          partyId: paymentData.partyId,
          amount: paymentData.amount,
          balance: 0,
          reference: paymentData.reference,
          bankAccountId: paymentData.bankAccountId,
          cashAccountId: paymentData.cashAccountId,
        },
      });

      if (paymentData.bankAccountId) {
        await tx.bankAccount.update({
          where: { id: paymentData.bankAccountId },
          data: { currentBalance: { increment: paymentData.amount } },
        });
      }

      if (paymentData.cashAccountId) {
        await tx.cashAccount.update({
          where: { id: paymentData.cashAccountId },
          data: { currentBalance: { increment: paymentData.amount } },
        });
      }

      return payment;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const payment = await prisma.payment.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
      include: { adjustments: true },
    });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    res.json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const check = await prisma.payment.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });
    if (!check) return res.status(404).json({ success: false, message: 'Payment not found' });

    await prisma.payment.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Payment deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
