import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middleware/auth.js";
import { verifyBusinessOwnership } from "../middleware/businessAuth.js";

const router = Router();
const prisma = new PrismaClient();
const INVOICE_REPORT_STATUSES = ["PAID", "PARTIAL", "SENT"];
const PURCHASE_REPORT_STATUSES = ["PAID", "PARTIAL", "RECEIVED"];

router.use(authenticate);
router.use(verifyBusinessOwnership);

router.get("/business/:businessId/dashboard", async (req, res, next) => {
  try {
    const { businessId } = req.params;

    const [
      totalInvoices,
      totalPurchases,
      totalExpenses,
      totalParties,
      totalItems,
      recentInvoices,
      recentExpenses,
      bankAccounts,
      cashAccounts,
    ] = await Promise.all([
      prisma.invoice.aggregate({
        where: {
          businessId,
          status: { in: INVOICE_REPORT_STATUSES },
        },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.purchase.aggregate({
        where: { businessId, status: { in: PURCHASE_REPORT_STATUSES } },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.expense.aggregate({
        where: { businessId, status: "PAID" },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.party.count({ where: { businessId, isActive: true } }),
      prisma.item.count({ where: { businessId, isActive: true } }),
      prisma.invoice.findMany({
        where: { businessId },
        orderBy: { date: "desc" },
        take: 5,
        include: { party: { select: { name: true } } },
      }),
      prisma.expense.findMany({
        where: { businessId },
        orderBy: { date: "desc" },
        take: 5,
      }),
      prisma.bankAccount.findMany({ where: { businessId } }),
      prisma.cashAccount.findMany({ where: { businessId } }),
    ]);

    const totalBankBalance = bankAccounts.reduce(
      (sum, acc) => sum + acc.currentBalance,
      0,
    );
    const totalCashBalance = cashAccounts.reduce(
      (sum, acc) => sum + acc.currentBalance,
      0,
    );

    const receivable = await prisma.invoice.aggregate({
      where: { businessId, status: "PARTIAL" },
      _sum: { balanceDue: true },
    });

    const payable = await prisma.purchase.aggregate({
      where: { businessId, status: { in: ["PARTIAL", "RECEIVED"] } },
      _sum: { balanceDue: true },
    });

    res.json({
      success: true,
      data: {
        totals: {
          invoices: {
            count: totalInvoices._count,
            amount: totalInvoices._sum.totalAmount || 0,
          },
          purchases: {
            count: totalPurchases._count,
            amount: totalPurchases._sum.totalAmount || 0,
          },
          expenses: {
            count: totalExpenses._count,
            amount: totalExpenses._sum.totalAmount || 0,
          },
          parties: totalParties,
          items: totalItems,
        },
        receivables: receivable._sum.balanceDue || 0,
        payables: payable._sum.balanceDue || 0,
        bankBalance: totalBankBalance,
        cashBalance: totalCashBalance,
        totalCash: totalBankBalance + totalCashBalance,
        recentInvoices,
        recentExpenses,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/business/:businessId/party-ledger", async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const { partyId, fromDate, toDate } = req.query;

    if (!partyId) {
      return res
        .status(400)
        .json({ success: false, message: "partyId is required" });
    }

    const party = await prisma.party.findUnique({ where: { id: partyId } });
    if (!party)
      return res
        .status(404)
        .json({ success: false, message: "Party not found" });

    const whereClause = {
      businessId,
      partyId,
      ...(fromDate && { date: { gte: new Date(fromDate) } }),
      ...(toDate && { date: { lte: new Date(toDate) } }),
    };

    const [transactions, invoices, purchases] = await Promise.all([
      prisma.transaction.findMany({
        where: whereClause,
        orderBy: { date: "asc" },
      }),
      prisma.invoice.findMany({
        where: {
          businessId,
          partyId,
          ...(fromDate && { date: { gte: new Date(fromDate) } }),
          ...(toDate && { date: { lte: new Date(toDate) } }),
        },
        orderBy: { date: "asc" },
      }),
      prisma.purchase.findMany({
        where: {
          businessId,
          partyId,
          ...(fromDate && { date: { gte: new Date(fromDate) } }),
          ...(toDate && { date: { lte: new Date(toDate) } }),
        },
        orderBy: { date: "asc" },
      }),
    ]);

    const rawEntries = [
      ...transactions.map((t) => ({
        id: t.id,
        date: new Date(t.date),
        type: t.type,
        description:
          t.narration ||
          t.reference ||
          (t.type === "RECEIPT" ? "Payment Received" : "Payment Made"),
        debit: t.type === "PAYMENT" ? t.amount : 0,
        credit: t.type === "RECEIPT" || t.type === "JOURNAL" ? t.amount : 0,
        originalRecord: t,
      })),
      ...invoices.map((inv) => ({
        id: inv.id,
        date: new Date(inv.date),
        type: "INVOICE",
        description: `Invoice ${inv.invoiceNumber}`,
        debit: inv.totalAmount,
        credit: 0,
        originalRecord: inv,
      })),
      ...purchases.map((pur) => ({
        id: pur.id,
        date: new Date(pur.date),
        type: "PURCHASE",
        description: `Purchase ${pur.purchaseNumber}`,
        debit: 0,
        credit: pur.totalAmount,
        originalRecord: pur,
      })),
    ];

    // Sort chronologically
    rawEntries.sort((a, b) => a.date - b.date);

    const ledgerEntries = [];
    let runningBalance = party.openingBalance || 0;
    const isReceivable = party.balanceType === "RECEIVABLE";

    rawEntries.forEach((entry) => {
      // Logic: Debit increases balance for receivables, Credit decreases it.
      // For payables, it's vice-versa. To keep it simple, we use a single sign convention:
      // Dr (+) and Cr (-) for customers, and vice-versa if we want, but let's stick to:
      // Balance = Opening + Total Debits - Total Credits
      runningBalance += entry.debit - entry.credit;

      ledgerEntries.push({
        ...entry,
        balance: runningBalance,
      });
    });

    const totals = ledgerEntries.reduce(
      (acc, entry) => ({
        totalDebit: acc.totalDebit + entry.debit,
        totalCredit: acc.totalCredit + entry.credit,
      }),
      { totalDebit: 0, totalCredit: 0 },
    );

    res.json({
      success: true,
      data: {
        party: {
          id: party.id,
          name: party.name,
          gstin: party.gstin,
          phone: party.phone,
          balanceType: party.balanceType,
        },
        openingBalance: party.openingBalance,
        ledger: ledgerEntries,
        closingBalance: runningBalance,
        totals: {
          ...totals,
          netFlow: totals.totalDebit - totals.totalCredit,
          closingBalance: runningBalance,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/business/:businessId/gst-summary", async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const { fromDate, toDate } = req.query;

    const dateFilter = {
      ...(fromDate && { date: { gte: new Date(fromDate) } }),
      ...(toDate && { date: { lte: new Date(toDate) } }),
    };

    const [invoices, purchases] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          businessId,
          status: { in: INVOICE_REPORT_STATUSES },
          ...dateFilter,
        },
        include: { party: true, items: true }, // Include items to avoid N+1
      }),
      prisma.purchase.findMany({
        where: {
          businessId,
          status: { in: PURCHASE_REPORT_STATUSES },
          ...dateFilter,
        },
        include: { party: true, items: true }, // Include items to avoid N+1
      }),
    ]);

    const salesSummary = invoices.reduce(
      (acc, inv) => ({
        totalSales: acc.totalSales + inv.subtotal,
        totalTaxableSales: acc.totalTaxableSales + inv.subtotal,
        cgstCollected: acc.cgstCollected + inv.cgstAmount,
        sgstCollected: acc.sgstCollected + inv.sgstAmount,
        igstCollected: acc.igstCollected + inv.igstAmount,
        cessCollected: acc.cessCollected + inv.cessAmount,
        invoiceCount: acc.invoiceCount + 1,
        totalTax:
          acc.totalTax +
          inv.cgstAmount +
          inv.sgstAmount +
          inv.igstAmount +
          inv.cessAmount,
      }),
      {
        totalSales: 0,
        totalTaxableSales: 0,
        cgstCollected: 0,
        sgstCollected: 0,
        igstCollected: 0,
        cessCollected: 0,
        invoiceCount: 0,
        totalTax: 0,
      },
    );

    const purchaseSummary = purchases.reduce(
      (acc, pur) => ({
        totalPurchases: acc.totalPurchases + pur.subtotal,
        totalTaxablePurchases: acc.totalTaxablePurchases + pur.subtotal,
        cgstPaid: acc.cgstPaid + pur.cgstAmount,
        sgstPaid: acc.sgstPaid + pur.sgstAmount,
        igstPaid: acc.igstPaid + pur.igstAmount,
        cessPaid: acc.cessPaid + pur.cessAmount,
        purchaseCount: acc.purchaseCount + 1,
        totalTax:
          acc.totalTax +
          pur.cgstAmount +
          pur.sgstAmount +
          pur.igstAmount +
          pur.cessAmount,
      }),
      {
        totalPurchases: 0,
        totalTaxablePurchases: 0,
        cgstPaid: 0,
        sgstPaid: 0,
        igstPaid: 0,
        cessPaid: 0,
        purchaseCount: 0,
        totalTax: 0,
      },
    );

    const b2bInvoices = invoices.filter((inv) => inv.party?.gstin);
    const b2cInvoices = invoices.filter((inv) => !inv.party?.gstin);
    const b2cLargeInvoices = b2cInvoices.filter(
      (inv) => inv.totalAmount >= 250000,
    );

    const hsnSummary = {};
    for (const inv of invoices) {
      for (const item of inv.items) {
        const hsn = item.hsnCode || "N/A";
        if (!hsnSummary[hsn]) {
          hsnSummary[hsn] = {
            hsnCode: hsn,
            taxableAmount: 0,
            cgstAmount: 0,
            sgstAmount: 0,
            igstAmount: 0,
            cessAmount: 0,
            quantity: 0,
          };
        }
        hsnSummary[hsn].taxableAmount += item.taxableAmount;
        hsnSummary[hsn].cgstAmount += item.cgstAmount;
        hsnSummary[hsn].sgstAmount += item.sgstAmount;
        hsnSummary[hsn].igstAmount += item.igstAmount;
        hsnSummary[hsn].cessAmount += item.cessAmount;
        hsnSummary[hsn].quantity += item.quantity;
      }
    }

    res.json({
      success: true,
      data: {
        period: { fromDate, toDate },
        sales: {
          ...salesSummary,
          b2bCount: b2bInvoices.length,
          b2cCount: b2cInvoices.length,
          b2bValue: b2bInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
          b2cValue: b2cInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
          b2cLargeCount: b2cLargeInvoices.length,
          b2bInvoices: b2bInvoices.map(inv => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            date: inv.date,
            partyName: inv.party?.name,
            partyGstin: inv.party?.gstin,
            totalAmount: inv.totalAmount,
            taxableAmount: inv.subtotal,
            cgst: inv.cgstAmount,
            sgst: inv.sgstAmount,
            igst: inv.igstAmount
          })),
          b2cInvoices: b2cInvoices.map(inv => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            date: inv.date,
            totalAmount: inv.totalAmount,
            taxableAmount: inv.subtotal,
            cgst: inv.cgstAmount,
            sgst: inv.sgstAmount,
            igst: inv.igstAmount
          }))
        },
        purchases: {
          ...purchaseSummary,
          invoices: purchases.map(pur => ({
            id: pur.id,
            purchaseNumber: pur.purchaseNumber,
            date: pur.date,
            partyName: pur.party?.name,
            partyGstin: pur.party?.gstin,
            totalAmount: pur.totalAmount,
            taxableAmount: pur.subtotal,
            cgst: pur.cgstAmount,
            sgst: pur.sgstAmount,
            igst: pur.igstAmount
          }))
        },
        hsnSummary: Object.values(hsnSummary),
        netTax: {
          cgst: salesSummary.cgstCollected - purchaseSummary.cgstPaid,
          sgst: salesSummary.sgstCollected - purchaseSummary.sgstPaid,
          igst: salesSummary.igstCollected - purchaseSummary.igstPaid,
          cess: salesSummary.cessCollected - purchaseSummary.cessPaid,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/business/:businessId/profit-loss", async (req, res, next) => {
  try {
    const { businessId } = req.params;
    let { fromDate, toDate, range } = req.query;

    if (range === "this-month") {
      const now = new Date();
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const dateFilter = {
      ...(fromDate && { date: { gte: new Date(fromDate) } }),
      ...(toDate && { date: { lte: new Date(toDate) } }),
    };

    console.log(`P&L Query for ${businessId}: Dates ${fromDate} to ${toDate}`);

    const [invoices, purchases, expenses] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          businessId,
          status: { in: INVOICE_REPORT_STATUSES },
          ...dateFilter,
        },
      }),
      prisma.purchase.findMany({
        where: {
          businessId,
          status: { in: PURCHASE_REPORT_STATUSES },
          ...dateFilter,
        },
      }),
      prisma.expense.findMany({
        where: { businessId, status: "PAID", ...dateFilter },
      }),
    ]);

    const totalSales = invoices.reduce((sum, inv) => sum + inv.subtotal, 0);
    const totalSalesTax = invoices.reduce(
      (sum, inv) => sum + inv.cgstAmount + inv.sgstAmount + inv.igstAmount,
      0,
    );
    const totalSalesDiscount = invoices.reduce(
      (sum, inv) => sum + inv.discountAmount,
      0,
    );
    const totalPurchases = purchases.reduce(
      (sum, pur) => sum + pur.subtotal,
      0,
    );
    const totalPurchaseTax = purchases.reduce(
      (sum, pur) => sum + pur.cgstAmount + pur.sgstAmount + pur.igstAmount,
      0,
    );
    const totalExpenses = expenses.reduce(
      (sum, exp) => sum + exp.totalAmount,
      0,
    );
    const totalExpenseTax = expenses.reduce(
      (sum, exp) => sum + exp.taxAmount,
      0,
    );

    const grossProfit = totalSales - totalSalesDiscount - totalPurchases;
    const netProfit = grossProfit - totalExpenses;

    res.json({
      success: true,
      data: {
        period: { fromDate, toDate },
        income: {
          sales: totalSales,
          taxCollected: totalSalesTax,
          discountGiven: totalSalesDiscount,
          netSales: totalSales - totalSalesDiscount,
        },
        expenses: {
          purchases: totalPurchases,
          taxPaid: totalPurchaseTax,
          operatingExpenses: totalExpenses,
          expenseTax: totalExpenseTax,
          totalExpenses: totalPurchases + totalExpenses,
        },
        profit: {
          grossProfit,
          netProfit,
          profitMargin:
            totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(2) : 0,
        },
        counts: {
          invoices: invoices.length,
          purchases: purchases.length,
          expenses: expenses.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get(
  "/business/:businessId/party-balance-summary",
  async (req, res, next) => {
    try {
      const { businessId } = req.params;
      const { type } = req.query;

      const where = {
        businessId,
        isActive: true,
        ...(type && { partyType: type }),
      };

      const parties = await prisma.party.findMany({
        where,
      });

      const [invoiceSums, purchaseSums, txnSums] = await Promise.all([
        prisma.invoice.groupBy({
          by: ["partyId"],
          where: {
            businessId,
            status: { in: INVOICE_REPORT_STATUSES },
          },
          _sum: { totalAmount: true, paidAmount: true },
        }),
        prisma.purchase.groupBy({
          by: ["partyId"],
          where: {
            businessId,
            status: { in: PURCHASE_REPORT_STATUSES },
          },
          _sum: { totalAmount: true, paidAmount: true },
        }),
        prisma.transaction.groupBy({
          by: ["partyId", "type"],
          where: { businessId },
          _sum: { amount: true },
        }),
      ]);

      const summary = parties.map((party) => {
        const invSum = invoiceSums.find((s) => s.partyId === party.id)
          ?._sum || { totalAmount: 0, paidAmount: 0 };
        const purSum = purchaseSums.find((s) => s.partyId === party.id)
          ?._sum || { totalAmount: 0, paidAmount: 0 };
        const receipts =
          txnSums.find((s) => s.partyId === party.id && s.type === "RECEIPT")
            ?._sum?.amount || 0;
        const payments =
          txnSums.find((s) => s.partyId === party.id && s.type === "PAYMENT")
            ?._sum?.amount || 0;

        const receivable = party.balanceType === "RECEIVABLE";
        const totalBilled = receivable
          ? invSum.totalAmount || 0
          : purSum.totalAmount || 0;
        const totalPaid = receivable
          ? (invSum.paidAmount || 0) + receipts
          : (purSum.paidAmount || 0) + payments;
        const balance = (party.openingBalance || 0) + totalBilled - totalPaid;

        return {
          id: party.id,
          name: party.name,
          gstin: party.gstin,
          phone: party.phone,
          partyType: party.partyType,
          balanceType: party.balanceType,
          openingBalance: party.openingBalance,
          totalBilled,
          totalPaid,
          closingBalance: balance,
          creditLimit: party.creditLimit,
          dueDays: party.dueDays,
        };
      });

      const totals = summary.reduce(
        (acc, p) => ({
          receivable:
            acc.receivable +
            (p.balanceType === "RECEIVABLE" ? p.closingBalance : 0),
          payable:
            acc.payable + (p.balanceType === "PAYABLE" ? p.closingBalance : 0),
          totalBilled: acc.totalBilled + p.totalBilled,
          totalPaid: acc.totalPaid + p.totalPaid,
        }),
        { receivable: 0, payable: 0, totalBilled: 0, totalPaid: 0 },
      );

      res.json({
        success: true,
        data: {
          parties: summary,
          totals: {
            ...totals,
            netBalance: totals.receivable - totals.payable,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get("/business/:businessId/trial-balance", async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const { fromDate, toDate } = req.query;

    const dateFilter = {
      ...(fromDate && { date: { gte: new Date(fromDate) } }),
      ...(toDate && { date: { lte: new Date(toDate) } }),
    };

    const [parties, bankAccounts, cashAccounts, invoiceAgg, purchaseAgg, txnAgg, expenseAgg] =
      await Promise.all([
        prisma.party.findMany({
          where: { businessId, isActive: true },
          select: { id: true, name: true, openingBalance: true, balanceType: true }
        }),
        prisma.bankAccount.findMany({ where: { businessId } }),
        prisma.cashAccount.findMany({ where: { businessId } }),
        prisma.invoice.groupBy({
          by: ['partyId'],
          where: { businessId, status: { in: INVOICE_REPORT_STATUSES }, ...dateFilter },
          _sum: { totalAmount: true, paidAmount: true, subtotal: true }
        }),
        prisma.purchase.groupBy({
          by: ['partyId'],
          where: { businessId, status: { in: PURCHASE_REPORT_STATUSES }, ...dateFilter },
          _sum: { totalAmount: true, paidAmount: true, subtotal: true }
        }),
        prisma.transaction.groupBy({
          by: ['partyId', 'type'],
          where: { businessId, ...dateFilter },
          _sum: { amount: true }
        }),
        prisma.expense.aggregate({
          where: { businessId, status: "PAID", ...dateFilter },
          _sum: { totalAmount: true }
        })
      ]);

    const sales = invoiceAgg.reduce((sum, s) => sum + (s._sum.subtotal || 0), 0);
    const purchasesTotal = purchaseAgg.reduce((sum, s) => sum + (s._sum.subtotal || 0), 0);
    const expensesTotal = expenseAgg._sum.totalAmount || 0;
    const salesReturns = 0;
    const directExpenses = 0;

    let sundryDebtors = 0;
    let sundryCreditors = 0;
    let advancesFromCustomers = 0;
    let advancesToSuppliers = 0;

    parties.forEach((party) => {
      const inv = invoiceAgg.find(s => s.partyId === party.id)?._sum || { totalAmount: 0, paidAmount: 0 };
      const pur = purchaseAgg.find(s => s.partyId === party.id)?._sum || { totalAmount: 0, paidAmount: 0 };
      const receipts = txnAgg.find(s => s.partyId === party.id && s.type === 'RECEIPT')?._sum?.amount || 0;
      const payments = txnAgg.find(s => s.partyId === party.id && s.type === 'PAYMENT')?._sum?.amount || 0;

      const receivable = party.balanceType === "RECEIVABLE";
      const billed = receivable ? inv.totalAmount : pur.totalAmount;
      const paid = receivable ? (inv.paidAmount + receipts) : (pur.paidAmount + payments);
      const balance = (party.openingBalance || 0) + billed - paid;

      if (balance > 0) {
        if (receivable) sundryDebtors += balance;
        else advancesFromCustomers += balance;
      } else if (balance < 0) {
        if (!receivable) sundryCreditors += Math.abs(balance);
        else advancesToSuppliers += Math.abs(balance);
      }
    });

    const bankBalance = bankAccounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);
    const cashBalance = cashAccounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);

    const indirectExpenses = expensesTotal;
    const netProfit = sales - salesReturns - purchasesTotal - directExpenses - indirectExpenses;

    const totalDebits = sundryDebtors + advancesToSuppliers + bankBalance + cashBalance + purchasesTotal + directExpenses + indirectExpenses;
    const totalCredits = sales + sundryCreditors + advancesFromCustomers + (netProfit > 0 ? netProfit : 0);
    const finalTotalCredits = totalCredits + (netProfit < 0 ? Math.abs(netProfit) : 0);
    // Adjusted netProfit logic for Trial Balance display
    const creditNetProfit = netProfit > 0 ? netProfit : 0;
    const debitNetLoss = netProfit < 0 ? Math.abs(netProfit) : 0;

    res.json({
      success: true,
      data: {
        period: { fromDate, toDate },
        ledgerAccounts: [
          { name: "Sales Account", type: "income", debit: 0, credit: sales },
          {
            name: "Sales Return",
            type: "expense",
            debit: salesReturns,
            credit: 0,
          },
          {
            name: "Purchases Account",
            type: "expense",
            debit: purchasesTotal,
            credit: 0,
          },
          {
            name: "Direct Expenses",
            type: "expense",
            debit: directExpenses,
            credit: 0,
          },
          {
            name: "Indirect Expenses",
            type: "expense",
            debit: indirectExpenses,
            credit: 0,
          },
          {
            name: "Sundry Debtors",
            type: "asset",
            debit: sundryDebtors,
            credit: 0,
          },
          {
            name: "Sundry Creditors",
            type: "liability",
            debit: 0,
            credit: sundryCreditors,
          },
          {
            name: "Advances from Customers",
            type: "liability",
            debit: 0,
            credit: advancesFromCustomers,
          },
          {
            name: "Advances to Suppliers",
            type: "asset",
            debit: advancesToSuppliers,
            credit: 0,
          },
          {
            name: "Bank Accounts",
            type: "asset",
            debit: bankBalance,
            credit: 0,
          },
          {
            name: "Cash in Hand",
            type: "asset",
            debit: cashBalance,
            credit: 0,
          },
          { name: "Net Profit / Loss", type: "income", debit: debitNetLoss, credit: creditNetProfit },
        ],
        totals: {
          totalDebits: totalDebits + debitNetLoss,
          totalCredits: totalCredits + (netProfit < 0 ? Math.abs(netProfit) : 0),
          isBalanced: Math.abs((totalDebits + debitNetLoss) - (totalCredits + (netProfit < 0 ? Math.abs(netProfit) : 0))) < 0.01,
          difference: Math.abs((totalDebits + debitNetLoss) - (totalCredits + (netProfit < 0 ? Math.abs(netProfit) : 0))),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/business/:businessId/day-book", async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res
        .status(400)
        .json({ success: false, message: "date is required" });
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [invoices, purchases, expenses, transactions, receipts] =
      await Promise.all([
        prisma.invoice.findMany({
          where: { businessId, date: { gte: startOfDay, lte: endOfDay } },
          include: { party: { select: { name: true, gstin: true } } },
        }),
        prisma.purchase.findMany({
          where: { businessId, date: { gte: startOfDay, lte: endOfDay } },
          include: { party: { select: { name: true, gstin: true } } },
        }),
        prisma.expense.findMany({
          where: { businessId, date: { gte: startOfDay, lte: endOfDay } },
        }),
        prisma.transaction.findMany({
          where: { businessId, date: { gte: startOfDay, lte: endOfDay } },
          include: {
            party: { select: { name: true } },
            bankAccount: { select: { bankName: true } },
            cashAccount: { select: { name: true } },
          },
        }),
        prisma.receipt.findMany({
          where: { businessId, date: { gte: startOfDay, lte: endOfDay } },
          include: { party: { select: { name: true } } },
        }),
      ]);

    const salesTotal = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const purchaseTotal = purchases.reduce(
      (sum, pur) => sum + pur.totalAmount,
      0,
    );
    const expenseTotal = expenses.reduce(
      (sum, exp) => sum + exp.totalAmount,
      0,
    );
    const receiptTotal = transactions
      .filter((t) => t.type === "RECEIPT")
      .reduce((sum, t) => sum + t.amount, 0);
    const paymentTotal = transactions
      .filter((t) => t.type === "PAYMENT")
      .reduce((sum, t) => sum + t.amount, 0);

    res.json({
      success: true,
      data: {
        date,
        vouchers: {
          invoices,
          purchases,
          expenses,
          transactions,
          receipts,
        },
        summary: {
          totalSales: salesTotal,
          totalPurchases: purchaseTotal,
          totalExpenses: expenseTotal,
          totalReceipts: receiptTotal,
          totalPayments: paymentTotal,
          netCashFlow: receiptTotal - paymentTotal,
        },
        counts: {
          invoices: invoices.length,
          purchases: purchases.length,
          expenses: expenses.length,
          transactions: transactions.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/business/:businessId/cash-book", async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const { fromDate, toDate } = req.query;

    const dateFilter = {
      ...(fromDate && { date: { gte: new Date(fromDate) } }),
      ...(toDate && { date: { lte: new Date(toDate) } }),
    };

    const [cashAccounts, bankAccounts, transactions] = await Promise.all([
      prisma.cashAccount.findMany({ where: { businessId } }),
      prisma.bankAccount.findMany({ where: { businessId } }),
      prisma.transaction.findMany({
        where: { businessId, ...dateFilter },
        include: { party: { select: { name: true } } },
        orderBy: { date: "asc" },
      }),
    ]);

    const cashTxns = transactions.filter((t) => t.cashAccountId);
    const bankTxns = transactions.filter((t) => t.bankAccountId);

    let cashBalance = cashAccounts.reduce(
      (sum, acc) => sum + acc.currentBalance,
      0,
    );
    let bankBalance = bankAccounts.reduce(
      (sum, acc) => sum + acc.currentBalance,
      0,
    );

    const cashReceipts = cashTxns
      .filter((t) => t.type === "RECEIPT")
      .reduce((sum, t) => sum + t.amount, 0);
    const cashPayments = cashTxns
      .filter((t) => t.type === "PAYMENT")
      .reduce((sum, t) => sum + t.amount, 0);
    const bankReceipts = bankTxns
      .filter((t) => t.type === "RECEIPT")
      .reduce((sum, t) => sum + t.amount, 0);
    const bankPayments = bankTxns
      .filter((t) => t.type === "PAYMENT")
      .reduce((sum, t) => sum + t.amount, 0);

    res.json({
      success: true,
      data: {
        cashAccounts: cashAccounts.map((acc) => ({
          ...acc,
          receipts: cashTxns
            .filter((t) => t.cashAccountId === acc.id && t.type === "RECEIPT")
            .reduce((sum, t) => sum + t.amount, 0),
          payments: cashTxns
            .filter((t) => t.cashAccountId === acc.id && t.type === "PAYMENT")
            .reduce((sum, t) => sum + t.amount, 0),
        })),
        bankAccounts: bankAccounts.map((acc) => ({
          ...acc,
          receipts: bankTxns
            .filter((t) => t.bankAccountId === acc.id && t.type === "RECEIPT")
            .reduce((sum, t) => sum + t.amount, 0),
          payments: bankTxns
            .filter((t) => t.bankAccountId === acc.id && t.type === "PAYMENT")
            .reduce((sum, t) => sum + t.amount, 0),
        })),
        summary: {
          totalCashInHand: cashBalance,
          totalBankBalance: bankBalance,
          totalCashReceipts: cashReceipts,
          totalCashPayments: cashPayments,
          totalBankReceipts: bankReceipts,
          totalBankPayments: bankPayments,
          netCashFlow:
            cashReceipts + bankReceipts - cashPayments - bankPayments,
        },
        transactions,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get(
  "/business/:businessId/account-statement/:accountId",
  async (req, res, next) => {
    try {
      const { businessId, accountId } = req.params;
      const { accountType, fromDate, toDate } = req.query;

      const dateFilter = {
        ...(fromDate && { date: { gte: new Date(fromDate) } }),
        ...(toDate && { date: { lte: new Date(toDate) } }),
      };

      let account, transactions;

      if (accountType === "bank") {
        account = await prisma.bankAccount.findFirst({
          where: { id: accountId, businessId },
        });
        transactions = await prisma.transaction.findMany({
          where: { businessId, bankAccountId: accountId, ...dateFilter },
          include: { party: { select: { name: true } } },
          orderBy: { date: "asc" },
        });
      } else if (accountType === "cash") {
        account = await prisma.cashAccount.findFirst({
          where: { id: accountId, businessId },
        });
        transactions = await prisma.transaction.findMany({
          where: { businessId, cashAccountId: accountId, ...dateFilter },
          include: { party: { select: { name: true } } },
          orderBy: { date: "asc" },
        });
      } else {
        return res
          .status(400)
          .json({ success: false, message: "Invalid accountType" });
      }

      if (!account) {
        return res
          .status(404)
          .json({ success: false, message: "Account not found" });
      }

      const openingBalance = account.openingBalance;
      let runningBalance = openingBalance;

      const ledger = transactions.map((t) => {
        if (t.type === "RECEIPT") {
          runningBalance += t.amount;
        } else {
          runningBalance -= t.amount;
        }
        return { ...t, runningBalance };
      });

      const totalReceipts = transactions
        .filter((t) => t.type === "RECEIPT")
        .reduce((sum, t) => sum + t.amount, 0);
      const totalPayments = transactions
        .filter((t) => t.type === "PAYMENT")
        .reduce((sum, t) => sum + t.amount, 0);

      res.json({
        success: true,
        data: {
          account: {
            id: account.id,
            name: account.bankName || account.name,
            type: accountType,
            openingBalance,
            currentBalance: account.currentBalance,
          },
          summary: {
            totalReceipts,
            totalPayments,
            closingBalance: runningBalance,
          },
          ledger,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get("/business/:businessId/balance-sheet", async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const { fromDate, toDate } = req.query;

    const dateFilter = {
      ...(fromDate && { date: { gte: new Date(fromDate) } }),
      ...(toDate && { date: { lte: new Date(toDate) } }),
    };

    const [parties, bankAccounts, cashAccounts, invoices, purchases, expenses] =
      await Promise.all([
        prisma.party.findMany({
          where: { businessId, isActive: true },
          include: {
            invoices: {
              where: {
                status: { in: INVOICE_REPORT_STATUSES },
                ...dateFilter,
              },
            },
            purchases: {
              where: {
                status: { in: PURCHASE_REPORT_STATUSES },
                ...dateFilter,
              },
            },
            transactions: { where: dateFilter },
          },
        }),
        prisma.bankAccount.findMany({ where: { businessId } }),
        prisma.cashAccount.findMany({ where: { businessId } }),
        prisma.invoice.findMany({
          where: {
            businessId,
            status: { in: INVOICE_REPORT_STATUSES },
            ...dateFilter,
          },
        }),
        prisma.purchase.findMany({
          where: {
            businessId,
            status: { in: PURCHASE_REPORT_STATUSES },
            ...dateFilter,
          },
        }),
        prisma.expense.findMany({
          where: { businessId, status: "PAID", ...dateFilter },
        }),
      ]);

    let sundryDebtors = 0;
    let sundryCreditors = 0;
    let advancesFromCustomers = 0;

    parties.forEach((party) => {
      const receivable = party.balanceType === "RECEIVABLE";
      const billed = receivable
        ? party.invoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
        : party.purchases.reduce((sum, pur) => sum + pur.totalAmount, 0);
      const paid = receivable
        ? party.invoices.reduce((sum, inv) => sum + inv.paidAmount, 0) +
          party.transactions
            .filter((t) => t.type === "RECEIPT")
            .reduce((sum, t) => sum + t.amount, 0)
        : party.purchases.reduce((sum, pur) => sum + pur.paidAmount, 0) +
          party.transactions
            .filter((t) => t.type === "PAYMENT")
            .reduce((sum, t) => sum + t.amount, 0);
      const balance = party.openingBalance + billed - paid;

      if (balance > 0) {
        if (receivable) sundryDebtors += balance;
        else advancesFromCustomers += balance;
      } else {
        if (!receivable) sundryCreditors += Math.abs(balance);
      }
    });

    const bankBalance = bankAccounts.reduce(
      (sum, acc) => sum + acc.currentBalance,
      0,
    );
    const cashBalance = cashAccounts.reduce(
      (sum, acc) => sum + acc.currentBalance,
      0,
    );

    const totalSales = invoices.reduce((sum, inv) => sum + inv.subtotal, 0);
    const totalPurchases = purchases.reduce(
      (sum, pur) => sum + pur.subtotal,
      0,
    );
    const totalExpenses = expenses.reduce(
      (sum, exp) => sum + exp.totalAmount,
      0,
    );
    const netProfit = totalSales - totalPurchases - totalExpenses;

    const assets = {
      currentAssets: {
        "Cash in Hand": cashBalance,
        "Bank Accounts": bankBalance,
        "Sundry Debtors (Receivables)": sundryDebtors,
        "Advances to Suppliers": 0,
      },
      totalCurrentAssets: cashBalance + bankBalance + sundryDebtors,
    };

    const liabilities = {
      currentLiabilities: {
        "Sundry Creditors (Payables)": sundryCreditors,
        "Advances from Customers": advancesFromCustomers,
      },
      totalCurrentLiabilities: sundryCreditors + advancesFromCustomers,
    };

    const equity = {
      "Capital Account": 0,
      "Reserves & Surplus": netProfit,
      "Net Profit/(Loss)": netProfit,
    };
    const totalEquity = netProfit;

    const totalLiabilities = liabilities.totalCurrentLiabilities + totalEquity;
    const totalAssets = assets.totalCurrentAssets;
    const isBalanced = Math.abs(totalAssets - totalLiabilities) < 0.01;

    res.json({
      success: true,
      data: {
        period: {
          fromDate,
          toDate,
          asOnDate: toDate || new Date().toISOString().split("T")[0],
        },
        assets,
        liabilities,
        equity,
        summary: {
          totalAssets,
          totalLiabilities: totalLiabilities,
          totalEquity: totalEquity,
          netProfit,
          isBalanced,
          difference: Math.abs(totalAssets - totalLiabilities),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/business/:businessId/bill-wise-profit", async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const { fromDate, toDate } = req.query;

    const dateFilter = {
      ...(fromDate && { date: { gte: new Date(fromDate) } }),
      ...(toDate && { date: { lte: new Date(toDate) } }),
    };

    const invoices = await prisma.invoice.findMany({
      where: {
        businessId,
        status: { in: INVOICE_REPORT_STATUSES },
        ...dateFilter,
      },
      include: {
        party: { select: { name: true } },
        items: {
          include: {
            item: { select: { purchasePrice: true } }
          }
        }
      },
      orderBy: { date: "asc" }
    });

    const reportData = invoices.map(inv => {
      let totalCost = 0;
      inv.items.forEach(line => {
        const cost = line.item?.purchasePrice || 0;
        totalCost += (cost * line.quantity);
      });

      const profit = inv.totalAmount - totalCost;

      return {
        id: inv.id,
        date: inv.date,
        invoiceNumber: inv.invoiceNumber,
        partyName: inv.party?.name || "Unknown",
        totalAmount: inv.totalAmount,
        totalCost,
        profit,
        profitPercentage: inv.totalAmount > 0 ? ((profit / inv.totalAmount) * 100).toFixed(2) : 0
      };
    });

    const summary = reportData.reduce((acc, row) => ({
      totalSaleAmount: acc.totalSaleAmount + row.totalAmount,
      totalProfit: acc.totalProfit + row.profit
    }), { totalSaleAmount: 0, totalProfit: 0 });

    res.json({
      success: true,
      data: {
        invoices: reportData,
        summary
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get("/business/:businessId/stock-summary", async (req, res, next) => {
  try {
    const { businessId } = req.params;
    
    const items = await prisma.item.findMany({
      where: { businessId, isActive: true },
    });

    const summary = items.map(item => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      hsnCode: item.hsnCode,
      currentStock: item.stockQuantity || 0,
      valuationPrice: item.purchasePrice || item.sellingPrice || 0,
      totalValuation: (item.stockQuantity || 0) * (item.purchasePrice || 0),
      minStockLevel: item.minStockLevel || 0
    }));

    const totalValuation = summary.reduce((sum, i) => sum + i.totalValuation, 0);

    res.json({
      success: true,
      data: {
        items: summary,
        totalValuation
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get("/business/:businessId/sac-summary", async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const { fromDate, toDate } = req.query;

    const dateFilter = {
      ...(fromDate && { date: { gte: new Date(fromDate) } }),
      ...(toDate && { date: { lte: new Date(toDate) } }),
    };

    const invoices = await prisma.invoice.findMany({
      where: {
        businessId,
        status: { in: INVOICE_REPORT_STATUSES },
        ...dateFilter
      },
      include: { items: true }
    });

    const sacSummary = {};
    invoices.forEach(inv => {
      inv.items.forEach(item => {
        // SAC codes usually start with 99
        if (item.hsnCode && (item.hsnCode.startsWith("99") || item.hsnCode.length === 6)) {
          const sac = item.hsnCode;
          if (!sacSummary[sac]) {
            sacSummary[sac] = {
              sacCode: sac,
              taxableAmount: 0,
              cgst: 0,
              sgst: 0,
              igst: 0,
              totalTax: 0,
              totalAmount: 0
            };
          }
          sacSummary[sac].taxableAmount += item.taxableAmount;
          sacSummary[sac].cgst += item.cgstAmount;
          sacSummary[sac].sgst += item.sgstAmount;
          sacSummary[sac].igst += item.igstAmount;
          sacSummary[sac].totalTax += (item.cgstAmount + item.sgstAmount + item.igstAmount);
          sacSummary[sac].totalAmount += (item.taxableAmount + item.cgstAmount + item.sgstAmount + item.igstAmount);
        }
      });
    });

    res.json({
      success: true,
      data: {
        sacCodes: Object.values(sacSummary),
        period: { fromDate, toDate }
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get("/business/:businessId/item-wise-profit", async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const { fromDate, toDate } = req.query;

    const dateFilter = {
      ...(fromDate && { date: { gte: new Date(fromDate) } }),
      ...(toDate && { date: { lte: new Date(toDate) } }),
    };

    const invoices = await prisma.invoice.findMany({
      where: {
        businessId,
        status: { in: INVOICE_REPORT_STATUSES },
        ...dateFilter
      },
      include: { items: true }
    });

    const itemSummary = {};
    invoices.forEach(inv => {
      inv.items.forEach(item => {
        const itemId = item.itemId || item.description;
        if (!itemSummary[itemId]) {
          itemSummary[itemId] = {
            name: item.description,
            quantitySold: 0,
            saleAmount: 0,
            costAmount: 0,
            profit: 0
          };
        }
        itemSummary[itemId].quantitySold += item.quantity;
        itemSummary[itemId].saleAmount += item.taxableAmount;
        // In a real app, we'd pull historical cost at the time of sale
        // Here we use current/fixed cost logic or a placeholder
        itemSummary[itemId].costAmount += (item.quantity * (item.rate * 0.7)); // Placeholder 30% margin logic
        itemSummary[itemId].profit = itemSummary[itemId].saleAmount - itemSummary[itemId].costAmount;
      });
    });

    res.json({
      success: true,
      data: Object.values(itemSummary)
    });
  } catch (error) {
    next(error);
  }
});

export default router;
