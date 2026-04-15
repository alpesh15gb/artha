import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { verifyBusinessOwnership } from '../middleware/businessAuth.js';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(verifyBusinessOwnership);

router.get('/business/:businessId/party-ledger', async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const { partyId, fromDate, toDate } = req.query;

    const party = await prisma.party.findUnique({ where: { id: partyId } });
    if (!party) return res.status(404).json({ success: false, message: 'Party not found' });

    const transactions = await prisma.transaction.findMany({
      where: {
        businessId,
        partyId,
        ...(fromDate && { date: { gte: new Date(fromDate) } }),
        ...(toDate && { date: { lte: new Date(toDate) } }),
      },
      orderBy: { date: 'asc' },
    });

    const invoices = await prisma.invoice.findMany({
      where: {
        businessId,
        partyId,
        status: { in: ['PAID', 'PARTIAL', 'SENT'] },
      },
    });

    let balance = party.openingBalance;
    const ledger = transactions.map(t => {
      balance += t.amount;
      return { ...t, runningBalance: balance };
    });

    const totals = invoices.reduce(
      (acc, inv) => ({
        totalBilled: acc.totalBilled + inv.totalAmount,
        totalPaid: acc.totalPaid + inv.paidAmount,
      }),
      { totalBilled: 0, totalPaid: 0 }
    );

    res.json({
      success: true,
      data: {
        party,
        openingBalance: party.openingBalance,
        ledger,
        closingBalance: balance,
        totals,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/business/:businessId/gst-summary', async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const { fromDate, toDate } = req.query;

    const where = {
      businessId,
      status: { in: ['PAID', 'PARTIAL', 'SENT'] },
      ...(fromDate && { date: { gte: new Date(fromDate) } }),
      ...(toDate && { date: { lte: new Date(toDate) } }),
    };

    const invoices = await prisma.invoice.findMany({
      where,
      include: { party: true },
    });

    const summary = invoices.reduce(
      (acc, inv) => ({
        totalSales: acc.totalSales + inv.subtotal,
        cgst: acc.cgst + inv.cgstAmount,
        sgst: acc.sgst + inv.sgstAmount,
        igst: acc.igst + inv.igstAmount,
        cess: acc.cess + inv.cessAmount,
        taxAmount: acc.taxAmount + inv.cgstAmount + inv.sgstAmount + inv.igstAmount + inv.cessAmount,
        invoiceCount: acc.invoiceCount + 1,
      }),
      { totalSales: 0, cgst: 0, sgst: 0, igst: 0, cess: 0, taxAmount: 0, invoiceCount: 0 }
    );

    const igstInvoices = invoices.filter(inv => inv.igstAmount > 0);
    const cgstInvoices = invoices.filter(inv => inv.cgstAmount > 0);

    res.json({
      success: true,
      data: {
        ...summary,
        igstInvoices: igstInvoices.length,
        cgstInvoices: cgstInvoices.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/business/:businessId/profit-loss', async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const { fromDate, toDate } = req.query;

    const invoices = await prisma.invoice.findMany({
      where: {
        businessId,
        status: { in: ['PAID', 'PARTIAL', 'SENT'] },
        ...(fromDate && { date: { gte: new Date(fromDate) } }),
        ...(toDate && { date: { lte: new Date(toDate) } }),
      },
    });

    const expenses = await prisma.expense.findMany({
      where: {
        businessId,
        status: 'PAID',
        ...(fromDate && { date: { gte: new Date(fromDate) } }),
        ...(toDate && { date: { lte: new Date(toDate) } }),
      },
    });

    const totalSales = invoices.reduce((sum, inv) => sum + inv.subtotal, 0);
    const totalTax = invoices.reduce((sum, inv) => sum + inv.cgstAmount + inv.sgstAmount + inv.igstAmount, 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.totalAmount, 0);
    const totalDiscounts = invoices.reduce((sum, inv) => sum + inv.discountAmount, 0);

    res.json({
      success: true,
      data: {
        totalSales,
        totalTax,
        totalDiscounts,
        netSales: totalSales - totalDiscounts,
        totalExpenses,
        grossProfit: totalSales - totalDiscounts,
        netProfit: totalSales - totalDiscounts - totalExpenses,
        invoiceCount: invoices.length,
        expenseCount: expenses.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/business/:businessId/party-balance-summary', async (req, res, next) => {
  try {
    const { businessId } = req.params;

    const parties = await prisma.party.findMany({
      where: { businessId, isActive: true },
      include: {
        invoices: {
          where: { status: { in: ['PAID', 'PARTIAL', 'SENT'] } },
        },
      },
    });

    const summary = parties.map(party => {
      const totalBilled = party.invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      const totalPaid = party.invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
      const currentBalance = totalBilled - totalPaid;
      const totalBalance = party.openingBalance + currentBalance;

      return {
        id: party.id,
        name: party.name,
        partyType: party.partyType,
        balanceType: party.balanceType,
        openingBalance: party.openingBalance,
        currentBalance,
        totalBalance,
      };
    });

    const totals = summary.reduce(
      (acc, p) => ({
        receivable: acc.receivable + (p.balanceType === 'RECEIVABLE' ? p.totalBalance : 0),
        payable: acc.payable + (p.balanceType === 'PAYABLE' ? p.totalBalance : 0),
      }),
      { receivable: 0, payable: 0 }
    );

    res.json({
      success: true,
      data: {
        parties: summary,
        totals,
        netBalance: totals.receivable - totals.payable,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
