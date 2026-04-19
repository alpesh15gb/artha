import * as XLSX from 'xlsx';

/**
 * Utility to export data to Excel matching the exact format required by Artha Premium.
 */

const formatCurrency = (val) => Number(val || 0).toFixed(2);
const formatDate = (date) => new Date(date).toLocaleDateString('en-GB');

const addBusinessHeader = (business, title, period = null) => {
  const header = [
    [business.name.toUpperCase()],
    [business.address || ''],
    [business.gstin ? `GSTIN: ${business.gstin}` : ''],
    [],
    [title.toUpperCase()],
    period ? [`PERIOD: ${period}`] : [],
    []
  ];
  return header;
};

export const exportGSTR1Excel = (business, period, gstData) => {
  const wb = XLSX.utils.book_new();
  const from = period.fromDate || 'Start';
  const to = period.toDate || 'End';
  
  // 1. HELP Sheet (Placeholder)
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['GSTR-1 Offline Utility Format'], ['Artha Premium Export']]), 'Help');

  // 2. B2B Sheet
  const b2bHeaders = ['GSTIN/UIN of Recipient', 'Receiver Name', 'Invoice Number', 'Invoice date', 'Invoice Value', 'Place Of Supply', 'Reverse Charge', 'Applicable % of Tax Rate', 'Invoice Type', 'E-Commerce GSTIN', 'Rate', 'Taxable Value', 'Cess Amount'];
  const b2bData = (gstData.sales.b2bInvoices || []).map(inv => [
    inv.partyGstin,
    inv.partyName,
    inv.invoiceNumber,
    formatDate(inv.date),
    inv.totalAmount,
    '36-Telangana',
    'N',
    '',
    'Regular',
    '',
    '',
    inv.taxableAmount,
    inv.cessAmount || 0
  ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([b2bHeaders, ...b2bData]), 'b2b');

  // 3. B2CL Sheet
  const b2clHeaders = ['Invoice Number', 'Invoice date', 'Invoice Value', 'Place Of Supply', 'Applicable % of Tax Rate', 'Rate', 'Taxable Value', 'Cess Amount', 'E-Commerce GSTIN'];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([b2clHeaders]), 'b2cl');

  // 4. B2CS Sheet
  const b2csHeaders = ['Type', 'Place Of Supply', 'Applicable % of Tax Rate', 'Rate', 'Taxable Value', 'Cess Amount', 'E-Commerce GSTIN'];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([b2csHeaders]), 'b2cs');

  // 5. CDNR Sheet
  const cdnrHeaders = ['GSTIN/UIN of Recipient', 'Receiver Name', 'Note/Refund Voucher Number', 'Note/Refund Voucher date', 'Note/Refund Voucher Value', 'Document Type', 'Place Of Supply', 'Reverse Charge', 'Applicable % of Tax Rate', 'Note Type', 'Rate', 'Taxable Value', 'Cess Amount'];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([cdnrHeaders]), 'cdnr');

  // 6. CDNUR Sheet
  const cdnurHeaders = ['URP Type', 'Note/Refund Voucher Number', 'Note/Refund Voucher date', 'Note/Refund Voucher Value', 'Document Type', 'Place Of Supply', 'Applicable % of Tax Rate', 'Note Type', 'Rate', 'Taxable Value', 'Cess Amount'];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([cdnurHeaders]), 'cdnur');

  // 7. EXP Sheet
  const expHeaders = ['Export Type', 'Invoice Number', 'Invoice date', 'Invoice Value', 'Port Code', 'Shipping Bill Number', 'Shipping Bill Date', 'Applicable % of Tax Rate', 'Rate', 'Taxable Value', 'Cess Amount'];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([expHeaders]), 'exp');

  // 8. AT Sheet (Advance Tax)
  const atHeaders = ['Place Of Supply', 'Applicable % of Tax Rate', 'Rate', 'Gross Advance Received', 'Cess Amount'];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([atHeaders]), 'at');

  // 9. ATADJ Sheet
  const atadjHeaders = ['Place Of Supply', 'Applicable % of Tax Rate', 'Rate', 'Gross Advance Adjusted', 'Cess Amount'];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([atadjHeaders]), 'atadj');

  // 10. HSN Sheet
  const hsnHeaders = ['HSN', 'Description', 'UQC', 'Total Quantity', 'Total Value', 'Taxable Value', 'Integrated Tax Amount', 'Central Tax Amount', 'State/UT Tax Amount', 'Cess Amount'];
  const hsnData = (gstData.hsnSummary || []).map(h => [
    h.hsnCode,
    '',
    'NOS-NUMBERS',
    h.quantity,
    formatCurrency(h.taxableAmount + h.cgstAmount + h.sgstAmount + h.igstAmount),
    formatCurrency(h.taxableAmount),
    formatCurrency(h.igstAmount),
    formatCurrency(h.cgstAmount),
    formatCurrency(h.sgstAmount),
    formatCurrency(h.cessAmount || 0)
  ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([hsnHeaders, ...hsnData]), 'hsn');

  // 11. DOCS Sheet
  const docsHeaders = ['Nature of Document', 'Sr. No. From', 'Sr. No. To', 'Total Number', 'Cancelled', 'Net Issued'];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([docsHeaders]), 'docs');

  XLSX.writeFile(wb, `GSTR1_Offline_Utility_${from}_to_${to}.xlsx`);
};

export const exportGSTR2Excel = (business, period, gstData) => {
  const wb = XLSX.utils.book_new();
  const from = period.fromDate || 'Start';
  const to = period.toDate || 'End';
  
  // 1. b2b Sheet (Registered Suppliers)
  const b2bHeaders = ['GSTIN of Supplier', 'Supplier Name', 'Invoice Number', 'Invoice date', 'Invoice Value', 'Place Of Supply', 'Reverse Charge', 'Invoice Type', 'Rate', 'Taxable Value', 'Integrated Tax', 'Central Tax', 'State/UT Tax', 'Cess Amount'];
  const b2bData = (gstData.purchases.invoices || []).map(pur => [
    pur.partyGstin || '',
    pur.partyName,
    pur.purchaseNumber,
    formatDate(pur.date),
    pur.totalAmount,
    '36-Telangana',
    'N',
    'Regular',
    '',
    pur.taxableAmount,
    pur.igst || 0,
    pur.cgst || 0,
    pur.sgst || 0,
    pur.cessAmount || 0
  ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([b2bHeaders, ...b2bData]), 'b2b');

  // 2. b2bur Sheet (Unregistered Suppliers)
  const b2burHeaders = ['Supplier Name', 'Invoice Number', 'Invoice date', 'Invoice Value', 'Place Of Supply', 'Rate', 'Taxable Value', 'Integrated Tax', 'Central Tax', 'State/UT Tax', 'Cess Amount'];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([b2burHeaders]), 'b2bur');

  // 3. cdnr Sheet
  const cdnrHeaders = ['GSTIN of Supplier', 'Note/Refund Voucher Number', 'Note/Refund Voucher date', 'Note/Refund Voucher Value', 'Document Type', 'Reverse Charge', 'Note Type', 'Rate', 'Taxable Value', 'Integrated Tax', 'Central Tax', 'State/UT Tax', 'Cess Amount'];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([cdnrHeaders]), 'cdnr');

  // 4. hsn Sheet
  const hsnHeaders = ['HSN', 'Description', 'UQC', 'Total Quantity', 'Total Value', 'Taxable Value', 'Integrated Tax Amount', 'Central Tax Amount', 'State/UT Tax Amount', 'Cess Amount'];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([hsnHeaders]), 'hsn_sum');

  XLSX.writeFile(wb, `GSTR2_Purchase_Register_${from}_to_${to}.xlsx`);
};

export const exportHSNSummaryExcel = (business, period, hsnSummary) => {
  const wb = XLSX.utils.book_new();
  const from = period.fromDate || 'Start';
  const to = period.toDate || 'End';
  const data = [
    ...addBusinessHeader(business, 'HSN SUMMARY Report', `${from} to ${to}`),
    ['HSN.', 'Total Value', 'Taxable Value', 'IGST', 'CGST', 'SGST', 'CESS', 'Additional CESS', 'Flood CESS', 'Other Taxes'],
    ...hsnSummary.map(h => [
      h.hsnCode,
      formatCurrency(h.taxableAmount + h.cgstAmount + h.sgstAmount + h.igstAmount),
      formatCurrency(h.taxableAmount),
      formatCurrency(h.igstAmount),
      formatCurrency(h.cgstAmount),
      formatCurrency(h.sgstAmount),
      formatCurrency(h.cessAmount || 0),
      '0.00',
      '0.00',
      '0.00'
    ])
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'HSN Summary');
  XLSX.writeFile(wb, `Sale_Summary_By_HSN_${from}_to_${to}.xlsx`);
};

export const exportBillWiseProfitExcel = (business, period, data) => {
  const wb = XLSX.utils.book_new();
  const from = period.fromDate || 'Start';
  const to = period.toDate || 'End';
  const rows = [
    ['From Date:', from],
    ['To Date:', to],
    [],
    ['Date', 'Ref No.', 'Name', 'Total Sale Amount', 'Profit(+)/Loss(-)'],
    ...data.invoices.map(inv => [
      formatDate(inv.date),
      inv.invoiceNumber,
      inv.partyName,
      inv.totalAmount,
      inv.profit
    ]),
    [],
    ['SUMMARY', '', '', data.summary.totalSaleAmount, data.summary.totalProfit]
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Profit Report');
  XLSX.writeFile(wb, `BillWiseProfitAndLossReport_${from}_to_${to}.xlsx`);
};

export const exportAllTransactionsExcel = (business, period, data) => {
  const wb = XLSX.utils.book_new();
  const from = period.fromDate || 'Start';
  const to = period.toDate || 'End';
  const rows = [
    [`Generated on ${new Date().toLocaleString()}`],
    [],
    ['Date', 'Reference No', 'Party Name', 'Category Name', 'Type', 'Total', 'Payment Type', 'Paid', 'Received', 'Balance']
  ];
  
  const all = [
    ...(data.vouchers?.invoices || []).map(i => [formatDate(i.date), i.invoiceNumber, i.party?.name, '', 'Sale', i.totalAmount, '', i.paidAmount, 0, i.balanceDue]),
    ...(data.vouchers?.purchases || []).map(p => [formatDate(p.date), p.purchaseNumber, p.party?.name, '', 'Purchase', p.totalAmount, '', p.paidAmount, 0, p.balanceDue]),
    ...(data.vouchers?.expenses || []).map(e => [formatDate(e.date), e.description, '', 'Expense', 'Expense', e.totalAmount, '', e.totalAmount, 0, 0]),
  ];
  
  rows.push(...all);
  
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
  XLSX.writeFile(wb, `DayBookReport_${from}_to_${to}.xlsx`);
};

export const exportTrialBalanceExcel = (business, period, data) => {
  const wb = XLSX.utils.book_new();
  const from = period.fromDate || 'Start';
  const to = period.toDate || 'End';
  const rows = [
    [`Trial Balance for ${business.name}`],
    [`Period: ${from} to ${to}`],
    [],
    ['Account Name', 'Type', 'Debit', 'Credit'],
    ...data.ledgerAccounts.map(a => [
      a.name,
      a.type.toUpperCase(),
      a.debit || 0,
      a.credit || 0
    ]),
    [],
    ['TOTAL', '', data.totals.totalDebits, data.totals.totalCredits]
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Trial Balance');
  XLSX.writeFile(wb, `Trial_Balance_${from}_to_${to}.xlsx`);
};

export const exportStockSummaryExcel = (business, period, data) => {
  const wb = XLSX.utils.book_new();
  const rows = [
    [`Stock Status for ${business.name}`],
    [`As of ${new Date().toLocaleDateString()}`],
    [],
    ['Item Name', 'SKU', 'HSN', 'Current Stock', 'Valuation Price', 'Total Valuation'],
    ...data.items.map(i => [
      i.name,
      i.sku || '-',
      i.hsnCode || '-',
      i.currentStock,
      i.valuationPrice,
      i.totalValuation
    ]),
    [],
    ['TOTAL VALUATION', '', '', '', '', data.totalValuation]
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Inventory Assets');
  XLSX.writeFile(wb, `Stock_Summary_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportPartyBalancesExcel = (business, period, data) => {
  const wb = XLSX.utils.book_new();
  const rows = [
    [`Partner Balances for ${business.name}`],
    [],
    ['Name', 'Type', 'GSTIN', 'Billed', 'Paid', 'Closing Balance'],
    ...data.parties.map(p => [
      p.name,
      p.balanceType,
      p.gstin || '-',
      p.totalBilled,
      p.totalPaid,
      p.closingBalance
    ]),
    [],
    ['SUMMARY', '', '', data.totals.totalBilled, data.totals.totalPaid, data.totals.netBalance]
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Party Balances');
  XLSX.writeFile(wb, `Party_Balances_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportBalanceSheetExcel = (business, period, data) => {
  const wb = XLSX.utils.book_new();
  const asOf = data.period.asOnDate;
  
  const rows = [
    [`Balance Sheet: ${business.name}`],
    [`As on ${asOf}`],
    [],
    ['LIABILITIES', 'Amount', '', 'ASSETS', 'Amount'],
    ['Current Liabilities', '', '', 'Current Assets', ''],
  ];
  
  const liabItems = Object.entries(data.liabilities.currentLiabilities);
  const assetItems = Object.entries(data.assets.currentAssets);
  const max = Math.max(liabItems.length, assetItems.length);
  
  for(let i=0; i<max; i++) {
    const l = liabItems[i] || ['', ''];
    const a = assetItems[i] || ['', ''];
    rows.push([l[0], l[1], '', a[0], a[1]]);
  }
  
  rows.push(['Equity', '', '', '', '']);
  Object.entries(data.equity).forEach(([k, v]) => {
     rows.push([k, v, '', '', '']);
  });
  
  rows.push([]);
  rows.push(['TOTAL LIABILITIES', data.summary.totalLiabilities, '', 'TOTAL ASSETS', data.summary.totalAssets]);
  
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Balance Sheet');
  XLSX.writeFile(wb, `Balance_Sheet_${asOf}.xlsx`);
};

export const exportGSTR3BExcel = (business, period, gstData) => {
  const wb = XLSX.utils.book_new();
  const from = period.fromDate || 'Start';
  const to = period.toDate || 'End';
  
  // Table 3.1
  const t31 = [
    ...addBusinessHeader(business, 'GSTR-3B Table 3.1: Outward Supplies'),
    ['Nature of Supplies', 'Total Taxable Value', 'Integrated Tax', 'Central Tax', 'State/UT Tax', 'Cess'],
    ['(a) Outward taxable supplies', formatCurrency(gstData.sales.totalTaxableSales), formatCurrency(gstData.sales.igstCollected), formatCurrency(gstData.sales.cgstCollected), formatCurrency(gstData.sales.sgstCollected), formatCurrency(gstData.sales.cessCollected)],
    ['(b) Zero rated outward supplies', '0.00', '0.00', '0.00', '0.00', '0.00'],
    ['(c) Other outward supplies', '0.00', '0.00', '0.00', '0.00', '0.00'],
    ['(d) Inward supplies (RCM)', '0.00', '0.00', '0.00', '0.00', '0.00'],
    ['(e) Non-GST outward supplies', '0.00', '0.00', '0.00', '0.00', '0.00'],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(t31), '3.1 Outward');

  // Table 4
  const t4 = [
    ...addBusinessHeader(business, 'GSTR-3B Table 4: Eligible ITC'),
    ['Details', 'Integrated Tax', 'Central Tax', 'State/UT Tax', 'Cess'],
    ['(A) ITC Available (Inward Supplies)', formatCurrency(gstData.purchases.igstPaid), formatCurrency(gstData.purchases.cgstPaid), formatCurrency(gstData.purchases.sgstPaid), formatCurrency(gstData.purchases.cessPaid)],
    ['(B) ITC Reversed', '0.00', '0.00', '0.00', '0.00'],
    ['(C) Net ITC Available (A-B)', formatCurrency(gstData.purchases.igstPaid), formatCurrency(gstData.purchases.cgstPaid), formatCurrency(gstData.purchases.sgstPaid), formatCurrency(gstData.purchases.cessPaid)],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(t4), '4 Eligible ITC');

  // Summary Table
  const summary = [
    ...addBusinessHeader(business, 'GSTR-3B NET SET-OFF SUMMARY'),
    ['Tax Head', 'Output Tax (Liability)', 'Input Tax (ITC Credit)', 'Net Payable'],
    ['CGST', formatCurrency(gstData.sales.cgstCollected), formatCurrency(gstData.purchases.cgstPaid), formatCurrency(gstData.netTax.cgst)],
    ['SGST', formatCurrency(gstData.sales.sgstCollected), formatCurrency(gstData.purchases.sgstPaid), formatCurrency(gstData.netTax.sgst)],
    ['IGST', formatCurrency(gstData.sales.igstCollected), formatCurrency(gstData.purchases.igstPaid), formatCurrency(gstData.netTax.igst)],
    ['TOTAL', formatCurrency(gstData.sales.totalTax), formatCurrency(gstData.purchases.totalTax), formatCurrency(gstData.netTax.total)],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Net Set-Off');

  XLSX.writeFile(wb, `GSTR3B_Computation_${from}_to_${to}.xlsx`);
};

export const exportPartyLedgerExcel = (business, period, data) => {
  const wb = XLSX.utils.book_new();
  const from = period.fromDate || 'Start';
  const to = period.toDate || 'End';
  
  const rows = [
    ...addBusinessHeader(business, `ACCOUNT STATEMENT: ${data.party.name}`, `${from} - ${to}`),
    ['Contact:', data.party.phone || 'N/A'],
    ['GSTIN:', data.party.gstin || 'N/A'],
    [],
    ['Date', 'Reference', 'Type', 'Description', 'Debit (Out)', 'Credit (In)', 'Balance'],
    ['', 'OPENING BALANCE', '', '', '', '', formatCurrency(data.openingBalance)],
    ...data.ledger.map(e => [
      formatDate(e.date),
      e.reference || '',
      e.type,
      e.description,
      e.debit || 0,
      e.credit || 0,
      e.balance
    ]),
    [],
    ['', 'CLOSING BALANCE', '', '', formatCurrency(data.totals.totalDebit), formatCurrency(data.totals.totalCredit), formatCurrency(data.closingBalance)]
  ];
  
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Ledger Statement');
  XLSX.writeFile(wb, `Ledger_${data.party.name.replace(/\s+/g, '_')}_${from}_to_${to}.xlsx`);
};
