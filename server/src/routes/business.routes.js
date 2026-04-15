import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import path from 'path';
import fs from 'fs';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

const createBusinessSchema = z.object({
  name: z.string().min(1),
  legalName: z.string().optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

router.get('/', async (req, res, next) => {
  try {
    const businesses = await prisma.business.findMany({
      where: { userId: req.user.id },
      include: {
        settings: true,
        _count: {
          select: {
            parties: true,
            items: true,
            invoices: true,
          },
        },
      },
    });

    res.json({ success: true, data: businesses });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const data = createBusinessSchema.parse(req.body);

    const business = await prisma.business.create({
      data: {
        userId: req.user.id,
        name: data.name,
        legalName: data.legalName,
        gstin: data.gstin,
        pan: data.pan,
        address: data.address,
        phone: data.phone,
        email: data.email,
        settings: {
          create: {},
        },
      },
      include: { settings: true },
    });

    res.status(201).json({ success: true, data: business });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const business = await prisma.business.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
      include: { settings: true },
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
      });
    }

    res.json({ success: true, data: business });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    console.log('PUT /businesses/:id', req.params.id);
    console.log('Body:', req.body);
    console.log('User:', req.user?.id);
    
    const { settings, ...businessData } = req.body;
    
    const updateData = { ...businessData };
    if (businessData.address && typeof businessData.address === 'string') {
      updateData.address = JSON.parse(businessData.address);
    }

    const business = await prisma.business.updateMany({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
      data: updateData,
    });

    console.log('Update result:', business);

    if (business.count === 0) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
      });
    }

    if (settings) {
      await prisma.businessSettings.upsert({
        where: { businessId: req.params.id },
        create: { businessId: req.params.id, ...settings },
        update: settings,
      });
    }

    const updated = await prisma.business.findUnique({
      where: { id: req.params.id },
      include: { settings: true },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('PUT /businesses error:', error);
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const business = await prisma.business.updateMany({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
      data: { isActive: false },
    });

    if (business.count === 0) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
      });
    }

    res.json({ success: true, message: 'Business archived' });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/logo', async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log('Logo upload request for business:', id);
    console.log('Files:', req.files);
    console.log('Body:', req.body);
    
    if (!req.files || !req.files.logo) {
      return res.status(400).json({ success: false, message: 'No logo file uploaded' });
    }

    const file = req.files.logo;
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.name).toLowerCase();
    
    if (!allowedExtensions.includes(ext) || !file.mimetype.startsWith('image/')) {
      return res.status(400).json({ success: false, message: 'Invalid file type. Allowed: jpg, png, gif, webp' });
    }

    const businessCheck = await prisma.business.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!businessCheck) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    const uploadDir = path.join(process.cwd(), 'uploads', 'logos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `${id}-${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, fileName);
    
    await file.mv(filePath);

    const logoUrl = `/uploads/logos/${fileName}`;
    
    const updated = await prisma.business.update({
      where: { id },
      data: { logo: logoUrl },
    });
    console.log('Business updated with logo:', updated.logo);

    res.json({ success: true, data: { logo: logoUrl } });
  } catch (error) {
    console.error('Logo upload error:', error);
    next(error);
  }
});

export default router;
