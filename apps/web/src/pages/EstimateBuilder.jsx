import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Save, Download, Printer, Mail,
  ChevronLeft, ChevronDown, ChevronRight, Search,
  Calendar, CreditCard, FileText, User, ShoppingBag,
  Percent, Hash, AlertCircle, CheckCircle2, MoreVertical,
  MinusCircle, FileCheck, Building2, Eye, ExternalLink,
  Info, ArrowLeft, ArrowRight, Settings, Calculator,
  X, FileSearch
} from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import { useBusinessStore } from '../store/auth';
import { Button, Input, Select, Card, Badge, Modal, Portal, cn } from '../components/ui';
import toast from 'react-hot-toast';
import { calculateDocumentTotals, numberToWords } from '@artha/common';
import { EstimateTemplateAlphesh } from '../components/invoices/EstimateTemplateAlphesh';

const GST_OPTIONS = [
  { value: 0, label: 'No Tax (0%)' },
  { value: 5, label: 'GST (5%)' },
  { value: 12, label: 'GST (12%)' },
  { value: 18, label: 'GST (18%)' },
  { value: 28, label: 'GST (28%)' },
];

const ITEM_UNITS = [
  'NOS', 'PCS', 'KGS', 'MTR', 'BOX', 'HRS', 'DAYS', 'LS'
];

function EstimateBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentBusiness } = useBusinessStore();
  const isEdit = !!id;

  // ── Form State ─────────────────────────────
  const [formData, setFormData] = useState({
    estimateNumber: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    expiryDate: format(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    partyId: '',
    partyName: '',
    poNumber: '',
    stateOfSupply: '',
    notes: 'Thank you for your business!',
    terms: '1. Quotation valid for 15 days from date of issue.\n2. 50% advance payment required to start work.\n3. Taxes as applicable.',
    isTaxInclusive: false,
    status: 'DRAFT'
  });

  const [items, setItems] = useState([
    { id: '1', itemId: '', description: '', hsnCode: '', quantity: 1, unit: 'NOS', rate: 0, taxRate: 18, discountPercent: 0 }
  ]);

  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ── Queries ────────────────────────────────
  const { data: partiesData } = useQuery({
    queryKey: ['parties', currentBusiness?.id],
    queryFn: () => api.get(`/parties/business/${currentBusiness.id}`).then(r => r.data),
    enabled: !!currentBusiness?.id,
  });

  const { data: productsData } = useQuery({
    queryKey: ['items', currentBusiness?.id],
    queryFn: () => api.get(`/items/business/${currentBusiness.id}`).then(r => r.data),
    enabled: !!currentBusiness?.id,
  });

  const { data: estimateData, isLoading: isLoadingEstimate } = useQuery({
    queryKey: ['estimate', id],
    queryFn: () => api.get(`/estimates/${id}`).then(r => r.data),
    enabled: isEdit,
  });

  const { data: nextNumberData } = useQuery({
    queryKey: ['next-estimate-number', currentBusiness?.id],
    queryFn: () => api.get(`/settings/${currentBusiness.id}/next-number/estimate`).then(r => r.data),
    enabled: !!currentBusiness?.id && !isEdit,
  });

  // ── Effects ────────────────────────────────
  useEffect(() => {
    if (estimateData?.data) {
      const est = estimateData.data;
      setFormData({
        estimateNumber: est.estimateNumber,
        date: format(new Date(est.date), 'yyyy-MM-dd'),
        expiryDate: est.expiryDate ? format(new Date(est.expiryDate), 'yyyy-MM-dd') : '',
        partyId: est.partyId,
        poNumber: est.poNumber || '',
        stateOfSupply: est.stateOfSupply || '',
        notes: est.notes || '',
        terms: est.terms || '',
        isTaxInclusive: est.isTaxInclusive || false,
        status: est.status
      });
      setItems(est.items?.length > 0 ? est.items.map(i => ({
        ...i,
        id: i.id || Math.random().toString(36).substr(2, 9),
        taxRate: (i.cgstRate || 0) + (i.sgstRate || 0) + (i.igstRate || 0)
      })) : [{ id: '1', itemId: '', description: '', hsnCode: '', quantity: 1, unit: 'NOS', rate: 0, taxRate: 18, discountPercent: 0 }]);
    } else if (!isEdit && nextNumberData?.data?.nextNumber) {
      setFormData(prev => ({ ...prev, estimateNumber: nextNumberData.data.nextNumber }));
    }
  }, [estimateData, nextNumberData, isEdit]);

  // ── Calculations ───────────────────────────
  const totals = useMemo(() => {
    const mappedItems = items.map(i => ({
      ...i,
      cgstRate: i.taxRate / 2,
      sgstRate: i.taxRate / 2,
    }));
    return calculateDocumentTotals(mappedItems, 0, 0, formData.isTaxInclusive);
  }, [items, formData.isTaxInclusive]);

  // ── Actions ────────────────────────────────
  const mutation = useMutation({
    mutationFn: (data) => isEdit ? api.put(`/estimates/${id}`, data) : api.post('/estimates', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['estimates']);
      toast.success(isEdit ? 'Updated' : 'Created');
      navigate('/estimates');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Error occurred')
  });

  const handleSave = async (status = 'DRAFT') => {
    if (!formData.partyId) return toast.error('Please select a customer');
    if (items.some(i => !i.description && !i.itemId)) return toast.error('Check line items');

    const party = partiesData?.data?.find(p => p.id === formData.partyId);

    const { items: processedItems, subtotal, totalTax, cgstAmount, sgstAmount, totalAmount } = totals;

    mutation.mutate({
      ...formData,
      status,
      businessId: currentBusiness.id,
      partyName: party?.name || '',
      subtotal,
      totalTax,
      cgstAmount,
      sgstAmount,
      igstAmount: 0,
      totalAmount,
      amountInWords: numberToWords(totalAmount),
      items: processedItems
    });
  };

  const addItemRow = () => {
    setItems([...items, { id: Math.random().toString(), itemId: '', description: '', hsnCode: '', quantity: 1, unit: 'NOS', rate: 0, taxRate: 18, discountPercent: 0 }]);
  };

  const removeItemRow = (rid) => {
    if (items.length > 1) setItems(items.filter(i => i.id !== rid));
  };

  const updateItem = (rid, field, value) => {
    setItems(items.map(i => {
      if (i.id === rid) {
        const up = { ...i, [field]: value };
        if (field === 'itemId' && value) {
          const p = productsData?.data?.find(x => x.id === value);
          if (p) {
            up.description = p.name;
            up.hsnCode = p.hsnCode;
            up.rate = p.sellingPrice;
            up.taxRate = p.taxRate;
            up.unit = p.unit;
          }
        }
        return up;
      }
      return i;
    }));
  };

  const selectedParty = partiesData?.data?.find(p => p.id === formData.partyId);

  if (isLoadingEstimate) return <div className="flex h-screen items-center justify-center bg-slate-50 font-bold text-slate-400">Loading Builder...</div>;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">

      {/* ── TOP BAR ────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 h-16 bg-slate-900 text-white z-[60] flex items-center justify-between px-6 shadow-2xl no-print">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-800 rounded-xl transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="h-8 w-px bg-slate-800 mx-1" />
          <div>
            <h1 className="text-sm font-black uppercase tracking-widest text-white leading-none">Estimate Builder</h1>
            <p className="text-[10px] font-bold text-indigo-400 mt-1 uppercase tracking-widest">{formData.estimateNumber || 'Drafting'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => handleSave('DRAFT')} className="px-5 py-2 text-xs font-bold text-slate-400 hover:text-white transition-all uppercase tracking-widest">
            Save Draft
          </button>
          <button
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-2 px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all border border-slate-700 shadow-lg"
          >
            <Eye className="w-3.5 h-3.5" /> PREVIEW
          </button>
          <button
            onClick={() => handleSave('SENT')}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-xl shadow-indigo-600/20"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> FINALIZE
          </button>
        </div>
      </header>

      {/* ── MAIN BODY ──────────────────────────────── */}
      <main className="flex-1 mt-16 p-6 overflow-auto no-print">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Customer & Quote Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Entity Block */}
            <section className="lg:col-span-2 surface p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <User className="w-3 h-3 text-indigo-500" /> Customer Information
                </h2>
                <button className="text-[10px] font-bold text-indigo-600 hover:underline uppercase tracking-widest">+ New Party</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Customer</label>
                  <div className="relative">
                    <select
                      className="input-base !bg-slate-50"
                      value={formData.partyId || ''}
                      onChange={(e) => {
                        const found = partiesData?.data?.find(p => p.id === e.target.value);
                        if (found) {
                          setFormData({ ...formData, partyId: found.id, partyName: found.name });
                        }
                      }}
                    >
                      <option value="">Select customer...</option>
                      {partiesData?.data?.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  {!formData.partyId && (
                    <button
                      type="button"
                      onClick={async () => {
                        const name = prompt('Enter new customer name:');
                        if (!name?.trim()) return;
                        try {
                          const res = await api.post('/parties', {
                            businessId: currentBusiness.id,
                            name: name.trim(),
                            partyType: 'CUSTOMER',
                          });
                          if (res.data.success) {
                            setFormData({ ...formData, partyId: res.data.data.id, partyName: res.data.data.name });
                            toast.success('Customer created!');
                          }
                        } catch (err) { toast.error('Failed to create customer'); }
                      }}
                      className="btn-primary !py-1.5 !text-xs"
                    >
                      + Add New Customer
                    </button>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Phone / Mobile</label>
                  <input readOnly disabled className="input-base !bg-slate-100/50 cursor-not-allowed" value={selectedParty?.phone || '—'} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Billing Address</label>
                <textarea
                  readOnly disabled
                  className="input-base !bg-slate-100/50 cursor-not-allowed min-h-[60px]"
                  value={selectedParty?.address || (formData.partyName ? '(New customer)' : 'Select a customer to see address details')}
                />
              </div>
            </section>

            {/* Attributes Block */}
            <section className="surface p-6 space-y-5">
              <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <FileSearch className="w-3 h-3 text-amber-500" /> Reference Meta
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ref Number</label>
                    <input
                      className="input-base"
                      placeholder="EST-00X"
                      value={formData.estimateNumber}
                      onChange={(e) => setFormData({ ...formData, estimateNumber: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">PO Number</label>
                    <input
                      className="input-base"
                      placeholder="OPTIONAL"
                      value={formData.poNumber}
                      onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</label>
                    <input
                      type="date"
                      className="input-base"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Expires On</label>
                    <input
                      type="date"
                      className="input-base text-rose-600 font-bold"
                      value={formData.expiryDate}
                      onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">State of Supply</label>
                  <input
                    className="input-base"
                    placeholder="e.g. Maharashtra"
                    value={formData.stateOfSupply}
                    onChange={(e) => setFormData({ ...formData, stateOfSupply: e.target.value })}
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Line Items Table */}
          <section className="surface overflow-hidden">
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-4">
                <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Items & Services</h2>
                <div className="flex bg-slate-200 p-1 rounded-lg">
                  <button
                    onClick={() => setFormData({ ...formData, isTaxInclusive: false })}
                    className={cn('px-3 py-1 text-[9px] font-black rounded-md transition-all', !formData.isTaxInclusive ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500')}
                  >EXCLUSIVE</button>
                  <button
                    onClick={() => setFormData({ ...formData, isTaxInclusive: true })}
                    className={cn('px-3 py-1 text-[9px] font-black rounded-md transition-all', formData.isTaxInclusive ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500')}
                  >INCLUSIVE</button>
                </div>
              </div>
              <button onClick={addItemRow} className="btn-secondary !py-1.5 !px-3 !text-[10px] !rounded-lg border-indigo-100 text-indigo-600 hover:bg-indigo-50">
                <Plus className="w-3 h-3" /> ADD LINE ITEM
              </button>
            </div>

            <table className="data-table">
              <thead className="!bg-slate-50/50">
                <tr>
                  <th className="!w-12 !text-center">#</th>
                  <th className="!w-[30%]">Product / Description</th>
                  <th>Unit</th>
                  <th className="!w-24">Quantity</th>
                  <th className="!text-right !w-32">Rate ({formData.isTaxInclusive ? 'Inc' : 'Exc'})</th>
                  <th className="!w-28">GST %</th>
                  <th className="!text-right !w-36">Net Amount</th>
                  <th className="!w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it, idx) => (
                  <tr key={it.id} className="hover:bg-indigo-50/20 transition-colors group">
                    <td className="text-center text-xs font-bold text-slate-300">{idx + 1}</td>
                    <td>
                      <div className="space-y-1.5 p-1">
                          <select
                            className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 focus:border-indigo-400 outline-none"
                            value={it.itemId || ''}
                            onChange={(e) => {
                              const found = productsData?.data?.find(p => p.id === e.target.value);
                              if (found) {
                                setItems(items.map(i => i.id === it.id ? {
                                  ...i,
                                  itemId: found.id,
                                  description: found.name,
                                  rate: found.sellingPrice || 0,
                                  taxRate: found.taxRate || 0,
                                  unit: found.unit || i.unit,
                                } : i));
                              }
                            }}
                          >
                            <option value="">Select item...</option>
                            {productsData?.data?.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                        {!it.itemId && it.description && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (!it.description?.trim()) return;
                              try {
                                const res = await api.post('/items', {
                                  businessId: currentBusiness.id,
                                  name: it.description,
                                  sellingPrice: it.rate || 0,
                                  taxRate: it.taxRate || 18,
                                  unit: it.unit || 'NOS',
                                });
                                if (res.data.success) {
                                  updateItem(it.id, 'itemId', res.data.data.id);
                                  toast.success('Item created!');
                                }
                              } catch (err) { toast.error('Failed to create item'); }
                            }}
                            className="btn-primary !py-1 !text-[10px]"
                          >
                            + Add New Item
                          </button>
                        )}
                        <input
                          className="w-full bg-transparent border-none p-1 text-xs text-slate-500 font-medium focus:ring-0 placeholder:italic"
                          placeholder="Line item description detail..."
                          value={it.description}
                          onChange={(e) => updateItem(it.id, 'description', e.target.value)}
                        />
                    </td>
                    <td>
                      <select
                        className="w-full bg-transparent border-none text-xs font-bold text-slate-700 focus:ring-0 appearance-none text-center"
                        value={it.unit}
                        onChange={(e) => updateItem(it.id, 'unit', e.target.value)}
                      >
                        {ITEM_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        className="w-full bg-slate-100 border-none rounded-lg px-2 py-2 text-center text-sm font-black text-slate-900 focus:ring-2 focus:ring-indigo-100 outline-none"
                        value={it.quantity}
                        onChange={(e) => updateItem(it.id, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td className="text-right">
                       <div className="flex items-center gap-1 justify-end">
                         <span className="text-[10px] text-slate-300 font-black">₹</span>
                         <input
                          type="number"
                          className="w-24 bg-transparent border-none p-1 text-right text-sm font-black text-slate-900 focus:ring-0"
                          value={it.rate}
                          onChange={(e) => updateItem(it.id, 'rate', parseFloat(e.target.value) || 0)}
                        />
                       </div>
                    </td>
                    <td>
                      <select
                        className="w-full bg-transparent border-none p-1 text-center text-sm font-bold text-slate-700 focus:ring-0 appearance-none"
                        value={it.taxRate}
                        onChange={(e) => updateItem(it.id, 'taxRate', parseFloat(e.target.value) || 0)}
                      >
                        {GST_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <p className="text-sm font-black text-slate-900 pr-2">
                        {(() => {
                           const sub = it.quantity * it.rate;
                           if (formData.isTaxInclusive) return `₹${sub.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
                           return `₹${(sub * (1 + it.taxRate/100)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
                        })()}
                      </p>
                    </td>
                    <td>
                      <button onClick={() => removeItemRow(it.id)} className="p-2 text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Footer Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
            <div className="space-y-4">
              <div className="surface p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Info className="w-3 h-3" /> Notes
                  </label>
                  <textarea
                    rows={2}
                    className="input-base !bg-slate-50 min-h-[80px]"
                    placeholder="Message to customer..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Terms & Conditions</label>
                  <textarea
                    rows={4}
                    className="input-base !bg-slate-50 italic text-slate-600 text-[11px]"
                    value={formData.terms}
                    onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
               <div className="surface p-8 bg-slate-900 text-white relative overflow-hidden">
                  {/* Decorative icon */}
                  <Calculator className="absolute -bottom-4 -right-4 w-32 h-32 text-white/5 rotate-12" />
                  
                  <div className="relative z-10 space-y-4">
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="text-xs font-bold uppercase tracking-widest">Subtotal ({formData.isTaxInclusive ? 'Inclusive' : 'Exclusive'})</span>
                      <span className="text-base font-bold text-white">₹{(totals?.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="text-xs font-bold uppercase tracking-widest">Calculated TAX (GST)</span>
                      <span className="text-base font-bold text-indigo-400">₹{(totals?.tax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="h-px bg-white/10 my-4" />
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Final Amount</p>
                        <h3 className="text-4xl font-black text-white tracking-tighter">₹{(totals?.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                      </div>
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 italic mt-4 max-w-[80%] uppercase leading-relaxed">
                      Rupees {numberToWords(Math.round(totals.totalAmount))} Only
                    </p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── PREVIEW MODAL ─────────────────────────── */}
      <AnimatePresence>
        {showPreview && (
          <Portal>
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 no-print">
              <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 15 }}
                className="bg-slate-100 rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden"
              >
                <div className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-lg">
                      <FileCheck className="w-4 h-4 text-indigo-600" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Quotation Preview</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => window.print()} className="btn-secondary !py-1.5 !px-3 !text-[11px] !rounded-lg"><Printer className="w-3.5 h-3.5" /> PRINT</button>
                    <button onClick={() => setShowPreview(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><X className="w-5 h-5" /></button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-12 bg-slate-300/30 flex justify-center custom-scrollbar">
                   <div className="bg-white shadow-2xl origin-top" style={{ transform: 'scale(0.9)' }}>
                     <EstimateTemplateAlphesh
                        invoice={{ ...formData, amountInWords: numberToWords(Math.round(totals.totalAmount)) }}
                        business={currentBusiness}
                        party={selectedParty}
                        items={items}
                        totals={{ subtotal: totals.subtotal, total: totals.totalAmount }}
                      />
                   </div>
                </div>

                <div className="h-16 bg-white border-t border-slate-200 px-6 flex items-center justify-between">
                   <p className="text-[10px] font-bold text-slate-400 italic">Previewing standard A4 document layout</p>
                   <button
                    onClick={() => handleSave('SENT')}
                    className="btn-primary !py-2 !px-6 !text-xs"
                   >Issue Official Quote</button>
                </div>
              </motion.div>
            </div>

            {/* Print Area Overlay */}
            <div id="print-root" className="fixed inset-0 hidden print:block bg-white z-[99999]">
              <EstimateTemplateAlphesh
                invoice={{ ...formData, amountInWords: numberToWords(Math.round(totals.totalAmount)) }}
                business={currentBusiness}
                party={selectedParty}
                items={items}
                totals={{ subtotal: totals.subtotal, total: totals.totalAmount }}
              />
            </div>
          </Portal>
        )}
      </AnimatePresence>
    </div>
  );
}

export default EstimateBuilder;
