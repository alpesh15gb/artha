import * as XLSX from 'xlsx';

/**
 * Utility to export data to Excel matching the exact format required by Artha Premium.
 */

const formatCurrency = (val) => Number(val || 0).toFixed(2);
const formatDate = (date) => new Date(date).toLocaleDateString('en-GB');

export const exportGSTR1Excel = (business, period, gstData) => {
  const wb = XLSX.utils.book_new();
  const from = period.fromDate || 'Start';
  const to = period.toDate || 'End';
  
  // Prepare Summary Sheet
  const summarySheet = [
    ['Period', `${from} - ${to}`],
    [],
    ['1. GSTIN', business.gstin || ''],
    ['2.a Legal name of the registered person.', business.name || ''],
    ['2.b Trade name, if any', ''],
    [],
    ['Section', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Total Tax'],
    ['B2B Invoices', formatCurrency(gstData.sales.b2bValue), formatCurrency(gstData.sales.cgstCollected), formatCurrency(gstData.sales.sgstCollected), formatCurrency(gstData.sales.igstCollected), formatCurrency(gstData.sales.totalTax)],
    ['B2C Invoices', formatCurrency(gstData.sales.b2cValue), '0.00', '0.00', '0.00', '0.00'],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summarySheet);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // B2B Sheet
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
  const wsB2B = XLSX.utils.aoa_to_sheet([b2bHeaders, ...b2bData]);
  XLSX.utils.book_append_sheet(wb, wsB2B, 'b2b');

  XLSX.writeFile(wb, `GSTR1_Report_${from}_to_${to}.xlsx`);
};

export const exportHSNSummaryExcel = (business, period, hsnSummary) => {
  const wb = XLSX.utils.book_new();
  const from = period.fromDate || 'Start';
  const to = period.toDate || 'End';
  const data = [
    [`From ${from} to ${to}`],
    ['Sale Summary by HSN'],
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
  XLSX.writeFile(wb, `AllTransactionsReport_${from}_to_${to}.xlsx`);
};
