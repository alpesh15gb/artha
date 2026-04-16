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
  description: z.string().optional(),
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
  template: z.enum(['template1', 'template2', 'template3']).default('template1'),
  partyId: z.string().uuid(),
  date: z.string(),
  dueDate: z.string().optional().nullable(),
  reverseCharge: z.boolean().default(false),
  stateOfSupply: z.string().optional().nullable(),
  subtotal: z.number().min(0),
  discountAmount: z.number().min(0).default(0),
  discountPercent: z.number().min(0).default(0),
  cgstAmount: z.number().min(0).default(0),
  sgstAmount: z.number().min(0).default(0),
  igstAmount: z.number().min(0).default(0),
  cessAmount: z.number().min(0).default(0),
  roundOff: z.number().default(0),
  totalAmount: z.number().min(0),
  amountInWords: z.string().optional().nullable(),
  paidAmount: z.number().min(0).default(0),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  billingAddress: z.any().optional().nullable(),
  shippingAddress: z.any().optional().nullable(),
  items: z.array(invoiceItemSchema),
  tags: z.array(z.string()).optional().default([]),
  bankAccountId: z.string().uuid().optional().nullable(),
  cashAccountId: z.string().uuid().optional().nullable(),
});

const recordPaymentSchema = z.object({
  amount: z.number().positive(),
  paymentMethod: z.enum(['CASH', 'BANK', 'UPI', 'CARD', 'CHEQUE', 'NEFT', 'RTGS']).default('CASH'),
  reference: z.string().optional(),
  date: z.string().datetime().optional(),
  bankAccountId: z.string().uuid().optional(),
  cashAccountId: z.string().uuid().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED']),
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
          party: { select: { id: true, name: true, gstin: true, phone: true } },
        },
        orderBy: { date: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.invoice.count({ where }),
    ]);

    const totals = invoices.reduce(
      (acc, inv) => ({
        totalAmount: acc.totalAmount + inv.totalAmount,
        totalPaid: acc.totalPaid + inv.paidAmount,
        totalDue: acc.totalDue + inv.balanceDue,
      }),
      { totalAmount: 0, totalPaid: 0, totalDue: 0 }
    );

    res.json({
      success: true,
      data: invoices,
      totals,
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
          template: data.template,
          partyId: data.partyId,
          date: new Date(data.date),
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          reverseCharge: data.reverseCharge || false,
          stateOfSupply: data.stateOfSupply || null,
          billingAddress: data.billingAddress || {},
          shippingAddress: data.shippingAddress || {},
          subtotal: data.subtotal || 0,
          discountAmount: data.discountAmount || 0,
          discountPercent: data.discountPercent || 0,
          cgstAmount: data.cgstAmount || 0,
          sgstAmount: data.sgstAmount || 0,
          igstAmount: data.igstAmount || 0,
          cessAmount: data.cessAmount || 0,
          roundOff: data.roundOff || 0,
          totalAmount: data.totalAmount || 0,
          amountInWords: data.amountInWords || null,
          paidAmount: data.paidAmount || 0,
          notes: data.notes || null,
          terms: data.terms || null,
          tags: data.tags || [],
          balanceDue: (data.totalAmount || 0) - (data.paidAmount || 0),
          status: (data.paidAmount || 0) >= (data.totalAmount || 0) ? 'PAID' : ((data.paidAmount || 0) > 0 ? 'PARTIAL' : 'SENT'),
          items: {
            create: data.items.map(item => ({
              itemId: item.itemId || null,
              description: item.description || 'No description',
              hsnCode: item.hsnCode || null,
              quantity: item.quantity || 0,
              unit: item.unit || 'NOS',
              rate: item.rate || 0,
              discountPercent: item.discountPercent || 0,
              discountAmount: item.discountAmount || 0,
              taxableAmount: item.taxableAmount || 0,
              cgstRate: item.cgstRate || 0,
              cgstAmount: item.cgstAmount || 0,
              sgstRate: item.sgstRate || 0,
              sgstAmount: item.sgstAmount || 0,
              igstRate: item.igstRate || 0,
              igstAmount: item.igstAmount || 0,
              cessRate: item.cessRate || 0,
              cessAmount: item.cessAmount || 0,
              totalAmount: item.totalAmount || 0,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // Update Items stock levels
      for (const item of data.items) {
        if (item.itemId) {
          await tx.item.update({
            where: { id: item.itemId },
            data: { 
              currentStock: { decrement: item.quantity }
            }
          });
        }
      }

      if (data.paidAmount > 0) {
        await tx.transaction.create({
          data: {
            businessId: data.businessId,
            date: new Date(data.date),
            type: 'RECEIPT',
            partyId: data.partyId,
            amount: data.paidAmount,
            balance: Math.round((data.totalAmount - data.paidAmount) * 100) / 100,
            reference: `Against Invoice ${data.invoiceNumber}`,
            narration: `Received against invoice ${data.invoiceNumber}`,
            bankAccountId: data.bankAccountId || null,
            cashAccountId: data.cashAccountId || null,
          },
        });

        if (data.bankAccountId) {
          await tx.bankAccount.update({
            where: { id: data.bankAccountId },
            data: { currentBalance: { increment: data.paidAmount } },
          });
        }

        if (data.cashAccountId) {
          await tx.cashAccount.update({
            where: { id: data.cashAccountId },
            data: { currentBalance: { increment: data.paidAmount } },
          });
        }
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
    const { id } = req.params;

    const existingInvoice = await prisma.invoice.findFirst({
      where: { id, businessId: data.businessId, business: { userId: req.user.id } },
      include: { items: true }
    });

    if (!existingInvoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Restore stock for old items
      for (const item of existingInvoice.items) {
        if (item.itemId) {
          await tx.item.update({
            where: { id: item.itemId },
            data: { currentStock: { increment: item.quantity } }
          });
        }
      }

      // Delete old items
      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });

      // Update invoice and create new items
      const updatedInvoice = await tx.invoice.update({
        where: { id },
        data: {
          invoiceNumber: data.invoiceNumber,
          invoiceType: data.invoiceType,
          template: data.template,
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
          tags: data.tags,
          status: data.paidAmount >= data.totalAmount ? 'PAID' : (data.paidAmount > 0 ? 'PARTIAL' : 'SENT'),
          items: {
            create: data.items.map(item => ({
              itemId: item.itemId || null,
              description: item.description || 'No description',
              hsnCode: item.hsnCode || null,
              quantity: item.quantity || 0,
              unit: item.unit || 'NOS',
              rate: item.rate || 0,
              discountPercent: item.discountPercent || 0,
              discountAmount: item.discountAmount || 0,
              taxableAmount: item.taxableAmount || 0,
              cgstRate: item.cgstRate || 0,
              cgstAmount: item.cgstAmount || 0,
              sgstRate: item.sgstRate || 0,
              sgstAmount: item.sgstAmount || 0,
              igstRate: item.igstRate || 0,
              igstAmount: item.igstAmount || 0,
              cessRate: item.cessRate || 0,
              cessAmount: item.cessAmount || 0,
              totalAmount: item.totalAmount || 0,
            })),
          },
        },
        include: { items: true }
      });

      // Decrement stock for new items
      for (const item of data.items) {
        if (item.itemId) {
          await tx.item.update({
            where: { id: item.itemId },
            data: { currentStock: { decrement: item.quantity } }
          });
        }
      }

      return updatedInvoice;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.put('/:id/status', async (req, res, next) => {
  try {
    const data = updateStatusSchema.parse(req.body);
    
    const check = await prisma.invoice.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });
    if (!check) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: { status: data.status },
    });

    res.json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/payment', async (req, res, next) => {
  try {
    const data = recordPaymentSchema.parse(req.body);

    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    if (data.amount > invoice.balanceDue) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount exceeds balance due',
        data: { balanceDue: invoice.balanceDue },
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const newPaidAmount = invoice.paidAmount + data.amount;
      const newBalanceDue = invoice.totalAmount - newPaidAmount;

      await tx.invoice.update({
        where: { id: req.params.id },
        data: {
          paidAmount: Math.round(newPaidAmount * 100) / 100,
          balanceDue: Math.round(Math.max(0, newBalanceDue) * 100) / 100,
          status: newBalanceDue <= 0.01 ? 'PAID' : 'PARTIAL',
        },
      });

      await tx.transaction.create({
        data: {
          businessId: invoice.businessId,
          date: new Date(data.date),
          type: 'RECEIPT',
          partyId: invoice.partyId,
          amount: data.amount,
          balance: newBalanceDue,
          reference: data.reference,
          narration: `Payment for invoice ${invoice.invoiceNumber}`,
          bankAccountId: data.bankAccountId,
          cashAccountId: data.cashAccountId,
        },
      });

      if (data.bankAccountId) {
        await tx.bankAccount.update({
          where: { id: data.bankAccountId },
          data: { currentBalance: { increment: data.amount } },
        });
      }

      if (data.cashAccountId) {
        await tx.cashAccount.update({
          where: { id: data.cashAccountId },
          data: { currentBalance: { increment: data.amount } },
        });
      }

      return { newPaidAmount, newBalanceDue, paymentMethod: data.paymentMethod };
    });

    res.json({
      success: true,
      message: 'Payment recorded successfully',
      data: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: invoice.totalAmount,
        paidAmount: result.newPaidAmount,
        balanceDue: result.newBalanceDue,
        status: result.newBalanceDue <= 0 ? 'PAID' : 'PARTIAL',
      },
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
