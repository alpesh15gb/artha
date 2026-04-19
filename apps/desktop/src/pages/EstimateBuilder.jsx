import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Trash2, Save, Download, Printer, Mail, 
  ChevronLeft, ChevronDown, ChevronRight, Search, 
  Calendar, CreditCard, FileText, User, ShoppingBag,
  Percent, Hash, AlertCircle, CheckCircle2, MoreVertical,
  MinusCircle, FileCheck, Building2, Eye, ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import { useBusinessStore } from '../store/auth';
import { Button, Input, Select, Card, Badge, Modal, Portal, cn } from '../components/ui';
import toast from 'react-hot-toast';
import { calculateDocumentTotals, numberToWords } from '@artha/common';
import { EstimateTemplateAlphesh } from '../components/invoices/EstimateTemplateAlphesh';

const GST_OPTIONS = [
  { value: 0, label: '0%' },
  { value: 5, label: '5%' },
  { value: 12, label: '12%' },
  { value: 18, label: '18%' },
  { value: 28, label: '28%' },
];

function EstimateBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentBusiness } = useBusinessStore();
  const isEdit = !!id;

  // Form State
  const [formData, setFormData] = useState({
    estimateNumber: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    expiryDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    partyId: '',
    poNumber: '',
    notes: 'Thank you for your interest. Looking forward to working with you.',
    terms: '1. Quote valid for 30 days.\n2. 50% advance for mobilization.',
    status: 'DRAFT'
  });

  const [items, setItems] = useState([
    { id: Math.random().toString(36).substr(2, 9), itemId: '', description: '', hsnCode: '', quantity: 1, unit: 'NOS', rate: 0, taxRate: 18, discountPercent: 0 }
  ]);

  const [showPreview, setShowPreview] = useState(false);

  // Queries
  const { data: partiesResponse } = useQuery({
    queryKey: ['parties', currentBusiness?.id],
    queryFn: () => api.get(`/parties/business/${currentBusiness.id}`).then(r => r.data),
    enabled: !!currentBusiness?.id,
  });

  const { data: itemsResponse } = useQuery({
    queryKey: ['items', currentBusiness?.id],
    queryFn: () => api.get(`/items/business/${currentBusiness.id}`).then(r => r.data),
    enabled: !!currentBusiness?.id,
  });

  const { data: estimateResponse, isLoading: isLoadingEstimate } = useQuery({
    queryKey: ['estimate', id],
    queryFn: () => api.get(`/estimates/${id}`).then(r => r.data),
    enabled: isEdit,
  });

  const { data: nextNumberData } = useQuery({
    queryKey: ['next-number', currentBusiness?.id, 'estimate'],
    queryFn: () => api.get(`/settings/${currentBusiness.id}/next-number/estimate`).then(r => r.data),
    enabled: !!currentBusiness?.id && !isEdit,
  });

  useEffect(() => {
    if (estimateResponse?.data) {
      const est = estimateResponse.data;
      setFormData({
        estimateNumber: est.estimateNumber,
        date: format(new Date(est.date), 'yyyy-MM-dd'),
        expiryDate: est.expiryDate ? format(new Date(est.expiryDate), 'yyyy-MM-dd') : '',
        partyId: est.partyId,
        poNumber: est.poNumber || '',
        notes: est.notes || '',
        terms: est.terms || '',
        status: est.status
      });
      setItems(est.items.map(i => ({
        ...i,
        id: i.id || Math.random().toString(36).substr(2, 9),
        taxRate: (i.cgstRate || 0) + (i.sgstRate || 0) + (i.igstRate || 0)
      })));
    } else if (!isEdit && nextNumberData?.data) {
      setFormData(prev => ({ ...prev, estimateNumber: nextNumberData.data.nextNumber }));
    }
  }, [estimateResponse, isEdit, nextNumberData]);

  const totals = useMemo(() => {
    const mappedItems = items.map(i => ({
      ...i,
      cgstRate: i.taxRate / 2,
      sgstRate: i.taxRate / 2,
    }));
    return calculateDocumentTotals(mappedItems, 0, 0, false); // Desktop estimate currently doesn't have isTaxInclusive in state but should match logic
  }, [items]);

  const updateItem = (id, field, value) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const newItem = { ...item, [field]: value };
        if (field === 'itemId' && value) {
          const selectedItem = itemsResponse?.data?.find(i => i.id === value);
          if (selectedItem) {
            newItem.description = selectedItem.name;
            newItem.rate = selectedItem.sellingPrice;
            newItem.hsnCode = selectedItem.hsnCode;
            newItem.taxRate = selectedItem.taxRate;
          }
        }
        return newItem;
      }
      return item;
    }));
  };

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? api.put(`/estimates/${id}`, data) : api.post('/estimates', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['estimates']);
      toast.success(isEdit ? 'Estimate updated!' : 'Estimate created!');
      navigate('/estimates');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Something went wrong')
  });

  const handleSave = (status = 'DRAFT') => {
    if (!formData.partyId) return toast.error('Please select a party');
    const { items: processedItems, subtotal, totalAmount } = totals;
    const payload = {
      ...formData,
      status,
      businessId: currentBusiness.id,
      address: formData.address || selectedParty?.address || '',
      subtotal,
      totalAmount,
      amountInWords: numberToWords(totalAmount),
      items: processedItems
    };
    mutation.mutate(payload);
  };

  const selectedParty = partiesResponse?.data?.find(p => p.id === formData.partyId);

  if (isLoadingEstimate) return <div className="p-8 text-slate-900 font-black">Loading Quotation Engine...</div>;

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col -m-8">
      {/* Top Professional Header */}
      <div className="bg-[#001a33] text-white px-8 py-4 flex items-center justify-between sticky top-0 z-50 shadow-2xl no-print">
        <div className="flex items-center gap-6 min-w-max">
          <button onClick={() => navigate('/estimates')} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-all">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex flex-col">
             <h1 className="text-xl font-black tracking-tight text-white leading-none whitespace-nowrap">Estimate Builder</h1>
             <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mt-1.5">{formData.estimateNumber || 'NEW QUOTATION'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" className="bg-white/10 border-white/10 text-white hover:bg-white/20" onClick={() => handleSave('DRAFT')}>Save Draft</Button>
          <Button variant="primary" className="bg-indigo-600 hover:bg-indigo-700 border-none" icon={Eye} onClick={() => setShowPreview(true)}>Preview & Send</Button>
          <Button variant="primary" className="bg-emerald-600 hover:bg-emerald-700 border-none px-6" icon={FileCheck} onClick={() => handleSave('SENT')}>Finalize Quote</Button>
        </div>
      </div>

      <div className="flex-1 p-3 flex flex-col items-center overflow-y-auto no-scrollbar no-print">
        <div className="w-full max-w-[1800px] gap-4 flex flex-col pb-10">
          
          {/* Section: Customer & Details */}
          <Card className="!p-5 border border-slate-200 shadow-lg shadow-slate-200/50 rounded-xl bg-white">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 border-l-4 border-indigo-600 pl-4 leading-none">Entity Identity</h3>
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
              <div className="xl:col-span-2 space-y-4">
                <div>
                  <label className="text-[11px] font-black text-slate-950 uppercase tracking-[0.2em] block mb-1.5">Selected Customer:</label>
                  <div className="flex gap-3">
                    <select
                      className="flex-1 h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-base font-black text-slate-950 focus:border-indigo-600 transition-all outline-none"
                      value={formData.partyId}
                      onChange={(e) => setFormData({ ...formData, partyId: e.target.value })}
                    >
                      <option value="">Choose Client...</option>
                      {partiesResponse?.data?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <button className="text-indigo-600 text-[10px] font-black hover:text-indigo-800 uppercase tracking-widest transition-colors">+ NEW</button>
                  </div>
                </div>
                <div>
                  <textarea
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-bold text-slate-900 leading-tight focus:border-indigo-600 outline-none transition-all"
                    placeholder="Enter customer address..."
                    value={formData.address || selectedParty?.address || selectedParty?.billingAddress?.street || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
              </div>

              <div className="xl:col-span-2 grid grid-cols-2 gap-6">
                 <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-950 uppercase tracking-widest block">Quote Date:</label>
                      <Input 
                         type="date" 
                         className="!h-10 !rounded-lg !bg-slate-50 !border-slate-200 !text-base font-black !text-slate-950" 
                         value={formData.date} 
                         onChange={(e) => setFormData({ ...formData, date: e.target.value })} 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-950 uppercase tracking-widest block">Reference #:</label>
                      <Input 
                         className="!h-10 !rounded-lg !bg-slate-50 !border-slate-200 !text-base font-black !text-slate-950" 
                         placeholder="Optional"
                         value={formData.poNumber} 
                         onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })} 
                      />
                    </div>
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-950 uppercase tracking-widest block">Valid Until:</label>
                    <Input 
                       type="date" 
                       className="!h-10 !rounded-lg !bg-slate-50 !border-slate-200 !text-base font-black !text-slate-950" 
                       value={formData.expiryDate} 
                       onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })} 
                    />
                 </div>
              </div>
            </div>
          </Card>

          {/* Section: Line Items */}
          <Card className="!p-0 border border-slate-200 shadow-lg shadow-slate-200/50 rounded-xl bg-white overflow-hidden">
            <div className="px-6 py-3 border-b border-slate-100 flex justify-between items-center bg-white">
               <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] border-l-4 border-indigo-600 pl-4 leading-none">Estimation Scope</h3>
               <button 
                 onClick={() => setItems([...items, { id: Math.random().toString(36).substr(2, 9), itemId: '', description: '', hsnCode: '', quantity: 1, unit: 'NOS', rate: 0, taxRate: 18, discountPercent: 0 }])}
                 className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-50 transition-all px-4 py-2 rounded-lg border border-indigo-100"
               >
                 <Plus className="w-4 h-4" /> ADD ITEM
               </button>
            </div>
            
            <div className="max-h-[35vh] overflow-y-auto no-scrollbar">
              <table className="w-full text-left">
                <thead className="bg-[#f8fafc] border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-2 w-12 text-center">#</th>
                    <th className="px-6 py-2 w-[35%] text-slate-900">ITEM/SERVICE</th>
                    <th className="px-6 py-2 w-[20%] text-slate-900">DESCRIPTION</th>
                    <th className="px-6 py-2 text-center text-slate-900">QTY</th>
                    <th className="px-6 py-2 text-right text-slate-900">RATE</th>
                    <th className="px-6 py-2 text-center text-slate-900">TAX (%)</th>
                    <th className="px-6 py-2 text-right text-slate-900">AMOUNT</th>
                    <th className="px-6 py-2 w-12 text-center text-slate-900">?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-2 text-xs font-bold text-slate-400 text-center">{idx + 1}</td>
                      <td className="px-6 py-2">
                        <select
                          className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-base font-black text-slate-950 focus:border-indigo-600 transition-all outline-none"
                          value={item.itemId || ''}
                          onChange={(e) => updateItem(item.id, 'itemId', e.target.value)}
                        >
                          <option value="">SKU Lookup...</option>
                          {itemsResponse?.data?.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </select>
                      </td>
                      <td className="px-6 py-2">
                        <input 
                          className="w-full bg-transparent border-none p-0 text-base font-bold text-slate-700 focus:ring-0 placeholder:text-slate-300"
                          placeholder="Spec..."
                          value={item.description}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        />
                      </td>
                      <td className="px-6 py-2">
                        <input 
                          type="number"
                          className="w-16 mx-auto bg-slate-100 border-none rounded-lg px-2 py-1 text-center text-base font-black text-slate-950 focus:ring-2 focus:ring-indigo-500/10 outline-none"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value))}
                        />
                      </td>
                      <td className="px-6 py-2 text-right">
                         <input 
                          type="number"
                          className="w-24 ml-auto bg-transparent border-none p-0 text-right text-base font-black text-slate-950 focus:ring-0"
                          value={item.rate}
                          onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value))}
                        />
                      </td>
                      <td className="px-6 py-2">
                        <select 
                          className="w-16 mx-auto bg-transparent border-none p-0 text-center text-sm font-black text-slate-950 focus:ring-0 appearance-none"
                          value={item.taxRate}
                          onChange={(e) => updateItem(item.id, 'taxRate', parseFloat(e.target.value))}
                        >
                          {GST_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </td>
                      <td className="px-6 py-2 text-right text-base font-black text-slate-950">
                        ₹{((item.quantity || 0) * (item.rate || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-2 text-center">
                        <button 
                          onClick={() => items.length > 1 && setItems(items.filter(i => i.id !== item.id))}
                          className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Bottom Grid: Collapsible Notes & Fixed Footer Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-100 p-4 space-y-4">
               <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">QUOTATION NOTES</label>
                  <textarea 
                    rows={1}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg p-3 text-base font-bold text-slate-950 focus:border-indigo-600 outline-none min-h-[50px] transition-all"
                    placeholder="Enter notes..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
               </div>
               <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">TERMS</label>
                  <textarea 
                    rows={1}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg p-3 text-base font-bold text-slate-950 focus:border-indigo-600 outline-none min-h-[50px] transition-all"
                    placeholder="Legal terms..."
                    value={formData.terms}
                    onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                  />
               </div>
            </div>

            <div className="bg-[#001a33]/5 rounded-xl border border-slate-200 p-6 flex flex-col justify-center">
               <div className="w-full space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-black text-slate-500 uppercase tracking-tighter">Subtotal</span>
                    <span className="text-xl font-black text-slate-950">₹{totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-base font-black uppercase tracking-widest text-indigo-600">Total Tax (GST)</span>
                    <span className="text-xl font-black text-slate-950">₹{totals.tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="h-px bg-slate-300/50 my-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-black text-slate-950 uppercase tracking-tighter">Grand Total</span>
                    <span className="text-5xl font-black text-indigo-600 tracking-tight">
                      ₹{totals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Estimate Preview"
        size="xl"
      >
        <div className="flex flex-col gap-6">
           <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center no-print">
              <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Previewing</p>
                 <h4 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Premium Alphesh Estimate</h4>
              </div>
              <div className="flex gap-2">
                 <Button variant="secondary" size="sm" onClick={() => window.print()} icon={Printer}>Print A4</Button>
                 <Button variant="primary" size="sm" onClick={() => handleSave('SENT')} icon={FileCheck} disabled={!formData.partyId}>Issue Quote</Button>
              </div>
           </div>
           
           <div className="shadow-2xl border border-slate-200 bg-white">
              <EstimateTemplateAlphesh 
                invoice={{ ...formData, amountInWords: numberToWords(Math.round(totals.total)) }}
                business={currentBusiness}
                party={selectedParty}
                items={items}
                totals={{
                   subtotal: totals.subtotal,
                   total: totals.total
                }}
              />
           </div>
        </div>
      </Modal>

      {/* High-Fidelity Print Portal */}
      {showPreview && (
        <Portal>
          <div id="print-root" className="fixed inset-0 hidden print:block bg-white z-[99999]">
            <EstimateTemplateAlphesh 
              invoice={{ ...formData, amountInWords: numberToWords(Math.round(totals.total)) }}
              business={currentBusiness}
              party={selectedParty}
              items={items}
              totals={{
                 subtotal: totals.subtotal,
                 total: totals.total
              }}
            />
          </div>
        </Portal>
      )}
    </div>
  );
}

export default EstimateBuilder;
