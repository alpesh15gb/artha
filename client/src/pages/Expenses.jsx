import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../services/api';
import { useBusinessStore } from '../store/auth';
import { Button, Input, Select, Card, Badge, Modal, EmptyState } from '../components/ui';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit } from 'lucide-react';
import { format } from 'date-fns';

function Expenses() {
  const { currentBusiness } = useBusinessStore();
  const queryClient = useQueryClient();
  const [showFormModal, setShowFormModal] = useState({ isOpen: false, initialData: null });

  const { data } = useQuery({
    queryKey: ['expenses', currentBusiness?.id],
    queryFn: () => api.get(`/expenses/business/${currentBusiness.id}`).then(r => r.data),
    enabled: !!currentBusiness?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/expenses/${id}`),
    onSuccess: () => { queryClient.invalidateQueries(['expenses']); toast.success('Deleted'); },
  });

  const expenses = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">General Expenses</h1>
        <Button icon={Plus} onClick={() => setShowFormModal({ isOpen: true })}>Add Expense</Button>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Num</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold">{e.expenseNumber}</td>
                  <td className="px-6 py-4">{e.category}</td>
                  <td className="px-6 py-4 text-gray-600">{format(new Date(e.date), 'dd MMM yyyy')}</td>
                  <td className="px-6 py-4 text-right font-bold">₹{e.totalAmount?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {expenses.length === 0 && <div className="p-8 text-center text-gray-500">No expenses recorded.</div>}
        </div>
      </Card>
      
      <ExpenseFormModal 
        isOpen={showFormModal.isOpen} 
        onClose={() => setShowFormModal({ isOpen: false })} 
        businessId={currentBusiness?.id} 
      />
    </div>
  );
}

function ExpenseFormModal({ isOpen, onClose, businessId }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({ category: 'OFFICE', amount: 0, description: '' });

  const mutation = useMutation({
    mutationFn: (data) => api.post('/expenses', data),
    onSuccess: () => { queryClient.invalidateQueries(['expenses']); onClose(); },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({ businessId, ...formData, amount: parseFloat(formData.amount), date: new Date().toISOString() });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add General Expense">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Category" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} required />
        <Input label="Amount" type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} required />
        <Input label="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
        <Button type="submit" loading={mutation.isPending}>Save</Button>
      </form>
    </Modal>
  );
}

export default Expenses;
