import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { verifyBusinessOwnership } from '../middleware/businessAuth.js';

const router = Router();

router.use(authenticate);
router.use(verifyBusinessOwnership);

const updateSettingsSchema = z.object({
  currency: z.string().optional().nullable(),
  currencySymbol: z.string().optional().nullable(),
  currencyPosition: z.enum(['prefix', 'suffix']).optional().nullable(),
  decimalPlaces: z.number().min(0).max(4).optional(),
  thousandsSeparator: z.string().optional().nullable(),
  dateFormat: z.string().optional().nullable(),
  timeZone: z.string().optional().nullable(),
  invoicePrefix: z.string().optional().nullable(),
  invoiceStartNumber: z.number().optional(),
  estimatePrefix: z.string().optional().nullable(),
  estimateStartNumber: z.number().optional(),
  receiptPrefix: z.string().optional().nullable(),
  receiptStartNumber: z.number().optional(),
  paymentPrefix: z.string().optional().nullable(),
  paymentStartNumber: z.number().optional(),
  purchasePrefix: z.string().optional().nullable(),
  purchaseStartNumber: z.number().optional(),
  voucherPrefix: z.string().optional().nullable(),
  invoiceNumberFormat: z.string().optional().nullable(),
  autoNumbering: z.boolean().optional(),
  enableGst: z.boolean().optional(),
  gstRegistrationType: z.string().optional().nullable(),
  stateCode: z.string().optional().nullable(),
  defaultTaxRate: z.number().optional(),
  cgstRate: z.number().optional(),
  sgstRate: z.number().optional(),
  igstRate: z.number().optional(),
  cessRate: z.number().optional(),
  enableReverseCharge: z.boolean().optional(),
  enableEInvoice: z.boolean().optional(),
  eInvoiceUsername: z.string().optional().nullable(),
  eInvoicePassword: z.string().optional().nullable(),
  eInvoiceGstin: z.string().optional().nullable(),
  enableEWayBill: z.boolean().optional(),
  defaultHsnCode: z.string().optional().nullable(),
  businessType: z.string().optional().nullable(),
  businessCategory: z.string().optional().nullable(),
  msmeNumber: z.string().optional().nullable(),
  ludNo: z.string().optional().nullable(),
  sezUnit: z.boolean().optional(),
  defaultPaymentTerms: z.number().optional(),
  defaultDueDays: z.number().optional(),
  defaultInvoiceTerms: z.string().optional().nullable(),
  defaultInvoiceNotes: z.string().optional().nullable(),
  showQrCode: z.boolean().optional(),
  showBankDetails: z.boolean().optional(),
  showSignature: z.boolean().optional(),
  showHsnCode: z.boolean().optional(),
  showQuantity: z.boolean().optional(),
  showRate: z.boolean().optional(),
  showDiscount: z.boolean().optional(),
  showTaxBreakup: z.boolean().optional(),
  invoiceTemplate: z.string().optional().nullable(),
  themeColor: z.string().optional().nullable(),
  fontFamily: z.string().optional().nullable(),
  footerMessage: z.string().optional().nullable(),
  emailOnInvoiceCreate: z.boolean().optional(),
  emailOnPaymentReceive: z.boolean().optional(),
  emailOnInvoiceOverdue: z.boolean().optional(),
  reminderDays: z.number().optional(),
  reminderFrequency: z.number().optional(),
  autoEmailStatements: z.boolean().optional(),
  statementFrequency: z.string().optional().nullable(),
  emailCC: z.string().optional().nullable(),
  defaultBankAccountId: z.string().optional().nullable(),
  defaultCashAccountId: z.string().optional().nullable(),
  financialYearStart: z.string().optional().nullable(),
  enableFinancialLock: z.boolean().optional(),
  lockDate: z.string().datetime().optional().nullable(),
  requireApproval: z.boolean().optional(),
  allowEditAfterSend: z.boolean().optional(),
  razorpayKeyId: z.string().optional().nullable(),
  razorpayKeySecret: z.string().optional().nullable(),
  enableOnlinePayments: z.boolean().optional(),
  upiId: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  legalName: z.string().optional().nullable(),
  gstin: z.string().optional().nullable(),
  pan: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  address: z.any().optional().nullable(),
});

router.get('/:businessId/next-number/:type', async (req, res, next) => {
  try {
    const { businessId, type } = req.params;
    const settings = await prisma.businessSettings.findUnique({
      where: { businessId }
    });

    if (!settings) return res.status(404).json({ success: false, message: 'Settings not found' });

    let prefix = '';
    let startNumber = 1;
    let count = 0;

    switch (type.toLowerCase()) {
      case 'invoice':
        prefix = settings.invoicePrefix || 'INV';
        startNumber = settings.invoiceStartNumber || 1;
        count = await prisma.invoice.count({ where: { businessId } });
        break;
      case 'estimate':
        prefix = settings.estimatePrefix || 'EST';
        startNumber = settings.estimateStartNumber || 1;
        count = await prisma.estimate.count({ where: { businessId } });
        break;
      case 'purchase':
        prefix = settings.purchasePrefix || 'PUR';
        startNumber = settings.purchaseStartNumber || 1;
        count = await prisma.purchase.count({ where: { businessId } });
        break;
      case 'payment':
        prefix = settings.paymentPrefix || 'PAY';
        startNumber = settings.paymentStartNumber || 1;
        count = await prisma.payment.count({ where: { businessId } });
        break;
      case 'receipt':
        prefix = settings.receiptPrefix || 'RCP';
        startNumber = settings.receiptStartNumber || 1;
        count = await prisma.receipt.count({ where: { businessId } });
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid document type' });
    }

    // Find the highest existing number to ensure true sequencing
    let lastRecord = null;
    switch (type.toLowerCase()) {
      case 'invoice':
        lastRecord = await prisma.invoice.findFirst({
          where: { businessId },
          orderBy: { createdAt: 'desc' },
          select: { invoiceNumber: true }
        });
        break;
      case 'purchase':
        lastRecord = await prisma.purchase.findFirst({
          where: { businessId },
          orderBy: { createdAt: 'desc' },
          select: { purchaseNumber: true }
        });
        break;
      case 'estimate':
        lastRecord = await prisma.estimate.findFirst({
          where: { businessId },
          orderBy: { createdAt: 'desc' },
          select: { estimateNumber: true }
        });
        break;
      case 'payment':
        lastRecord = await prisma.payment.findFirst({
          where: { businessId },
          orderBy: { createdAt: 'desc' },
          select: { referenceNo: true }
        });
        break;
    }

    let nextSeq = startNumber;
    if (lastRecord) {
      const numStr = lastRecord.invoiceNumber || lastRecord.purchaseNumber || lastRecord.estimateNumber || lastRecord.referenceNo || '';
      const match = numStr.match(/\d+$/);
      if (match) {
        nextSeq = Math.max(startNumber, parseInt(match[0]) + 1);
      } else {
        nextSeq = startNumber + count;
      }
    } else {
      nextSeq = startNumber;
    }

    const formattedNumber = `${prefix}-${String(nextSeq).padStart(5, '0')}`;
    res.json({ success: true, data: { nextNumber: formattedNumber, prefix, sequence: nextSeq } });
  } catch (error) {
    next(error);
  }
});

router.get('/:businessId', async (req, res, next) => {
  try {
    const settings = await prisma.businessSettings.findUnique({
      where: { businessId: req.params.businessId },
      include: {
        taxRates: { where: { isActive: true }, orderBy: { rate: 'asc' } },
        accounts: { where: { isActive: true }, orderBy: { name: 'asc' } },
        emailTemplates: { where: { isActive: true } },
      },
    });

    if (!settings) {
      const newSettings = await prisma.businessSettings.create({
        data: { businessId: req.params.businessId },
        include: {
          taxRates: true,
          accounts: true,
          emailTemplates: true,
        },
      });
      // Fetch business info to merge
      const business = await prisma.business.findUnique({ 
        where: { id: req.params.businessId }, 
        select: { 
          name: true, legalName: true, gstin: true, pan: true, 
          phone: true, email: true, website: true, upiId: true, 
          signatureImage: true 
        } 
      });
      return res.json({ success: true, data: { ...newSettings, ...business } });
    }

    const business = await prisma.business.findUnique({ 
      where: { id: req.params.businessId }, 
      select: { 
        name: true, legalName: true, gstin: true, pan: true, 
        phone: true, email: true, website: true, upiId: true, 
        address: true, // Included address
        signatureImage: true 
      } 
    });
    res.json({ success: true, data: { ...settings, ...business } });
  } catch (error) {
    next(error);
  }
});

router.put('/:businessId', async (req, res, next) => {
  try {
    const data = updateSettingsSchema.parse(req.body);
    const businessFields = ['name', 'legalName', 'gstin', 'pan', 'phone', 'email', 'website', 'upiId', 'address'];
    
    // Separate settings data from business data
    const settingsData = { ...data };
    const businessUpdate = {};
    
    businessFields.forEach(field => {
      if (data[field] !== undefined) {
        businessUpdate[field] = data[field];
        delete settingsData[field]; // Remove from settingsData so Prisma doesn't complain
      }
    });

    const settings = await prisma.businessSettings.upsert({
      where: { businessId: req.params.businessId },
      create: { businessId: req.params.businessId, ...settingsData },
      update: settingsData,
    });

    if (Object.keys(businessUpdate).length > 0) {
      await prisma.business.update({
        where: { id: req.params.businessId },
        data: businessUpdate,
      });
    }

    const business = await prisma.business.findUnique({ 
      where: { id: req.params.businessId }, 
      select: { 
        name: true, legalName: true, gstin: true, pan: true, 
        phone: true, email: true, website: true, upiId: true, 
        signatureImage: true 
      } 
    });

    await prisma.auditLog.create({
      data: {
        businessId: req.params.businessId,
        userId: req.user.id,
        action: 'UPDATE',
        entityType: 'BusinessSettings',
        entityId: settings.id,
        newValue: data,
      },
    });

    res.json({ success: true, data: { ...settings, ...business } });
  } catch (error) {
    next(error);
  }
});

router.get('/:businessId/tax-rates', async (req, res, next) => {
  try {
    const taxRates = await prisma.taxRate.findMany({
      where: { businessId: req.params.businessId, isActive: true },
      orderBy: { rate: 'asc' },
    });
    res.json({ success: true, data: taxRates });
  } catch (error) {
    next(error);
  }
});

router.post('/:businessId/tax-rates', async (req, res, next) => {
  try {
    const { name, rate, cgstRate, sgstRate, igstRate, cessRate, hsnCode, description, isDefault } = req.body;

    if (isDefault) {
      await prisma.taxRate.updateMany({
        where: { businessId: req.params.businessId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const taxRate = await prisma.taxRate.create({
      data: {
        businessId: req.params.businessId,
        name,
        rate: rate || cgstRate + sgstRate || 0,
        cgstRate: cgstRate || 0,
        sgstRate: sgstRate || 0,
        igstRate: igstRate || 0,
        cessRate: cessRate || 0,
        hsnCode,
        description,
        isDefault: isDefault || false,
      },
    });

    res.status(201).json({ success: true, data: taxRate });
  } catch (error) {
    next(error);
  }
});

router.put('/:businessId/tax-rates/:id', async (req, res, next) => {
  try {
    const { name, rate, cgstRate, sgstRate, igstRate, cessRate, hsnCode, description, isDefault, isActive } = req.body;

    if (isDefault) {
      await prisma.taxRate.updateMany({
        where: { businessId: req.params.businessId, isDefault: true, id: { not: req.params.id } },
        data: { isDefault: false },
      });
    }

    const taxRate = await prisma.taxRate.update({
      where: { id: req.params.id, businessId: req.params.businessId },
      data: {
        name,
        rate,
        cgstRate,
        sgstRate,
        igstRate,
        cessRate,
        hsnCode,
        description,
        isDefault,
        isActive,
      },
    });

    res.json({ success: true, data: taxRate });
  } catch (error) {
    next(error);
  }
});

router.delete('/:businessId/tax-rates/:id', async (req, res, next) => {
  try {
    await prisma.taxRate.update({
      where: { id: req.params.id, businessId: req.params.businessId },
      data: { isActive: false },
    });
    res.json({ success: true, message: 'Tax rate deleted' });
  } catch (error) {
    next(error);
  }
});

router.get('/:businessId/accounts', async (req, res, next) => {
  try {
    const { type, search } = req.query;

    const accounts = await prisma.account.findMany({
      where: {
        businessId: req.params.businessId,
        isActive: true,
        ...(type && { type }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { children: true } },
      },
    });

    const grouped = {
      ASSET: accounts.filter(a => a.type === 'ASSET'),
      LIABILITY: accounts.filter(a => a.type === 'LIABILITY'),
      EQUITY: accounts.filter(a => a.type === 'EQUITY'),
      INCOME: accounts.filter(a => ['INCOME', 'DIRECT_INCOME', 'INDIRECT_INCOME'].includes(a.type)),
      EXPENSE: accounts.filter(a => ['EXPENSE', 'DIRECT_EXPENSE', 'INDIRECT_EXPENSE'].includes(a.type)),
    };

    res.json({ success: true, data: accounts, grouped });
  } catch (error) {
    next(error);
  }
});

router.post('/:businessId/accounts', async (req, res, next) => {
  try {
    const { code, name, type, subType, parentId, openingBalance, isBankAccount, isCashAccount, bankName, accountNumber, ifscCode, gstApplicable, description } = req.body;

    const account = await prisma.account.create({
      data: {
        businessId: req.params.businessId,
        code,
        name,
        type,
        subType,
        parentId,
        openingBalance: openingBalance || 0,
        balance: openingBalance || 0,
        isBankAccount,
        isCashAccount,
        bankName,
        accountNumber,
        ifscCode,
        gstApplicable,
        description,
      },
    });

    res.status(201).json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
});

router.put('/:businessId/accounts/:id', async (req, res, next) => {
  try {
    const data = req.body;

    const account = await prisma.account.update({
      where: { id: req.params.id, businessId: req.params.businessId },
      data,
    });

    res.json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
});

router.delete('/:businessId/accounts/:id', async (req, res, next) => {
  try {
    await prisma.account.update({
      where: { id: req.params.id, businessId: req.params.businessId },
      data: { isActive: false },
    });
    res.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    next(error);
  }
});

router.post('/:businessId/accounts/initialize', async (req, res, next) => {
  try {
    const businessId = req.params.businessId;
    const existingAccounts = await prisma.account.count({ where: { businessId } });

    if (existingAccounts > 0) {
      return res.status(400).json({ success: false, message: 'Accounts already initialized' });
    }

    const defaultAccounts = [
      { code: 'CASH', name: 'Cash Account', type: 'ASSET', subType: 'Current Asset', isCashAccount: true },
      { code: 'BANK', name: 'Bank Account', type: 'ASSET', subType: 'Current Asset', isBankAccount: true },
      { code: 'SALES', name: 'Sales Account', type: 'INCOME', subType: 'Direct Income' },
      { code: 'PURCHASE', name: 'Purchase Account', type: 'EXPENSE', subType: 'Direct Expense' },
      { code: 'SUNDRY-DEBTORS', name: 'Sundry Debtors', type: 'ASSET', subType: 'Current Asset' },
      { code: 'SUNDRY-CREDITORS', name: 'Sundry Creditors', type: 'LIABILITY', subType: 'Current Liability' },
      { code: 'CGST', name: 'CGST Payable', type: 'LIABILITY', subType: 'Current Liability' },
      { code: 'SGST', name: 'SGST Payable', type: 'LIABILITY', subType: 'Current Liability' },
      { code: 'IGST', name: 'IGST Payable', type: 'LIABILITY', subType: 'Current Liability' },
      { code: 'CREDITORS', name: 'Capital Account', type: 'EQUITY', subType: 'Capital' },
      { code: 'RENT', name: 'Rent Expense', type: 'EXPENSE', subType: 'Indirect Expense' },
      { code: 'SALARY', name: 'Salaries & Wages', type: 'EXPENSE', subType: 'Indirect Expense' },
      { code: 'STATIONERY', name: 'Stationery & Printing', type: 'EXPENSE', subType: 'Indirect Expense' },
      { code: 'TELEPHONE', name: 'Telephone & Internet', type: 'EXPENSE', subType: 'Indirect Expense' },
      { code: 'TRAVEL', name: 'Travelling Expense', type: 'EXPENSE', subType: 'Indirect Expense' },
      { code: 'COMMISSION', name: 'Commission Paid', type: 'EXPENSE', subType: 'Indirect Expense' },
      { code: 'INTEREST', name: 'Interest Paid', type: 'EXPENSE', subType: 'Indirect Expense' },
      { code: 'REPAIRS', name: 'Repairs & Maintenance', type: 'EXPENSE', subType: 'Indirect Expense' },
      { code: 'DEPRECIATION', name: 'Depreciation', type: 'EXPENSE', subType: 'Indirect Expense' },
      { code: 'INSURANCE', name: 'Insurance Premium', type: 'EXPENSE', subType: 'Indirect Expense' },
    ];

    await prisma.account.createMany({
      data: defaultAccounts.map(acc => ({ ...acc, businessId })),
    });

    res.json({ success: true, message: 'Default accounts created', data: defaultAccounts.length });
  } catch (error) {
    next(error);
  }
});

router.get('/:businessId/email-templates', async (req, res, next) => {
  try {
    const { type } = req.query;
    const templates = await prisma.emailTemplate.findMany({
      where: { businessId: req.params.businessId, isActive: true, ...(type && { type }) },
    });
    res.json({ success: true, data: templates });
  } catch (error) {
    next(error);
  }
});

router.post('/:businessId/email-templates', async (req, res, next) => {
  try {
    const { type, name, subject, body, isDefault } = req.body;

    if (isDefault) {
      await prisma.emailTemplate.updateMany({
        where: { businessId: req.params.businessId, type, isDefault: true },
        data: { isDefault: false },
      });
    }

    const template = await prisma.emailTemplate.create({
      data: {
        businessId: req.params.businessId,
        type,
        name,
        subject,
        body,
        isDefault: isDefault || false,
      },
    });

    res.status(201).json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
});

router.put('/:businessId/email-templates/:id', async (req, res, next) => {
  try {
    const { name, subject, body, isDefault, isActive } = req.body;

    const template = await prisma.emailTemplate.update({
      where: { id: req.params.id, businessId: req.params.businessId },
      data: { name, subject, body, isDefault, isActive },
    });

    res.json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
});

router.delete('/:businessId/email-templates/:id', async (req, res, next) => {
  try {
    await prisma.emailTemplate.update({
      where: { id: req.params.id, businessId: req.params.businessId },
      data: { isActive: false },
    });
    res.json({ success: true, message: 'Template deleted' });
  } catch (error) {
    next(error);
  }
});

router.get('/:businessId/export', async (req, res, next) => {
  try {
    const businessId = req.params.businessId;
    const { format } = req.query;

    const data = await prisma.$transaction([
      prisma.business.findUnique({
        where: { id: businessId },
        include: { settings: true },
      }),
      prisma.party.findMany({ where: { businessId } }),
      prisma.item.findMany({ where: { businessId } }),
      prisma.invoice.findMany({
        where: { businessId },
        include: { items: true, party: true },
      }),
      prisma.purchase.findMany({
        where: { businessId },
        include: { items: true, party: true },
      }),
      prisma.expense.findMany({ where: { businessId } }),
      prisma.account.findMany({ where: { businessId } }),
      prisma.taxRate.findMany({ where: { businessId } }),
    ]);

    if (format === 'json') {
      res.json({ success: true, data, exportedAt: new Date().toISOString() });
    } else {
      res.json({ success: true, data, exportedAt: new Date().toISOString() });
    }
  } catch (error) {
    next(error);
  }
});

router.get('/:businessId/audit-logs', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, entityType } = req.query;

    const logs = await prisma.auditLog.findMany({
      where: { businessId: req.params.businessId, ...(entityType && { entityType }) },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    const userIds = [...new Set(logs.map(log => log.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true }
    });

    const userMap = users.reduce((acc, user) => ({ ...acc, [user.id]: user }), {});
    const enrichedLogs = logs.map(log => ({ ...log, user: userMap[log.userId] || null }));

    const total = await prisma.auditLog.count({ where: { businessId: req.params.businessId, ...(entityType && { entityType }) } });

    res.json({
      success: true,
      data: enrichedLogs,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
