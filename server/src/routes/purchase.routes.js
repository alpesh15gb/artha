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
    const { status, partyId, fromDate, toDate, page = 1, limit = 20 } = req.query;

    const where = {
      businessId,
      ...(status && { status }),
      ...(partyId && { partyId }),
      ...(fromDate && { date: { gte: new Date(fromDate) } }),
      ...(toDate && { date: { lte: new Date(toDate) } }),
    };

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        include: { items: true, party: true },
        orderBy: { date: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.purchase.count({ where }),
    ]);

    res.json({
      success: true,
      data: purchases,
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
    const { items, ...purchaseData } = req.body;

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
          items: {
            create: items,
          },
        },
        include: { items: true },
      });

      for (const item of items) {
        if (item.itemId) {
          await tx.item.update({
            where: { id: item.itemId },
            data: {
              currentStock: { increment: item.quantity },
            },
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

export default router;
