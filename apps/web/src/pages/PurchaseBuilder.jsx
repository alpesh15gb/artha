import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Save, Download, Printer, Mail,
  ChevronLeft, ChevronDown, ChevronRight, Search,
  Calendar, CreditCard, FileText, User, ShoppingBag,
  Percent, Hash, AlertCircle, CheckCircle2, MoreVertical,
  MinusCircle, ShoppingCart, Box, Eye, Building2, Package,
  Calculator, ArrowLeft, Info, Receipt, Truck
} from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import { useBusinessStore } from '../store/auth';
import { Button, Input, Select, Card, Badge, Modal, Portal, cn } from '../components/ui';
import toast from 'react-hot-toast';
import { numberToWords } from '../utils/numberToWords';

const GST_OPTIONS = [
  { value: 0, label: '0%' }, { value: 5, label: '5%' }, { value: 12, label: '12%' }, { value: 18, label: '18%' }, { value: 28, label: '28%' },
];

function PurchaseBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentBusiness } = useBusinessStore();
  const isEdit = !!id;

  // ── Form State ─────────────────────────────
  const [formData, setFormData] = useState({
    purchaseNumber: '',
    refNo: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    dueDate: '',
    partyId: '',
    partyName: '',
    notes: '',
    terms: '',
    status: 'RECEIVED',
    isTaxInclusive: false,
    invoiceType: 'PURCHASE_INVOICE'
  });

  const [items, setItems] = useState([
    { id: '1', itemId: '', description: '', hsnCode: '', quantity: 1, unit: 'NOS', rate: 0, taxRate: 18, discountPercent: 0 }
  ]);

  const [showPreview, setShowPreview] = useState(false);

  // ── Queries ────────────────────────────────
  const { data: partiesData } = useQuery({
    queryKey: ['parties', currentBusiness?.id, 'vendors'],
    queryFn: () => api.get(`/parties/business/${currentBusiness.id}`).then(r => r.data),
    enabled: !!currentBusiness?.id,
  });

  const { data: itemsData } = useQuery({
    queryKey: ['items', currentBusiness?.id],
    queryFn: () => api.get(`/items/business/${currentBusiness.id}`).then(r => r.data),
    enabled: !!currentBusiness?.id,
  });

  const { data: purchaseData, isLoading: isLoadingPurchase } = useQuery({
    queryKey: ['purchase', id],
    queryFn: () => api.get(`/purchases/${id}`).then(r => r.data),
    enabled: isEdit,
  });

  const { data: nextNumberData } = useQuery({
    queryKey: ['next-purchase-number', currentBusiness?.id],
    queryFn: () => api.get(`/settings/${currentBusiness.id}/next-number/purchase`).then(r => r.data),
    enabled: !!currentBusiness?.id && !isEdit,
  });

  // ── Populate ───────────────────────────────
  useEffect(() => {
    if (purchaseData?.data) {
      const p = purchaseData.data;
      setFormData({
        ...p,
        date: format(new Date(p.date), 'yyyy-MM-dd'),
        dueDate: p.dueDate ? format(new Date(p.dueDate), 'yyyy-MM-dd') : '',
        isTaxInclusive: p.isTaxInclusive || false,
      });
      setItems(p.items?.map(i => ({
        ...i,
        id: i.id || Math.random().toString(),
        taxRate: (i.cgstRate || 0) + (i.sgstRate || 0) + (i.igstRate || 0)
      })) || []);
    } else if (!isEdit && nextNumberData?.data?.nextNumber) {
      setFormData(prev => ({ ...prev, purchaseNumber: nextNumberData.data.nextNumber }));
    }
  }, [purchaseData, nextNumberData, isEdit]);

  // ── Calculations ───────────────────────────
  const totals = useMemo(() => {
    return items.reduce((acc, item) => {
      const q = item.quantity || 0;
      const r = item.rate || 0;
      const t = item.taxRate || 0;
      const d = item.discountPercent || 0;

      let taxable, tax, total;
      if (formData.isTaxInclusive) {
        total = q * r;
        const disc = total * (d / 100);
        total -= disc;
        taxable = total / (1 + (t / 100));
        tax = total - taxable;
      } else {
        const gross = q * r;
        const disc = gross * (d / 100);
        taxable = gross - disc;
        tax = taxable * (t / 100);
        total = taxable + tax;
      }

      return {
        subtotal: acc.subtotal + taxable,
        tax: acc.tax + tax,
        totalAmount: acc.totalAmount + total
      };
    }, { subtotal: 0, tax: 0, totalAmount: 0 });
  }, [items, formData.isTaxInclusive]);

  // ── API ────────────────────────────────────
  const mutation = useMutation({
    mutationFn: (data) => isEdit ? api.put(`/purchases/${id}`, data) : api.post('/purchases', { ...data, businessId: currentBusiness.id }),
    onSuccess: () => {
      queryClient.invalidateQueries(['purchases']);
      toast.success(isEdit ? 'Bill Updated' : 'Stock Logged');
      navigate('/purchases');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Sync failed')
  });

  const handleSave = (status = 'RECEIVED') => {
    if (!formData.partyId) return toast.error('Select target supplier');
    mutation.mutate({
       ...formData,
       status,
subtotal: totals.subtotal,
        totalAmount: totals.totalAmount,
        balanceDue: totals.totalAmount,
       items: items.map(i => {
          const taxableAmount = (i.quantity || 0) * (i.rate || 0) * (1 - (i.discountPercent || 0) / 100);
          const hTax = i.taxRate / 2;
          return {
             ...i,
             taxableAmount,
             cgstRate: hTax, sgstRate: hTax,
             cgstAmount: taxableAmount * (hTax / 100),
             sgstAmount: taxableAmount * (hTax / 100),
             totalAmount: taxableAmount * (1 + i.taxRate/100)
          };
       })
    });
  };

  const updateItem = (rid, field, value) => {
    setItems(items.map(i => {
      if (rid === i.id) {
        const up = { ...i, [field]: value };
        if (field === 'itemId' && value) {
          const p = itemsData?.data?.find(x => x.id === value);
          if (p) {
            up.description = p.name;
            up.hsnCode = p.hsnCode;
            up.rate = p.purchasePrice || p.sellingPrice;
            up.taxRate = p.taxRate;
            up.unit = p.unit;
          }
        }
        return up;
      } return i;
    }));
  };

  const selectedParty = partiesData?.data?.find(p => p.id === formData.partyId);

  if (isLoadingPurchase) return <div className="flex h-screen items-center justify-center font-bold text-slate-400">Syncing Master Record...</div>;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      
      {/* ── TOP BAR ────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 h-16 bg-slate-900 text-white z-[60] flex items-center justify-between px-6 shadow-2xl">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/purchases')} className="p-2 hover:bg-slate-800 rounded-xl transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="h-8 w-px bg-slate-800 mx-1" />
          <div>
            <h1 className="text-sm font-black uppercase tracking-widest text-white leading-none">Purchase Voucher</h1>
            <p className="text-[10px] font-bold text-indigo-400 mt-1 uppercase tracking-widest leading-none italic font-mono">#{formData.purchaseNumber || 'DRAFT'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => handleSave('DRAFT')} className="px-5 py-2 text-xs font-bold text-slate-400 hover:text-white transition-all uppercase tracking-widest">
            Save Draft
          </button>
          <button
            onClick={() => handleSave('RECEIVED')}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-xl shadow-indigo-600/20"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> COMMIT STOCK
          </button>
        </div>
      </header>

      {/* ── MAIN BODY ──────────────────────────────── */}
      <main className="flex-1 mt-16 p-6 overflow-auto custom-scrollbar no-print">
         <div className="max-w-6xl mx-auto space-y-6 pb-20">
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Vendor Details */}
                <section className="lg:col-span-2 surface p-6 space-y-5">
                   <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                     <User className="w-3 h-3 text-indigo-500" /> Origin Supplier
                   </h2>
<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                       <div className="space-y-1.5">
                         <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Vendor</label>
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
                            <option value="">Select vendor...</option>
                            {partiesData?.data?.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                           </select>
                         </div>
                         {!formData.partyId && (
                           <button
                             type="button"
onClick={async () => {
                                const name = prompt('Enter new vendor name:');
                                if (!name?.trim()) return;
                                try {
                                  const res = await api.post('/parties', {
                                    businessId: currentBusiness.id,
                                    name: name.trim(),
                                    partyType: 'SUPPLIER',
                                  });
                                  if (res.data.success) {
                                    setFormData({ ...formData, partyId: res.data.data.id, partyName: res.data.data.name });
                                    toast.success('Vendor created!');
                                  }
                                } catch (err) { toast.error('Failed to create vendor'); }
                              }}
                             className="btn-primary !py-1.5 !text-xs"
                           >
                             + Add New Vendor
                           </button>
                         )}
                       </div>
                       <div className="space-y-1.5">
                         <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Supplier GSTIN</label>
                         <input readOnly disabled className="input-base !bg-slate-100/50 uppercase font-black" value={selectedParty?.gstin || 'UNREGISTERED'} />
                       </div>
                    </div>
                   <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/50 flex items-center gap-4">
                      <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dispatch From</p>
                        <p className="text-sm font-bold text-slate-700">{selectedParty?.address || 'Specify vendor to load address...'}</p>
                      </div>
                   </div>
                </section>

                {/* Dates & Control */}
                <section className="surface p-6 space-y-5">
                   <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                     <Receipt className="w-3 h-3 text-amber-500" /> Voucher Identity
                   </h2>
                   <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Vendor Bill No.</label>
                        <input className="input-base" placeholder="Enter Supplier Bill #" value={formData.refNo} onChange={e => setFormData({...formData, refNo: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Entry Date</label>
                          <input type="date" className="input-base" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Payable Date</label>
                          <input type="date" className="input-base" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
                        </div>
                      </div>
                      <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center justify-between">
                         <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Input Tax Inclusive</span>
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
                  <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Package className="w-3.5 h-3.5" /> Stock Incoming
                  </h2>
                  <button onClick={() => setItems([...items, { id: Math.random().toString(), itemId: '', description: '', hsnCode: '', quantity: 1, unit: 'NOS', rate: 0, taxRate: 18, discountPercent: 0 }])} className="btn-secondary !py-1.5 !px-3 !text-[10px] !rounded-lg border-indigo-100 text-indigo-600">
                    <Plus className="w-3 h-3" /> ADD LINE
                  </button>
               </div>
               <table className="data-table">
                  <thead className="!bg-slate-50/50">
                    <tr>
                      <th className="!w-12 !text-center">#</th>
                      <th className="!w-[35%]">Resource Item</th>
                      <th className="!text-center">Quantity</th>
                      <th className="!text-right !w-32">Acq. Cost ({formData.isTaxInclusive ? 'Inc' : 'Exc'})</th>
                      <th className="!text-center !w-24">Tax%</th>
                      <th className="!text-right !w-36">Impact Amount</th>
                      <th className="!w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((it, idx) => (
                      <tr key={it.id} className="hover:bg-slate-50/50 group">
                        <td className="text-center text-xs font-bold text-slate-300">{idx+1}</td>
                        <td className="py-4">
                           <div className="space-y-2">
                              <select
                                className="input-base !text-sm font-black"
                                value={it.itemId || ''}
                                onChange={(e) => {
                                  const found = itemsData?.data?.find(p => p.id === e.target.value);
                                  if (found) {
                                    setItems(items.map(i => i.id === it.id ? {
                                      ...i,
                                      itemId: found.id,
                                      description: found.name,
                                      rate: found.purchasePrice || 0,
                                      taxRate: found.taxRate || 18,
                                      unit: found.unit || i.unit,
                                    } : i));
                                  }
                                }}
                              >
                                <option value="">Select item...</option>
                                {itemsData?.data?.map(p => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </select>
                              <input className="w-full bg-transparent text-[11px] font-bold text-slate-400 px-1 border-none outline-none" placeholder="Add specific description..." value={it.description} onChange={e => updateItem(it.id, 'description', e.target.value)} />
                           </div>
                        </td>
                        <td>
                           <div className="flex bg-slate-100 rounded-lg p-1 w-fit mx-auto">
                              <input type="number" className="w-12 bg-transparent text-center text-sm font-black border-none outline-none focus:ring-0" value={it.quantity} onChange={e => updateItem(it.id, 'quantity', parseFloat(e.target.value) || 0)} />
                              <span className="text-[10px] font-black text-slate-400 self-center px-1 uppercase">{it.unit || 'PCS'}</span>
                           </div>
                        </td>
                        <td className="text-right">
                           <input type="number" className="w-full bg-transparent text-right text-sm font-black text-slate-900 border-none outline-none focus:ring-0" value={it.rate} onChange={e => updateItem(it.id, 'rate', parseFloat(e.target.value) || 0)} />
                        </td>
                        <td>
                           <select className="w-full bg-transparent text-center text-xs font-bold border-none outline-none focus:ring-0" value={it.taxRate} onChange={e => updateItem(it.id, 'taxRate', parseFloat(e.target.value))}>
                              {GST_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                           </select>
                        </td>
                        <td className="text-right">
                           <p className="text-sm font-black text-slate-900 pr-2">
                              ₹{(() => {
                                 const sub = (it.quantity || 0) * (it.rate || 0);
                                 if (formData.isTaxInclusive) return sub.toLocaleString('en-IN', { minimumFractionDigits: 2 });
                                 return (sub * (1 + (it.taxRate || 0)/100)).toLocaleString('en-IN', { minimumFractionDigits: 2 });
                              })()}
                           </p>
                        </td>
                        <td>
                           <button onClick={() => setItems(items.filter(x => x.id !== it.id))} className="text-slate-200 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </section>

            {/* Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="surface p-6 space-y-4">
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entry Notes</label>
                      <textarea rows={3} className="input-base !bg-slate-50" placeholder="Internal remarks about this intake..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                   </div>
                </section>
                <section className="surface p-8 bg-slate-900 text-white relative flex flex-col justify-center overflow-hidden">
                   <Calculator className="absolute -bottom-6 -right-6 w-40 h-40 text-white/5 rotate-12" />
                   <div className="relative z-10 space-y-5">
                      <div className="flex justify-between items-center text-slate-400">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Net Value Impact</span>
                        <span className="text-lg font-bold text-white">₹{(totals?.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-400 text-emerald-400">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">IGST/CGST Credit</span>
                        <span className="text-lg font-bold">+ ₹{(totals?.tax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="h-px bg-white/10 my-2" />
                      <div>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-1">Total Payable Balance</p>
                        <h2 className="text-5xl font-black tracking-tighter">₹{(totals?.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h2>
                      </div>
                      <p className="text-[10px] font-bold text-slate-500 italic mt-3 uppercase">RUPEES {numberToWords(Math.round(totals.totalAmount))} ONLY</p>
                   </div>
                </section>
            </div>
         </div>
      </main>
    </div>
  );
}

export default PurchaseBuilder;
