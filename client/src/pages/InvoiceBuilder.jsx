import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Trash2, Save, Download, Printer, Mail, 
  ChevronLeft, ChevronDown, ChevronRight, Search, 
  Calendar, CreditCard, FileText, User, ShoppingBag,
  Percent, Hash, AlertCircle, CheckCircle2, MoreVertical,
  MinusCircle, Building2, Eye, ExternalLink
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

function InvoiceBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentBusiness } = useBusinessStore();
  const isEdit = !!id;

  // Form State
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    dueDate: format(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    partyId: '',
    notes: '',
    terms: '',
    status: 'DRAFT',
    invoiceType: 'TAX_INVOICE'
  });

  const [items, setItems] = useState([
    { id: Math.random().toString(36).substr(2, 9), itemId: '', description: '', hsnCode: '', quantity: 1, unit: 'NOS', rate: 0, taxRate: 18, discountPercent: 0 }
  ]);

  const [activeSection, setActiveSection] = useState('details');

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

  const { data: invoiceResponse, isLoading: isLoadingInvoice } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => api.get(`/invoices/${id}`).then(r => r.data),
    enabled: isEdit,
  });

  // Populate data
  useEffect(() => {
    if (invoiceResponse?.data) {
      const inv = invoiceResponse.data;
      setFormData({
        invoiceNumber: inv.invoiceNumber,
        date: format(new Date(inv.date), 'yyyy-MM-dd'),
        dueDate: inv.dueDate ? format(new Date(inv.dueDate), 'yyyy-MM-dd') : '',
        partyId: inv.partyId,
        notes: inv.notes || '',
        terms: inv.terms || '',
        status: inv.status,
        invoiceType: inv.invoiceType
      });
      setItems(inv.items.map(i => ({
        ...i,
        id: i.id || Math.random().toString(36).substr(2, 9),
        taxRate: (i.cgstRate || 0) + (i.sgstRate || 0) + (i.igstRate || 0)
      })));
    } else if (!isEdit && currentBusiness) {
      setFormData(prev => ({ ...prev, invoiceNumber: `INV-${Date.now().toString().slice(-6)}` }));
    }
  }, [invoiceResponse, isEdit, currentBusiness]);

  // Calculations
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
    mutationFn: (data) => isEdit ? api.put(`/invoices/${id}`, data) : api.post('/invoices', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['invoices']);
      toast.success(isEdit ? 'Invoice updated!' : 'Invoice created!');
      navigate('/invoices');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Something went wrong');
    }
  });

  const handleSave = () => {
    if (!formData.partyId) return toast.error('Please select a party');
    const payload = {
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
    };
    mutation.mutate(payload);
  };

  const selectedParty = partiesResponse?.data?.find(p => p.id === formData.partyId);

  if (isLoadingInvoice) return <div className="p-8">Loading...</div>;

  return (
    <div className="flex h-screen overflow-hidden bg-white -m-8">
      {/* Left Pane - Form Controls */}
      <div className="w-[520px] border-r border-gray-100 flex flex-col bg-[#fcfdfe]">
        <div className="h-20 flex items-center justify-between px-6 border-b border-gray-100 bg-white">
           <div className="flex items-center gap-4">
              <button onClick={() => navigate('/invoices')} className="p-3 hover:bg-gray-100 rounded-2xl text-gray-400 transition-all">
                 <ChevronLeft className="w-6 h-6" />
              </button>
              <div>
                 <h1 className="text-xl font-black text-gray-900 tracking-tight">{isEdit ? 'Refine Invoice' : 'Draft New Invoice'}</h1>
                 <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest -mt-0.5">Automated GST Billing</p>
              </div>
           </div>
           <Button variant="primary" icon={Save} onClick={handleSave} loading={mutation.isPending} className="!rounded-2xl !px-6">
              SAVE
           </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
           {/* Section 1: Entity */}
           <CollapsibleSection title="Billing Entities" icon={User} active={activeSection === 'details'} onClick={() => setActiveSection(activeSection === 'details' ? '' : 'details')}>
              <div className="space-y-4 p-5 bg-white rounded-[24px] border border-gray-100 shadow-sm">
                 <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-1">
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Billing From</p>
                    <p className="text-sm font-black text-indigo-900">{currentBusiness?.name}</p>
                    <p className="text-[10px] font-bold text-indigo-700">{currentBusiness?.gstin || 'GST Unregistered'}</p>
                 </div>
                 
                 <Select
                    label="Billed To (Customer)"
                    value={formData.partyId}
                    onChange={(e) => setFormData({ ...formData, partyId: e.target.value })}
                    options={[
                       { value: '', label: 'Select a customer' },
                       ...(partiesResponse?.data?.map(p => ({ value: p.id, label: p.name })) || [])
                    ]}
                 />
                 {selectedParty && (
                    <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                       <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Customer Delivery</p>
                       <p className="text-sm font-black text-emerald-900">{selectedParty.name}</p>
                       <p className="text-xs font-bold text-emerald-700">{selectedParty.phone}</p>
                    </div>
                 )}
              </div>
           </CollapsibleSection>

           {/* Section 2: Details */}
           <CollapsibleSection title="Invoice Schema" icon={FileText} active={activeSection === 'schema'} onClick={() => setActiveSection(activeSection === 'schema' ? '' : 'schema')}>
              <div className="space-y-4 p-5 bg-white rounded-[24px] border border-gray-100 shadow-sm">
                 <Input label="Invoice Identifier" value={formData.invoiceNumber} onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })} />
                 <div className="grid grid-cols-2 gap-4">
                    <Input label="Issue Date" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                    <Input label="Payable Till" type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} />
                 </div>
              </div>
           </CollapsibleSection>

           {/* Section 3: Items */}
           <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                 <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" /> Itemized List
                 </h3>
                 <button onClick={() => setItems([...items, { id: Math.random().toString(36).substr(2, 9), itemId: '', description: '', quantity: 1, rate: 0, taxRate: 18 }])} className="text-xs font-black text-indigo-600 hover:text-indigo-700 transition-all flex items-center gap-1">
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
                       onChange={(e) => updateItem(item.id, 'itemId', e.target.value)}
                       options={[{ value: '', label: 'Select product/service...' }, ...(itemsResponse?.data?.map(i => ({ value: i.id, label: i.name })) || [])]}
                    />
                    {!item.itemId && <Input placeholder="Item Description" className="!py-3 !rounded-xl" value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} />}
                    <div className="grid grid-cols-3 gap-4">
                       <Input label="Qty" type="number" className="!rounded-xl" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value))} />
                       <Input label="Price (₹)" type="number" className="!rounded-xl" value={item.rate} onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value))} />
                       <Select label="GST %" className="!rounded-xl" value={item.taxRate} options={GST_OPTIONS} onChange={(e) => updateItem(item.id, 'taxRate', parseFloat(e.target.value))} />
                    </div>
                 </div>
              ))}
           </div>
        </div>
      </div>

      {/* Right Pane - Visual Preview */}
      <div className="flex-1 bg-[#f1f3f6] flex flex-col items-center overflow-y-auto no-scrollbar pb-24 relative">
         {/* Floating Glass Toolbar */}
         <div className="sticky top-8 z-30 mb-8">
            <div className="glass shadow-2xl rounded-3xl p-2 px-3 flex items-center gap-2 border-white/40 border">
               <button className="px-6 py-2.5 bg-indigo-600 text-white font-black text-[10px] tracking-widest uppercase rounded-2xl shadow-lg shadow-indigo-500/30">
                  <Eye className="w-4 h-4 inline mr-2" /> Live Preview
               </button>
               <button className="px-5 py-2.5 text-gray-500 hover:text-indigo-600 font-bold text-[10px] tracking-widest uppercase transition-all">
                  <Download className="w-4 h-4 inline mr-2" /> Download
               </button>
               <button className="px-5 py-2.5 text-gray-500 hover:text-indigo-600 font-bold text-[10px] tracking-widest uppercase transition-all">
                  <Printer className="w-4 h-4 inline mr-2" /> Print
               </button>
               <div className="w-px h-6 bg-gray-200 mx-2" />
               <button className="p-2.5 text-gray-400 hover:text-indigo-600 transition-colors">
                  <MoreVertical className="w-5 h-5" />
               </button>
            </div>
         </div>

         {/* A4 Sheet */}
         <div className="w-[820px] bg-white shadow-[0_32px_128px_rgba(0,0,0,0.1)] rounded-sm p-16 flex flex-col min-h-[1160px] relative overflow-hidden">
            {/* Design Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-bl-[128px] -z-0 opacity-50" />
            
            <div className="relative z-10">
               <div className="flex justify-between items-start mb-20">
                  <div>
                     <h2 className="text-5xl font-black text-gray-900 tracking-tighter uppercase leading-none">Invoice</h2>
                     <p className="text-sm font-black text-indigo-600 mt-2 tracking-[0.3em] uppercase">Document Master #{formData.invoiceNumber || 'DRAFT'}</p>
                  </div>
                  <div className="text-right">
                     <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl flex items-center justify-center ml-auto mb-6 shadow-2xl">
                        <span className="text-white font-black text-3xl">A</span>
                     </div>
                     <p className="text-xl font-black text-gray-900">{currentBusiness?.name}</p>
                     <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-widest">GSTIN: {currentBusiness?.gstin || '-'}</p>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-16 mb-24">
                  <div>
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Invoice Issued For</p>
                     <p className="text-2xl font-black text-gray-900 leading-tight">{selectedParty?.name || 'Customer Name'}</p>
                     <p className="text-sm font-bold text-gray-500 mt-2">{selectedParty?.email || 'customer@email.com'}</p>
                     <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">VAT/GST: {selectedParty?.gstin || 'Unregistered'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                     <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Issue Date</p>
                        <p className="text-sm font-black text-gray-900">{formData.date ? format(new Date(formData.date), 'dd MMM, yyyy') : '-'}</p>
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Balance Due</p>
                        <p className="text-sm font-black text-rose-500">{formData.dueDate ? format(new Date(formData.dueDate), 'dd MMM, yyyy') : '-'}</p>
                     </div>
                  </div>
               </div>

               <div className="flex-1">
                  <table className="w-full">
                     <thead>
                        <tr className="border-b-4 border-gray-900">
                           <th className="py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                           <th className="py-6 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest w-20">Quantity</th>
                           <th className="py-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest w-32">Unit Price</th>
                           <th className="py-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest w-32">Amount</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                        {items.map((item) => (
                           <tr key={item.id}>
                              <td className="py-8 pr-12">
                                 <p className="text-lg font-black text-gray-900">{item.description || 'Service/Product Item'}</p>
                                 <p className="text-xs font-bold text-gray-400 uppercase mt-1 tracking-widest">HSN: {item.hsnCode || 'N/A'} • GST {item.taxRate}%</p>
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
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Subtotal</span>
                        <span className="text-lg font-black text-gray-900">₹{totals.subtotal.toLocaleString()}</span>
                     </div>
                     <div className="flex justify-between items-center px-4">
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Total Tax (GST)</span>
                        <span className="text-lg font-black text-gray-900">₹{totals.tax.toLocaleString()}</span>
                     </div>
                     <div className="p-6 bg-gray-900 rounded-[24px] flex justify-between items-center text-white shadow-2xl">
                        <span className="text-xs font-black uppercase tracking-widest opacity-60">Total Amount</span>
                        <span className="text-3xl font-black">₹{totals.total.toLocaleString()}</span>
                     </div>
                  </div>
               </div>

               <div className="mt-40 flex justify-between items-end border-t border-gray-100 pt-16">
                  <div className="space-y-4">
                     <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Payment Instructions</p>
                        <p className="text-sm font-black text-gray-900">{currentBusiness?.bankDetails?.bankName || 'Direct Bank Transfer'}</p>
                        <p className="text-xs font-bold text-gray-500 uppercase">AC: {currentBusiness?.bankDetails?.accountNumber || '502000-XXXXXXXX'}</p>
                        <p className="text-xs font-bold text-gray-500 uppercase">IFSC: {currentBusiness?.bankDetails?.ifscCode || 'ARTHA0001'}</p>
                     </div>
                     <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                        <ExternalLink className="w-3 h-3" /> Pay online via secure link
                     </div>
                  </div>
                  <div className="text-right">
                     <div className="h-16 w-48 border-b-2 border-gray-900 mb-4 ml-auto" />
                     <p className="text-xs font-black text-gray-900 uppercase tracking-[0.2em]">Authorized Signatory</p>
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
      <button 
        onClick={onClick}
        className={cn(
          "w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300",
          active ? "bg-white shadow-xl shadow-gray-200/50 ring-1 ring-gray-100" : "hover:bg-gray-100"
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2.5 rounded-xl transition-all duration-300",
            active ? "bg-indigo-600 text-white rotate-[360deg]" : "bg-white text-gray-400 border border-gray-200"
          )}>
            <Icon className="w-4 h-4" />
          </div>
          <span className={cn("text-sm font-black tracking-tight", active ? "text-gray-900" : "text-gray-400")}>{title}</span>
        </div>
        <ChevronRight className={cn("w-4 h-4 text-gray-400 transition-transform", active && "rotate-90")} />
      </button>
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="py-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default InvoiceBuilder;
