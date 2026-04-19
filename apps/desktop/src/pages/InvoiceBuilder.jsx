import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Trash2, Save, Download, Printer, Mail, 
  ChevronLeft, ChevronDown, ChevronRight, Search, 
  Calendar, CreditCard, FileText, User, ShoppingBag,
  Percent, Hash, AlertCircle, CheckCircle2, MoreVertical,
  MinusCircle, Building2, Eye, ExternalLink, Layout, Tag,
  Send, FileCheck
} from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import { useBusinessStore } from '../store/auth';
import { Button, Input, Select, Card, Badge, Modal, Portal, cn } from '../components/ui';
import toast from 'react-hot-toast';
import { numberToWords } from '../utils/numberToWords';
import { InvoiceTemplate1 } from '../components/invoices/InvoiceTemplate1';

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
    poNumber: '',
    notes: 'Thank you for your business. Please make payment within 30 days.',
    terms: 'Late payments incur a 2% fee/month.',
    isTaxInclusive: false,
    status: 'DRAFT',
    invoiceType: 'TAX_INVOICE',
    transportMode: '',
    vehicleNo: '',
    lrNo: '',
    lrDate: '',
    totalBoxes: '',
    irn: '',
    ackNo: '',
    ackDate: '',
    qrCode: ''
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

  const { data: invoiceResponse, isLoading: isLoadingInvoice } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => api.get(`/invoices/${id}`).then(r => r.data),
    enabled: isEdit,
  });

  const { data: nextNumberData } = useQuery({
    queryKey: ['next-number', currentBusiness?.id, 'invoice'],
    queryFn: () => api.get(`/settings/${currentBusiness.id}/next-number/invoice`).then(r => r.data),
    enabled: !!currentBusiness?.id && !isEdit,
    refetchOnWindowFocus: false,
    staleTime: Infinity
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
        poNumber: inv.poNumber || '',
        notes: inv.notes || '',
        terms: inv.terms || '',
        status: inv.status,
        isTaxInclusive: inv.isTaxInclusive || false,
        invoiceType: inv.invoiceType,
        transportMode: inv.transportMode || '',
        vehicleNo: inv.vehicleNo || '',
        lrNo: inv.lrNo || '',
        lrDate: inv.lrDate ? format(new Date(inv.lrDate), 'yyyy-MM-dd') : '',
        totalBoxes: inv.totalBoxes ? parseInt(inv.totalBoxes) : null,
        irn: inv.irn || '',
        ackNo: inv.ackNo || '',
        ackDate: inv.ackDate ? format(new Date(inv.ackDate), 'yyyy-MM-dd') : '',
        qrCode: inv.qrCode || ''
      });
      setItems(inv.items.map(i => ({
        ...i,
        id: i.id || Math.random().toString(36).substr(2, 9),
        taxRate: (i.cgstRate || 0) + (i.sgstRate || 0) + (i.igstRate || 0)
      })));
    } else if (!isEdit && nextNumberData?.data && !formData.invoiceNumber) {
      setFormData(prev => ({ ...prev, invoiceNumber: nextNumberData.data.nextNumber }));
    }
  }, [invoiceResponse, isEdit, nextNumberData, formData.invoiceNumber]);

  // Calculations
  const totals = useMemo(() => {
    return items.reduce((acc, item) => {
      const quantity = item.quantity || 0;
      const rate = item.rate || 0;
      const taxRate = item.taxRate || 0;
      const discountPercent = item.discountPercent || 0;

      let taxable = 0;
      let taxAmount = 0;
      let total = 0;

      if (formData.isTaxInclusive) {
        total = quantity * rate;
        const discount = total * (discountPercent / 100);
        total -= discount;
        taxable = total / (1 + (taxRate / 100));
        taxAmount = total - taxable;
      } else {
        const amount = quantity * rate;
        const discount = amount * (discountPercent / 100);
        taxable = amount - discount;
        taxAmount = taxable * (taxRate / 100);
        total = taxable + taxAmount;
      }
      
      return {
        subtotal: acc.subtotal + taxable,
        tax: acc.tax + taxAmount,
        total: acc.total + total
      };
    }, { subtotal: 0, tax: 0, total: 0 });
  }, [items, formData.isTaxInclusive]);

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
    onError: (error) => toast.error(error.response?.data?.message || 'Something went wrong')
  });

  const handleSave = (status = 'DRAFT') => {
    if (!formData.partyId) return toast.error('Please select a party');
    const payload = {
      ...formData,
      status,
      businessId: currentBusiness?.id,
      totalBoxes: formData.totalBoxes ? parseInt(formData.totalBoxes) : null,
      billingAddress: formData.billingAddress || selectedParty?.address || '',
      subtotal: totals.subtotal,
      cgstAmount: totals.tax / 2,
      sgstAmount: totals.tax / 2,
      totalAmount: totals.total,
      balanceDue: totals.total,
      amountInWords: numberToWords(Math.round(totals.total)),
      items: items.map(i => {
        let taxableAmount = (i.quantity || 0) * (i.rate || 0) * (1 - (i.discountPercent || 0) / 100);
        if (formData.isTaxInclusive) {
          taxableAmount = taxableAmount / (1 + (i.taxRate / 100));
        }
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
          cgstAmount: taxableAmount * halfTax / 100,
          sgstAmount: taxableAmount * halfTax / 100,
          totalAmount: taxableAmount * (1 + i.taxRate / 100)
        };
      })
    };
    mutation.mutate(payload);
  };

  const selectedParty = partiesResponse?.data?.find(p => p.id === formData.partyId);

  if (isLoadingInvoice) return <div className="p-8">Syncing...</div>;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col -m-8">
      {/* Header */}
      <div className="bg-[#0f172a] text-white px-8 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/invoices')} className="p-2 hover:bg-slate-800 rounded-lg"><ChevronLeft /></button>
          <div>
             <h1 className="text-xl font-black uppercase tracking-tighter">Sale Invoice</h1>
             <p className="text-[10px] font-mono text-indigo-400">{formData.invoiceNumber || 'GENERATING...'}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => handleSave('DRAFT')}>Save Draft</Button>
          <Button variant="primary" className="bg-indigo-600" onClick={() => setShowPreview(true)}>Preview</Button>
          <Button variant="primary" className="bg-emerald-600" onClick={() => handleSave('SENT')}>Finalize</Button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto no-scrollbar">
        <div className="max-w-[1600px] mx-auto space-y-4">
          
          {/* Party Details */}
          <Card className="p-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-l-4 border-indigo-600 pl-4">Customer Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               <div className="lg:col-span-2 space-y-4">
                  <Select 
                    label="Customer" 
                    value={formData.partyId} 
                    onChange={e => setFormData({...formData, partyId: e.target.value})}
                    options={[{value:'', label:'Select Customer...'}, ...(partiesResponse?.data?.map(p => ({value: p.id, label: p.name})) || [])]}
                  />
                  <textarea 
                    className="w-full bg-slate-50 border p-3 rounded-lg text-sm" 
                    placeholder="Address..." 
                    value={formData.billingAddress || selectedParty?.address || ''}
                    onChange={e => setFormData({...formData, billingAddress: e.target.value})}
                  />
               </div>
               <div className="space-y-4">
                  <Input label="Invoice Date" type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                  <Input label="Invoice Number" value={formData.invoiceNumber} onChange={e => setFormData({...formData, invoiceNumber: e.target.value})} />
               </div>
               <div className="space-y-4">
                  <Input label="Due Date" type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
                  <Select label="Type" value={formData.invoiceType} onChange={e => setFormData({...formData, invoiceType: e.target.value})} options={[{value:'TAX_INVOICE', label:'Tax Invoice'}, {value:'BILL_OF_SUPPLY', label:'Bill of Supply'}]} />
               </div>
            </div>
          </Card>

          {/* ITEM TABLE */}
          <Card className="!p-0 overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
               <div className="flex items-center gap-6">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Line Items</h3>
                  
                  {/* Mode Swapper */}
                  <div className="flex bg-slate-200 p-1 rounded-xl border">
                    <button 
                      onClick={() => setFormData({...formData, isTaxInclusive: false})}
                      className={cn("px-4 py-1.5 rounded-lg text-[9px] font-black tracking-widest transition-all", !formData.isTaxInclusive ? "bg-white text-indigo-600 shadow" : "text-slate-500")}
                    >EXCLUSIVE</button>
                    <button 
                      onClick={() => setFormData({...formData, isTaxInclusive: true})}
                      className={cn("px-4 py-1.5 rounded-lg text-[9px] font-black tracking-widest transition-all", formData.isTaxInclusive ? "bg-white text-indigo-600 shadow" : "text-slate-500")}
                    >INCLUSIVE</button>
                  </div>
               </div>
               <Button variant="secondary" size="sm" onClick={() => setItems([...items, { id: Math.random().toString(36).substr(2, 9), itemId: '', description: '', hsnCode: '', quantity: 1, unit: 'NOS', rate: 0, taxRate: 18, discountPercent: 0 }])} icon={Plus}>Add Line</Button>
            </div>
            
            <table className="w-full">
              <thead className="bg-slate-50 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b">
                <tr>
                  <th className="p-4 w-12 text-center">#</th>
                  <th className="p-4 text-left">Product</th>
                  <th className="p-4 text-center w-24">Qty</th>
                  <th className="p-4 text-right w-32">{formData.isTaxInclusive ? 'Rate (Incl)' : 'Rate (Excl)'}</th>
                  <th className="p-4 text-center w-24">Tax%</th>
                  <th className="p-4 text-right w-32">Amount</th>
                  <th className="p-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="p-4 text-center text-xs text-slate-400">{idx+1}</td>
                    <td className="p-4">
                      <select className="w-full border-none bg-transparent font-black" value={item.itemId} onChange={e => updateItem(item.id, 'itemId', e.target.value)}>
                        <option value="">Select Item...</option>
                        {itemsResponse?.data?.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                      <input className="w-full text-xs text-slate-500 border-none bg-transparent" placeholder="Details..." value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} />
                    </td>
                    <td className="p-4">
                      <input type="number" className="w-full text-center font-black border-none bg-transparent" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value))} />
                    </td>
                    <td className="p-4 text-right">
                      <input type="number" className="w-full text-right font-black border-none bg-transparent" value={item.rate} onChange={e => updateItem(item.id, 'rate', parseFloat(e.target.value))} />
                    </td>
                    <td className="p-4 text-center">
                      <select className="border-none bg-transparent font-black" value={item.taxRate} onChange={e => updateItem(item.id, 'taxRate', parseFloat(e.target.value))}>
                        {GST_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                    <td className="p-4 text-right font-black">
                      ₹{((item.quantity || 0) * (item.rate || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-center">
                      <button onClick={() => items.length > 1 && setItems(items.filter(i => i.id !== item.id))} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* TOTALS */}
          <div className="flex justify-end">
            <div className="w-full lg:w-96 bg-slate-900 rounded-2xl p-8 text-white space-y-4">
               <div className="flex justify-between text-xs opacity-60 uppercase tracking-widest font-black">
                  <span>Subtotal</span>
                  <span>₹{totals.subtotal.toLocaleString()}</span>
               </div>
               <div className="flex justify-between text-xs opacity-60 uppercase tracking-widest font-black">
                  <span>Tax Total</span>
                  <span>₹{totals.tax.toLocaleString()}</span>
               </div>
               <div className="h-px bg-white/10" />
               <div className="flex justify-between items-end">
                  <span className="text-xs font-black opacity-40 uppercase tracking-widest mb-1">Total</span>
                  <span className="text-5xl font-black">₹{totals.total.toLocaleString()}</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} title="Invoice Preview" size="xl">
        <div className="space-y-6">
           <div className="bg-slate-50 p-4 flex justify-between rounded-xl border">
              <span className="text-xs font-black uppercase tracking-widest">Document Rendering</span>
              <Button size="sm" onClick={() => window.print()} icon={Printer}>Print</Button>
           </div>
           <div className="bg-white border shadow-2xl">
              <InvoiceTemplate1 
                invoice={{ ...formData, amountInWords: numberToWords(Math.round(totals.total)) }}
                business={currentBusiness}
                party={selectedParty}
                items={items}
                totals={{ subtotal: totals.subtotal, cgst: totals.tax / 2, sgst: totals.tax / 2, total: totals.total }}
              />
           </div>
        </div>
      </Modal>

      {showPreview && (
        <Portal>
          <div id="print-root" className="fixed inset-0 hidden print:block bg-white z-[99999]">
            <InvoiceTemplate1 
              invoice={{ ...formData, amountInWords: numberToWords(Math.round(totals.total)) }}
              business={currentBusiness}
              party={selectedParty}
              items={items}
              totals={{ subtotal: totals.subtotal, cgst: totals.tax / 2, sgst: totals.tax / 2, total: totals.total }}
            />
          </div>
        </Portal>
      )}
    </div>
  );
}

export default InvoiceBuilder;
