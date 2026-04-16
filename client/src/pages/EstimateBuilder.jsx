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
import { Button, Input, Select, Card, Badge, cn } from '../components/ui';
import toast from 'react-hot-toast';
import { exportToPDF, printElement } from '../utils/export';
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
    notes: '',
    terms: '',
    status: 'DRAFT'
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

  const { data: estimateResponse, isLoading: isLoadingEstimate } = useQuery({
    queryKey: ['estimate', id],
    queryFn: () => api.get(`/estimates/${id}`).then(r => r.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (estimateResponse?.data) {
      const est = estimateResponse.data;
      setFormData({
        estimateNumber: est.estimateNumber,
        date: format(new Date(est.date), 'yyyy-MM-dd'),
        expiryDate: est.expiryDate ? format(new Date(est.expiryDate), 'yyyy-MM-dd') : '',
        partyId: est.partyId,
        notes: est.notes || '',
        terms: est.terms || '',
        status: est.status
      });
      setItems(est.items.map(i => ({
        ...i,
        id: i.id || Math.random().toString(36).substr(2, 9),
        taxRate: (i.cgstRate || 0) + (i.sgstRate || 0) + (i.igstRate || 0)
      })));
    } else if (!isEdit && currentBusiness) {
      setFormData(prev => ({ ...prev, estimateNumber: `EST-${Date.now().toString().slice(-6)}` }));
    }
  }, [estimateResponse, isEdit, currentBusiness]);

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
    mutationFn: (data) => isEdit ? api.put(`/estimates/${id}`, data) : api.post('/estimates', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['estimates']);
      toast.success(isEdit ? 'Estimate updated!' : 'Estimate created!');
      navigate('/estimates');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Something went wrong')
  });

  const handleSave = () => {
    if (!formData.partyId) return toast.error('Please select a party');
    const payload = {
      ...formData,
      businessId: currentBusiness.id,
      subtotal: totals.subtotal,
      totalAmount: totals.total,
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

  if (isLoadingEstimate) return <div className="p-8">Loading...</div>;

  return (
    <div className="flex h-screen overflow-hidden bg-white -m-8">
      {/* Configuration Sidebar */}
      <div className="w-[520px] border-r border-gray-100 flex flex-col bg-[#fcfdfe]">
        <div className="h-20 flex items-center justify-between px-6 border-b border-gray-100 bg-white">
           <div className="flex items-center gap-4">
              <button onClick={() => navigate('/estimates')} className="p-3 hover:bg-gray-100 rounded-2xl text-gray-400 transition-all">
                 <ChevronLeft className="w-6 h-6" />
              </button>
              <div>
                 <h1 className="text-xl font-black text-gray-900 tracking-tight">{isEdit ? 'Refine Quote' : 'New Quotation'}</h1>
                 <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest -mt-0.5">Professional Estimates</p>
              </div>
           </div>
           <Button variant="primary" icon={Save} onClick={handleSave} loading={mutation.isPending} className="!rounded-2xl !px-6">
              SAVE
           </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
           <CollapsibleSection title="Client Entity" icon={User} active={activeSection === 'details'} onClick={() => setActiveSection(activeSection === 'details' ? '' : 'details')}>
              <div className="space-y-4 p-5 bg-white rounded-[24px] border border-gray-100 shadow-sm">
                 <Select
                    label="Select Customer"
                    value={formData.partyId}
                    onChange={(e) => setFormData({ ...formData, partyId: e.target.value })}
                    options={[
                       { value: '', label: 'Select client' },
                       ...(partiesResponse?.data?.map(p => ({ value: p.id, label: p.name })) || [])
                    ]}
                 />
                 {selectedParty && (
                    <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                       <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Billing Info</p>
                       <p className="text-sm font-black text-indigo-900">{selectedParty.name}</p>
                       <p className="text-xs font-bold text-indigo-700">{selectedParty.phone}</p>
                    </div>
                 )}
              </div>
           </CollapsibleSection>

           <CollapsibleSection title="Estimation Info" icon={FileCheck} active={activeSection === 'schema'} onClick={() => setActiveSection(activeSection === 'schema' ? '' : 'schema')}>
               <div className="space-y-4 p-5 bg-white rounded-[24px] border border-gray-100 shadow-sm">
                  <Input label="Estimate Identifier" value={formData.estimateNumber} onChange={(e) => setFormData({ ...formData, estimateNumber: e.target.value })} />
                  <div className="grid grid-cols-2 gap-4">
                     <Input label="Quote Date" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                     <Input label="Valid Until" type="date" value={formData.expiryDate} onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })} />
                  </div>
               </div>
            </CollapsibleSection>

            <CollapsibleSection title="Terms & Notes" icon={FileText} active={activeSection === 'terms'} onClick={() => setActiveSection(activeSection === 'terms' ? '' : 'terms')}>
               <div className="space-y-4 p-5 bg-white rounded-[24px] border border-gray-100 shadow-sm">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 text-xs">Customer Terms & Conditions</label>
                    <textarea 
                      className="w-full rounded-2xl border-gray-100 bg-gray-50/50 p-4 text-sm font-medium focus:ring-indigo-500 focus:border-indigo-500 min-h-[120px]"
                      value={formData.terms}
                      onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                      placeholder="1. Payment 100% in advance...&#10;2. Quote valid for 5 days..."
                    />
                  </div>
               </div>
            </CollapsibleSection>



           {/* Items List */}
           <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                 <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" /> Itemized Scope
                 </h3>
                 <button onClick={() => setItems([...items, { id: Math.random().toString(36).substr(2, 9), itemId: '', description: '', hsnCode: '', quantity: 1, unit: 'NOS', rate: 0, taxRate: 18, discountPercent: 0 }])} className="text-xs font-black text-indigo-600 hover:text-indigo-700 transition-all flex items-center gap-1">
                    <Plus className="w-4 h-4" /> ADD ITEM
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
                       <Input label="Qty" type="number" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value))} />
                       <Input label="Rate (₹)" type="number" value={item.rate} onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value))} />
                       <Select label="GST" value={item.taxRate} options={GST_OPTIONS} onChange={(e) => updateItem(item.id, 'taxRate', parseFloat(e.target.value))} />
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
               <button className="px-6 py-2.5 bg-indigo-600 text-white font-black text-[10px] tracking-widest uppercase rounded-2xl">
                  <Eye className="w-4 h-4 inline mr-2" /> Live Preview
               </button>
                <button 
                  onClick={() => exportToPDF('print-area', `Estimate_${formData.estimateNumber || 'Draft'}.pdf`)}
                  className="px-5 py-2.5 text-gray-500 hover:text-indigo-600 font-bold text-[10px] tracking-widest uppercase"
                >
                  <Download className="w-4 h-4 inline mr-2" /> Download
                </button>
                <button 
                  onClick={() => printElement('print-area')}
                  className="px-5 py-2.5 text-gray-500 hover:text-indigo-600 font-bold text-[10px] tracking-widest uppercase"
                >
                  <Printer className="w-4 h-4 inline mr-2" /> Print
                </button>
            </div>
         </div>

         <div className="w-[820px] bg-white shadow-[0_32px_128px_rgba(0,0,0,0.1)] rounded-sm p-4 flex flex-col min-h-[1160px] relative overflow-hidden">
            <EstimateTemplateAlphesh 
              invoice={formData}
              business={currentBusiness}
              party={selectedParty}
              items={items.map(i => ({
                ...i,
                totalAmount: (i.quantity || 0) * (i.rate || 0) * (1 - (i.discountPercent || 0) / 100) * (1 + (i.taxRate || 0) / 100)
              }))}
              totals={{
                subtotal: totals.subtotal,
                cgst: totals.tax / 2, // Simplified for preview
                sgst: totals.tax / 2,
                igst: 0,
                total: totals.total
              }}
            />
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
          <div className={cn("p-2.5 rounded-xl transition-all", active ? "bg-emerald-600 text-white" : "bg-white text-gray-400 border border-gray-200")}>
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

export default EstimateBuilder;
