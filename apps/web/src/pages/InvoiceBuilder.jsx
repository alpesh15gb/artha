import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Save, Download, Printer, Mail,
  ChevronLeft, ChevronDown, ChevronRight, Search,
  Calendar, CreditCard, FileText, User, ShoppingBag,
  Percent, Hash, AlertCircle, CheckCircle2, MoreVertical,
  MinusCircle, Building2, Eye, ExternalLink, Tag,
  Send, FileCheck, Truck, ShieldCheck, Zap, X, Calculator, ArrowLeft, Info
} from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import { useBusinessStore } from '../store/auth';
import { Button, Input, Select, Card, Badge, Modal, Portal, cn } from '../components/ui';
import toast from 'react-hot-toast';
import { calculateDocumentTotals, numberToWords } from '@artha/common';
import { InvoiceTemplate1 } from '../components/invoices/InvoiceTemplate1';

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

function InvoiceBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentBusiness } = useBusinessStore();
  const isEdit = !!id;

  // ── Form State ─────────────────────────────
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    dueDate: format(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    partyId: '',
    partyName: '',
    poNumber: '',
    stateOfSupply: '',
    invoiceType: 'TAX_INVOICE',
    notes: 'Thank you for your business!',
    terms: '1. Payment is due within 15 days.\n2. Please include invoice number in payment reference.\n3. Goods once sold will not be taken back.',
    isTaxInclusive: false,
    status: 'DRAFT',
    // Transport
    transportMode: '',
    vehicleNo: '',
    lrNo: '',
    lrDate: '',
    totalBoxes: '',
    // Tax details
    irn: '',
    ackNo: '',
    ackDate: '',
  });

  const [items, setItems] = useState([
    { id: '1', itemId: '', description: '', hsnCode: '', quantity: 1, unit: 'NOS', rate: 0, taxRate: 18, discountPercent: 0 }
  ]);

  const [showPreview, setShowPreview] = useState(false);

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

  const { data: invoiceData, isLoading: isLoadingInvoice } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => api.get(`/invoices/${id}`).then(r => r.data),
    enabled: isEdit,
  });

  const { data: nextNumberData } = useQuery({
    queryKey: ['next-invoice-number', currentBusiness?.id],
    queryFn: () => api.get(`/settings/${currentBusiness.id}/next-number/invoice`).then(r => r.data),
    enabled: !!currentBusiness?.id && !isEdit,
  });

  // ── Populating ─────────────────────────────
  useEffect(() => {
    if (invoiceData?.data) {
      const inv = invoiceData.data;
      setFormData({
        ...inv,
        date: format(new Date(inv.date), 'yyyy-MM-dd'),
        dueDate: inv.dueDate ? format(new Date(inv.dueDate), 'yyyy-MM-dd') : '',
        lrDate: inv.lrDate ? format(new Date(inv.lrDate), 'yyyy-MM-dd') : '',
        ackDate: inv.ackDate ? format(new Date(inv.ackDate), 'yyyy-MM-dd') : '',
        poNumber: inv.poNumber || '',
        isTaxInclusive: inv.isTaxInclusive || false,
      });
      setItems(inv.items?.map(i => ({
        ...i,
        id: i.id || Math.random().toString(),
        taxRate: (i.cgstRate || 0) + (i.sgstRate || 0) + (i.igstRate || 0)
      })) || []);
    } else if (!isEdit && nextNumberData?.data?.nextNumber) {
      setFormData(prev => ({ ...prev, invoiceNumber: nextNumberData.data.nextNumber }));
    }
  }, [invoiceData, nextNumberData, isEdit]);

  // ── Calculations ───────────────────────────
  const totals = useMemo(() => {
    // Map taxRate to cgst/sgst rates for the common engine
    const mappedItems = items.map(i => ({
      ...i,
      cgstRate: i.taxRate / 2,
      sgstRate: i.taxRate / 2,
    }));
    return calculateDocumentTotals(mappedItems, 0, 0, formData.isTaxInclusive);
  }, [items, formData.isTaxInclusive]);

  // ── API Handlers ───────────────────────────
  const mutation = useMutation({
    mutationFn: (data) => isEdit ? api.put(`/invoices/${id}`, data) : api.post('/invoices', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['invoices']);
      toast.success(isEdit ? 'Invoice Updated' : 'Invoice Created');
      navigate('/invoices');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Transaction failed')
  });

  const handleSave = (status = 'DRAFT') => {
    if (!formData.partyId) return toast.error('Check entity identity');
    
    // Use the totals calculated from the shared engine
    const { items: processedItems, subtotal, totalTax, cgstAmount, sgstAmount, totalAmount } = totals;

    mutation.mutate({
      ...formData,
      status,
      businessId: currentBusiness.id,
      totalBoxes: formData.totalBoxes ? parseInt(formData.totalBoxes) : null,
      subtotal,
      totalTax,
      cgstAmount,
      sgstAmount,
      totalAmount,
      balanceDue: status === 'PAID' ? 0 : totalAmount,
      amountInWords: numberToWords(totalAmount),
      items: processedItems
    });
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

  if (isLoadingInvoice) return <div className="flex h-screen items-center justify-center bg-slate-50 font-bold text-slate-400">Syncing Transaction...</div>;

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
            <h1 className="text-sm font-black uppercase tracking-widest text-white leading-none">Sale Invoice</h1>
            <p className="text-[10px] font-bold text-emerald-400 mt-1 uppercase tracking-widest">{formData.invoiceNumber || 'NEW SESSION'}</p>
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
            <CheckCircle2 className="w-3.5 h-3.5" /> ISSUE INVOICE
          </button>
        </div>
      </header>

      {/* ── MAIN BODY ──────────────────────────────── */}
      <main className="flex-1 mt-16 p-6 overflow-auto custom-scrollbar no-print">
        <div className="max-w-6xl mx-auto space-y-6 pb-20">

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Customer Details */}
            <section className="lg:col-span-2 surface p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-indigo-600 rounded-full" /> Customer Information
                </h2>
                <div className="flex gap-4">
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
                      + Add New
                    </button>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">GST Number</label>
                  <input readOnly disabled className="input-base !bg-slate-100/50 uppercase font-black" value={selectedParty?.gstin || 'NOT PROVIDED'} />
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

            {/* Date & Ref Block */}
            <section className="surface p-6 space-y-5">
              <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                <div className="w-1.5 h-4 bg-amber-500 rounded-full" /> Date & Logic
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Invoice Date</label>
                    <input type="date" className="input-base" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Due Date</label>
                    <input type="date" className="input-base text-rose-600 font-bold" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Order Ref (PO)</label>
                    <input className="input-base" placeholder="Optional PO#" value={formData.poNumber} onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })} />
                  </div>
                   <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Place of Supply</label>
                    <input className="input-base" placeholder="State" value={formData.stateOfSupply} onChange={(e) => setFormData({ ...formData, stateOfSupply: e.target.value })} />
                  </div>
                </div>

                <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center justify-between">
                   <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Tax Inclusive Mode</span>
                   <button
                    onClick={() => setFormData({...formData, isTaxInclusive: !formData.isTaxInclusive})}
                    className={cn('w-10 h-5 rounded-full transition-all relative', formData.isTaxInclusive ? 'bg-indigo-600' : 'bg-slate-200')}
                   >
                     <div className={cn('absolute top-1 w-3 h-3 bg-white rounded-full transition-all', formData.isTaxInclusive ? 'right-1' : 'left-1')} />
                   </button>
                </div>
              </div>
            </section>
          </div>

          {/* Items Table */}
          <section className="surface overflow-hidden">
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
                 <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                   <div className="w-1.5 h-4 bg-indigo-600 rounded-full" /> Line Items
                 </h2>
                <button onClick={() => setItems([...items, { id: Math.random().toString(), itemId: '', description: '', hsnCode: '', quantity: 1, unit: 'NOS', rate: 0, taxRate: 18, discountPercent: 0 }])} className="btn-secondary !py-1.5 !px-3 !text-[10px] !rounded-lg border-indigo-100 text-indigo-600">
                  <Plus className="w-3 h-3" /> ADD ITEM
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
                                taxRate: found.taxRate || 18,
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
                                  setItems(items.map(i => i.id === it.id ? { ...i, itemId: res.data.data.id } : i));
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
                          className="w-full bg-transparent border-none p-1 text-xs text-slate-500 font-medium focus:ring-0"
                          placeholder="Line item description detail..."
                          value={it.description}
                          onChange={(e) => setItems(items.map(i => i.id === it.id ? { ...i, description: e.target.value } : i))}
                        />
                      </div>
                    </td>
                    <td>
                      <select className="input-base !bg-transparent !border-none !p-0 !text-center !text-xs font-bold" value={it.unit} onChange={e => updateItem(it.id, 'unit', e.target.value)}>
                        {ITEM_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </td>
                    <td>
                      <input type="number" className="input-base !bg-slate-100/50 !border-none !p-2 !text-center !text-sm font-black" value={it.quantity} onChange={e => updateItem(it.id, 'quantity', parseFloat(e.target.value) || 0)} />
                    </td>
                    <td className="text-right">
                       <input type="number" className="w-full bg-transparent border-none p-1 text-right text-sm font-black text-slate-900" value={it.rate} onChange={e => updateItem(it.id, 'rate', parseFloat(e.target.value) || 0)} />
                    </td>
                    <td>
                      <select className="w-full bg-transparent border-none text-center text-xs font-bold" value={it.taxRate} onChange={e => updateItem(it.id, 'taxRate', parseFloat(e.target.value) || 0)}>
                        {GST_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                    <td className="text-right">
                      <p className="text-sm font-black text-slate-900 pr-2">
                        {(() => {
                           const sub = it.quantity * it.rate;
                           if (formData.isTaxInclusive) return `₹${sub.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
                           return `₹${(sub * (1 + it.taxRate/100)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
                        })()}
                      </p>
                    </td>
                    <td>
                      <button onClick={() => updateItem(it.id, 'id', null)} className="p-2 text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Transport & Shipping */}
          <section className="surface p-6 space-y-5">
             <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
               <div className="w-1.5 h-4 bg-indigo-600 rounded-full" /> Logistics & Transport
             </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mode</label>
                  <input className="input-base !py-2" placeholder="Road/Air" value={formData.transportMode} onChange={e => setFormData({...formData, transportMode: e.target.value})} />
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Vehicle No</label>
                  <input className="input-base !py-2 uppercase" placeholder="MH-XX-..." value={formData.vehicleNo} onChange={e => setFormData({...formData, vehicleNo: e.target.value})} />
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">LR / Doc No</label>
                  <input className="input-base !py-2" placeholder="LR-123" value={formData.lrNo} onChange={e => setFormData({...formData, lrNo: e.target.value})} />
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">LR Date</label>
                  <input type="date" className="input-base !py-2" value={formData.lrDate} onChange={e => setFormData({...formData, lrDate: e.target.value})} />
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Boxes</label>
                  <input type="number" className="input-base !py-2" value={formData.totalBoxes} onChange={e => setFormData({...formData, totalBoxes: e.target.value})} />
               </div>
            </div>
          </section>

          {/* Summary Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <section className="surface p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notes & Description</label>
                  <textarea rows={2} className="input-base !bg-slate-50 min-h-[80px]" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Statutory Terms</label>
                  <textarea rows={3} className="input-base !bg-slate-50 text-[10px] font-semibold italic" value={formData.terms} onChange={e => setFormData({...formData, terms: e.target.value})} />
                </div>
             </section>

              <section className="surface p-8 bg-[#0f172a] text-white relative flex flex-col justify-center overflow-hidden shadow-2xl">
                 <Calculator className="absolute -bottom-6 -right-6 w-40 h-40 text-white/5 rotate-12" />
                 <div className="relative z-10 space-y-5">
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Net Taxable Value</span>
                      <span className="text-xl font-black text-white font-header">₹{(totals?.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Aggregate GST</span>
                      <span className="text-xl font-black text-indigo-400 font-header">₹{(totals?.totalTax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="h-px bg-white/10 my-2" />
                    <div className="py-2">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-2 leading-none">Total Payable Amount</p>
                      <h2 className="text-6xl font-black tracking-tighter text-white font-header leading-none">
                        ₹{(totals?.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                        <span className="text-2xl opacity-60 ml-1">.00</span>
                      </h2>
                    </div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-4">Rupees {numberToWords(Math.round(totals?.totalAmount || 0))} ONLY</p>
                 </div>
              </section>
          </div>
        </div>
      </main>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && (
          <Portal>
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 no-print">
              <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: 15 }}
                className="bg-slate-100 rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden"
              >
                <div className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Invoice Preview</h3>
                  </div>
                  <button onClick={() => setShowPreview(false)} className="p-2 text-slate-400 hover:text-slate-900"><X /></button>
                </div>
                <div className="flex-1 overflow-auto p-12 bg-slate-300/30 flex justify-center">
                   <div className="bg-white shadow-2xl origin-top" style={{ transform: 'scale(0.85)' }}>
                     <InvoiceTemplate1
                        invoice={{ ...formData, amountInWords: numberToWords(Math.round(totals.totalAmount)) }}
                        business={currentBusiness}
                        party={selectedParty}
                        items={items}
                        totals={{ subtotal: totals.subtotal, cgst: totals.totalTax/2, sgst: totals.totalTax/2, total: totals.totalAmount }}
                      />
                   </div>
                </div>
                <div className="h-16 bg-white border-t border-slate-200 px-6 flex items-center justify-between">
                   <button onClick={() => window.print()} className="btn-secondary">PRINT DOCUMENT</button>
                   <button onClick={() => handleSave('SENT')} className="btn-primary px-8">ACTIVATE TRANSACTION</button>
                </div>
              </motion.div>
            </div>
          </Portal>
        )}
      </AnimatePresence>
    </div>
  );
}

export default InvoiceBuilder;
