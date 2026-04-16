import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, ArrowRightLeft, CreditCard, Banknote, 
  History, TrendingUp, TrendingDown, Search,
  ExternalLink, MoreHorizontal, Wallet, Landmark
} from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import { useBusinessStore } from '../store/auth';
import { Card, Badge, Button, Input, Modal, cn } from '../components/ui';
import toast from 'react-hot-toast';

function Accounts() {
  const { currentBusiness } = useBusinessStore();
  const queryClient = useQueryClient();
  const [txSearch, setTxSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addAccountType, setAddAccountType] = useState('bank'); // 'bank' or 'cash'
  const [accountForm, setAccountForm] = useState({ bankName: '', accountNumber: '', openingBalance: 0 });

  const { data: bankAccountsData, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['bank-accounts', currentBusiness?.id],
    queryFn: () => api.get(`/accounts/bank-accounts/business/${currentBusiness.id}`).then(r => r.data),
    enabled: !!currentBusiness?.id,
  });

  const { data: cashAccountsData } = useQuery({
    queryKey: ['cash-accounts', currentBusiness?.id],
    queryFn: () => api.get(`/accounts/cash-accounts/business/${currentBusiness.id}`).then(r => r.data),
    enabled: !!currentBusiness?.id,
  });

  const { data: txData } = useQuery({
    queryKey: ['transactions', currentBusiness?.id, txSearch],
    queryFn: () => api.get(`/accounts/transactions/business/${currentBusiness.id}?search=${txSearch}&limit=50`).then(r => r.data),
    enabled: !!currentBusiness?.id,
  });

  const addAccountMutation = useMutation({
    mutationFn: (data) => {
      if (addAccountType === 'bank') {
        return api.post('/accounts/bank-accounts', { 
          bankName: data.bankName, 
          accountName: data.bankName, 
          accountNumber: data.accountNumber, 
          ifscCode: 'UNKNOWN',
          businessId: currentBusiness.id, 
          currentBalance: data.openingBalance || 0 
        });
      } else {
        return api.post('/accounts/cash-accounts', { 
          name: data.bankName, 
          businessId: currentBusiness.id, 
          openingBalance: data.openingBalance || 0 
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bank-accounts']);
      queryClient.invalidateQueries(['cash-accounts']);
      toast.success(`${addAccountType === 'bank' ? 'Bank' : 'Cash'} account added`);
      setShowAddModal(false);
      setAccountForm({ bankName: '', accountNumber: '', openingBalance: 0 });
    },
    onError: () => toast.error('Failed to add account'),
  });

  const bankAccounts = bankAccountsData?.data || [];
  const cashAccounts = cashAccountsData?.data || [];
  const accounts = [...bankAccounts, ...cashAccounts];
  const transactions = txData?.data || [];

  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);
  }, [accounts]);

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Banking & Treasury</h1>
          <p className="text-sm text-gray-400 font-medium mt-1">Manage liquidity, bank reconciliations and cash flow.</p>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="secondary" icon={ArrowRightLeft}>Transfer Funds</Button>
           <Button icon={Plus} onClick={() => setShowAddModal(true)}>Linked Account</Button>
        </div>
      </div>

      {/* Hero Wallet Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <Card className="lg:col-span-1 !p-8 bg-gradient-to-br from-indigo-600 to-purple-700 text-white border-none shadow-2xl shadow-indigo-500/20 relative overflow-hidden group">
            <div className="absolute -right-12 -top-12 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700" />
            <div className="relative z-10">
               <div className="flex justify-between items-center mb-12">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                     <Wallet className="w-6 h-6" />
                  </div>
                  <Badge className="bg-white/20 text-white border-none text-[10px] uppercase font-black tracking-widest px-3">Live Liquidity</Badge>
               </div>
               <p className="text-indigo-100/60 text-xs font-black uppercase tracking-widest">Total Treasury Balance</p>
               <h2 className="text-5xl font-black mt-2 tracking-tighter">₹{totalBalance.toLocaleString()}</h2>
               <div className="mt-12 flex gap-4">
                  <div className="flex-1 p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
                     <p className="text-[10px] font-black uppercase opacity-60">Accounts</p>
                     <p className="text-xl font-black mt-1">{accounts.length}</p>
                  </div>
                  <div className="flex-1 p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
                     <p className="text-[10px] font-black uppercase opacity-60">Status</p>
                     <p className="text-xl font-black mt-1">Healthy</p>
                  </div>
               </div>
            </div>
         </Card>

         <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            {accounts.map((acc, i) => (
               <Card key={acc.id} className="!p-6 border-none shadow-xl shadow-gray-200/50 flex flex-col justify-between hover:-translate-y-1 transition-all duration-300">
                  <div className="flex justify-between items-start">
                     <div className="p-3 bg-gray-50 rounded-2xl text-indigo-600">
                        <Landmark className="w-6 h-6" />
                     </div>
                     <button className="text-gray-300 hover:text-indigo-600"><MoreHorizontal className="w-5 h-5" /></button>
                  </div>
                  <div className="mt-8">
                     <h4 className="text-sm font-black text-gray-900 tracking-tight">{acc.bankName}</h4>
                     <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">**** {acc.accountNumber?.slice(-4) || '0000'}</p>
                  </div>
                  <div className="mt-8 pt-4 border-t border-gray-50 flex items-center justify-between">
                     <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Available</span>
                     <span className="text-xl font-black text-indigo-600">₹{acc.currentBalance?.toLocaleString()}</span>
                  </div>
               </Card>
            ))}
            {accounts.length === 0 && (
              <div className="md:col-span-2 flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-100 rounded-[2rem] text-center">
                 <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4"><Plus className="w-8 h-8 text-gray-200" /></div>
                 <h5 className="font-bold text-gray-900">No Banks Linked</h5>
                 <p className="text-sm text-gray-400 mt-1">Connect your business accounts to track cash flows.</p>
              </div>
            )}
         </div>
      </div>

      {/* Transaction Ledger */}
      <div className="space-y-6">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
               <History className="w-6 h-6 text-indigo-600" />
               Recent General Ledger
            </h3>
            <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl w-full md:w-80 border border-gray-100 group shadow-sm focus-within:ring-2 ring-indigo-500/20">
               <Search className="w-4 h-4 text-gray-400" />
               <input 
                 type="text" 
                 placeholder="Search ledger..." 
                 value={txSearch}
                 onChange={(e) => setTxSearch(e.target.value)}
                 className="bg-transparent border-none focus:ring-0 text-sm w-full font-medium"
               />
            </div>
         </div>

         <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
               <thead className="bg-gray-50/50 border-b border-gray-100">
                  <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                     <th className="px-8 py-5">Value Date</th>
                     <th className="px-8 py-5">Transaction Details</th>
                     <th className="px-8 py-5">Reference/Entity</th>
                     <th className="px-8 py-5 text-right">Debit / Credit</th>
                     <th className="px-8 py-5 text-right">Action</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                  {transactions.map(tx => (
                    <tr key={tx.id} className="group hover:bg-indigo-50/30 transition-all">
                       <td className="px-8 py-6">
                          <p className="text-sm font-black text-gray-900 tracking-tighter">{format(new Date(tx.date), 'dd MMM, yyyy')}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5 tracking-widest">{format(new Date(tx.date), 'HH:mm')}</p>
                       </td>
                       <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                             <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", tx.type === 'RECEIPT' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                                {tx.type === 'RECEIPT' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                             </div>
                             <div>
                                <p className="text-sm font-bold text-gray-900 uppercase tracking-tighter">{tx.type}</p>
                                <p className="text-xs text-gray-400 font-medium">Auto-reconciled</p>
                             </div>
                          </div>
                       </td>
                       <td className="px-8 py-6">
                          <p className="text-sm font-black text-gray-700">{tx.party?.name || tx.reference || 'N/A'}</p>
                       </td>
                       <td className="px-8 py-6 text-right">
                          <span className={cn("text-lg font-black tracking-tight", tx.type === 'RECEIPT' ? 'text-emerald-600' : 'text-rose-600')}>
                             {tx.type === 'RECEIPT' ? '+' : '-'} ₹{tx.amount?.toLocaleString()}
                          </span>
                       </td>
                       <td className="px-8 py-6 text-right">
                          <button className="p-2.5 hover:bg-white rounded-xl text-gray-400 hover:text-indigo-600 shadow-sm transition-all opacity-0 group-hover:opacity-100">
                             <ExternalLink className="w-4 h-4" />
                          </button>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
            {transactions.length === 0 && (
               <div className="py-20 text-center text-gray-400">
                  <p className="text-sm font-bold">No ledger transactions found</p>
               </div>
            )}
         </div>
      </div>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Account">
        <div className="space-y-4">
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
            <button 
              type="button"
              onClick={() => { setAddAccountType('bank'); setAccountForm({ bankName: '', accountNumber: '', openingBalance: 0 }); }}
              className={cn("flex-1 py-2 rounded-lg text-sm font-bold transition-colors", addAccountType === 'bank' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500")}
            >Bank Account</button>
            <button 
              type="button"
              onClick={() => { setAddAccountType('cash'); setAccountForm({ bankName: '', accountNumber: '', openingBalance: 0 }); }}
              className={cn("flex-1 py-2 rounded-lg text-sm font-bold transition-colors", addAccountType === 'cash' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500")}
            >Cash Account</button>
          </div>
          
          {addAccountType === 'bank' ? (
            <>
              <Input 
                label="Bank Name" 
                value={accountForm.bankName} 
                onChange={e => setAccountForm({...accountForm, bankName: e.target.value})} 
                placeholder="e.g., HDFC Bank"
              />
              <Input 
                label="Account Number" 
                value={accountForm.accountNumber} 
                onChange={e => setAccountForm({...accountForm, accountNumber: e.target.value})} 
                placeholder="e.g., 1234567890"
              />
            </>
          ) : (
            <Input 
              label="Account Name" 
              value={accountForm.bankName} 
              onChange={e => setAccountForm({...accountForm, bankName: e.target.value})} 
              placeholder="e.g., Petty Cash"
            />
          )}
          
          <Input 
            label="Opening Balance" 
            type="number" 
            value={accountForm.openingBalance} 
            onChange={e => setAccountForm({...accountForm, openingBalance: parseFloat(e.target.value) || 0})} 
          />
          
          <Button 
            className="w-full" 
            onClick={() => addAccountMutation.mutate(accountForm)}
            loading={addAccountMutation.isPending}
          >
            Add {addAccountType === 'bank' ? 'Bank' : 'Cash'} Account
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default Accounts;
