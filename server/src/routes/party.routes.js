import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { verifyBusinessOwnership } from '../middleware/businessAuth.js';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(verifyBusinessOwnership);

const createPartySchema = z.object({
  businessId: z.string().uuid(),
  name: z.string().min(1),
  partyType: z.enum(['CUSTOMER', 'SUPPLIER', 'BOTH']).optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  billingAddress: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  shippingAddress: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  creditLimit: z.number().optional(),
  openingBalance: z.number().optional(),
  balanceType: z.enum(['RECEIVABLE', 'PAYABLE']).optional(),
  dueDays: z.number().optional(),
  taxability: z.string().optional(),
  notes: z.string().optional(),
});

router.get('/business/:businessId', async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const { search, type, page = 1, limit = 50 } = req.query;

    const where = {
      businessId,
      isActive: true,
      ...(type && { partyType: type }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { gstin: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [parties, total] = await Promise.all([
      prisma.party.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.party.count({ where }),
    ]);

    res.json({
      success: true,
      data: parties,
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
    const data = createPartySchema.parse(req.body);

    const party = await prisma.party.create({
      data,
    });

    res.status(201).json({ success: true, data: party });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const party = await prisma.party.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
      include: {
        transactions: {
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
    });

    if (!party) {
      return res.status(404).json({
        success: false,
        message: 'Party not found',
      });
    }

    res.json({ success: true, data: party });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const check = await prisma.party.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });
    if (!check) return res.status(404).json({ success: false, message: 'Party not found' });

    const data = createPartySchema.partial().omit({ businessId: true }).parse(req.body);

    const party = await prisma.party.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ success: true, data: party });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const check = await prisma.party.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });
    if (!check) return res.status(404).json({ success: false, message: 'Party not found' });

    await prisma.party.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({ success: true, message: 'Party archived' });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/balance', async (req, res, next) => {
  try {
    const party = await prisma.party.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
      select: { openingBalance: true, balanceType: true },
    });

    if (!party) {
      return res.status(404).json({
        success: false,
        message: 'Party not found',
      });
    }

    const invoices = await prisma.invoice.aggregate({
      where: {
        partyId: req.params.id,
        status: { in: ['PAID', 'PARTIAL', 'SENT'] },
      },
      _sum: { totalAmount: true, paidAmount: true },
    });

    const totalBilled = invoices._sum.totalAmount || 0;
    const totalPaid = invoices._sum.paidAmount || 0;
    const currentBalance = totalBilled - totalPaid;

    const balance = party.openingBalance + currentBalance;

    res.json({
      success: true,
      data: {
        openingBalance: party.openingBalance,
        balanceType: party.balanceType,
        currentBalance,
        totalBalance: party.balanceType === 'RECEIVABLE' ? balance : -balance,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
