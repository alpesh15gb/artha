import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../services/api';
import { useBusinessStore } from '../store/auth';
import { Button, Input, Select, Card, Badge, Modal, EmptyState } from '../components/ui';
import toast from 'react-hot-toast';
import { Plus, Search, Edit, Trash2, CreditCard } from 'lucide-react';
import { format } from 'date-fns';

function Payments() {
  const { currentBusiness } = useBusinessStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showFormModal, setShowFormModal] = useState({ isOpen: false, initialData: null });

  const { data } = useQuery({
    queryKey: ['payments', currentBusiness?.id, search],
    queryFn: () => api.get(`/payments/business/${currentBusiness.id}?search=${search}`).then(r => r.data),
    enabled: !!currentBusiness?.id,
  });

  const { data: parties } = useQuery({
    queryKey: ['parties', currentBusiness?.id],
    queryFn: () => api.get(`/parties/business/${currentBusiness.id}`).then(r => r.data),
    enabled: !!currentBusiness?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/payments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['payments']);
      toast.success('Payment deleted');
    },
  });

  const payments = data?.data || [];
  const systemParties = parties?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-500 mt-1">Record payments mapped to parties or invoices</p>
        </div>
        <Button icon={Plus} onClick={() => setShowFormModal({ isOpen: true, initialData: null })}>Record Payment</Button>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Payment #</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Method</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((payment) => (
                <motion.tr key={payment.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-gray-50">
                  <td className="px-6 py-4"><p className="font-semibold text-gray-900">{payment.paymentNumber}</p></td>
                  <td className="px-6 py-4"><Badge variant="default">{payment.paymentMethod}</Badge></td>
                  <td className="px-6 py-4"><p className="text-gray-600">{format(new Date(payment.date), 'dd MMM yyyy')}</p></td>
                  <td className="px-6 py-4 text-right"><p className="font-semibold text-emerald-600">+₹{payment.amount?.toLocaleString()}</p></td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => deleteMutation.mutate(payment.id)} className="p-2 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {payments.length === 0 && <div className="p-8 text-center text-gray-500">No payments found.</div>}
        </div>
      </Card>

      <PaymentFormModal 
        isOpen={showFormModal.isOpen} 
        onClose={() => setShowFormModal({ isOpen: false, initialData: null })} 
        businessId={currentBusiness?.id} 
        parties={systemParties}
      />
    </div>
  );
}

function PaymentFormModal({ isOpen, onClose, businessId, parties }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({ partyId: '', amount: 0, paymentMethod: 'BANK', reference: '' });

  useEffect(() => {
    if(isOpen) setFormData({ partyId: '', amount: 0, paymentMethod: 'BANK', reference: '' });
  }, [isOpen]);

  const mutation = useMutation({
    mutationFn: (data) => api.post('/payments', data),
    onSuccess: () => { queryClient.invalidateQueries(['payments']); onClose(); toast.success('Payment recorded'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Error recording payment'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({
      businessId,
      ...formData,
      amount: parseFloat(formData.amount),
      date: new Date().toISOString()
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Inward Payment" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select label="Party (From)" value={formData.partyId} onChange={e => setFormData({...formData, partyId: e.target.value})} options={parties.map(p => ({value: p.id, label: p.name}))} required />
        <Input label="Amount Received" type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} required />
        <Select label="Payment Method" value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value})} options={[
            {value: 'BANK', label: 'Bank Transfer'},
            {value: 'CASH', label: 'Cash'},
            {value: 'UPI', label: 'UPI'},
            {value: 'CHEQUE', label: 'Cheque'}
        ]} />
        <Input label="Reference (Txn ID)" value={formData.reference} onChange={e => setFormData({...formData, reference: e.target.value})} />
        <div className="flex justify-end pt-4"><Button type="submit" loading={mutation.isPending}>Save</Button></div>
      </form>
    </Modal>
  );
}

export default Payments;
