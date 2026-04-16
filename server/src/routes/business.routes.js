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

    const result = await prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
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
          cashAccounts: {
            create: {
              name: 'Cash Account',
              openingBalance: 0,
              currentBalance: 0,
            }
          },
          bankAccounts: {
            create: {
              bankName: 'Main Bank',
              accountName: 'Operating Account',
              accountNumber: 'PENDING',
              ifscCode: 'TBD',
              openingBalance: 0,
              currentBalance: 0,
            }
          }
        },
        include: { settings: true, cashAccounts: true, bankAccounts: true },
      });
      return business;
    });

    res.status(201).json({ success: true, data: result });
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

    res.json({ success: true, data: { logo: logoUrl } });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/signature', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!req.files || (!req.files.signature && !req.files.signatureImage)) {
      return res.status(400).json({ success: false, message: 'No signature file uploaded' });
    }

    const file = req.files.signature || req.files.signatureImage;
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

    const uploadDir = path.join(process.cwd(), 'uploads', 'signatures');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `${id}-sig-${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, fileName);
    
    await file.mv(filePath);

    const signatureUrl = `/uploads/signatures/${fileName}`;
    
    const updated = await prisma.business.update({
      where: { id },
      data: { signatureImage: signatureUrl },
    });

    res.json({ success: true, data: { signatureImage: signatureUrl } });
  } catch (error) {
    next(error);
  }
});

export default router;
