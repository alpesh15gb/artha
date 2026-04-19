import { useEffect, useMemo, useState } from 'react';
import { 
  PieChart as RePie, Pie, 
  AreaChart, Area, 
  BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, 
  Tooltip, Cell, ResponsiveContainer 
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Calendar,
  Clock,
  Download,
  FileJson,
  FileSpreadsheet,
  Filter,
  PieChart,
  Receipt,
  Shield,
  TrendingDown,
  TrendingUp,
  Printer,
  ChevronDown,
} from 'lucide-react';
import api from '../services/api';
import { useBusinessStore } from '../store/auth';
import { Card, Button, cn, Modal, Badge } from '../components/ui';
import { exportToPDF } from '../utils/export';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const DATE_RANGES = [
  { id: 'this-month', label: 'This Month' },
  { id: 'last-month', label: 'Last Month' },
  { id: 'this-quarter', label: 'This Quarter' },
  { id: 'this-year', label: 'This Year' },
  { id: 'custom', label: 'Custom Range' },
];

const REPORT_SECTIONS = [
  {
    id: 'financial',
    label: 'Financial Report',
    tabs: [
      { id: 'overview', label: 'Executive Dashboard' },
      { id: 'bill-wise-profit', label: 'Bill Wise Profit' },
      { id: 'cash-flow', label: 'Cash flow' },
      { id: 'trial-balance', label: 'Trial Balance Report' },
      { id: 'balance-sheet', label: 'Balance Sheet' },
    ]
  },
  {
    id: 'party',
    label: 'Party report',
    tabs: [
      { id: 'party-ledger', label: 'Party Statement' },
      { id: 'party-profit-loss', label: 'Party wise Profit & Loss' },
      { id: 'balances', label: 'All parties' },
      { id: 'party-by-item', label: 'Party Report By Item' },
      { id: 'sale-purchase-party', label: 'Sale Purchase By Party' },
      { id: 'sale-purchase-party-group', label: 'Sale Purchase By Party Group' },
    ]
  },
  {
    id: 'gst',
    label: 'GST reports',
    tabs: [
      { id: 'gstr-1', label: 'GSTR 1' },
      { id: 'gstr-2', label: 'GSTR 2' },
      { id: 'gstr-3b', label: 'GSTR 3 B' },
      { id: 'gstr-9', label: 'GSTR 9' },
      { id: 'sale-summary-hsn', label: 'Sale Summary By HSN' },
      { id: 'sac-report', label: 'SAC Report' },
    ]
  },
  {
    id: 'inventory',
    label: 'Item/ Stock report',
    tabs: [
      { id: 'stock-summary', label: 'Stock summary' },
      { id: 'item-report-party', label: 'Item Report By Party' },
      { id: 'item-wise-profit', label: 'Item wise Profit & Loss' },
    ]
  }
];

function Reports() {
  const { currentBusiness } = useBusinessStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('this-year');
  const [customDates, setCustomDates] = useState({ fromDate: '', toDate: '' });
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [gstSubTab, setGstSubTab] = useState('Summary');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [accountType, setAccountType] = useState('bank');
  const [auditPage, setAuditPage] = useState(1);
  const [auditEntityType, setAuditEntityType] = useState('');

  const { data: bankAccounts } = useQuery({
    queryKey: ['bank-accounts', currentBusiness?.id],
    queryFn: () => api.get(`/accounts/bank-accounts/business/${currentBusiness.id}`).then((r) => r.data),
    enabled: !!currentBusiness?.id,
  });

  const { data: cashAccounts } = useQuery({
    queryKey: ['cash-accounts', currentBusiness?.id],
    queryFn: () => api.get(`/accounts/cash-accounts/business/${currentBusiness.id}`).then((r) => r.data),
    enabled: !!currentBusiness?.id,
  });

  const getDateParams = () => {
    const params = new URLSearchParams();
    if (dateRange === 'custom') {
      if (customDates.fromDate) params.append('fromDate', customDates.fromDate);
      if (customDates.toDate) params.append('toDate', customDates.toDate);
    } else if (dateRange === 'this-month') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      params.append('fromDate', firstDay.toISOString().split('T')[0]);
      params.append('toDate', lastDay.toISOString().split('T')[0]);
    } else if (dateRange === 'last-month') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      params.append('fromDate', firstDay.toISOString().split('T')[0]);
      params.append('toDate', lastDay.toISOString().split('T')[0]);
    } else if (dateRange === 'this-quarter') {
      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3);
      const firstDay = new Date(now.getFullYear(), quarter * 3, 1);
      const lastDay = new Date(now.getFullYear(), quarter * 3 + 3, 0);
      params.append('fromDate', firstDay.toISOString().split('T')[0]);
      params.append('toDate', lastDay.toISOString().split('T')[0]);
    } else if (dateRange === 'this-year') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), 0, 1);
      const lastDay = new Date(now.getFullYear(), 11, 31);
      params.append('fromDate', firstDay.toISOString().split('T')[0]);
      params.append('toDate', lastDay.toISOString().split('T')[0]);
    }
    return params.toString();
  };

  const { data: stockSummaryData } = useQuery({
    queryKey: ['report-stock-summary', currentBusiness?.id],
    queryFn: () => api.get(`/reports/business/${currentBusiness.id}/stock-summary`).then((r) => r.data),
    enabled: !!currentBusiness?.id && activeTab === 'stock-summary',
  });

  const { data: sacReportData } = useQuery({
    queryKey: ['report-sac', currentBusiness?.id, dateRange],
    queryFn: () => {
      const params = getDateParams();
      return api.get(`/reports/business/${currentBusiness.id}/sac-summary?${params}`).then((r) => r.data);
    },
    enabled: !!currentBusiness?.id && activeTab === 'sac-report',
  });

  const { data: itemProfitData } = useQuery({
    queryKey: ['report-item-profit', currentBusiness?.id, dateRange],
    queryFn: () => {
      const params = getDateParams();
      return api.get(`/reports/business/${currentBusiness.id}/item-wise-profit?${params}`).then((r) => r.data);
    },
    enabled: !!currentBusiness?.id && activeTab === 'item-wise-profit',
  });

  const { data: plData } = useQuery({
    queryKey: ['report-pl', currentBusiness?.id, dateRange],
    queryFn: () => {
      const params = getDateParams();
      return api.get(`/reports/business/${currentBusiness.id}/profit-loss?${params}`).then((r) => r.data);
    },
    enabled: !!currentBusiness?.id,
  });

  const { data: balanceSheetData } = useQuery({
    queryKey: ['report-balance-sheet', currentBusiness?.id, dateRange],
    queryFn: () => {
      const params = getDateParams();
      return api.get(`/reports/business/${currentBusiness.id}/balance-sheet?${params}`).then((r) => r.data);
    },
    enabled: !!currentBusiness?.id && activeTab === 'balance-sheet',
  });

  const { data: trialBalanceData } = useQuery({
    queryKey: ['report-trial-balance', currentBusiness?.id, dateRange],
    queryFn: () => {
      const params = getDateParams();
      return api.get(`/reports/business/${currentBusiness.id}/trial-balance?${params}`).then((r) => r.data);
    },
    enabled: !!currentBusiness?.id && activeTab === 'trial-balance',
  });

  const { data: balanceData } = useQuery({
    queryKey: ['report-balance', currentBusiness?.id],
    queryFn: () => api.get(`/reports/business/${currentBusiness.id}/party-balance-summary`).then((r) => r.data),
    enabled: !!currentBusiness?.id && activeTab === 'balances',
  });

  const { data: gstData } = useQuery({
    queryKey: ['report-gst', currentBusiness?.id, dateRange],
    queryFn: () => {
      const params = getDateParams();
      return api.get(`/reports/business/${currentBusiness.id}/gst-summary?${params}`).then((r) => r.data);
    },
    enabled: !!currentBusiness?.id && (activeTab === 'gst' || activeTab.startsWith('gstr-') || activeTab === 'sale-summary-hsn'),
  });

  const { data: dayBookData } = useQuery({
    queryKey: ['report-day-book', currentBusiness?.id, selectedDate],
    queryFn: () => api.get(`/reports/business/${currentBusiness.id}/day-book?date=${selectedDate}`).then((r) => r.data),
    enabled: !!currentBusiness?.id && activeTab === 'day-book',
  });

  const { data: cashBookData } = useQuery({
    queryKey: ['report-cash-book', currentBusiness?.id, dateRange],
    queryFn: () => {
      const params = getDateParams();
      return api.get(`/reports/business/${currentBusiness.id}/cash-book?${params}`).then((r) => r.data);
    },
    enabled: !!currentBusiness?.id && activeTab === 'cash-book',
  });

  const { data: accountStatementData } = useQuery({
    queryKey: ['report-account-statement', currentBusiness?.id, selectedAccountId, accountType, dateRange],
    queryFn: () => {
      const params = getDateParams();
      return api.get(`/reports/business/${currentBusiness.id}/account-statement/${selectedAccountId}?accountType=${accountType}&${params}`).then((r) => r.data);
    },
    enabled: !!currentBusiness?.id && activeTab === 'cash-book' && !!selectedAccountId,
  });

  const { data: partyData } = useQuery({
    queryKey: ['parties-for-ledger', currentBusiness?.id],
    queryFn: () => api.get(`/parties/business/${currentBusiness.id}?limit=500`).then((r) => r.data),
    enabled: !!currentBusiness?.id && activeTab === 'party-ledger',
  });

  const { data: auditData } = useQuery({
    queryKey: ['audit-logs', currentBusiness?.id, auditPage, auditEntityType],
    queryFn: () => api.get(`/settings/${currentBusiness.id}/audit-logs?page=${auditPage}&limit=20${auditEntityType ? `&entityType=${auditEntityType}` : ''}`).then((r) => r.data),
    enabled: !!currentBusiness?.id && activeTab === 'audit',
  });

  const { data: billWiseProfitData } = useQuery({
    queryKey: ['report-bill-wise-profit', currentBusiness?.id, dateRange],
    queryFn: () => {
      const params = getDateParams();
      return api.get(`/reports/business/${currentBusiness.id}/bill-wise-profit?${params}`).then((r) => r.data);
    },
    enabled: !!currentBusiness?.id && (activeTab === 'bill-wise-profit' || activeTab === 'overview'),
  });

  useEffect(() => {
    if (!selectedPartyId && partyData?.data?.length) {
      setSelectedPartyId(partyData.data[0].id);
    }
  }, [partyData, selectedPartyId]);

  useEffect(() => {
    if (bankAccounts?.data?.length && !selectedAccountId) {
      setSelectedAccountId(bankAccounts.data[0].id);
      setAccountType('bank');
    }
  }, [bankAccounts, selectedAccountId]);

  const { data: ledgerData } = useQuery({
    queryKey: ['party-ledger-detail', currentBusiness?.id, selectedPartyId],
    queryFn: () => {
      const params = getDateParams();
      return api.get(`/reports/business/${currentBusiness.id}/party-ledger?partyId=${selectedPartyId}&${params}`).then((r) => r.data);
    },
    enabled: !!currentBusiness?.id && activeTab === 'party-ledger' && !!selectedPartyId,
  });

  const pl = plData?.data;
  const balanceSheet = balanceSheetData?.data;
  const balances = balanceData?.data;
  const gst = gstData?.data;
  const parties = partyData?.data;
  const trialBalance = trialBalanceData?.data;
  const dayBook = dayBookData?.data;
  const cashBook = cashBookData?.data;
  const accountStatement = accountStatementData?.data;
  const auditLogs = auditData?.data;
  const auditPagination = auditData?.pagination;
  const billWiseProfit = billWiseProfitData?.data;
  const stockSummary = stockSummaryData?.data;
  const sacReport = sacReportData?.data;
  const itemProfit = itemProfitData?.data;
  const partyLedger = ledgerData?.data;

  const handleExportPL = async () => {
    try {
      setIsExporting(true);
      await exportToPDF('pl-report', `Profit_Loss_${currentBusiness.name}.pdf`);
      toast.success('Profit & Loss exported');
    } catch {
      toast.error('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  const downloadJson = (name, payload) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadExcel = (name, data, headers) => {
    const ws = XLSX.utils.json_to_sheet(data, { headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, `${name}.xlsx`);
  };

  const handleGstDownload = (type) => {
    if (!gst) {
      toast.error('Load GST report first');
      return;
    }

    if (type === 'gstr1') {
      downloadJson(`GSTR1_${currentBusiness?.name || 'Business'}.json`, {
        returnType: 'GSTR-1',
        gstin: currentBusiness?.gstin,
        businessName: currentBusiness?.name,
        generatedAt: new Date().toISOString(),
        period: gst.period,
        summary: {
          totalTaxableValue: gst.sales?.totalTaxableSales || 0,
          cgst: gst.sales?.cgstCollected || 0,
          sgst: gst.sales?.sgstCollected || 0,
          igst: gst.sales?.igstCollected || 0,
          cess: gst.sales?.cessCollected || 0,
        },
        b2b: gst.sales?.b2bCount || 0,
        b2c: gst.sales?.b2cCount || 0,
        hsnSummary: gst.hsnSummary || [],
        invoices: [],
      });
      toast.success('GSTR-1 JSON downloaded');
      return;
    }

    if (type === 'gstr2') {
      downloadJson(`GSTR2_Purchase_Register_${currentBusiness?.name || 'Business'}.json`, {
        returnType: 'GSTR-2 (Purchase register draft)',
        note: 'GSTR-2 filing is suspended; this draft helps reconciliation with 2A/2B.',
        gstin: currentBusiness?.gstin,
        businessName: currentBusiness?.name,
        generatedAt: new Date().toISOString(),
        period: gst.period,
        summary: {
          totalTaxableValue: gst.purchases?.totalTaxablePurchases || 0,
          cgst: gst.purchases?.cgstPaid || 0,
          sgst: gst.purchases?.sgstPaid || 0,
          igst: gst.purchases?.igstPaid || 0,
          cess: gst.purchases?.cessPaid || 0,
        },
        inwardSupplies: [],
      });
      toast.success('GSTR-2 draft downloaded');
      return;
    }

    downloadJson(`GSTR3B_${currentBusiness?.name || 'Business'}.json`, {
      returnType: 'GSTR-3B',
      gstin: currentBusiness?.gstin,
      businessName: currentBusiness?.name,
      generatedAt: new Date().toISOString(),
      period: gst.period,
      summary: {
        totalSales: gst.sales?.totalSales || 0,
        totalTaxableSales: gst.sales?.totalTaxableSales || 0,
        totalPurchases: gst.purchases?.totalPurchases || 0,
        totalTaxablePurchases: gst.purchases?.totalTaxablePurchases || 0,
        outputTax: {
          cgst: gst.sales?.cgstCollected || 0,
          sgst: gst.sales?.sgstCollected || 0,
          igst: gst.sales?.igstCollected || 0,
          cess: gst.sales?.cessCollected || 0,
        },
        inputTaxCredit: {
          cgst: gst.purchases?.cgstPaid || 0,
          sgst: gst.purchases?.sgstPaid || 0,
          igst: gst.purchases?.igstPaid || 0,
          cess: gst.purchases?.cessPaid || 0,
        },
        netTax: gst.netTax || {},
      },
    });
    toast.success('GSTR-3B JSON downloaded');
  };

  const chartData = useMemo(
    () => [
      { name: 'Income', value: pl?.income?.sales || 0, color: '#4f46e5' },
      { name: 'Expenses', value: pl?.expenses?.totalExpenses || 0, color: '#f43f5e' },
      { name: 'Net Profit', value: Math.max(pl?.profit?.netProfit || 0, 0), color: '#10b981' },
    ],
    [pl]
  );

  const handleTrialBalanceExport = () => {
    if (!trialBalance) return;
    const data = trialBalance.ledgerAccounts.map(acc => ({
      'Account Name': acc.name,
      'Type': acc.type,
      'Debit (₹)': acc.debit,
      'Credit (₹)': acc.credit,
    }));
    downloadExcel(`Trial_Balance_${currentBusiness?.name || 'Business'}`, data, ['Account Name', 'Type', 'Debit (₹)', 'Credit (₹)']);
    toast.success('Trial Balance exported to Excel');
  };

  const handleBalanceSheetExport = () => {
    if (!balanceSheet) return;
    const data = [
      ...Object.entries(balanceSheet.assets.currentAssets).map(([name, value]) => ({ Section: 'Assets', Account: name, Amount: value })),
      { Section: 'Assets', Account: 'TOTAL CURRENT ASSETS', Amount: balanceSheet.assets.totalCurrentAssets },
      ...Object.entries(balanceSheet.liabilities.currentLiabilities).map(([name, value]) => ({ Section: 'Liabilities', Account: name, Amount: value })),
      { Section: 'Liabilities', Account: 'TOTAL CURRENT LIABILITIES', Amount: balanceSheet.liabilities.totalCurrentLiabilities },
      ...Object.entries(balanceSheet.equity).map(([name, value]) => ({ Section: 'Equity', Account: name, Amount: value })),
      { Section: 'Equity', Account: 'TOTAL EQUITY', Amount: balanceSheet.summary.totalEquity },
    ];
    downloadExcel(`Balance_Sheet_${currentBusiness?.name || 'Business'}`, data, ['Section', 'Account', 'Amount']);
    toast.success('Balance Sheet exported to Excel');
  };

  const handleBillWiseProfitExport = () => {
    if (!billWiseProfit?.invoices?.length) return;
    const data = [
      ...billWiseProfit.invoices.map(inv => ({
        'DATE': new Date(inv.date).toLocaleDateString('en-GB'),
        'INVOICE NO': inv.invoiceNumber,
        'PARTY': inv.partyName,
        'TOTAL SALE AMOUNT': inv.totalAmount,
        'PROFIT (+) / LOSS (-)': inv.profit
      })),
      {}, // Spacer
      {
        'DATE': 'SUMMARY',
        'TOTAL SALE AMOUNT': billWiseProfit.summary.totalSaleAmount,
        'PROFIT (+) / LOSS (-)': billWiseProfit.summary.totalProfit
      }
    ];
    downloadExcel(`Bill_Wise_Profit_Report_${currentBusiness?.name}`, data, ['DATE', 'INVOICE NO', 'PARTY', 'TOTAL SALE AMOUNT', 'PROFIT (+) / LOSS (-)']);
    toast.success('Excel Report downloaded');
  };

  const handleProfitLossExport = () => {
    if (!pl) return;
    const data = [
      { Category: 'INCOME', Particulars: 'Gross Sales', Amount: pl.income.sales },
      { Category: 'INCOME', Particulars: 'Taxes Collected', Amount: pl.income.taxCollected },
      { Category: 'INCOME', Particulars: 'Deductions (Discounts)', Amount: -pl.income.discountGiven },
      { Category: 'INCOME', Particulars: 'NET OPERATING REVENUE', Amount: pl.income.netSales },
      {},
      { Category: 'EXPENSES', Particulars: 'Total Purchases', Amount: pl.expenses.purchases },
      { Category: 'EXPENSES', Particulars: 'Operating Expenses', Amount: pl.expenses.operatingExpenses },
      { Category: 'EXPENSES', Particulars: 'TOTAL OPERATING EXPENSES', Amount: pl.expenses.totalExpenses },
      {},
      { Category: 'PROFIT/LOSS', Particulars: 'GROSS PROFIT', Amount: pl.profit.grossProfit },
      { Category: 'PROFIT/LOSS', Particulars: 'NET PROFIT', Amount: pl.profit.netProfit },
    ];
    downloadExcel(`Profit_Loss_Report_${currentBusiness?.name}`, data, ['Category', 'Particulars', 'Amount']);
    toast.success('P&L Report downloaded');
  };

  const handleGstExcelExport = () => {
    if (!gst) return;
    const data = [
      { Type: 'Sales (Output Tax)', 'Taxable Value': gst.sales.totalTaxableSales, CGST: gst.sales.cgstCollected, SGST: gst.sales.sgstCollected, IGST: gst.sales.igstCollected, Total: gst.sales.totalTax },
      { Type: 'Purchases (ITC)', 'Taxable Value': gst.purchases.totalTaxablePurchases, CGST: gst.purchases.cgstPaid, SGST: gst.purchases.sgstPaid, IGST: gst.purchases.igstPaid, Total: gst.purchases.totalTax },
      {},
      { Type: 'NET PAYABLE', CGST: gst.netTax.cgst, SGST: gst.netTax.sgst, IGST: gst.netTax.igst, Total: gst.netTax.cgst + gst.netTax.sgst + gst.netTax.igst }
    ];
    downloadExcel(`GST_Summary_${currentBusiness?.name}`, data, ['Type', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Total']);
    toast.success('GST Excel Report downloaded');
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'CREATE': return 'bg-emerald-100 text-emerald-700';
      case 'UPDATE': return 'bg-blue-100 text-blue-700';
      case 'DELETE': return 'bg-rose-100 text-rose-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Financial Reports</h1>
          <p className="text-sm text-gray-400 font-medium mt-1">Comprehensive accounting and GST compliance reports.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" icon={Download} onClick={handleExportPL} loading={isExporting}>Export PDF</Button>
          <Button icon={PieChart} onClick={() => setShowAnalytics(true)}>Analytics</Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Reports Sidebar */}
        <Card className="w-full md:w-64 !p-2 border-none shadow-xl shadow-gray-200/50 flex-shrink-0">
          <div className="space-y-4">
            {REPORT_SECTIONS.map((section) => (
              <div key={section.id} className="space-y-1">
                <p className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">{section.label}</p>
                {section.tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition-all',
                      activeTab === tab.id 
                        ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' 
                        : 'text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </Card>

        {/* Main Report Area */}
        <div className="flex-1 space-y-6 w-full overflow-hidden">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <h2 className="text-2xl font-black text-slate-950 uppercase tracking-tighter">
              {activeTab.replace(/-/g, ' ')}
            </h2>
            
            {activeTab !== 'day-book' && activeTab !== 'party-ledger' && activeTab !== 'cash-book' && activeTab !== 'audit' && (
              <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-slate-100">
                <Calendar className="w-4 h-4 text-slate-400 ml-2" />
                <select
                  className="bg-transparent border-none rounded-lg px-2 py-2 text-xs font-black text-slate-900 focus:ring-0"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                >
                  {DATE_RANGES.map((range) => (
                    <option key={range.id} value={range.id}>{range.label}</option>
                  ))}
                </select>
                {dateRange === 'custom' && (
                  <div className="flex items-center gap-2 pr-2">
                    <input
                      type="date"
                      className="border-none bg-slate-50 rounded-lg px-2 py-1 text-xs font-bold"
                      value={customDates.fromDate}
                      onChange={(e) => setCustomDates(prev => ({ ...prev, fromDate: e.target.value }))}
                    />
                    <span className="text-[10px] font-black text-slate-300">TO</span>
                    <input
                      type="date"
                      className="border-none bg-slate-50 rounded-lg px-2 py-1 text-xs font-bold"
                      value={customDates.toDate}
                      onChange={(e) => setCustomDates(prev => ({ ...prev, toDate: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

      <AnimatePresence mode="wait">
        {activeTab === 'bill-wise-profit' && (
          <motion.div key="bill-profit" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">PROFIT ON SALE INVOICES</h3>
              <div className="flex gap-2">
                <button 
                  onClick={handleBillWiseProfitExport}
                  className="p-2 border border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                >
                   <FileSpreadsheet className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => window.print()}
                  className="p-2 border border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                >
                   <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>

            <Card className="!p-0 overflow-hidden border border-slate-100 shadow-sm rounded-none">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <tr>
                    <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 flex items-center gap-1">DATE <ChevronDown className="w-3 h-3"/></th>
                    <th className="px-4 py-3 cursor-pointer hover:bg-slate-100">INVOICE NO <ChevronDown className="w-3 h-3 inline ml-1"/></th>
                    <th className="px-4 py-3 cursor-pointer hover:bg-slate-100">PARTY</th>
                    <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 text-right">TOTAL SALE AMOUNT</th>
                    <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 text-right">PROFIT (+) / LOSS (-) <ChevronDown className="w-3 h-3 inline ml-1"/></th>
                    <th className="px-4 py-3 text-center">DETAILS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {billWiseProfit?.invoices?.map((inv, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-4 py-4 text-sm font-medium text-slate-600">{new Date(inv.date).toLocaleDateString('en-GB')}</td>
                      <td className="px-4 py-4 text-sm font-medium text-slate-600">{inv.invoiceNumber}</td>
                      <td className="px-4 py-4 text-sm font-medium text-slate-600">{inv.partyName}</td>
                      <td className="px-4 py-4 text-right text-sm font-medium text-slate-600">₹ {inv.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className={cn("px-4 py-4 text-right text-sm font-medium", inv.profit >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
                        {inv.profit < 0 && '- '}₹ {Math.abs(inv.profit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">Show &gt;</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!billWiseProfit?.invoices || billWiseProfit.invoices.length === 0) && (
                <div className="p-20 text-center text-slate-300">
                   <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-20" />
                   <p className="font-black uppercase tracking-widest text-xs">No transactions found for the selected period</p>
                </div>
              )}
            </Card>

            {/* Bottom Summary Panel */}
            <div className="pt-10 space-y-2 border-t border-slate-100 mt-20">
               <p className="text-sm font-black text-slate-900 uppercase tracking-widest">Summary</p>
               <div className="flex gap-10">
                  <div>
                    <span className="text-xs font-bold text-slate-500">Total Sale Amount: </span>
                    <span className="text-sm font-black text-slate-900">₹ {billWiseProfit?.summary?.totalSaleAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-500">Total Profit(+)/Loss(-): </span>
                    <span className={cn("text-sm font-black", (billWiseProfit?.summary?.totalProfit || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
                      ₹ {(billWiseProfit?.summary?.totalProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
               </div>
            </div>
          </motion.div>
        )}

        {/* Overview & Analytics */}
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
               <Card className="!p-6 border-none shadow-xl shadow-indigo-100/50 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white">
                  <div className="flex justify-between items-start">
                     <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Total Revenue</p>
                     <div className="p-2 bg-white/20 rounded-xl"><TrendingUp className="w-4 h-4" /></div>
                  </div>
                  <h3 className="text-3xl font-black mt-4">₹{(plData?.data?.income?.netSales || 0).toLocaleString()}</h3>
                  <p className="text-xs font-bold mt-2 text-indigo-100 flex items-center gap-1">
                     <ArrowUpRight className="w-3 h-3" /> +12.5% vs last month
                  </p>
               </Card>
               <Card className="!p-6 border-none shadow-xl shadow-emerald-100/50 bg-white">
                  <div className="flex justify-between items-start">
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Net Profit</p>
                     <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><BarChart3 className="w-4 h-4" /></div>
                  </div>
                  <h3 className="text-3xl font-black mt-4 text-slate-900">₹{(plData?.data?.profit?.netProfit || 0).toLocaleString()}</h3>
                  <div className="mt-4 flex items-center gap-2">
                     <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 w-[65%]" />
                     </div>
                     <span className="text-[10px] font-black text-emerald-600">65%</span>
                  </div>
               </Card>
               <Card className="!p-6 border-none shadow-xl shadow-blue-100/50 bg-white">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Profit Margin</p>
                  <h3 className="text-3xl font-black mt-4 text-slate-900">{plData?.data?.profit?.profitMargin || 0}%</h3>
                  <p className="text-xs font-bold text-slate-400 mt-2 uppercase">Industry Avg: 18%</p>
               </Card>
               <Card className="!p-6 border-none shadow-xl shadow-slate-100/50 bg-white">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Items</p>
                  <h3 className="text-3xl font-black mt-4 text-slate-900">{stockSummary?.items?.length || 0}</h3>
                  <p className="text-xs font-bold text-slate-400 mt-2">Valuation: ₹{(stockSummary?.totalValuation || 0).toLocaleString()}</p>
               </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <Card className="!p-8 bg-white border border-slate-100 shadow-sm rounded-3xl">
                  <div className="flex items-center justify-between mb-8">
                     <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Revenue trend</h3>
                     <Badge variant="outline" className="text-[10px] font-black">Monthly View</Badge>
                  </div>
                  <div className="h-[300px] w-full">
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={[
                          { name: 'Jan', value: 4000 }, { name: 'Feb', value: 3000 }, { name: 'Mar', value: 5000 },
                          { name: 'Apr', value: 6500 }, { name: 'May', value: 8000 }, { name: 'Jun', value: 7000 }
                        ]}>
                           <defs>
                              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                                 <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                              </linearGradient>
                           </defs>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                           <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                           <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                           <Area type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                        </AreaChart>
                     </ResponsiveContainer>
                  </div>
               </Card>

               <Card className="!p-8 bg-white border border-slate-100 shadow-sm rounded-3xl">
                  <div className="flex items-center justify-between mb-8">
                     <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Cash Flow dynamics</h3>
                     <div className="flex gap-2">
                        <div className="flex items-center gap-1.5">
                           <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                           <span className="text-[10px] font-black uppercase text-slate-400">In</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                           <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                           <span className="text-[10px] font-black uppercase text-slate-400">Out</span>
                        </div>
                     </div>
                  </div>
                  <div className="h-[300px] w-full">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { name: 'W1', in: 4000, out: 2400 }, { name: 'W2', in: 3000, out: 1398 },
                          { name: 'W3', in: 2000, out: 4800 }, { name: 'W4', in: 2780, out: 3908 }
                        ]}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                           <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                           <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                           <Bar dataKey="in" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                           <Bar dataKey="out" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </Card>
            </div>
          </motion.div>
        )}

        {activeTab === 'profit-loss' && (
          <motion.div key="pl" id="pl-report" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SummaryCard title="Total Sales" value={pl?.income?.sales || 0} icon={TrendingUp} color="emerald" />
              <SummaryCard title="Total Expenses" value={pl?.expenses?.totalExpenses || 0} icon={TrendingDown} color="rose" />
              <SummaryCard title="Net Profit" value={pl?.profit?.netProfit || 0} icon={BarChart3} color="indigo" />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="secondary" icon={FileSpreadsheet} onClick={handleProfitLossExport}>Export Excel</Button>
              <Button variant="secondary" icon={Printer} onClick={() => window.print()}>Print Report</Button>
            </div>

            <Card className="!p-8 border-none shadow-xl shadow-gray-200/50">
              <h3 className="text-xl font-black text-gray-900 tracking-tight mb-8">P&L Detailed Breakdown</h3>
              <div className="space-y-6">
                <BreakdownRow label="Gross Sales" value={pl?.income?.sales} sub="Combined value of all invoices" />
                <BreakdownRow label="Taxes Collected" value={pl?.income?.taxCollected} sub="CGST + SGST + IGST" />
                <BreakdownRow label="Discounts Given" value={pl?.income?.discountGiven} sub="Deducted at source" color="rose" />
                <div className="h-px bg-gray-100 my-4" />
                <BreakdownRow label="Net Operating Revenue" value={pl?.income?.netSales} sub="Gross sales minus discounts" bold />
                <BreakdownRow label="Total Operating Expenses" value={pl?.expenses?.totalExpenses} sub="Purchases and overheads" color="rose" />
                <div className="pt-6 border-t-2 border-gray-900 mt-6 flex justify-between items-center">
                  <div>
                    <h4 className="text-xl font-black text-gray-900">Net Profit / Loss</h4>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-tighter">Accrual Basis Period</p>
                  </div>
                  <p className={cn("text-3xl font-black", (pl?.profit?.netProfit >= 0) ? 'text-indigo-600' : 'text-rose-600')}>
                    ₹{(pl?.profit?.netProfit || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {activeTab === 'balance-sheet' && (
          <motion.div key="balancesheet" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-950">Balance Sheet</h3>
                <p className="text-sm text-slate-500 mt-1 font-bold">As on {balanceSheet?.period?.asOnDate || new Date().toLocaleDateString()}</p>
              </div>
              <Button variant="secondary" icon={FileSpreadsheet} onClick={handleBalanceSheetExport}>Export Excel</Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="!p-6 border-none shadow-xl shadow-gray-200/50">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900">Assets</h3>
                    <p className="text-sm text-gray-400">What the business owns</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {Object.entries(balanceSheet?.assets?.currentAssets || {}).map(([name, value]) => (
                    <div key={name} className="flex justify-between items-center py-2 border-b border-gray-100 group">
                      <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900">{name}</span>
                      <span className="font-black text-gray-900">₹{(value || 0).toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-3 border-t-2 border-gray-200">
                    <span className="text-sm font-black text-gray-900">Total Assets</span>
                    <span className="text-lg font-black text-emerald-600">₹{(balanceSheet?.assets?.totalCurrentAssets || 0).toLocaleString()}</span>
                  </div>
                </div>
              </Card>

              <div className="space-y-8">
                <Card className="!p-6 border-none shadow-xl shadow-gray-200/50">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-rose-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-900">Liabilities</h3>
                      <p className="text-sm text-gray-400">What the business owes</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(balanceSheet?.liabilities?.currentLiabilities || {}).map(([name, value]) => (
                      <div key={name} className="flex justify-between items-center py-2 border-b border-gray-100 group">
                        <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900">{name}</span>
                        <span className="font-black text-gray-900">₹{(value || 0).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-3 border-t-2 border-gray-200">
                      <span className="text-sm font-black text-gray-900">Total Liabilities</span>
                      <span className="text-lg font-black text-rose-600">₹{(balanceSheet?.liabilities?.totalCurrentLiabilities || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </Card>

                <Card className="!p-6 border-none shadow-xl shadow-gray-200/50">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-900">Equity</h3>
                      <p className="text-sm text-gray-400">Owner's stake in the business</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(balanceSheet?.equity || {}).map(([name, value]) => (
                      <div key={name} className="flex justify-between items-center py-2 border-b border-gray-100 group">
                        <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900">{name}</span>
                        <span className="font-black text-gray-900">₹{(value || 0).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-3 border-t-2 border-gray-200">
                      <span className="text-sm font-black text-gray-900">Total Equity</span>
                      <span className="text-lg font-black text-indigo-600">₹{(balanceSheet?.summary?.totalEquity || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            <Card className={cn("!p-6 border-2", balanceSheet?.summary?.isBalanced ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50')}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", balanceSheet?.summary?.isBalanced ? 'bg-emerald-500' : 'bg-rose-500')}>
                    <span className="text-white font-black text-sm">{balanceSheet?.summary?.isBalanced ? '✓' : '✗'}</span>
                  </div>
                  <div>
                    <p className="font-black text-gray-900">Balance Sheet Status</p>
                    <p className="text-sm text-gray-500">{balanceSheet?.summary?.isBalanced ? 'Total Assets = Total Liabilities + Equity' : 'Imbalance detected'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Total Assets</p>
                  <p className="text-lg font-black">₹{(balanceSheet?.summary?.totalAssets || 0).toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Liabilities + Equity</p>
                  <p className="text-lg font-black">₹{(balanceSheet?.summary?.totalLiabilities || 0).toLocaleString()}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {activeTab === 'trial-balance' && (
          <motion.div key="trial" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-gray-900">Trial Balance</h3>
                <p className="text-sm text-gray-400 mt-1">List of all ledger accounts with debit/credit balances</p>
              </div>
              <Button variant="secondary" icon={FileSpreadsheet} onClick={handleTrialBalanceExport}>Export Excel</Button>
            </div>

            <Card className="!p-0 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-100 border-b border-slate-300 text-[10px] font-black text-slate-900 uppercase tracking-widest">
                  <tr>
                    <th className="px-4 py-4">Account Name</th>
                    <th className="px-4 py-4">Type</th>
                    <th className="px-4 py-4 text-right">Debit (₹)</th>
                    <th className="px-4 py-4 text-right">Credit (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {trialBalance?.ledgerAccounts?.map((acc, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-indigo-50/30 transition-colors">
                      <td className="px-4 py-3 font-bold text-gray-900">{acc.name}</td>
                      <td className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-indigo-600/70">{acc.type}</td>
                      <td className="px-4 py-3 text-right font-black text-gray-900">{acc.debit > 0 ? `₹${acc.debit.toLocaleString()}` : '-'}</td>
                      <td className="px-4 py-3 text-right font-black text-gray-900">{acc.credit > 0 ? `₹${acc.credit.toLocaleString()}` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 font-black text-gray-900">TOTAL</td>
                    <td className="px-4 py-3 text-right font-black text-gray-900">₹{(trialBalance?.totals?.totalDebits || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-black text-gray-900">₹{(trialBalance?.totals?.totalCredits || 0).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-4 py-2">
                      <div className={cn("text-xs font-black", trialBalance?.totals?.isBalanced ? 'text-emerald-600' : 'text-rose-600')}>
                        {trialBalance?.totals?.isBalanced ? '✓ Trial Balance is Balanced' : `✗ Difference: ₹${trialBalance?.totals?.difference?.toLocaleString()}`}
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </Card>
          </motion.div>
        )}

        {activeTab === 'balances' && (
          <motion.div key="bal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="!p-6 bg-emerald-50 border-none flex items-center gap-6">
                <ArrowUpRight className="w-8 h-8 text-emerald-600" />
                <div>
                  <p className="text-xs font-black text-emerald-600/50 uppercase tracking-widest">Total Receivable</p>
                  <p className="text-2xl font-black text-emerald-700">₹{(balances?.totals?.receivable || 0).toLocaleString()}</p>
                </div>
              </Card>
              <Card className="!p-6 bg-rose-50 border-none flex items-center gap-6">
                <ArrowDownRight className="w-8 h-8 text-rose-600" />
                <div>
                  <p className="text-xs font-black text-rose-600/50 uppercase tracking-widest">Total Payable</p>
                  <p className="text-2xl font-black text-rose-700">₹{(balances?.totals?.payable || 0).toLocaleString()}</p>
                </div>
              </Card>
            </div>

            <Card className="!p-0 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  <tr>
                    <th className="px-4 py-3">Party</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3 text-right">Opening</th>
                    <th className="px-4 py-3 text-right">Closing</th>
                  </tr>
                </thead>
                <tbody>
                  {balances?.parties?.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold">{p.name}</td>
                      <td className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500">{p.partyType}</td>
                      <td className="px-4 py-3 text-right">₹{(p.openingBalance || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-semibold">₹{(p.closingBalance || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </motion.div>
        )}

        {activeTab === 'party-ledger' && (
          <motion.div key="ledger" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <Card className="!p-6 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest font-black text-gray-400">Select Party</p>
                <select className="mt-2 border border-gray-200 rounded-xl px-4 py-2 min-w-64" value={selectedPartyId} onChange={(e) => setSelectedPartyId(e.target.value)}>
                  {partyData?.data?.map((party) => (
                    <option key={party.id} value={party.id}>{party.name}</option>
                  ))}
                </select>
              </div>
              <div className="text-sm text-gray-500">
                Closing Balance: <span className="font-black text-gray-900">₹{(partyLedger?.closingBalance || 0).toLocaleString()}</span>
              </div>
            </Card>

            <Card className="!p-0 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-right">Debit</th>
                    <th className="px-4 py-3 text-right">Credit</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {partyLedger?.ledger?.map((entry) => (
                    <tr key={`${entry.type}-${entry.id}`} className="border-b border-gray-100">
                      <td className="px-4 py-3">{new Date(entry.date).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-3 text-xs uppercase tracking-wider">{entry.type}</td>
                      <td className="px-4 py-3">{entry.description}</td>
                      <td className="px-4 py-3 text-right">₹{(entry.debit || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">₹{(entry.credit || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-semibold">₹{(entry.balance || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </motion.div>
        )}

        {activeTab === 'day-book' && (
          <motion.div key="daybook" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-gray-900">Day Book</h3>
                <p className="text-sm text-gray-400 mt-1">All transactions for a specific date</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="date"
                  className="border border-gray-200 rounded-xl px-4 py-2"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <MiniStat cardColor="emerald" label="Sales" value={dayBook?.summary?.totalSales || 0} />
              <MiniStat cardColor="rose" label="Purchases" value={dayBook?.summary?.totalPurchases || 0} />
              <MiniStat cardColor="orange" label="Expenses" value={dayBook?.summary?.totalExpenses || 0} />
              <MiniStat cardColor="blue" label="Receipts" value={dayBook?.summary?.totalReceipts || 0} />
              <MiniStat cardColor="purple" label="Payments" value={dayBook?.summary?.totalPayments || 0} />
            </div>

            <Card className="!p-0 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  <tr>
                    <th className="px-4 py-3">Voucher Type</th>
                    <th className="px-4 py-3">Number</th>
                    <th className="px-4 py-3">Party</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {dayBook?.vouchers?.invoices?.map((inv) => (
                    <tr key={`inv-${inv.id}`} className="border-b border-gray-100">
                      <td className="px-4 py-3"><span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full font-black">SALE</span></td>
                      <td className="px-4 py-3">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3">{inv.party?.name}</td>
                      <td className="px-4 py-3 text-right font-semibold">₹{(inv.totalAmount || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                  {dayBook?.vouchers?.purchases?.map((pur) => (
                    <tr key={`pur-${pur.id}`} className="border-b border-gray-100">
                      <td className="px-4 py-3"><span className="px-2 py-1 bg-rose-100 text-rose-700 text-xs rounded-full font-black">PURCHASE</span></td>
                      <td className="px-4 py-3">{pur.purchaseNumber}</td>
                      <td className="px-4 py-3">{pur.party?.name}</td>
                      <td className="px-4 py-3 text-right font-semibold">₹{(pur.totalAmount || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                  {dayBook?.vouchers?.expenses?.map((exp) => (
                    <tr key={`exp-${exp.id}`} className="border-b border-gray-100">
                      <td className="px-4 py-3"><span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full font-black">EXPENSE</span></td>
                      <td className="px-4 py-3">{exp.expenseNumber || '-'}</td>
                      <td className="px-4 py-3">{exp.description}</td>
                      <td className="px-4 py-3 text-right font-semibold">₹{(exp.totalAmount || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                  {dayBook?.vouchers?.transactions?.map((t) => (
                    <tr key={`txn-${t.id}`} className="border-b border-gray-100">
                      <td className="px-4 py-3"><span className={cn("px-2 py-1 text-xs rounded-full font-black", t.type === 'RECEIPT' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700')}>{t.type}</span></td>
                      <td className="px-4 py-3">{t.reference || '-'}</td>
                      <td className="px-4 py-3">{t.party?.name || t.narration || '-'}</td>
                      <td className="px-4 py-3 text-right font-semibold">₹{(t.amount || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!dayBook?.vouchers || (dayBook.vouchers.invoices?.length === 0 && dayBook.vouchers.purchases?.length === 0 && dayBook.vouchers.expenses?.length === 0 && dayBook.vouchers.transactions?.length === 0)) && (
                <div className="p-8 text-center text-gray-400">No transactions for this date</div>
              )}
            </Card>
          </motion.div>
        )}

        {activeTab === 'cash-book' && (
          <motion.div key="cashbook" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <Card className="!p-6 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest font-black text-gray-400">Select Account</p>
                  <select
                    className="mt-2 border border-gray-200 rounded-xl px-4 py-2 min-w-64"
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                  >
                    <optgroup label="Bank Accounts">
                      {bankAccounts?.data?.map((acc) => (
                        <option key={acc.id} value={acc.id}>{acc.bankName || 'Bank Account'}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Cash Accounts">
                      {cashAccounts?.data?.map((acc) => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAccountType('bank')}
                    className={cn("px-4 py-2 text-xs font-black rounded-xl", accountType === 'bank' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600')}
                  >
                    Bank
                  </button>
                  <button
                    onClick={() => setAccountType('cash')}
                    className={cn("px-4 py-2 text-xs font-black rounded-xl", accountType === 'cash' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600')}
                  >
                    Cash
                  </button>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                Closing Balance: <span className="font-black text-gray-900">₹{(accountStatement?.summary?.closingBalance || cashBook?.summary?.totalBankBalance || cashBook?.summary?.totalCashInHand || 0).toLocaleString()}</span>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <MiniStat cardColor="emerald" label="Opening Balance" value={accountStatement?.account?.openingBalance || 0} />
              <MiniStat cardColor="blue" label="Total Receipts" value={accountStatement?.summary?.totalReceipts || cashBook?.summary?.totalBankReceipts + cashBook?.summary?.totalCashReceipts || 0} />
              <MiniStat cardColor="purple" label="Total Payments" value={accountStatement?.summary?.totalPayments || cashBook?.summary?.totalBankPayments + cashBook?.summary?.totalCashPayments || 0} />
              <MiniStat cardColor="indigo" label="Closing Balance" value={accountStatement?.summary?.closingBalance || 0} />
            </div>

            <Card className="!p-0 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Party</th>
                    <th className="px-4 py-3">Narration</th>
                    <th className="px-4 py-3 text-right">Receipts</th>
                    <th className="px-4 py-3 text-right">Payments</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {accountStatement?.ledger?.map((entry) => (
                    <tr key={entry.id} className="border-b border-gray-100">
                      <td className="px-4 py-3">{new Date(entry.date).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-3">{entry.reference || '-'}</td>
                      <td className="px-4 py-3">{entry.party?.name || '-'}</td>
                      <td className="px-4 py-3">{entry.narration || '-'}</td>
                      <td className="px-4 py-3 text-right text-emerald-600">{entry.type === 'RECEIPT' ? `₹${entry.amount.toLocaleString()}` : '-'}</td>
                      <td className="px-4 py-3 text-right text-rose-600">{entry.type === 'PAYMENT' ? `₹${entry.amount.toLocaleString()}` : '-'}</td>
                      <td className="px-4 py-3 text-right font-semibold">₹{(entry.runningBalance || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!accountStatement?.ledger || accountStatement.ledger.length === 0) && (
                <div className="p-8 text-center text-gray-400">No transactions for this account in the selected period</div>
              )}
            </Card>
          </motion.div>
        )}

        {(activeTab === 'gst' || activeTab === 'gstr-1' || activeTab === 'gstr-2' || activeTab === 'gstr-3b' || activeTab === 'sale-summary-hsn') && (
          <motion.div key="gst" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm gap-4">
               <div>
                  <h3 className="text-xl font-black text-slate-900 border-l-4 border-indigo-600 pl-4 uppercase tracking-tighter">GST Compliance Module</h3>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest pl-5">Financial Period: {dateRange.toUpperCase()}</p>
               </div>
               <div className="flex flex-wrap gap-2">
                  <div className="flex bg-slate-100 p-1 rounded-xl mr-4">
                    {['Summary', 'B2B', 'B2C', 'HSN'].map(st => (
                      <button
                        key={st}
                        onClick={() => setGstSubTab(st)}
                        className={cn(
                          "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                          gstSubTab === st ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                  <Button variant="secondary" size="sm" icon={FileSpreadsheet} onClick={handleGstExcelExport}>Export XL</Button>
                  <Button variant="primary" size="sm" icon={FileJson} onClick={() => handleGstDownload(activeTab.replace('-', ''))}>
                    JSON
                  </Button>
               </div>
            </div>

            {gstSubTab === 'Summary' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <MiniStat cardColor="rose" label="ITC (Purchases)" value={gst?.purchases?.totalTax || 0} />
                  <MiniStat cardColor="emerald" label="Output (Sales)" value={gst?.sales?.totalTax || 0} />
                  <MiniStat cardColor="indigo" label="Net CGST" value={gst?.netTax?.cgst || 0} />
                  <MiniStat cardColor="indigo" label="Net SGST" value={gst?.netTax?.sgst || 0} />
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <Card className="!p-6 border-none shadow-xl shadow-gray-200/50">
                    <h3 className="text-sm font-black text-slate-900 mb-4 uppercase tracking-widest">Sales Analysis</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                        <div>
                          <p className="text-xs font-black text-emerald-900 uppercase tracking-widest">Registered (B2B)</p>
                          <p className="text-[10px] text-emerald-600 font-bold mt-0.5">{gst?.sales?.b2bCount || 0} Invoices with valid GSTIN</p>
                        </div>
                        <p className="text-xl font-black text-emerald-700 font-mono">₹{(gst?.sales?.b2bValue || 0).toLocaleString()}</p>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                        <div>
                          <p className="text-xs font-black text-blue-900 uppercase tracking-widest">Consumer (B2C)</p>
                          <p className="text-[10px] text-blue-600 font-bold mt-0.5">{gst?.sales?.b2cCount || 0} Small & Large Sales</p>
                        </div>
                        <p className="text-xl font-black text-blue-700 font-mono">₹{(gst?.sales?.b2cValue || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="!p-6 border-none shadow-xl shadow-gray-200/50">
                    <h3 className="text-sm font-black text-slate-900 mb-4 uppercase tracking-widest">Tax Ledger (Sales)</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-4 py-2 bg-slate-50 rounded-xl">
                        <span className="text-[10px] font-black text-slate-500 uppercase">CGST Collected</span>
                        <span className="text-sm font-black text-slate-900">₹{(gst?.sales?.cgstCollected || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center px-4 py-2 bg-slate-50 rounded-xl">
                        <span className="text-[10px] font-black text-slate-500 uppercase">SGST Collected</span>
                        <span className="text-sm font-black text-slate-900">₹{(gst?.sales?.sgstCollected || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center px-4 py-2 bg-slate-50 rounded-xl">
                        <span className="text-[10px] font-black text-slate-500 uppercase">IGST Collected</span>
                        <span className="text-sm font-black text-slate-900">₹{(gst?.sales?.igstCollected || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </Card>
                </div>
              </>
            )}

            {gstSubTab === 'B2B' && (
              <Card className="!p-0 border-none shadow-xl shadow-gray-200/50 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Invoice Details</th>
                      <th className="px-6 py-4">Recipient Info</th>
                      <th className="px-6 py-4 text-right">Taxable Value</th>
                      <th className="px-6 py-4 text-right">Total Tax</th>
                      <th className="px-6 py-4 text-right">Total Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {gst?.sales?.b2bInvoices?.map((inv, idx) => (
                      <tr key={idx} className="hover:bg-indigo-50/30 transition-colors group">
                        <td className="px-6 py-4">
                           <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{inv.invoiceNumber}</p>
                           <p className="text-[10px] text-slate-400 font-bold mt-0.5">{new Date(inv.date).toLocaleDateString()}</p>
                        </td>
                        <td className="px-6 py-4">
                           <p className="text-xs font-black text-slate-900 uppercase tracking-tighter">{inv.partyName}</p>
                           <p className="text-[10px] text-indigo-600 font-black mt-0.5 tracking-widest">{inv.partyGstin}</p>
                        </td>
                        <td className="px-6 py-4 text-right text-xs font-bold font-mono">₹{(inv.taxableAmount || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 text-right text-xs font-black text-indigo-600 font-mono">₹{(inv.cgst + inv.sgst + inv.igst || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 text-right text-xs font-black text-slate-950 font-mono">₹{(inv.totalAmount || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}

            {gstSubTab === 'B2C' && (
              <Card className="!p-0 border-none shadow-xl shadow-gray-200/50 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Invoice Details</th>
                      <th className="px-6 py-4 text-right">Taxable Value</th>
                      <th className="px-6 py-4 text-right">Total Tax</th>
                      <th className="px-6 py-4 text-right">Total Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {gst?.sales?.b2cInvoices?.map((inv, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                           <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{inv.invoiceNumber}</p>
                           <p className="text-[10px] text-slate-400 font-bold mt-0.5">{new Date(inv.date).toLocaleDateString()}</p>
                        </td>
                        <td className="px-6 py-4 text-right text-xs font-bold font-mono">₹{(inv.taxableAmount || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 text-right text-xs font-black text-indigo-600 font-mono">₹{(inv.cgst + inv.sgst + inv.igst || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 text-right text-xs font-black text-slate-950 font-mono">₹{(inv.totalAmount || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}

            {gstSubTab === 'HSN' && (
              <Card className="!p-0 border-none shadow-xl shadow-gray-200/50 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-4">HSN Code</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4 text-center">Qty</th>
                      <th className="px-6 py-4 text-right">Taxable</th>
                      <th className="px-6 py-4 text-right">CGST</th>
                      <th className="px-6 py-4 text-right">SGST</th>
                      <th className="px-6 py-4 text-right">IGST</th>
                      <th className="px-6 py-4 text-right">Total Tax</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {gst?.hsnSummary?.map((hsn, idx) => (
                      <tr key={idx} className="border-b border-gray-100 group">
                        <td className="px-6 py-4 font-black text-xs text-slate-900 tracking-widest">{hsn.hsnCode}</td>
                        <td className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase">Product Category</td>
                        <td className="px-6 py-4 text-center text-xs font-bold">{hsn.quantity}</td>
                        <td className="px-6 py-4 text-right text-xs font-bold font-mono">₹{(hsn.taxableAmount || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 text-right text-xs font-bold font-mono">₹{(hsn.cgstAmount || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 text-right text-xs font-bold font-mono">₹{(hsn.sgstAmount || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 text-right text-xs font-bold font-mono">₹{(hsn.igstAmount || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 text-right font-black text-indigo-600 text-xs font-mono">₹{(hsn.cgstAmount + hsn.sgstAmount + hsn.igstAmount || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </motion.div>
        )}

        {(activeTab === 'party-ledger' || activeTab === 'balances') && (
           <motion.div key="party-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div>
                   <h3 className="text-xl font-black text-slate-900 border-l-4 border-indigo-600 pl-4 uppercase tracking-tighter">Party Statement</h3>
                   <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest pl-5">Ledger reconciliation for {parties?.find(p => p.id === selectedPartyId)?.name || 'Selected Party'}</p>
                </div>
                <div className="flex gap-4">
                   <select 
                     className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-black focus:ring-2 focus:ring-indigo-600/20"
                     value={selectedPartyId}
                     onChange={(e) => setSelectedPartyId(e.target.value)}
                   >
                     <option value="">Select Party</option>
                     {parties?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                   </select>
                   <Button variant="secondary" icon={FileSpreadsheet}>Export Statement</Button>
                </div>
              </div>
              <Card className="!p-0 overflow-hidden border border-slate-100 shadow-sm rounded-2xl">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <tr>
                      <th className="px-4 py-4">Date</th>
                      <th className="px-4 py-4">Reference</th>
                      <th className="px-4 py-4">Type</th>
                      <th className="px-4 py-4 text-right">Debit / Out</th>
                      <th className="px-4 py-4 text-right">Credit / In</th>
                      <th className="px-4 py-4 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {partyLedger?.ledger?.map((entry, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-4 py-3 text-xs font-bold text-slate-500">{new Date(entry.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-xs font-black text-slate-900 uppercase tracking-tight">{entry.reference}</td>
                        <td className="px-4 py-3 text-xs font-black uppercase text-indigo-600 font-mono tracking-tighter">{entry.type}</td>
                        <td className="px-4 py-3 text-right text-xs font-bold text-rose-500">{entry.debit > 0 ? `₹${(entry.debit || 0).toLocaleString()}` : '-'}</td>
                        <td className="px-4 py-3 text-right text-xs font-bold text-emerald-500">{entry.credit > 0 ? `₹${(entry.credit || 0).toLocaleString()}` : '-'}</td>
                        <td className="px-4 py-3 text-right text-xs font-black text-slate-950">₹{(entry.runningBalance || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!partyLedger?.ledger || partyLedger.ledger.length === 0) && (
                   <div className="p-32 text-center text-slate-300 font-black uppercase tracking-widest text-xs flex flex-col items-center gap-4">
                      <TrendingUp className="w-12 h-12 opacity-20" />
                      Select a party from the dropdown to view statement
                   </div>
                )}
              </Card>
           </motion.div>
        )}

        {activeTab === 'audit' && (
          <motion.div key="audit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-gray-900">Audit Trail</h3>
                <p className="text-sm text-gray-400 mt-1">Track all changes made to business data</p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  value={auditEntityType}
                  onChange={(e) => setAuditEntityType(e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="Invoice">Invoices</option>
                  <option value="Purchase">Purchases</option>
                  <option value="Party">Parties</option>
                  <option value="Item">Items</option>
                  <option value="Expense">Expenses</option>
                </select>
                <Button variant="secondary" icon={FileSpreadsheet} onClick={handleAuditExport}>Export Excel</Button>
              </div>
            </div>

            <Card className="!p-0 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-100 border-b border-slate-300 text-[10px] font-black text-slate-900 uppercase tracking-widest">
                  <tr>
                    <th className="px-4 py-4">Timestamp</th>
                    <th className="px-4 py-4">User</th>
                    <th className="px-4 py-4">Action</th>
                    <th className="px-4 py-4">Entity Type</th>
                    <th className="px-4 py-4">Entity ID</th>
                    <th className="px-4 py-4">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs?.map((log) => (
                    <tr key={log.id} className="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 text-indigo-600" />
                          <span className="text-xs font-bold text-slate-900">{log.createdAt ? new Date(log.createdAt).toLocaleString() : '-'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-black text-slate-900">{log.user?.name || 'System'}</td>
                      <td className="px-4 py-3">
                        <span className={cn("px-2 py-1 text-[10px] rounded-full font-black shadow-sm", getActionColor(log.action))}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-950">{log.entityType}</td>
                      <td className="px-4 py-3 text-[10px] font-mono font-bold text-indigo-900 bg-indigo-50/50 px-2 py-1 rounded">{log.entityId?.slice(0, 8)}...</td>
                      <td className="px-4 py-3 text-xs font-medium text-slate-800 max-w-xs truncate">
                        {log.description || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!auditLogs || auditLogs.length === 0) && (
                <div className="p-8 text-center text-gray-400">
                  <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  No audit logs found
                </div>
              )}
            </Card>

            {auditPagination && auditPagination.pages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing page {auditPagination.page} of {auditPagination.pages} ({auditPagination.total} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={auditPage === 1}
                    onClick={() => setAuditPage(prev => prev - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={auditPage >= auditPagination.pages}
                    onClick={() => setAuditPage(prev => prev + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}
        {activeTab === 'stock-summary' && (
          <motion.div key="stock" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 border-l-4 border-emerald-500 pl-4 uppercase tracking-tighter">Inventory Valuation</h3>
                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest pl-5">Total Stock Asset Value: ₹{stockSummary?.totalValuation?.toLocaleString()}</p>
              </div>
              <Button variant="secondary" icon={FileSpreadsheet} onClick={() => downloadExcel(`Stock_Summary_${currentBusiness.name}`, stockSummary?.items || [], ['name', 'sku', 'currentStock', 'valuationPrice', 'totalValuation'])}>Export Stock Sheet</Button>
            </div>
            
            <Card className="!p-0 overflow-hidden border border-slate-100 rounded-2xl shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-[#f8fafc] border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Item Name</th>
                    <th className="px-6 py-4">SKU/HSN</th>
                    <th className="px-6 py-4 text-center">Closing Stock</th>
                    <th className="px-6 py-4 text-right">Valuation Rate</th>
                    <th className="px-6 py-4 text-right">Asset Value (₹)</th>
                    <th className="px-6 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {stockSummary?.items?.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-black text-slate-950">{item.name}</td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-tighter">{item.sku || 'N/A'} | {item.hsnCode || '-'}</td>
                      <td className="px-6 py-4 text-center text-sm font-black text-slate-900">{item.currentStock}</td>
                      <td className="px-6 py-4 text-right text-xs font-bold text-slate-500">₹{item.valuationPrice.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-sm font-black text-slate-950">₹{(item.totalValuation).toLocaleString()}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn("px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest", item.currentStock <= item.minStockLevel ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700')}>
                          {item.currentStock <= item.minStockLevel ? 'Critical Low' : 'In Stock'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </motion.div>
        )}

        {activeTab === 'sac-report' && (
          <motion.div key="sac" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900 border-l-4 border-indigo-600 pl-4 uppercase tracking-tighter">SAC Report (Services Summary)</h3>
              <Button variant="secondary" icon={FileSpreadsheet} onClick={() => downloadExcel(`SAC_Report_${currentBusiness.name}`, sacReport?.sacCodes || [], ['sacCode', 'taxableAmount', 'totalTax', 'totalAmount'])}>Export Excel</Button>
            </div>
            <Card className="!p-0 overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-[#f8fafc] border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-4">SAC CODE</th>
                    <th className="px-6 py-4 text-right">Taxable Amount</th>
                    <th className="px-6 py-4 text-right">CGST</th>
                    <th className="px-6 py-4 text-right">SGST</th>
                    <th className="px-6 py-4 text-right">IGST</th>
                    <th className="px-6 py-4 text-right font-black">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sacReport?.sacCodes?.map((s) => (
                    <tr key={s.sacCode} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-black font-mono text-indigo-600">{s.sacCode}</td>
                      <td className="px-6 py-4 text-right font-bold">₹{s.taxableAmount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-slate-500">₹{s.cgst.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-slate-500">₹{s.sgst.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-slate-500">₹{s.igst.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right font-black text-slate-900">₹{s.totalAmount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!sacReport?.sacCodes || sacReport.sacCodes.length === 0) && (
                <div className="p-20 text-center text-slate-300 font-bold uppercase tracking-widest">No Service Transactions found for this period</div>
              )}
            </Card>
          </motion.div>
        )}

        {activeTab === 'item-wise-profit' && (
          <motion.div key="item-profit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900 border-l-4 border-emerald-500 pl-4 uppercase tracking-tighter">Item-wise Profitability</h3>
              <Button variant="secondary" icon={FileSpreadsheet} onClick={() => downloadExcel(`Item_Profitability_${currentBusiness.name}`, itemProfit || [], ['name', 'quantitySold', 'saleAmount', 'profit'])}>Export Excel</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {itemProfit?.slice(0, 4).map(item => (
                <Card key={item.name} className="!p-4 bg-white border border-slate-100 shadow-sm">
                   <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest truncate">{item.name}</p>
                   <p className="text-xl font-black text-indigo-600 mt-1">₹{item.profit.toLocaleString()}</p>
                   <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: '70%' }} />
                   </div>
                </Card>
              ))}
            </div>
            <Card className="!p-0 overflow-hidden border border-slate-100 rounded-2xl shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-[#f8fafc] border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Item Identity</th>
                    <th className="px-6 py-4 text-center">Qty Sold</th>
                    <th className="px-6 py-4 text-right">Revenue</th>
                    <th className="px-6 py-4 text-right">Est. Cost</th>
                    <th className="px-6 py-4 text-right">Est. Profit</th>
                    <th className="px-6 py-4 text-center">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {itemProfit?.map((item) => (
                    <tr key={item.name} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-black">{item.name}</td>
                      <td className="px-6 py-4 text-center font-bold text-slate-500">{item.quantitySold}</td>
                      <td className="px-6 py-4 text-right font-black">₹{item.saleAmount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-rose-500">₹{item.costAmount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-emerald-600 font-black">₹{item.profit.toLocaleString()}</td>
                      <td className="px-6 py-4 text-center">
                         <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-full font-black text-[10px]">30.0%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
        </div> {/* flex-1 space-y-6 */}
      </div> {/* flex flex-col md:flex-row gap-6 */}

      <AnalyticsModal isOpen={showAnalytics} onClose={() => setShowAnalytics(false)} chartData={chartData} />
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon, color }) {
  const themes = {
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    indigo: 'bg-indigo-600 text-white shadow-indigo-200',
  };
  return (
    <Card className={cn('!p-8 border-none shadow-xl shadow-gray-200/50', themes[color])}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-black uppercase tracking-widest opacity-60">{title}</p>
          <p className="text-3xl font-black mt-2 tracking-tight">₹{(value || 0).toLocaleString()}</p>
        </div>
        <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center', color === 'indigo' ? 'bg-white/20' : 'bg-white')}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
  );
}

function BreakdownRow({ label, value, sub, bold, color = 'indigo' }) {
  return (
    <div className="flex justify-between items-center group">
      <div className="flex items-center gap-4">
        <div className={cn("w-1.5 h-1.5 rounded-full", color === 'rose' ? 'bg-rose-500' : 'bg-indigo-600')} />
        <div>
          <p className={cn("text-sm transition-all", bold ? "font-black text-gray-900 text-lg" : "font-black text-gray-900")}>{label}</p>
          <p className="text-[10px] text-indigo-600/60 font-black uppercase tracking-widest">{sub}</p>
        </div>
      </div>
      <p className={cn("text-lg", bold ? "font-black text-gray-900" : "font-black", color === 'rose' ? 'text-rose-500' : 'text-gray-900')}>
        {color === 'rose' ? '-' : '+'}₹{(value || 0).toLocaleString()}
      </p>
    </div>
  );
}

function AnalyticsModal({ isOpen, onClose, chartData }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Advanced Financial Analytics" maxWidth="3xl">
      <Card className="!p-6 border-none bg-gray-50 flex flex-col items-center">
        <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">Profitability Mix</h4>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RePie>
              <Pie data={chartData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </RePie>
          </ResponsiveContainer>
        </div>
      </Card>
    </Modal>
  );
}

function MiniStat({ label, value, cardColor }) {
  const colors = {
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
  };

  return (
    <Card className={cn('!p-4 border-none shadow-sm', colors[cardColor] || 'bg-gray-50')}>
      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-900/40">{label}</p>
      <p className="text-xl font-black mt-1 text-gray-900">₹{(value || 0).toLocaleString()}</p>
    </Card>
  );
}

export default Reports;
