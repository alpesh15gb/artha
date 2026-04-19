import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { verifyBusinessOwnership } from '../middleware/businessAuth.js';

const router = Router();

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
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  pincode: z.string().optional().nullable(),
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

    const [partiesData, total] = await Promise.all([
      prisma.party.findMany({
        where,
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { invoices: true, purchases: true, transactions: true } }
        },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.party.count({ where }),
    ]);

    // Calculate balances for each party
    const parties = await Promise.all(partiesData.map(async (party) => {
      const [invoices, purchases, transactions] = await Promise.all([
        prisma.invoice.aggregate({
          where: { partyId: party.id, status: { in: ['PAID', 'PARTIAL', 'SENT', 'DRAFT'] } },
          _sum: { totalAmount: true },
        }),
        prisma.purchase.aggregate({
          where: { partyId: party.id, status: { in: ['PAID', 'PARTIAL', 'RECEIVED'] } },
          _sum: { totalAmount: true },
        }),
        prisma.transaction.findMany({
          where: { partyId: party.id },
        }),
      ]);

      const totalInvoiced = invoices._sum.totalAmount || 0;
      const totalPurchased = purchases._sum.totalAmount || 0;
      const receipts = transactions.filter(t => t.type === 'RECEIPT').reduce((sum, t) => sum + t.amount, 0);
      const payments = transactions.filter(t => t.type === 'PAYMENT').reduce((sum, t) => sum + t.amount, 0);

      const opening = party.balanceType === 'RECEIVABLE' ? party.openingBalance : -party.openingBalance;
      const netBalance = opening + totalInvoiced + payments - totalPurchased - receipts;

      return {
        ...party,
        currentBalance: netBalance,
        displayBalance: Math.abs(netBalance),
        currentBalanceType: netBalance >= 0 ? 'RECEIVABLE' : 'PAYABLE'
      };
    }));

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
    const body = createPartySchema.parse(req.body);
    
    // Sync billingAddress JSON with scalar fields if not provided
    if (!body.billingAddress && body.address) {
      body.billingAddress = {
        street: body.address,
        city: body.city || '',
        state: body.state || '',
        pincode: body.pincode || ''
      };
    } else if (body.billingAddress && !body.address) {
      body.address = body.billingAddress.street || '';
      body.city = body.billingAddress.city || '';
      body.state = body.billingAddress.state || '';
      body.pincode = body.billingAddress.pincode || '';
    }

    const party = await prisma.party.create({
      data: body,
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

    // Sync billingAddress JSON with scalar fields
    if (data.address || data.city || data.state || data.pincode) {
      // If scalar fields are provided, update billingAddress JSON part
      const current = await prisma.party.findUnique({ where: { id: req.params.id }, select: { billingAddress: true } });
      const existingAddress = (current?.billingAddress && typeof current.billingAddress === 'object') ? current.billingAddress : {};
      
      data.billingAddress = {
        ...existingAddress,
        ...(data.address && { street: data.address }),
        ...(data.city && { city: data.city }),
        ...(data.state && { state: data.state }),
        ...(data.pincode && { pincode: data.pincode })
      };
    } else if (data.billingAddress && typeof data.billingAddress === 'object') {
       // If billingAddress JSON is provided, sync scalars back
       const ba = data.billingAddress;
       if (ba.street) data.address = ba.street;
       if (ba.city) data.city = ba.city;
       if (ba.state) data.state = ba.state;
       if (ba.pincode) data.pincode = ba.pincode;
    }

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

    const [invoices, purchases, transactions] = await Promise.all([
      prisma.invoice.aggregate({
        where: { partyId: req.params.id, status: { in: ['PAID', 'PARTIAL', 'SENT', 'DRAFT'] } },
        _sum: { totalAmount: true, paidAmount: true },
      }),
      prisma.purchase.aggregate({
        where: { partyId: req.params.id, status: { in: ['PAID', 'PARTIAL', 'RECEIVED'] } },
        _sum: { totalAmount: true, paidAmount: true },
      }),
      prisma.transaction.findMany({
        where: { partyId: req.params.id },
      }),
    ]);

    const totalInvoiced = invoices._sum.totalAmount || 0;
    const totalInvPaid = invoices._sum.paidAmount || 0;
    const totalPurchased = purchases._sum.totalAmount || 0;
    const totalPurPaid = purchases._sum.paidAmount || 0;

    const receipts = transactions
      .filter(t => t.type === 'RECEIPT')
      .reduce((sum, t) => sum + t.amount, 0);
    const payments = transactions
      .filter(t => t.type === 'PAYMENT')
      .reduce((sum, t) => sum + t.amount, 0);

    const isReceivable = party.balanceType === 'RECEIVABLE';

    // Balance Formula: 
    // If Receivable (Customer): Opening + Total Invoiced - (Total Inv Paid + Receipts)
    // If Payable (Supplier): Opening + Total Purchased - (Total Pur Paid + Payments)
    
    // However, a party can be BOTH. So we combine everything:
    // Net Balance = (Opening if Dr) + Invoices + Payments - Purchases - Receipts
    
    const opening = party.balanceType === 'RECEIVABLE' ? party.openingBalance : -party.openingBalance;
    const netBalance = opening + totalInvoiced + payments - totalPurchased - receipts;

    res.json({
      success: true,
      data: {
        id: req.params.id,
        balanceType: party.balanceType,
        openingBalance: party.openingBalance,
        totalInvoiced,
        totalPurchased,
        totalReceipts: receipts,
        totalPayments: payments,
        netBalance,
        displayBalance: Math.abs(netBalance),
        status: netBalance >= 0 ? 'RECEIVABLE' : 'PAYABLE'
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/ledger', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fromDate, toDate } = req.query;

    const where = {
      partyId: id,
      ...(fromDate && toDate && {
        date: {
          gte: new Date(fromDate),
          lte: new Date(toDate),
        },
      }),
    };

    const [invoices, purchases, transactions, party] = await Promise.all([
      prisma.invoice.findMany({ where, orderBy: { date: 'desc' } }),
      prisma.purchase.findMany({ where, orderBy: { date: 'desc' } }),
      prisma.transaction.findMany({ where, orderBy: { date: 'desc' } }),
      prisma.party.findUnique({ where: { id } })
    ]);

    // Format them into a unified ledger structure
    const ledger = [
      ...invoices.map(i => ({ id: i.id, date: i.date, type: 'INVOICE', ref: i.invoiceNumber, amount: i.totalAmount, balance: i.balanceDue, status: i.status })),
      ...purchases.map(p => ({ id: p.id, date: p.date, type: 'PURCHASE', ref: p.purchaseNumber, amount: p.totalAmount, balance: p.balanceDue, status: p.status })),
      ...transactions.map(t => ({ id: t.id, date: t.date, type: t.type, ref: t.reference, amount: t.amount, balance: 0, status: 'DONE' }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      data: {
        party,
        ledger
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
