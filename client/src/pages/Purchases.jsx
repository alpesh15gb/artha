import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Filter, MoreHorizontal, 
  ChevronDown, ChevronUp, Download, Eye, Trash2, 
  CheckCircle2, Clock, AlertCircle, ShoppingCart, 
  Truck, ArrowUpRight
} from 'lucide-react';
import { format, isBefore } from 'date-fns';
import api from '../services/api';
import { useBusinessStore } from '../store/auth';
import { Button, Card, Badge, cn } from '../components/ui';
import toast from 'react-hot-toast';

const STATUS_GROUPS = [
  { id: 'ORDERED', label: 'Ordered', color: 'text-blue-600', bg: 'bg-blue-50', icon: Clock },
  { id: 'RECEIVED', label: 'Received', color: 'text-orange-600', bg: 'bg-orange-50', icon: Truck },
  { id: 'PAID', label: 'Paid', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
  { id: 'DRAFT', label: 'Draft', color: 'text-gray-600', bg: 'bg-gray-50', icon: ShoppingCart },
];

function Purchases() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentBusiness } = useBusinessStore();
  const [search, setSearch] = useState('');
  const [expandedSections, setExpandedSections] = useState(new Set(['ORDERED', 'RECEIVED', 'PAID']));

  const { data: purchasesData, isLoading } = useQuery({
    queryKey: ['purchases', currentBusiness?.id, search],
    queryFn: () => api.get(`/purchases/business/${currentBusiness.id}?search=${search}`).then(r => r.data),
    enabled: !!currentBusiness?.id,
  });

  const purchases = purchasesData?.data || [];

  const groupedPurchases = useMemo(() => {
    const groups = { ORDERED: [], RECEIVED: [], PAID: [], DRAFT: [] };
    purchases.forEach(p => {
      const status = p.status || 'DRAFT';
      if (groups[status]) groups[status].push(p);
      else groups.DRAFT.push(p);
    });
    return groups;
  }, [purchases]);

  const toggleSection = (id) => {
    const newSet = new Set(expandedSections);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedSections(newSet);
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/purchases/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['purchases']);
      toast.success('Purchase bill deleted');
    },
  });

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Purchases</h1>
          <p className="text-sm text-gray-500 font-medium">Record and track inventory orders & vendor bills.</p>
        </div>
        <div className="flex gap-3">
           <Button icon={Plus} onClick={() => navigate('/purchases/new')}>New Purchase Bill</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATUS_GROUPS.map((group) => {
          const Icon = group.icon;
          return (
            <Card key={group.id} className="!p-4 border-none shadow-sm flex items-center gap-4 bg-white">
               <div className={cn("p-2.5 rounded-xl", group.bg)}>
                 <Icon className={cn("w-5 h-5", group.color)} />
               </div>
               <div>
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{group.label}</p>
                 <p className="text-lg font-black text-gray-900 leading-none mt-1">{groupedPurchases[group.id]?.length || '0'}</p>
               </div>
            </Card>
          );
        })}
      </div>

      <Card className="!p-3 border-none shadow-sm">
         <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl w-96 border border-gray-100">
           <Search className="w-4 h-4 text-gray-400" />
           <input 
             type="text" 
             placeholder="Search Bills..." 
             value={search}
             onChange={(e) => setSearch(e.target.value)}
             className="bg-transparent border-none focus:ring-0 text-sm w-full font-medium"
           />
         </div>
      </Card>

      <div className="space-y-4 pb-20">
        {STATUS_GROUPS.map((group) => {
          const list = groupedPurchases[group.id] || [];
          const isExpanded = expandedSections.has(group.id);

          return (
            <div key={group.id} className="space-y-4">
              <button onClick={() => toggleSection(group.id)} className="flex items-center gap-2 group w-full">
                <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", !isExpanded && "-rotate-90")} />
                <span className={cn("text-sm font-bold", group.color)}>{group.label}</span>
                <span className="bg-gray-100 text-gray-500 text-[10px] font-black px-1.5 py-0.5 rounded-md">{list.length}</span>
                <div className="flex-1 h-px bg-gray-100 ml-2" />
              </button>

              <AnimatePresence>
                {isExpanded && list.length > 0 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-gray-50/50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                           <tr>
                             <th className="px-6 py-4">Bill #</th>
                             <th className="px-6 py-4">Vendor</th>
                             <th className="px-6 py-4">Date</th>
                             <th className="px-6 py-4 text-right">Amount</th>
                             <th className="px-6 py-4 text-right">Actions</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {list.map((p) => (
                            <tr key={p.id} className="group hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3 font-bold text-gray-900 text-sm">
                                  <ShoppingCart className="w-4 h-4 text-gray-400" />
                                  <span>#{p.purchaseNumber}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm font-bold text-gray-700">{p.partyName || 'Vendor'}</span>
                              </td>
                              <td className="px-6 py-4 text-xs font-bold text-gray-500">
                                {format(new Date(p.date), 'dd MMM, yyyy')}
                              </td>
                              <td className="px-6 py-4 text-right font-black text-gray-900">₹{p.totalAmount?.toLocaleString()}</td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1 opacity-10 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button onClick={() => navigate(`/purchases/edit/${p.id}`)} className="p-2 hover:bg-white rounded-lg text-gray-400 hover:text-indigo-600"><Eye className="w-4 h-4" /></button>
                                   <button onClick={() => deleteMutation.mutate(p.id)} className="p-2 hover:bg-white rounded-lg text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Purchases;
