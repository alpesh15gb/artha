import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// All routes here require Super Admin role
router.use(authenticate);
router.use(requireRole('ADMIN'));

// System Stats
router.get('/stats', async (req, res, next) => {
  try {
    const [userCount, businessCount, activeSubs] = await Promise.all([
      prisma.user.count(),
      prisma.business.count(),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    ]);

    // Since it's free for 1 year, current revenue is 0
    // But we can show "Projected Revenue" based on users starting to pay next year
    const projectedRevenue = activeSubs * 999; 

    res.json({
      success: true,
      data: {
        totalUsers: userCount,
        totalBusinesses: businessCount,
        activeSubscriptions: activeSubs,
        estimatedRevenue: 0,
        projectedRevenue: projectedRevenue,
        growthRate: '+100% Conversion'
      }
    });
  } catch (error) {
    next(error);
  }
});

// User Management - Privacy First (No deep business relations)
router.get('/users', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        role: true,
        createdAt: true,
        // Only return counts of data for system health monitoring, not the data itself
        _count: {
          select: {
            businesses: true,
          }
        },
        subscriptions: { 
          include: { plan: true }, 
          orderBy: { createdAt: 'desc' }, 
          take: 1 
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
});

router.patch('/users/:id/status', async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive }
    });
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

router.delete('/users/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Prevent self-deletion
    if (id === req.user.id) {
       return res.status(400).json({ success: false, message: 'You cannot delete your own admin account.' });
    }

    await prisma.user.delete({
      where: { id }
    });
    
    res.json({ success: true, message: 'User and all associated data deleted' });
  } catch (error) {
    next(error);
  }
});

router.get('/audit-logs', async (req, res, next) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        user: { select: { name: true, email: true } },
        business: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
});

// Plans & Subscriptions
router.get('/plans', async (req, res, next) => {
  try {
    const plans = await prisma.plan.findMany();
    res.json({ success: true, data: plans });
  } catch (error) {
    next(error);
  }
});

router.post('/plans', async (req, res, next) => {
  try {
    const plan = await prisma.plan.create({ data: req.body });
    res.json({ success: true, data: plan });
  } catch (error) {
    next(error);
  }
});

router.post('/subscriptions/assign', async (req, res, next) => {
  try {
    const { userId, planId, durationInDays = 30 } = req.body;
    
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationInDays);

    const subscription = await prisma.subscription.create({
      data: {
        userId,
        planId,
        endDate,
        status: 'ACTIVE'
      }
    });
    res.json({ success: true, data: subscription });
  } catch (error) {
    next(error);
  }
});

export default router;
