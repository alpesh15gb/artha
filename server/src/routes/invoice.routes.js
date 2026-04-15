import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { verifyBusinessOwnership } from '../middleware/businessAuth.js';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(verifyBusinessOwnership);

const invoiceItemSchema = z.object({
  itemId: z.string().uuid().optional(),
  description: z.string(),
  hsnCode: z.string().optional(),
  quantity: z.number().positive(),
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

const createInvoiceSchema = z.object({
  businessId: z.string().uuid(),
  invoiceNumber: z.string(),
  invoiceType: z.enum(['TAX_INVOICE', 'BILL_OF_SUPPLY', 'EXPORT_INVOICE', 'SEZ_INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE']).default('TAX_INVOICE'),
  partyId: z.string().uuid(),
  date: z.string().datetime(),
  dueDate: z.string().datetime().optional(),
  reverseCharge: z.boolean().default(false),
  stateOfSupply: z.string().optional(),
  subtotal: z.number().min(0),
  discountAmount: z.number().min(0).default(0),
  discountPercent: z.number().min(0).default(0),
  cgstAmount: z.number().min(0).default(0),
  sgstAmount: z.number().min(0).default(0),
  igstAmount: z.number().min(0).default(0),
  cessAmount: z.number().min(0).default(0),
  roundOff: z.number().default(0),
  totalAmount: z.number().min(0),
  amountInWords: z.string().optional(),
  paidAmount: z.number().min(0).default(0),
  notes: z.string().optional(),
  terms: z.string().optional(),
  billingAddress: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    country: z.string().optional(),
  }),
  shippingAddress: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  items: z.array(invoiceItemSchema),
});

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

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          items: true,
        },
        orderBy: { date: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.invoice.count({ where }),
    ]);

    res.json({
      success: true,
      data: invoices,
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
    const data = createInvoiceSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          businessId: data.businessId,
          invoiceNumber: data.invoiceNumber,
          invoiceType: data.invoiceType,
          partyId: data.partyId,
          date: new Date(data.date),
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          reverseCharge: data.reverseCharge,
          stateOfSupply: data.stateOfSupply,
          billingAddress: data.billingAddress,
          shippingAddress: data.shippingAddress,
          subtotal: data.subtotal,
          discountAmount: data.discountAmount,
          discountPercent: data.discountPercent,
          cgstAmount: data.cgstAmount,
          sgstAmount: data.sgstAmount,
          igstAmount: data.igstAmount,
          cessAmount: data.cessAmount,
          roundOff: data.roundOff,
          totalAmount: data.totalAmount,
          amountInWords: data.amountInWords,
          paidAmount: data.paidAmount,
          balanceDue: data.totalAmount - data.paidAmount,
          notes: data.notes,
          terms: data.terms,
          status: data.paidAmount >= data.totalAmount ? 'PAID' : (data.paidAmount > 0 ? 'PARTIAL' : 'DRAFT'),
          items: {
            create: data.items.map(item => ({
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
        include: {
          items: true,
        },
      });

      if (data.paidAmount > 0) {
        const business = await tx.business.findUnique({
          where: { id: data.businessId },
        });

        await tx.transaction.create({
          data: {
            businessId: data.businessId,
            date: new Date(data.date),
            type: 'RECEIPT',
            partyId: data.partyId,
            amount: data.paidAmount,
            balance: data.paidAmount,
            reference: `Against Invoice ${data.invoiceNumber}`,
            narration: `Received against invoice ${data.invoiceNumber}`,
          },
        });
      }

      return invoice;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
      include: {
        items: {
          include: { item: true },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const data = createInvoiceSchema.parse(req.body);

    const check = await prisma.invoice.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });
    if (!check) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const result = await prisma.$transaction(async (tx) => {
      // Clean previous items
      await tx.invoiceItem.deleteMany({
        where: { invoiceId: req.params.id },
      });

      // Insert new core details with items nested
      const updatedInvoice = await tx.invoice.update({
        where: { id: req.params.id },
        data: {
          invoiceNumber: data.invoiceNumber,
          invoiceType: data.invoiceType,
          partyId: data.partyId,
          date: new Date(data.date),
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          reverseCharge: data.reverseCharge,
          stateOfSupply: data.stateOfSupply,
          billingAddress: data.billingAddress,
          shippingAddress: data.shippingAddress,
          subtotal: data.subtotal,
          discountAmount: data.discountAmount,
          discountPercent: data.discountPercent,
          cgstAmount: data.cgstAmount,
          sgstAmount: data.sgstAmount,
          igstAmount: data.igstAmount,
          cessAmount: data.cessAmount,
          roundOff: data.roundOff,
          totalAmount: data.totalAmount,
          amountInWords: data.amountInWords,
          paidAmount: data.paidAmount,
          balanceDue: data.totalAmount - data.paidAmount,
          notes: data.notes,
          terms: data.terms,
          status: data.paidAmount >= data.totalAmount ? 'PAID' : (data.paidAmount > 0 ? 'PARTIAL' : 'DRAFT'),
          items: {
            create: data.items.map(item => ({
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
        include: {
          items: true,
        },
      });

      return updatedInvoice;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    const check = await prisma.invoice.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });
    if (!check) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const { status } = req.body;

    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: { status },
    });

    res.json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/payment', async (req, res, next) => {
  try {
    const { amount, paymentMethod, reference, date } = req.body;

    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const newPaidAmount = invoice.paidAmount + amount;
      const newBalanceDue = invoice.totalAmount - newPaidAmount;

      await tx.invoice.update({
        where: { id: req.params.id },
        data: {
          paidAmount: newPaidAmount,
          balanceDue: newBalanceDue,
          status: newBalanceDue <= 0 ? 'PAID' : 'PARTIAL',
        },
      });

      await tx.transaction.create({
        data: {
          businessId: invoice.businessId,
          date: new Date(date),
          type: 'RECEIPT',
          partyId: invoice.partyId,
          amount,
          balance: amount,
          reference,
          narration: `Payment for invoice ${invoice.invoiceNumber}`,
        },
      });

      return newBalanceDue;
    });

    res.json({
      success: true,
      message: 'Payment recorded',
      data: { balanceDue: result },
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const check = await prisma.invoice.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });
    if (!check) return res.status(404).json({ success: false, message: 'Invoice not found' });

    await prisma.invoice.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Invoice deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
