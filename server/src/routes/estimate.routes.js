import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { verifyBusinessOwnership } from '../middleware/businessAuth.js';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(verifyBusinessOwnership);

const estimateItemSchema = z.object({
  itemId: z.string().uuid().optional(),
  name: z.string().optional(),
  hsnCode: z.string().optional(),
  quantity: z.number().min(1),
  unit: z.string().default('NOS'),
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
  partyId: z.string().uuid().optional(),
  date: z.string().datetime().optional(),
  expiryDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(estimateItemSchema).min(1),
  subtotal: z.number().min(0),
  discount: z.number().min(0).default(0),
  totalTax: z.number().min(0).default(0),
  totalAmount: z.number().min(0),
});

const updateEstimateStatusSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED']),
});

router.get('/business/:businessId', async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const { status, fromDate, toDate, page = 1, limit = 20 } = req.query;

    const where = {
      businessId,
      ...(status && { status }),
      ...(fromDate && { date: { gte: new Date(fromDate) } }),
      ...(toDate && { date: { lte: new Date(toDate) } }),
    };

    const [estimates, total] = await Promise.all([
      prisma.estimate.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.estimate.count({ where }),
    ]);

    res.json({
      success: true,
      data: estimates,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const data = createEstimateSchema.parse(req.body);
    const { items, ...estimateData } = data;

    const estimate = await prisma.estimate.create({
      data: {
        ...estimateData,
        date: new Date(estimateData.date),
        expiryDate: estimateData.expiryDate ? new Date(estimateData.expiryDate) : null,
        items: {
          create: items,
        },
      },
      include: { items: true },
    });
    res.status(201).json({ success: true, data: estimate });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const estimate = await prisma.estimate.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
      include: { items: true },
    });
    if (!estimate) return res.status(404).json({ success: false, message: 'Estimate not found' });
    res.json({ success: true, data: estimate });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const check = await prisma.estimate.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });
    if (!check) return res.status(404).json({ success: false, message: 'Estimate not found' });

    const { items, ...estimateData } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      await tx.estimateItem.deleteMany({
        where: { estimateId: req.params.id },
      });

      const updatedEstimate = await tx.estimate.update({
        where: { id: req.params.id },
        data: {
          ...estimateData,
          date: new Date(estimateData.date),
          expiryDate: estimateData.expiryDate ? new Date(estimateData.expiryDate) : null,
          items: {
            create: items.map(item => ({
              itemId: item.itemId,
              description: item.description,
              hsnCode: item.hsnCode,
              quantity: item.quantity,
              unit: item.unit,
              rate: item.rate,
              discountPercent: item.discountPercent,
              discountAmount: item.discountAmount,
              taxableAmount: item.taxableAmount,
              cgstRate: item.cgstRate,
              cgstAmount: item.cgstAmount,
              sgstRate: item.sgstRate,
              sgstAmount: item.sgstAmount,
              igstRate: item.igstRate,
              igstAmount: item.igstAmount,
              cessRate: item.cessRate,
              cessAmount: item.cessAmount,
              totalAmount: item.totalAmount,
            })),
          },
        },
        include: { items: true },
      });

      return updatedEstimate;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    const data = updateEstimateStatusSchema.parse(req.body);
    
    const check = await prisma.estimate.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });
    if (!check) return res.status(404).json({ success: false, message: 'Estimate not found' });

    const estimate = await prisma.estimate.update({
      where: { id: req.params.id },
      data: { status: data.status },
    });
    res.json({ success: true, data: estimate });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/convert-to-invoice', async (req, res, next) => {
  try {
    const estimate = await prisma.estimate.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
      include: { items: true },
    });

    if (!estimate) return res.status(404).json({ success: false, message: 'Estimate not found' });
    if (estimate.status === 'ACCEPTED' && estimate.invoiceId) {
      return res.status(400).json({ success: false, message: 'Estimate already converted to invoice' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create Invoice from Estimate
      const invoice = await tx.invoice.create({
        data: {
          businessId: estimate.businessId,
          partyId: estimate.partyId,
          date: new Date(),
          dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days default
          subtotal: estimate.subtotal,
          discountAmount: estimate.discount,
          totalAmount: estimate.totalAmount,
          balanceDue: estimate.totalAmount,
          status: 'SENT',
          notes: estimate.notes,
          items: {
            create: estimate.items.map(item => ({
              itemId: item.itemId,
              description: item.description,
              hsnCode: item.hsnCode,
              quantity: item.quantity,
              unit: item.unit,
              rate: item.rate,
              discountPercent: item.discountPercent,
              discountAmount: item.discountAmount,
              taxableAmount: item.taxableAmount,
              cgstRate: item.cgstRate,
              cgstAmount: item.cgstAmount,
              sgstRate: item.sgstRate,
              sgstAmount: item.sgstAmount,
              igstRate: item.igstRate,
              igstAmount: item.igstAmount,
              cessRate: item.cessRate,
              cessAmount: item.cessAmount,
              totalAmount: item.totalAmount,
            })),
          },
        },
      });

      // Update Estimate status and link invoice
      await tx.estimate.update({
        where: { id: estimate.id },
        data: { 
          status: 'ACCEPTED',
        },
      });

      return invoice;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const check = await prisma.estimate.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });
    if (!check) return res.status(404).json({ success: false, message: 'Estimate not found' });

    await prisma.estimate.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Estimate deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
