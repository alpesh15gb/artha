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
    const { items, ...estimateData } = req.body;

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
    const check = await prisma.estimate.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });
    if (!check) return res.status(404).json({ success: false, message: 'Estimate not found' });

    const { status } = req.body;
    const estimate = await prisma.estimate.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json({ success: true, data: estimate });
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
