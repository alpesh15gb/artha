import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Trash2, Save, Download, Printer, Mail, 
  ChevronLeft, ChevronDown, ChevronRight, Search, 
  Calendar, CreditCard, FileText, User, ShoppingBag,
  Percent, Hash, AlertCircle, CheckCircle2, MoreVertical,
  MinusCircle, ShoppingCart, Box, Eye, Building2, Package
} from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import { useBusinessStore } from '../store/auth';
import { Button, Input, Select, Card, Badge, cn } from '../components/ui';
import toast from 'react-hot-toast';
import { calculateDocumentTotals } from '@artha/common';

const GST_OPTIONS = [
  { value: 0, label: '0%' },
  { value: 5, label: '5%' },
  { value: 12, label: '12%' },
  { value: 18, label: '18%' },
  { value: 28, label: '28%' },
];

function PurchaseBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentBusiness } = useBusinessStore();
  const isEdit = !!id;

  // Form State
  const [formData, setFormData] = useState({
    purchaseNumber: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    dueDate: '',
    partyId: '',
    notes: '',
    terms: '',
    status: 'RECEIVED',
    isTaxInclusive: false,
    invoiceType: 'PURCHASE_INVOICE'
  });

  const [items, setItems] = useState([
    { id: Math.random().toString(36).substr(2, 9), itemId: '', description: '', hsnCode: '', quantity: 1, unit: 'NOS', rate: 0, taxRate: 18, discountPercent: 0 }
  ]);

  const [activeSection, setActiveSection] = useState('details');

  // Queries
  const { data: partiesResponse } = useQuery({
    queryKey: ['parties', currentBusiness?.id, 'suppliers'],
    queryFn: () => api.get(`/parties/business/${currentBusiness.id}`).then(r => r.data),
    enabled: !!currentBusiness?.id,
  });

  const { data: itemsResponse } = useQuery({
    queryKey: ['items', currentBusiness?.id],
    queryFn: () => api.get(`/items/business/${currentBusiness.id}`).then(r => r.data),
    enabled: !!currentBusiness?.id,
  });

  const { data: purchaseResponse, isLoading: isLoadingPurchase } = useQuery({
    queryKey: ['purchase', id],
    queryFn: () => api.get(`/purchases/${id}`).then(r => r.data),
    enabled: isEdit,
  });

  const { data: nextNumberData } = useQuery({
    queryKey: ['next-number', currentBusiness?.id, 'purchase'],
    queryFn: () => api.get(`/settings/${currentBusiness.id}/next-number/purchase`).then(r => r.data),
    enabled: !!currentBusiness?.id && !isEdit,
  });

  useEffect(() => {
    if (purchaseResponse?.data) {
      const pur = purchaseResponse.data;
      setFormData({
        purchaseNumber: pur.purchaseNumber,
        date: format(new Date(pur.date), 'yyyy-MM-dd'),
        dueDate: pur.dueDate ? format(new Date(pur.dueDate), 'yyyy-MM-dd') : '',
        partyId: pur.partyId,
        notes: pur.notes || '',
        terms: pur.terms || '',
        status: pur.status,
        isTaxInclusive: pur.isTaxInclusive || false,
        invoiceType: pur.invoiceType
      });
      setItems(pur.items.map(i => ({
        ...i,
        id: i.id || Math.random().toString(36).substr(2, 9),
        taxRate: (i.cgstRate || 0) + (i.sgstRate || 0) + (i.igstRate || 0)
      })));
    } else if (!isEdit && nextNumberData?.data) {
      setFormData(prev => ({ ...prev, purchaseNumber: nextNumberData.data.nextNumber }));
    }
  }, [purchaseResponse, isEdit, nextNumberData]);

  const totals = useMemo(() => {
    const mappedItems = items.map(i => ({
      ...i,
      cgstRate: i.taxRate / 2,
      sgstRate: i.taxRate / 2,
    }));
    return calculateDocumentTotals(mappedItems, 0, 0, formData.isTaxInclusive);
  }, [items, formData.isTaxInclusive]);

  const updateItem = (id, field, value) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const newItem = { ...item, [field]: value };
        if (field === 'itemId' && value) {
          const selectedItem = itemsResponse?.data?.find(i => i.id === value);
          if (selectedItem) {
             newItem.description = selectedItem.name;
             newItem.rate = selectedItem.purchasePrice || selectedItem.sellingPrice;
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
    mutationFn: (data) => isEdit ? api.put(`/purchases/${id}`, data) : api.post('/purchases', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['purchases', 'items']);
      toast.success('Purchase bill saved!');
      navigate('/purchases');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to save')
  });

  const handleSave = () => {
    if (!formData.partyId) return toast.error('Please select a vendor');
    const { items: processedItems, subtotal, totalAmount } = totals;
    
    mutation.mutate({
      ...formData,
      businessId: currentBusiness.id,
      totalBoxes: formData.totalBoxes ? parseInt(formData.totalBoxes) : null,
      subtotal,
      totalAmount,
      balanceDue: totalAmount,
      items: processedItems
    });
  };

  const selectedParty = partiesResponse?.data?.find(p => p.id === formData.partyId);

  if (isLoadingPurchase) return <div className="p-8">Loading Purchase Ledger...</div>;

  return (
    <div className="flex h-screen overflow-hidden bg-white -m-8">
      {/* Configuration Sidebar */}
      <div className="w-[520px] border-r border-gray-100 flex flex-col bg-[#fcfdfe]">
        <div className="h-20 flex items-center justify-between px-6 border-b border-gray-100 bg-white">
           <div className="flex items-center gap-4">
              <button onClick={() => navigate('/purchases')} className="p-3 hover:bg-gray-100 rounded-2xl text-gray-400 transition-all">
                 <ChevronLeft className="w-6 h-6" />
              </button>
              <div>
                 <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none uppercase tracking-tighter">{isEdit ? 'Update Bill' : 'New Vendor Bill'}</h1>
                 <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1.5 font-mono italic">#{formData.purchaseNumber || 'DRAFT'}</p>
              </div>
           </div>
           <Button variant="primary" icon={Save} onClick={handleSave} loading={mutation.isPending} className="!rounded-2xl !px-6 bg-[#0f172a] hover:bg-[#1e293b] border-none text-white font-black text-[10px] tracking-widest uppercase">
              SAVE
           </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar no-print">
           <CollapsibleSection title="Source Vendor" icon={User} active={activeSection === 'details'} onClick={() => setActiveSection(activeSection === 'details' ? '' : 'details')}>
              <div className="space-y-4 p-5 bg-white rounded-[24px] border border-gray-100 shadow-sm">
                 <Select
                    label="Select Vendor Account"
                    value={formData.partyId}
                    onChange={e => setFormData({...formData, partyId: e.target.value})}
                    options={[{value:'', label:'Select vendor account...'}, ...(partiesResponse?.data?.filter(p => p.partyType !== 'CUSTOMER')?.map(p => ({value: p.id, label: p.name})) || [])]}
                 />
                 {selectedParty && (
                    <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                       <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Vendor Meta</p>
                       <p className="text-sm font-black text-indigo-900">{selectedParty.name}</p>
                       <p className="text-xs font-bold text-indigo-700">{selectedParty.gstin || 'Unregistered Vendor'}</p>
                    </div>
                 )}
              </div>
           </CollapsibleSection>

           <CollapsibleSection title="Acquisition Log" icon={ShoppingCart} active={activeSection === 'bill'} onClick={() => setActiveSection(activeSection === 'bill' ? '' : 'bill')}>
               <div className="space-y-4 p-5 bg-white rounded-[24px] border border-gray-100 shadow-sm">
                  <Input label="Purchase Ref ID" value={formData.purchaseNumber} onChange={e => setFormData({...formData, purchaseNumber: e.target.value})} />
                  <div className="grid grid-cols-2 gap-4">
                     <Input label="Receipt Date" type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                     <Input label="Payable Date" type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
                  </div>
               </div>
            </CollapsibleSection>

           {/* Items Section */}
           <div className="space-y-4">
              <div className="flex flex-col gap-4 px-2">
                 <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2">
                       <Package className="w-4 h-4" /> Stock Incoming
                    </h3>
                    <button onClick={() => setItems([...items, { id: Math.random().toString(36).substr(2, 9), itemId: '', description: '', hsnCode: '', quantity: 1, unit: 'NOS', rate: 0, taxRate: 18, discountPercent: 0 }])} className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 transition-all flex items-center gap-1 uppercase tracking-widest">
                       <Plus className="w-4 h-4" /> ADD LINE
                    </button>
                 </div>

                 {/* Premium Tax Mode Selector */}
                 <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 self-start shadow-inner">
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, isTaxInclusive: false})}
                      className={cn(
                        "px-4 py-1.5 rounded-lg text-[9px] font-black tracking-[0.2em] transition-all",
                        !formData.isTaxInclusive ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                      )}
                    >EXCLUSIVE</button>
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, isTaxInclusive: true})}
                      className={cn(
                        "px-4 py-1.5 rounded-lg text-[9px] font-black tracking-[0.2em] transition-all",
                        formData.isTaxInclusive ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                      )}
                    >INCLUSIVE</button>
                 </div>
              </div>

              <div className="space-y-4 max-h-[40vh] overflow-y-auto no-scrollbar pb-10">
                {items.map((item) => (
                  <div key={item.id} className="p-5 bg-white rounded-[24px] border border-gray-100 shadow-sm space-y-4 group relative hover:border-indigo-100 transition-all">
                      <button onClick={() => items.length > 1 && setItems(items.filter(i => i.id !== item.id))} className="absolute top-4 right-4 text-gray-200 hover:text-rose-500 transition-colors">
                        <MinusCircle className="w-5 h-5" />
                      </button>
                      <Select
                        className="!py-3 !rounded-xl !text-sm font-black text-slate-900"
                        value={item.itemId || ''}
                        onChange={e => updateItem(item.id, 'itemId', e.target.value)}
                        options={[{value:'', label:'SKU Resource Lookup...'}, ...(itemsResponse?.data?.map(i => ({value:i.id, label:i.name})) || [])]}
                      />
                      {!item.itemId && <Input placeholder="Item description or resource type..." className="!py-3 !rounded-xl font-bold" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} />}
                      <div className="grid grid-cols-3 gap-4">
                        <Input label="Qty" type="number" className="font-black" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value))} />
                        <Input label={formData.isTaxInclusive ? "Cost (Incl)" : "Cost (Excl)"} type="number" className="font-black" value={item.rate} onChange={e => updateItem(item.id, 'rate', parseFloat(e.target.value))} />
                        <Select label="GST Rate" className="font-black" value={item.taxRate} options={GST_OPTIONS} onChange={e => updateItem(item.id, 'taxRate', parseFloat(e.target.value))} />
                      </div>
                  </div>
                ))}
              </div>
           </div>
        </div>
      </div>

      {/* Preview Pane */}
      <div className="flex-1 bg-[#f1f3f6] flex flex-col items-center overflow-y-auto no-scrollbar pb-24 relative">
         <div className="sticky top-8 z-30 mb-8 no-print">
            <div className="glass shadow-2xl rounded-3xl p-2 px-3 flex items-center gap-2 border-white/40 border bg-white/50 backdrop-blur-xl">
               <button className="px-6 py-2.5 bg-indigo-600 text-white font-black text-[10px] tracking-widest uppercase rounded-2xl shadow-lg shadow-indigo-500/30 transition-transform active:scale-95">
                  <Eye className="w-4 h-4 inline mr-2" /> Live Voucher
               </button>
               <button className="px-5 py-2.5 text-gray-500 hover:text-indigo-600 font-bold text-[10px] tracking-widest uppercase transition-all">
                  <Download className="w-4 h-4 inline mr-2" /> Archive
               </button>
               <button onClick={() => window.print()} className="px-5 py-2.5 text-gray-500 hover:text-indigo-600 font-bold text-[10px] tracking-widest uppercase transition-all">
                  <Printer className="w-4 h-4 inline mr-2" /> Print
               </button>
            </div>
         </div>

         <div className="w-[820px] bg-white shadow-[0_32px_128px_rgba(0,0,0,0.1)] rounded-sm p-14 flex flex-col min-h-[1160px] relative overflow-hidden text-gray-900 mb-20">
            <div className="absolute top-0 left-0 w-64 h-64 bg-slate-50 rounded-br-[128px] -z-0 opacity-50" />
            
            <div className="relative z-10">
               <div className="flex justify-between items-start mb-20">
                  <div>
                     <h2 className="text-5xl font-black text-gray-900 tracking-tighter uppercase leading-none">Purchase</h2>
                     <p className="text-sm font-black text-indigo-600 mt-3 tracking-[0.4em] uppercase font-mono italic">ID #{formData.purchaseNumber || 'DRAFT'}</p>
                  </div>
                  <div className="text-right">
                     <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center ml-auto mb-6 shadow-2xl transition-transform hover:rotate-3">
                        <span className="text-white font-black text-4xl">P</span>
                     </div>
                     <p className="text-xl font-black text-gray-900 tracking-tighter uppercase">{currentBusiness?.name}</p>
                     <p className="text-[10px] font-black text-gray-400 mt-1.5 uppercase tracking-widest opacity-80 italic">Verified Inventory Intake</p>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-16 mb-24 bg-slate-50/50 p-8 rounded-[40px] border border-slate-100">
                  <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Origin Vendor</p>
                     <p className="text-2xl font-black text-slate-900 leading-tight tracking-tighter uppercase">{selectedParty?.name || 'Supplier Account'}</p>
                     <p className="text-sm font-bold text-slate-500 mt-2">{selectedParty?.email || 'vendor@artha.io'}</p>
                     <div className="inline-block px-3 py-1 bg-white rounded-lg border border-slate-200 mt-4 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GSTIN: <span className="text-slate-900">{selectedParty?.gstin || 'UNREGISTERED'}</span></p>
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-10">
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Voucher Date</p>
                        <p className="text-sm font-black text-slate-900">{formData.date ? format(new Date(formData.date), 'dd MMM, yyyy') : '-'}</p>
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Due Timeline</p>
                        <p className="text-sm font-black text-indigo-600">{formData.dueDate ? format(new Date(formData.dueDate), 'dd MMM, yyyy') : 'Immediate'}</p>
                     </div>
                  </div>
               </div>

               <div className="flex-1">
                  <table className="w-full">
                     <thead>
                        <tr className="border-b-[6px] border-slate-900">
                           <th className="py-6 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Acquired Resource</th>
                           <th className="py-6 text-center text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] w-20">Qty</th>
                           <th className="py-6 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] w-32">Acq. Cost</th>
                           <th className="py-6 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] w-32">Adjustment</th>
                           <th className="py-6 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] w-32">Net Total</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {items.map((item) => (
                           <tr key={item.id} className="group transition-colors hover:bg-slate-50/50">
                              <td className="py-8 pr-12">
                                 <p className="text-lg font-black text-slate-900 tracking-tight">{item.description || 'Stock/Resource Item'}</p>
                                 <p className="text-[10px] font-black text-slate-400 uppercase mt-1.5 tracking-[0.1em]">Tax Input Credit {item.taxRate}% Mode: {formData.isTaxInclusive ? 'Inclusive' : 'Exclusive'}</p>
                              </td>
                              <td className="py-8 text-center text-slate-900 font-black">{item.quantity}</td>
                              <td className="py-8 text-right text-slate-600 font-bold">₹{item.rate?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td className="py-8 text-right text-slate-400 font-bold">₹{((item.quantity * item.rate) * (item.taxRate / 100)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td className="py-8 text-right text-xl font-black text-slate-900 tracking-tighter">₹{((item.quantity || 0) * (item.rate || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>

               <div className="mt-24 flex justify-end">
                  <div className="w-80 space-y-4">
                     <div className="flex justify-between items-center px-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Acquisition Subtotal</span>
                        <span className="text-lg font-black text-slate-900">₹{totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                     </div>
                     <div className="flex justify-between items-center px-4 text-emerald-600">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Input Tax Credit (GST)</span>
                        <span className="text-lg font-black">+ ₹{totals.tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                     </div>
                     <div className="h-px bg-slate-200 mx-4" />
                     <div className="p-8 bg-slate-900 rounded-[40px] flex flex-col items-end text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mb-2 relative z-10">Total Payable</span>
                        <span className="text-4xl font-black tracking-tight relative z-10">₹{totals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                     </div>
                  </div>
               </div>

               <div className="mt-40 border-t border-slate-100 pt-16 flex justify-between items-end">
                  <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 italic">Acquisition Verification</p>
                     <p className="text-[11px] font-bold text-slate-500 max-w-xs leading-relaxed uppercase tracking-widest opacity-60">Verified for internal stock and tax reconciliation in compliance with GSTR-3B Input Tax protocols.</p>
                  </div>
                  <div className="text-right">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Authorised Signatory</p>
                     <div className="h-14 w-56 border-b-[3px] border-slate-900 ml-auto transition-all hover:border-indigo-600" />
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

function CollapsibleSection({ title, icon: Icon, active, onClick, children }) {
  return (
    <div className="space-y-1">
      <button onClick={onClick} className={cn("w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300", active ? "bg-white shadow-xl ring-1 ring-gray-100" : "hover:bg-gray-100")}>
        <div className="flex items-center gap-3">
          <div className={cn("p-2.5 rounded-xl transition-all", active ? "bg-indigo-600 text-white" : "bg-white text-gray-400 border border-gray-200")}>
            <Icon className="w-4 h-4" />
          </div>
          <span className={cn("text-sm font-black tracking-tight", active ? "text-gray-900" : "text-gray-400 whitespace-nowrap overflow-hidden")}>{title}</span>
        </div>
        <ChevronRight className={cn("w-4 h-4 text-gray-400 transition-transform flex-shrink-0", active && "rotate-90")} />
      </button>
      <AnimatePresence>{active && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><div className="py-2">{children}</div></motion.div>}</AnimatePresence>
    </div>
  );
}

export default PurchaseBuilder;
