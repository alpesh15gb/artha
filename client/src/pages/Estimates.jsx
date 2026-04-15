import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Filter, MoreHorizontal, Copy, 
  ChevronDown, ChevronUp, Download, Eye, Trash2, 
  CheckCircle2, Clock, AlertCircle, FileText,
  Mail, ExternalLink, Calendar, FileCheck, Send, XCircle
} from 'lucide-react';
import { format, isAfter, isBefore } from 'date-fns';
import api from '../services/api';
import { useBusinessStore } from '../store/auth';
import { Button, Input, Select, Card, Badge, cn } from '../components/ui';
import toast from 'react-hot-toast';

const STATUS_GROUPS = [
  { id: 'DRAFT', label: 'Draft', color: 'text-gray-600', bg: 'bg-gray-50', icon: FileCheck },
  { id: 'SENT', label: 'Sent', color: 'text-blue-600', bg: 'bg-blue-50', icon: Send },
  { id: 'ACCEPTED', label: 'Accepted', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
  { id: 'REJECTED', label: 'Rejected', color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
  { id: 'CONVERTED', label: 'Converted', color: 'text-purple-600', bg: 'bg-purple-50', icon: CheckCircle2 },
  { id: 'EXPIRED', label: 'Expired', color: 'text-orange-600', bg: 'bg-orange-50', icon: Clock },
];

function Estimates() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentBusiness } = useBusinessStore();
  const [search, setSearch] = useState('');
  const [expandedSections, setExpandedSections] = useState(new Set(['DRAFT', 'SENT', 'ACCEPTED']));

  const { data: estimatesData, isLoading } = useQuery({
    queryKey: ['estimates', currentBusiness?.id, search],
    queryFn: () => api.get(`/estimates/business/${currentBusiness.id}?search=${search}`).then(r => r.data),
    enabled: !!currentBusiness?.id,
  });

  const estimates = estimatesData?.data || [];

  // Grouping
  const groupedEstimates = useMemo(() => {
    const groups = { DRAFT: [], SENT: [], ACCEPTED: [], REJECTED: [], CONVERTED: [], EXPIRED: [] };
    estimates.forEach(est => {
      let status = est.status;
      // Check for expiry
      if (status === 'SENT' && est.expiryDate && isBefore(new Date(est.expiryDate), new Date())) {
        status = 'EXPIRED';
      }
      if (groups[status]) groups[status].push(est);
      else groups.DRAFT.push(est);
    });
    return groups;
  }, [estimates]);

  const metrics = useMemo(() => {
     return {
       DRAFT: `${groupedEstimates.DRAFT.length}`,
       SENT: `${groupedEstimates.SENT.length}`,
       ACCEPTED: `${groupedEstimates.ACCEPTED.length}`,
       REJECTED: `${groupedEstimates.REJECTED.length}`,
       CONVERTED: `${groupedEstimates.CONVERTED.length}`,
     };
  }, [groupedEstimates]);

  const toggleSection = (id) => {
    const newSet = new Set(expandedSections);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedSections(newSet);
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/estimates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['estimates']);
      toast.success('Estimate deleted');
    },
  });

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Estimates</h1>
          <p className="text-sm text-gray-500 font-medium">Create professional quotations & track customer acceptance.</p>
        </div>
        <div className="flex gap-3">
           <Button icon={Plus} onClick={() => navigate('/estimates/new')}>New Estimate</Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {STATUS_GROUPS.slice(0, 5).map((group) => {
          const Icon = group.icon;
          return (
            <Card key={group.id} className="!p-4 border-none shadow-sm flex items-center gap-4 bg-white">
               <div className={cn("p-2.5 rounded-xl", group.bg)}>
                 <Icon className={cn("w-5 h-5", group.color)} />
               </div>
               <div>
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{group.label}</p>
                 <p className="text-lg font-black text-gray-900 leading-none mt-1">{metrics[group.id] || '0'}</p>
               </div>
            </Card>
          );
        })}
      </div>

      {/* Filters Area */}
      <Card className="!p-3 border-none shadow-sm flex items-center justify-between">
         <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl w-96 border border-gray-100 group">
           <Search className="w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
           <input 
             type="text" 
             placeholder="Search Quotations..." 
             value={search}
             onChange={(e) => setSearch(e.target.value)}
             className="bg-transparent border-none focus:ring-0 text-sm w-full font-medium"
           />
         </div>
         <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={Filter}>Filters</Button>
         </div>
      </Card>

      {/* Grouped Lists */}
      <div className="space-y-4 pb-20">
        {STATUS_GROUPS.map((group) => {
          const list = groupedEstimates[group.id] || [];
          const isExpanded = expandedSections.has(group.id);

          return (
            <div key={group.id} className="space-y-4">
              <button onClick={() => toggleSection(group.id)} className="flex items-center gap-2 group w-full">
                <div className={cn("transition-transform", isExpanded ? "rotate-0" : "-rotate-90")}>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>
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
                             <th className="px-6 py-4">Estimate #</th>
                             <th className="px-6 py-4">Customer</th>
                             <th className="px-6 py-4">Status</th>
                             <th className="px-6 py-4">Dates</th>
                             <th className="px-6 py-4 text-right">Amount</th>
                             <th className="px-6 py-4 text-right">Actions</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {list.map((est) => (
                            <tr key={est.id} className="group hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3 font-bold text-gray-900">
                                  <FileText className="w-4 h-4 text-gray-400" />
                                  <span>#{est.estimateNumber}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 font-bold text-gray-700">{est.partyName || 'Customer'}</td>
                              <td className="px-6 py-4">
                                <Badge variant={group.id === 'ACCEPTED' ? 'success' : group.id === 'EXPIRED' ? 'warning' : 'default'}>{group.label}</Badge>
                              </td>
                              <td className="px-6 py-4 text-xs font-bold text-gray-500">
                                {format(new Date(est.date), 'MMM dd')} - {est.expiryDate ? format(new Date(est.expiryDate), 'MMM dd, yyyy') : 'No Expiry'}
                              </td>
                              <td className="px-6 py-4 text-right font-black text-gray-900">₹{est.totalAmount?.toLocaleString()}</td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1 opacity-10 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button onClick={() => navigate(`/estimates/edit/${est.id}`)} className="p-2 hover:bg-white rounded-lg text-gray-400 hover:text-indigo-600"><Eye className="w-4 h-4" /></button>
                                   <button onClick={() => deleteMutation.mutate(est.id)} className="p-2 hover:bg-white rounded-lg text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
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

export default Estimates;
