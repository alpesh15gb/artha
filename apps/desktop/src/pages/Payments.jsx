import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useBusinessStore } from '../store/auth';
import { Button, Input, Select, Card, Badge, Modal, EmptyState } from '../components/ui';
import toast from 'react-hot-toast';
import { Plus, Search, Trash2, ArrowUpRight, ArrowDownLeft, FileText, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

const CreditCardIcon = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="14" x="2" y="5" rx="2" />
    <line x1="2" x2="22" y1="10" y2="10" />
  </svg>
);

function Payments() {
  const { currentBusiness } = useBusinessStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showFormModal, setShowFormModal] = useState({ isOpen: false, initialData: null });

  const { data, isLoading } = useQuery({
    queryKey: ['payments', currentBusiness?.id, search],
    queryFn: () => api.get(`/payments/business/${currentBusiness.id}?search=${search}`).then(r => r.data),
    enabled: !!currentBusiness?.id,
  });

  const { data: partiesData } = useQuery({
    queryKey: ['parties', currentBusiness?.id],
    queryFn: () => api.get(`/parties/business/${currentBusiness.id}`).then(r => r.data),
    enabled: !!currentBusiness?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/payments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['payments']);
      queryClient.invalidateQueries(['invoices']);
      queryClient.invalidateQueries(['purchases']);
      toast.success('Payment deleted and balances restored');
    },
  });

  const payments = data?.data || [];
  const parties = partiesData?.data || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-full bg-gray-50/50">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Financial Transactions</h1>
          <p className="text-slate-500 mt-1.5 text-lg">Manage inward receipts and outward payments with auto-allocation</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
           <Button 
            className="flex-1 sm:flex-none shadow-lg shadow-indigo-200"
            icon={Plus} 
            onClick={() => setShowFormModal({ isOpen: true, initialData: null })}
          >
            Record Transaction
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card noPadding className="overflow-hidden border-slate-200/60 shadow-sm transition-all hover:shadow-md">
          <div className="p-4 border-b border-slate-100 bg-white/50 backdrop-blur-sm flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search by Payment # or Party Name..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-100/50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold text-slate-600 uppercase tracking-wider text-[10px]">Reference</th>
                  <th className="px-6 py-4 text-left font-semibold text-slate-600 uppercase tracking-wider text-[10px]">Party & Method</th>
                  <th className="px-6 py-4 text-left font-semibold text-slate-600 uppercase tracking-wider text-[10px]">Allocations</th>
                  <th className="px-6 py-4 text-left font-semibold text-slate-600 uppercase tracking-wider text-[10px]">Date</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-600 uppercase tracking-wider text-[10px]">Amount</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-600 uppercase tracking-wider text-[10px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((payment) => (
                  <motion.tr 
                    key={payment.id} 
                    initial={{ opacity: 0, y: 5 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 tracking-tight">{payment.paymentNumber}</span>
                        <span className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">{payment.reference}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${payment.adjustments?.some(a => a.purchaseId) ? 'bg-orange-50 text-orange-600' : 'bg-indigo-50 text-indigo-600'}`}>
                          {payment.adjustments?.some(a => a.purchaseId) ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{parties.find(p => p.id === payment.partyId)?.name || 'Direct Entry'}</p>
                          <p className="text-[11px] text-indigo-500 font-bold tracking-wider">{payment.paymentMethod}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-1.5">
                        {payment.adjustments && payment.adjustments.length > 0 ? (
                          payment.adjustments.map((adj, idx) => (
                            <Badge key={idx} variant="ghost" className="bg-slate-100 text-slate-600 text-[10px] py-0.5 border-none">
                              {adj.invoice?.invoiceNumber || adj.purchase?.purchaseNumber || 'General'}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-slate-400 italic text-xs font-medium">Unallocated</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <p className="text-slate-500 font-medium">
                        {payment.date ? format(new Date(payment.date), 'dd MMM, yyyy') : '-'}
                      </p>
                    </td>
                    <td className="px-6 py-5 text-right whitespace-nowrap">
                       <span className={`text-base font-bold tabular-nums ${payment.adjustments?.some(a => a.purchaseId) ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {payment.adjustments?.some(a => a.purchaseId) ? '-' : '+'}₹{(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => deleteMutation.mutate(payment.id)} 
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        title="Delete Transaction"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {payments.length === 0 && !isLoading && (
              <div className="py-24 text-center">
                <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCardIcon className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 uppercase tracking-widest text-[11px]">Zero Transactions</h3>
                <p className="text-slate-400 mt-2 text-sm max-w-[200px] mx-auto">Start recording payments to see your cashflow here.</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      <PaymentFormModal 
        isOpen={showFormModal.isOpen} 
        onClose={() => setShowFormModal({ isOpen: false, initialData: null })} 
        businessId={currentBusiness?.id} 
        parties={parties}
      />
    </div>
  );
}

function PaymentFormModal({ isOpen, onClose, businessId, parties }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({ partyId: '', amount: '', paymentMethod: 'UPI', reference: '', adjustments: [] });
  const [activeTab, setActiveTab] = useState('info'); // 'info' or 'allocation'

  // Fetch pending docs for selected party
  const { data: pendingDocs } = useQuery({
    queryKey: ['pending-docs', formData.partyId],
    queryFn: async () => {
      const party = parties.find(p => p.id === formData.partyId);
      const endpoint = party?.partyType === 'SUPPLIER' ? `/purchases/business/${businessId}?partyId=${formData.partyId}&status=PARTIAL,RECEIVED` : `/invoices/business/${businessId}?partyId=${formData.partyId}&status=PARTIAL,SENT`;
      const res = await api.get(endpoint);
      return res.data;
    },
    enabled: !!formData.partyId && isOpen,
  });

  const docs = pendingDocs?.data || [];

  useEffect(() => {
    if(isOpen) {
      setFormData({ partyId: '', amount: '', paymentMethod: 'UPI', reference: '', adjustments: [] });
      setActiveTab('info');
    }
  }, [isOpen]);

  const mutation = useMutation({
    mutationFn: (data) => api.post('/payments', data),
    onSuccess: () => { 
      queryClient.invalidateQueries(['payments']); 
      queryClient.invalidateQueries(['invoices']); 
      queryClient.invalidateQueries(['purchases']);
      onClose(); 
      toast.success('Transaction protected and saved'); 
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Error recording transaction'),
  });

  const handleDocAllocation = (doc, amount) => {
    const isPurchase = !!doc.purchaseNumber;
    const docId = doc.id;
    
    setFormData(prev => {
      const existing = prev.adjustments.filter(a => (isPurchase ? a.purchaseId : a.invoiceId) !== docId);
      if (amount > 0) {
        existing.push({
          ...(isPurchase ? { purchaseId: docId } : { invoiceId: docId }),
          amount: parseFloat(amount)
        });
      }
      return { ...prev, adjustments: existing };
    });
  };

  const autoAllocate = () => {
    const totalToAllocate = parseFloat(formData.amount || 0);
    let remaining = totalToAllocate;
    const newAdjs = [];

    // Sort docs by date (oldest first)
    const sortedDocs = [...docs].sort((a, b) => new Date(a.date) - new Date(b.date));

    for (const doc of sortedDocs) {
      if (remaining <= 0) break;
      const allocable = Math.min(remaining, doc.balanceDue);
      newAdjs.push({
        ...(doc.purchaseNumber ? { purchaseId: doc.id } : { invoiceId: doc.id }),
        amount: Math.round(allocable * 100) / 100
      });
      remaining -= allocable;
    }

    setFormData({ ...formData, adjustments: newAdjs });
    toast.success('Auto-allocated based on oldest records');
  };

  const totalAdjusted = (formData.adjustments || []).reduce((sum, a) => sum + (a.amount || 0), 0);
  const displayAmount = parseFloat(formData.amount || 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.partyId) return toast.error('Select a party');
    if (!formData.amount || formData.amount <= 0) return toast.error('Enter valid amount');
    
    mutation.mutate({
      businessId,
      ...formData,
      amount: parseFloat(formData.amount),
      date: new Date().toISOString()
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Cashflow Transaction" size="lg">
      <div className="flex border-b border-slate-100 mb-6">
        <button 
          onClick={() => setActiveTab('info')}
          className={`px-6 py-3 font-bold text-[11px] uppercase tracking-widest transition-all ${activeTab === 'info' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}
        >
          1. Transaction Info
        </button>
        <button 
          onClick={() => setActiveTab('allocation')}
          disabled={!formData.partyId || !formData.amount}
          className={`px-6 py-3 font-bold text-[11px] uppercase tracking-widest transition-all ${activeTab === 'allocation' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 disabled:opacity-30'}`}
        >
          2. Allocation (Optional)
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <AnimatePresence mode="wait">
          {activeTab === 'info' ? (
            <motion.div key="info" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
              <Select 
                label="Party (Customer/Supplier)" 
                value={formData.partyId} 
                onChange={e => setFormData({...formData, partyId: e.target.value, adjustments: []})} 
                options={(parties || []).map(p => ({value: p.id, label: `${p.name} (${p.partyType})`}))} 
                placeholder="Search party..."
                required 
              />
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Amount" 
                  type="number" 
                  value={formData.amount} 
                  onChange={e => setFormData({...formData, amount: e.target.value})} 
                  placeholder="0.00"
                  icon={<span>₹</span>}
                  required 
                />
                <Select 
                  label="Payment Method" 
                  value={formData.paymentMethod} 
                  onChange={e => setFormData({...formData, paymentMethod: e.target.value})} 
                  options={[
                      {value: 'BANK', label: 'Bank Transfer'},
                      {value: 'CASH', label: 'Cash'},
                      {value: 'UPI', label: 'UPI / QR'},
                      {value: 'CHEQUE', label: 'Cheque'}
                  ]} 
                />
              </div>
              <Input 
                label="Reference No. / Narration" 
                value={formData.reference} 
                onChange={e => setFormData({...formData, reference: e.target.value})} 
                placeholder="Txn ID, Cheque No. etc."
              />
              <div className="flex justify-end pt-4">
                <Button 
                  type="button" 
                  variant="secondary"
                  onClick={() => setActiveTab('allocation')}
                  disabled={!formData.partyId || !formData.amount}
                >
                  Next: Allocate Payment
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="alloc" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
              <div className="bg-indigo-50/50 p-4 rounded-2xl flex items-center justify-between border border-indigo-100">
                <div>
                  <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Total to Allocate</p>
                  <p className="text-xl font-black text-indigo-700">₹{(displayAmount || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-right">Remaining</p>
                  <p className={`text-xl font-black text-right ${Math.abs(displayAmount - totalAdjusted) < 0.1 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    ₹{(displayAmount - totalAdjusted).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center px-1">
                <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Pending Documents</h4>
                <button type="button" onClick={autoAllocate} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-widest flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Auto Allocate
                </button>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {docs.map(doc => {
                  const currentAlloc = formData.adjustments.find(a => (doc.invoiceNumber ? a.invoiceId : a.purchaseId) === doc.id)?.amount || '';
                  return (
                    <div key={doc.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between hover:border-indigo-200 transition-all shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-50 rounded-lg">
                          <FileText className="w-4 h-4 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{doc.invoiceNumber || doc.purchaseNumber}</p>
                          <p className="text-[10px] text-slate-400 font-medium">Due: ₹{doc.balanceDue?.toLocaleString()} • {doc.date ? format(new Date(doc.date), 'dd MMM') : '-'}</p>
                        </div>
                      </div>
                      <div className="w-32">
                        <input 
                          type="number" 
                          max={doc.balanceDue}
                          className="w-full bg-slate-50 border-none rounded-lg py-1.5 px-3 text-right font-bold text-indigo-600 focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                          placeholder="0.00"
                          value={currentAlloc}
                          onChange={e => handleDocAllocation(doc, e.target.value)}
                        />
                      </div>
                    </div>
                  );
                })}
                {docs.length === 0 && (
                  <div className="text-center py-10 bg-slate-50 rounded-2xl">
                    <p className="text-slate-400 text-xs font-medium italic">No pending bills found for this party.</p>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-4 sticky bottom-0 bg-white">
                <Button type="button" variant="ghost" onClick={() => setActiveTab('info')}>Back</Button>
                <Button type="submit" loading={mutation.isPending} icon={CheckCircle2}>Confirm & Save</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </Modal>
  );
}

export default Payments;
