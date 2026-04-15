import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Edit, Trash2, Users, Save, Eye, 
  MoreVertical, Phone, Mail, MapPin, 
  ChevronDown, Filter, User
} from 'lucide-react';
import api from '../services/api';
import { useBusinessStore } from '../store/auth';
import { Button, Input, Select, Card, Badge, Modal, cn } from '../components/ui';
import toast from 'react-hot-toast';

function Parties() {
  const { currentBusiness } = useBusinessStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [filterType, setFilterType] = useState('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['parties', currentBusiness?.id, search],
    queryFn: () => api.get(`/parties/business/${currentBusiness.id}?search=${search}`).then(r => r.data),
    enabled: !!currentBusiness?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/parties/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['parties']);
      toast.success('Party archived');
    },
  });

  const parties = useMemo(() => {
    let list = data?.data || [];
    if (filterType !== 'ALL') {
      list = list.filter(p => p.partyType === filterType);
    }
    return list;
  }, [data, filterType]);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Parties</h1>
          <p className="text-sm text-gray-500 font-medium">Manage your relationships with customers and suppliers.</p>
        </div>
        <Button icon={Plus} onClick={() => setShowModal(true)}>Add New Party</Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="!p-6 bg-white border-none shadow-sm flex items-center gap-4">
            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Parties</p>
              <p className="text-xl font-black text-gray-900">{parties.length}</p>
            </div>
         </Card>
      </div>

      {/* Filters Area */}
      <Card className="!p-3 border-none shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
         <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl w-full md:w-96 border border-gray-100 group">
           <Search className="w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
           <input 
             type="text" 
             placeholder="Search name, phone, or GST..." 
             value={search}
             onChange={(e) => setSearch(e.target.value)}
             className="bg-transparent border-none focus:ring-0 text-sm w-full font-medium"
           />
         </div>
         <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
               <button 
                 onClick={() => setFilterType('ALL')}
                 className={cn("px-4 py-2 text-xs font-bold rounded-lg transition-all", filterType === 'ALL' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400")}
               >
                 All
               </button>
               <button 
                 onClick={() => setFilterType('CUSTOMER')}
                 className={cn("px-4 py-2 text-xs font-bold rounded-lg transition-all", filterType === 'CUSTOMER' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400")}
               >
                 Customers
               </button>
               <button 
                 onClick={() => setFilterType('SUPPLIER')}
                 className={cn("px-4 py-2 text-xs font-bold rounded-lg transition-all", filterType === 'SUPPLIER' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400")}
               >
                 Suppliers
               </button>
            </div>
         </div>
      </Card>

      {/* Parties List */}
      <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 border-b border-gray-100">
             <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-8 py-5">Party Details</th>
                <th className="px-8 py-5">Contact Details</th>
                <th className="px-8 py-5">GST / Tax Info</th>
                <th className="px-8 py-5 text-right">Balance Status</th>
                <th className="px-8 py-5 text-right">Actions</th>
             </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {parties.map((party) => (
              <tr key={party.id} className="group hover:bg-indigo-50/30 transition-colors">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-200">
                      {party.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900 tracking-tight">{party.name}</p>
                      <Badge variant={party.partyType === 'CUSTOMER' ? 'info' : 'purple'} className="mt-1 text-[10px] uppercase font-bold tracking-widest px-2 py-0">
                        {party.partyType}
                      </Badge>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      {party.phone || 'No phone'}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
                      <Mail className="w-3.5 h-3.5" />
                      {party.email || 'No email'}
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                   <div>
                     <p className="text-xs font-black text-gray-900 tracking-widest uppercase">{party.gstin || 'Unregistered'}</p>
                     <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-tighter">Business Tax ID</p>
                   </div>
                </td>
                <td className="px-8 py-6 text-right">
                   <p className={cn("text-sm font-black tracking-tight", party.balanceType === 'RECEIVABLE' ? 'text-emerald-600' : 'text-rose-500')}>
                      {party.balanceType === 'RECEIVABLE' ? '+' : '-'} ₹{party.openingBalance?.toLocaleString()}
                   </p>
                   <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5 tracking-widest">{party.balanceType}</p>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingItem(party); setShowModal(true); }} className="p-2.5 hover:bg-white rounded-xl text-gray-400 hover:text-indigo-600 shadow-sm transition-all"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => deleteMutation.mutate(party.id)} className="p-2.5 hover:bg-white rounded-xl text-gray-400 hover:text-red-500 shadow-sm transition-all"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {parties.length === 0 && (
           <div className="py-20 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                 <User className="w-10 h-10 text-gray-200" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">No parties found</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-xs">Start adding your customers and vendors to manage their accounts.</p>
           </div>
        )}
      </div>

      <PartyModal isOpen={showModal} onClose={() => { setShowModal(false); setEditingItem(null); }} item={editingItem} businessId={currentBusiness?.id} />
    </div>
  );
}

function PartyModal({ isOpen, onClose, item, businessId }) {
  const queryClient = useQueryClient();
  const isEditing = !!item;

  const mutation = useMutation({
    mutationFn: (data) => isEditing ? api.put(`/parties/${item.id}`, data) : api.post('/parties', { ...data, businessId }),
    onSuccess: () => { 
      queryClient.invalidateQueries(['parties']); 
      toast.success(isEditing ? 'Party updated' : 'Party created'); 
      onClose(); 
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Action failed'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      phone: formData.get('phone'),
      email: formData.get('email'),
      gstin: formData.get('gstin'),
      partyType: formData.get('partyType'),
      openingBalance: parseFloat(formData.get('openingBalance')) || 0,
      balanceType: formData.get('balanceType'),
    };
    mutation.mutate(data);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Party Details' : 'Register New Party'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
          <Input label="Display Name *" name="name" defaultValue={item?.name} placeholder="Business or Individual name" required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Phone Number" name="phone" defaultValue={item?.phone} placeholder="+91 ..." />
            <Input label="Email Address" name="email" defaultValue={item?.email} placeholder="name@company.com" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
           <Input label="Business GSTIN" name="gstin" defaultValue={item?.gstin} placeholder="22AAAAA0000A1Z5" />
           <Select label="Party Type" name="partyType" defaultValue={item?.partyType || 'CUSTOMER'} options={[{value:'CUSTOMER', label:'Customer'}, {value:'SUPPLIER', label:'Supplier'}]} />
        </div>

        <div className="p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/50">
           <p className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-4">Financial Settings</p>
           <div className="grid grid-cols-2 gap-4">
             <Input label="Opening Balance" name="openingBalance" type="number" defaultValue={item?.openingBalance || 0} />
             <Select label="Balance Meaning" name="balanceType" defaultValue={item?.balanceType || 'RECEIVABLE'} options={[{value:'RECEIVABLE', label:'To Collect (Receivable)'}, {value:'PAYABLE', label:'To Pay (Payable)'}]} />
           </div>
        </div>

        <div className="flex justify-end pt-4 gap-3">
          <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" loading={mutation.isPending} icon={Save}>
            {isEditing ? 'Update Party' : 'Register Party'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default Parties;
