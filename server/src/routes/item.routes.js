import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { verifyBusinessOwnership } from '../middleware/businessAuth.js';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(verifyBusinessOwnership);

const createItemSchema = z.object({
  businessId: z.string().uuid(),
  name: z.string().min(1),
  sku: z.string().optional(),
  hsnCode: z.string().optional(),
  barcode: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().optional().nullable(),
  taxRate: z.number().optional().nullable(),
  taxability: z.string().optional().nullable(),
  sellingPrice: z.number().optional().nullable(),
  purchasePrice: z.number().optional().nullable(),
  mrp: z.number().optional().nullable(),
  openingStock: z.number().optional().nullable(),
  reorderLevel: z.number().optional().nullable(),
  godown: z.string().optional().nullable(),
  isService: z.boolean().optional().nullable(),
});

router.get('/business/:businessId', async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const { search, category, inStock, page = 1, limit = 50 } = req.query;

    const where = {
      businessId,
      isActive: true,
      ...(category && { category }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { hsnCode: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(inStock === 'true' && { currentStock: { gt: 0 } }),
    };

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.item.count({ where }),
    ]);

    res.json({
      success: true,
      data: items,
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
    const data = createItemSchema.parse(req.body);

    const item = await prisma.item.create({
      data: {
        ...data,
        currentStock: data.openingStock || 0,
      },
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const item = await prisma.item.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const check = await prisma.item.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });
    if (!check) return res.status(404).json({ success: false, message: 'Item not found' });

    const data = createItemSchema.partial().omit({ businessId: true }).parse(req.body);

    const item = await prisma.item.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const check = await prisma.item.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });
    if (!check) return res.status(404).json({ success: false, message: 'Item not found' });

    await prisma.item.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({ success: true, message: 'Item archived' });
  } catch (error) {
    next(error);
  }
});

router.get('/categories/business/:businessId', async (req, res, next) => {
  try {
    const categories = await prisma.item.groupBy({
      by: ['category'],
      where: {
        businessId: req.params.businessId,
        isActive: true,
        category: { not: null },
      },
      _count: true,
    });

    res.json({
      success: true,
      data: categories.map(c => ({
        name: c.category,
        count: c._count,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
