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
    status: 'DRAFT',
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
        invoiceType: pur.invoiceType
      });
      setItems(pur.items.map(i => ({
        ...i,
        id: i.id || Math.random().toString(36).substr(2, 9),
        taxRate: (i.cgstRate || 0) + (i.sgstRate || 0) + (i.igstRate || 0)
      })));
    } else if (!isEdit && currentBusiness) {
      setFormData(prev => ({ ...prev, purchaseNumber: `PUR-${Date.now().toString().slice(-6)}` }));
    }
  }, [purchaseResponse, isEdit, currentBusiness]);

  const totals = useMemo(() => {
    return items.reduce((acc, item) => {
      const amount = (item.quantity || 0) * (item.rate || 0);
      const discount = amount * ((item.discountPercent || 0) / 100);
      const taxable = amount - discount;
      const taxAmount = taxable * ((item.taxRate || 0) / 100);
      return {
        subtotal: acc.subtotal + taxable,
        tax: acc.tax + taxAmount,
        total: acc.total + taxable + taxAmount
      };
    }, { subtotal: 0, tax: 0, total: 0 });
  }, [items]);

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
    mutation.mutate({
      ...formData,
      businessId: currentBusiness.id,
      subtotal: totals.subtotal,
      totalAmount: totals.total,
      balanceDue: totals.total,
      items: items.map(i => {
        const taxableAmount = (i.quantity || 0) * (i.rate || 0) * (1 - (i.discountPercent || 0) / 100);
        const halfTax = i.taxRate / 2;
        return {
           itemId: i.itemId || null,
           description: i.description,
           hsnCode: i.hsnCode,
           quantity: i.quantity,
           unit: i.unit,
           rate: i.rate,
           taxableAmount,
           cgstRate: halfTax,
           sgstRate: halfTax,
           cgstAmount: taxableAmount * (halfTax / 100),
           sgstAmount: taxableAmount * (halfTax / 100),
           totalAmount: taxableAmount * (1 + i.taxRate / 100)
        };
      })
    });
  };

  const selectedParty = partiesResponse?.data?.find(p => p.id === formData.partyId);

  if (isLoadingPurchase) return <div className="p-8">Loading...</div>;

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
                 <h1 className="text-xl font-black text-gray-900 tracking-tight">{isEdit ? 'Update Bill' : 'New Vendor Bill'}</h1>
                 <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest -mt-0.5">Inventory Acquisition</p>
              </div>
           </div>
           <Button variant="primary" icon={Save} onClick={handleSave} loading={mutation.isPending} className="!rounded-2xl !px-6">
              SAVE
           </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
           <CollapsibleSection title="Source Vendor" icon={User} active={activeSection === 'details'} onClick={() => setActiveSection(activeSection === 'details' ? '' : 'details')}>
              <div className="space-y-4 p-5 bg-white rounded-[24px] border border-gray-100 shadow-sm">
                 <Select
                    label="Select Vendor Account"
                    value={formData.partyId}
                    onChange={e => setFormData({...formData, partyId: e.target.value})}
                    options={[{value:'', label:'Select vendor'}, ...(partiesResponse?.data?.filter(p => p.partyType !== 'CUSTOMER')?.map(p => ({value: p.id, label: p.name})) || [])]}
                 />
                 {selectedParty && (
                    <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                       <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Vendor Meta</p>
                       <p className="text-sm font-black text-indigo-900">{selectedParty.name}</p>
                       <p className="text-xs font-bold text-indigo-700">{selectedParty.gstin || 'No GSTIN'}</p>
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
              <div className="flex items-center justify-between px-2">
                 <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Package className="w-4 h-4" /> Stock Incoming
                 </h3>
                 <button onClick={() => setItems([...items, { id: Math.random().toString(36).substr(2, 9), itemId: '', description: '', hsnCode: '', quantity: 1, unit: 'NOS', rate: 0, taxRate: 18, discountPercent: 0 }])} className="text-xs font-black text-indigo-600 hover:text-indigo-700 transition-all flex items-center gap-1">
                    <Plus className="w-4 h-4" /> ADD LINE
                 </button>
              </div>

              {items.map((item) => (
                 <div key={item.id} className="p-5 bg-white rounded-[24px] border border-gray-100 shadow-sm space-y-4 group relative">
                    <button onClick={() => items.length > 1 && setItems(items.filter(i => i.id !== item.id))} className="absolute top-4 right-4 text-gray-200 hover:text-rose-500 transition-colors">
                       <MinusCircle className="w-5 h-5" />
                    </button>
                    <Select
                       className="!py-3 !rounded-xl"
                       value={item.itemId || ''}
                       onChange={e => updateItem(item.id, 'itemId', e.target.value)}
                       options={[{value:'', label:'Select item...'}, ...(itemsResponse?.data?.map(i => ({value:i.id, label:i.name})) || [])]}
                    />
                    {!item.itemId && <Input placeholder="Line Description" className="!py-3 !rounded-xl" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} />}
                    <div className="grid grid-cols-3 gap-4">
                       <Input label="Qty" type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value))} />
                       <Input label="Cost (₹)" type="number" value={item.rate} onChange={e => updateItem(item.id, 'rate', parseFloat(e.target.value))} />
                       <Select label="GST" value={item.taxRate} options={GST_OPTIONS} onChange={e => updateItem(item.id, 'taxRate', parseFloat(e.target.value))} />
                    </div>
                 </div>
              ))}
           </div>
        </div>
      </div>

      {/* Preview Pane */}
      <div className="flex-1 bg-[#f1f3f6] flex flex-col items-center overflow-y-auto no-scrollbar pb-24 relative">
         <div className="sticky top-8 z-30 mb-8">
            <div className="glass shadow-2xl rounded-3xl p-2 px-3 flex items-center gap-2 border-white/40 border">
               <button className="px-6 py-2.5 bg-indigo-600 text-white font-black text-[10px] tracking-widest uppercase rounded-2xl shadow-lg shadow-indigo-500/30">
                  <Eye className="w-4 h-4 inline mr-2" /> Live Voucher
               </button>
               <button className="px-5 py-2.5 text-gray-500 hover:text-indigo-600 font-bold text-[10px] tracking-widest uppercase transition-all">
                  <Download className="w-4 h-4 inline mr-2" /> Archive
               </button>
               <button className="px-5 py-2.5 text-gray-500 hover:text-indigo-600 font-bold text-[10px] tracking-widest uppercase transition-all">
                  <Printer className="w-4 h-4 inline mr-2" /> Print
               </button>
            </div>
         </div>

         <div className="w-[820px] bg-white shadow-[0_32px_128px_rgba(0,0,0,0.1)] rounded-sm p-16 flex flex-col min-h-[1160px] relative overflow-hidden text-gray-900">
            <div className="absolute top-0 left-0 w-64 h-64 bg-gray-50 rounded-br-[128px] -z-0 opacity-50" />
            
            <div className="relative z-10">
               <div className="flex justify-between items-start mb-20">
                  <div>
                     <h2 className="text-5xl font-black text-gray-900 tracking-tighter uppercase leading-none">Purchase</h2>
                     <p className="text-sm font-black text-indigo-600 mt-2 tracking-[0.3em] uppercase">Voucher ID #{formData.purchaseNumber || 'DRAFT'}</p>
                  </div>
                  <div className="text-right">
                     <div className="w-20 h-20 bg-gray-900 rounded-3xl flex items-center justify-center ml-auto mb-6 shadow-2xl">
                        <span className="text-white font-black text-3xl">P</span>
                     </div>
                     <p className="text-xl font-black text-gray-900">{currentBusiness?.name}</p>
                     <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-widest">ITC ELIGIBLE BILL</p>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-16 mb-24">
                  <div>
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Vendor Information</p>
                     <p className="text-2xl font-black text-gray-900 leading-tight">{selectedParty?.name || 'Supplier Account'}</p>
                     <p className="text-sm font-bold text-gray-500 mt-2">{selectedParty?.email || 'vendor@example.com'}</p>
                     <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">GSTIN: {selectedParty?.gstin || 'Unregistered'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                     <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Voucher Date</p>
                        <p className="text-sm font-black text-gray-900">{formData.date ? format(new Date(formData.date), 'dd MMM, yyyy') : '-'}</p>
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Payment Due</p>
                        <p className="text-sm font-black text-indigo-600">{formData.dueDate ? format(new Date(formData.dueDate), 'dd MMM, yyyy') : '-'}</p>
                     </div>
                  </div>
               </div>

               <div className="flex-1">
                  <table className="w-full">
                     <thead>
                        <tr className="border-b-4 border-gray-900">
                           <th className="py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Acquired Resource</th>
                           <th className="py-6 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest w-20">Qty</th>
                           <th className="py-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest w-32">Acq. Cost</th>
                           <th className="py-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest w-32">Total</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                        {items.map((item) => (
                           <tr key={item.id}>
                              <td className="py-8 pr-12">
                                 <p className="text-lg font-black text-gray-900">{item.description || 'Stock/Resource Item'}</p>
                                 <p className="text-xs font-bold text-gray-400 uppercase mt-1 tracking-widest">Tax Input Credit {item.taxRate}%</p>
                              </td>
                              <td className="py-8 text-center text-gray-900 font-black">{item.quantity}</td>
                              <td className="py-8 text-right text-gray-600 font-bold">₹{item.rate?.toLocaleString()}</td>
                              <td className="py-8 text-right text-xl font-black text-gray-900">₹{((item.quantity || 0) * (item.rate || 0)).toLocaleString()}</td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>

               <div className="mt-20 flex justify-end">
                  <div className="w-80 space-y-6">
                     <div className="flex justify-between items-center px-4">
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Base Cost</span>
                        <span className="text-lg font-black text-gray-900">₹{totals.subtotal.toLocaleString()}</span>
                     </div>
                     <div className="flex justify-between items-center px-4 text-indigo-600">
                        <span className="text-xs font-black uppercase tracking-widest">Input Tax Credit</span>
                        <span className="text-lg font-black">₹{totals.tax.toLocaleString()}</span>
                     </div>
                     <div className="p-6 bg-indigo-600 rounded-[24px] flex justify-between items-center text-white shadow-2xl">
                        <span className="text-xs font-black uppercase tracking-widest opacity-60">Bill Amount</span>
                        <span className="text-3xl font-black">₹{totals.total.toLocaleString()}</span>
                     </div>
                  </div>
               </div>

               <div className="mt-40 border-t border-gray-100 pt-16 flex justify-between items-end">
                  <div>
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Internal Note</p>
                     <p className="text-xs font-bold text-gray-500 max-w-xs italic overflow-hidden">This acquisition is recorded for internal stock and tax reconciliation purposes.</p>
                  </div>
                  <div className="text-right">
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Stock Received & Verified</p>
                     <div className="h-16 w-48 border-b-2 border-gray-900 ml-auto" />
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
          <span className={cn("text-sm font-black tracking-tight", active ? "text-gray-900" : "text-gray-400")}>{title}</span>
        </div>
        <ChevronRight className={cn("w-4 h-4 text-gray-400 transition-transform", active && "rotate-90")} />
      </button>
      <AnimatePresence>{active && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><div className="py-2">{children}</div></motion.div>}</AnimatePresence>
    </div>
  );
}

export default PurchaseBuilder;
