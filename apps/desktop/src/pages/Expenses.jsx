import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useBusinessStore } from '../store/auth';
import { Button, Input, Card, Badge, Modal, cn } from '../components/ui';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit, Calendar } from 'lucide-react';
import { format } from 'date-fns';

function Expenses() {
  const { currentBusiness } = useBusinessStore();
  const queryClient = useQueryClient();
  const [showFormModal, setShowFormModal] = useState({ isOpen: false, initialData: null });

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', currentBusiness?.id],
    queryFn: () => api.get(`/expenses/business/${currentBusiness?.id}`).then(r => r.data),
    enabled: !!currentBusiness?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/expenses/${id}`),
    onSuccess: () => { 
      queryClient.invalidateQueries(['expenses']); 
      toast.success('Expense deleted successfully'); 
    },
    onError: () => { toast.error('Failed to delete expense'); }
  });

  if (!currentBusiness) {
    return (
      <div className="p-20 text-center">
        <p className="text-gray-400 font-bold uppercase tracking-widest">No business selected</p>
      </div>
    );
  }

  const expenses = data?.data || [];

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">General Expenses</h1>
          <p className="text-sm text-gray-400 font-medium mt-1">Track and manage your business overheads and operating costs.</p>
        </div>
        <Button 
          icon={Plus} 
          onClick={() => setShowFormModal({ isOpen: true })}
          className="btn-primary"
        >
          New Expense Entry
        </Button>
      </div>

      <Card className="border-none shadow-xl shadow-gray-200/50 overflow-hidden !p-0">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-8 py-5">Voucher Num</th>
                <th className="px-8 py-5">Category & Purpose</th>
                <th className="px-8 py-5">Date</th>
                <th className="px-8 py-5 text-right">Amount</th>
                <th className="px-8 py-5 text-right w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenses.map((e) => (
                <tr key={e.id} className="group hover:bg-gray-50/80 transition-all">
                  <td className="px-8 py-5">
                    <span className="font-mono text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">#{e.expenseNumber}</span>
                  </td>
                  <td className="px-8 py-5">
                    <p className="font-black text-gray-900">{e.category}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{e.description || 'No description'}</p>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2 text-gray-500 font-medium">
                       <Calendar className="w-3.5 h-3.5" />
                       <span className="text-sm">{e.date ? format(new Date(e.date), 'dd MMM yyyy') : 'No Date'}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <p className="text-lg font-black text-gray-900 tracking-tight">₹{e.totalAmount?.toLocaleString()}</p>
                    <Badge variant={e.paymentMethod === 'BANK' ? 'info' : 'default'} className="text-[10px] px-2 py-0">{(e.paymentMethod || 'CASH').toLowerCase()}</Badge>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><Edit className="w-4 h-4 text-gray-400" /></button>
                      <button 
                        onClick={() => deleteMutation.mutate(e.id)}
                        className="p-2 hover:bg-rose-50 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-rose-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {expenses.length === 0 && !isLoading && (
            <div className="p-20 text-center">
               <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8 text-gray-200" />
               </div>
               <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No expenses found</p>
            </div>
          )}
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
  const [activeTab, setActiveTab] = useState('cash'); // 'cash' or 'bank'
  const [formData, setFormData] = useState({ category: 'OFFICE', amount: 0, description: '', accountId: '' });

  const { data: bankData } = useQuery({
    queryKey: ['bank-accounts', businessId],
    queryFn: () => api.get(`/accounts/bank-accounts/business/${businessId}`).then(r => r.data),
    enabled: !!isOpen && !!businessId,
  });

  const { data: cashData } = useQuery({
    queryKey: ['cash-accounts', businessId],
    queryFn: () => api.get(`/accounts/cash-accounts/business/${businessId}`).then(r => r.data),
    enabled: !!isOpen && !!businessId,
  });

  const banks = bankData?.data || [];
  const cashAccounts = cashData?.data || [];

  const mutation = useMutation({
    mutationFn: (data) => api.post('/expenses', data),
    onSuccess: () => { 
      queryClient.invalidateQueries(['expenses']); 
      queryClient.invalidateQueries(['bank-accounts']); 
      queryClient.invalidateQueries(['cash-accounts']); 
      toast.success('Expense recorded successfully');
      onClose(); 
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to save expense');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.accountId) {
      toast.error('Please select an account to pay from');
      return;
    }
    
    // Deconstruct to separate accountId from categories/descriptions
    const { accountId, ...otherFields } = formData;

    const data = { 
      businessId, 
      ...otherFields, 
      amount: parseFloat(formData.amount), 
      date: new Date().toISOString(),
      paymentMethod: activeTab === 'cash' ? 'CASH' : 'BANK',
      bankAccountId: activeTab === 'bank' ? accountId : undefined,
      cashAccountId: activeTab === 'cash' ? accountId : undefined,
    };
    mutation.mutate(data);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add General Expense">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Category" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} required />
        <Input label="Amount" type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} required />
        
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Pay From</label>
          <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
             <button type="button" onClick={() => {setActiveTab('cash'); setFormData({...formData, accountId: ''})}} className={cn("flex-1 py-1.5 rounded-lg font-bold text-xs transition-colors", activeTab === 'cash' ? "bg-white shadow-sm text-indigo-600" : "text-gray-400 hover:text-gray-600")}>Cash</button>
             <button type="button" onClick={() => {setActiveTab('bank'); setFormData({...formData, accountId: ''})}} className={cn("flex-1 py-1.5 rounded-lg font-bold text-xs transition-colors", activeTab === 'bank' ? "bg-white shadow-sm text-indigo-600" : "text-gray-400 hover:text-gray-600")}>Bank</button>
          </div>
          
          <select 
            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-sm font-medium outline-none focus:ring-2 ring-indigo-500/20"
            value={formData.accountId}
            onChange={(e) => setFormData({...formData, accountId: e.target.value})}
            required
          >
            <option value="">Select Account</option>
            {activeTab === 'cash' ? (
              cashAccounts.map(c => <option key={c.id} value={c.id}>{c.name} (₹{c.currentBalance})</option>)
            ) : (
              banks.map(b => <option key={b.id} value={b.id}>{b.bankName} (₹{b.currentBalance})</option>)
            )}
          </select>
        </div>

        <Input label="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
        <Button type="submit" loading={mutation.isPending} className="w-full">Save Expense</Button>
      </form>
    </Modal>
  );
}

export default Expenses;
