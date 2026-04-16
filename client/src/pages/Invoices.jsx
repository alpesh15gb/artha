import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Filter, MoreHorizontal, Copy, 
  ChevronDown, ChevronUp, Download, Eye, Trash2, 
  CheckCircle2, Clock, AlertCircle, FileText,
  Mail, ExternalLink, Calendar, Pencil, Printer
} from 'lucide-react';
import { format, isAfter, isBefore } from 'date-fns';
import api from '../services/api';
import { useBusinessStore } from '../store/auth';
import { Button, Input, Select, Card, Badge, cn } from '../components/ui';
import toast from 'react-hot-toast';
import { exportToPDF, printElement } from '../utils/export';
import { InvoiceTemplate1 } from '../components/invoices/InvoiceTemplate1';
import { InvoiceTemplate2 } from '../components/invoices/InvoiceTemplate2';
import { InvoiceTemplate3 } from '../components/invoices/InvoiceTemplate3';
import { EstimateTemplateAlphesh } from '../components/invoices/EstimateTemplateAlphesh';


const STATUS_GROUPS = [
  { id: 'UNPAID', label: 'Unpaid', color: 'text-orange-600', bg: 'bg-orange-50', icon: Clock },
  { id: 'PAID', label: 'Paid', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
  { id: 'PARTIAL', label: 'Partially', color: 'text-blue-600', bg: 'bg-blue-50', icon: AlertCircle },
  { id: 'OVERDUE', label: 'Overdue', color: 'text-red-600', bg: 'bg-red-50', icon: AlertCircle },
  { id: 'DRAFT', label: 'Draft', color: 'text-gray-600', bg: 'bg-gray-50', icon: FileText },
];

function Invoices() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentBusiness } = useBusinessStore();
  const [search, setSearch] = useState('');
  const [expandedSections, setExpandedSections] = useState(new Set(['UNPAID', 'PAID', 'DRAFT']));
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ['invoices', currentBusiness?.id, search],
    queryFn: () => api.get(`/invoices/business/${currentBusiness.id}?search=${search}`).then(r => r.data),
    enabled: !!currentBusiness?.id,
  });

  const invoices = invoicesData?.data || [];

  // Grouping and Metrics
  const groupedInvoices = useMemo(() => {
    const groups = { UNPAID: [], PAID: [], PARTIAL: [], OVERDUE: [], DRAFT: [] };
    invoices.forEach(inv => {
      let status = inv.status;
      if (status === 'SENT' || status === 'PARTIAL') {
         // Check for overdue
         if (inv.dueDate && isBefore(new Date(inv.dueDate), new Date()) && inv.status !== 'PAID') {
           status = 'OVERDUE';
         } else if (inv.status === 'SENT') {
           status = 'UNPAID';
         }
      }
      if (groups[status]) groups[status].push(inv);
      else groups.DRAFT.push(inv);
    });
    return groups;
  }, [invoices]);

const metrics = useMemo(() => {
      return {
        UNPAID: groupedInvoices.UNPAID.length,
        PAID: groupedInvoices.PAID.length,
        PARTIAL: groupedInvoices.PARTIAL.length,
        OVERDUE: groupedInvoices.OVERDUE.length,
        DRAFT: groupedInvoices.DRAFT.length,
      };
   }, [groupedInvoices]);

  const toggleSection = (id) => {
    const newSet = new Set(expandedSections);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedSections(newSet);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['invoices']);
      toast.success('Invoice deleted');
    },
  });

  const handleDownload = async (inv) => {
    setPreviewInvoice(inv);
    setTimeout(async () => {
      try {
        setIsExporting(true);
        const filename = `Invoice_${inv.invoiceNumber}.pdf`;
        await exportToPDF('print-area', filename);
        toast.success('PDF Downloaded');
      } catch (err) {
        toast.error('Failed to generate PDF');
      } finally {
        setIsExporting(false);
        setPreviewInvoice(null);
      }
    }, 1000);
  };

  const handlePrint = async (inv) => {
    setPreviewInvoice(inv);
    setTimeout(async () => {
      try {
        setIsExporting(true);
        printElement('print-area');
      } catch (err) {
        toast.error('Failed to open print window');
      } finally {
        setIsExporting(false);
        setPreviewInvoice(null);
      }
    }, 1000);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Invoices</h1>
          <div className="flex items-center gap-2 mt-1">
             <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">All Invoice ({invoices.length})</span>
             <span className="w-1 h-1 bg-gray-300 rounded-full" />
             <span className="text-sm text-gray-500">Draft (02)</span>
          </div>
        </div>
        <div className="flex gap-3">
           <Button variant="secondary" icon={Download}>Batch Payment</Button>
           <Button icon={Plus} onClick={() => navigate('/invoices/new')}>New Invoice</Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {STATUS_GROUPS.map((group) => {
          const Icon = group.icon;
          return (
            <Card key={group.id} className="!p-4 border-none shadow-sm flex items-center gap-4 bg-white hover:shadow-md transition-shadow cursor-default">
               <div className={cn("p-2.5 rounded-xl", group.bg)}>
                 <Icon className={cn("w-5 h-5", group.color)} />
               </div>
               <div>
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{group.label}</p>
                 <p className="text-lg font-black text-gray-900 leading-none mt-1">{metrics[group.id] || '00/00'}</p>
               </div>
            </Card>
          );
        })}
      </div>

      {/* Filters Area */}
      <Card className="!p-3 border-none shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
         <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl w-full md:w-96 border border-gray-100 group">
           <Search className="w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
           <input 
             type="text" 
             placeholder="Search Invoices" 
             value={search}
             onChange={(e) => setSearch(e.target.value)}
             className="bg-transparent border-none focus:ring-0 text-sm w-full font-medium"
           />
           <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-lg border border-gray-200 text-[10px] font-bold text-gray-400">
             <span className="border-b-[1.5px] border-gray-400 px-0.5">⌘</span>
             <span>1</span>
           </div>
         </div>
         <div className="flex items-center gap-3">
           <Button variant="secondary" size="sm" icon={Download}>Export</Button>
           <Button variant="secondary" size="sm" icon={ExternalLink}>Sync</Button>
           <div className="w-px h-6 bg-gray-200 mx-1" />
           <Button variant="secondary" size="sm" icon={Filter}>Filter</Button>
           <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"><MoreHorizontal className="w-5 h-5" /></button>
         </div>
      </Card>

      {/* Grouped Lists */}
      <div className="space-y-4 pb-20">
        {STATUS_GROUPS.map((group) => {
          const list = groupedInvoices[group.id] || [];
          const isExpanded = expandedSections.has(group.id);

          return (
            <div key={group.id} className="space-y-4">
              <button 
                onClick={() => toggleSection(group.id)}
                className="flex items-center gap-2 group w-full"
              >
                <div className={cn("transition-transform duration-200", isExpanded ? "rotate-0" : "-rotate-90")}>
                  <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" />
                </div>
                <span className={cn("text-sm font-bold", group.color)}>{group.label}</span>
                <span className="bg-gray-100 text-gray-500 text-[10px] font-black px-1.5 py-0.5 rounded-md">{list.length}</span>
                <div className="flex-1 h-px bg-gray-100 ml-2" />
              </button>

              <AnimatePresence>
                {isExpanded && list.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                           <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                             <th className="px-6 py-4 w-8"><input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" /></th>
                             <th className="px-6 py-4">Invoice</th>
                             <th className="px-6 py-4">Customer</th>
                             <th className="px-6 py-4">Email</th>
                             <th className="px-6 py-4">Dates</th>
                             <th className="px-6 py-4">Amount</th>
                             <th className="px-6 py-4">Total Tax</th>
                             <th className="px-6 py-4">Tags</th>
                             <th className="px-6 py-4 text-right">Actions</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {list.map((inv) => (
                            <InvoiceRow 
                              key={inv.id} 
                              inv={inv} 
                              onCopy={copyToClipboard}
                              onEdit={() => navigate(`/invoices/edit/${inv.id}`)}
                              onDelete={() => deleteMutation.mutate(inv.id)}
                              onDownload={() => handleDownload(inv)}
                              onPrint={() => handlePrint(inv)}
                            />
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

      {/* Hidden Preview Area for Export */}
      {previewInvoice && (
        <div className="fixed -left-[4000px] top-0">
          <div id="print-area" className="w-[900px] bg-white">
            {previewInvoice.template === 'template1' && (
              <InvoiceTemplate1 
                invoice={previewInvoice} 
                business={currentBusiness} 
                party={previewInvoice.party} 
                items={previewInvoice.items} 
                totals={{
                  subtotal: previewInvoice.subtotal,
                  cgst: previewInvoice.cgstAmount,
                  sgst: previewInvoice.sgstAmount,
                  igst: previewInvoice.igstAmount,
                  total: previewInvoice.totalAmount
                }} 
              />
            )}
            {previewInvoice.template === 'template2' && (
              <InvoiceTemplate2 
                invoice={previewInvoice} 
                business={currentBusiness} 
                party={previewInvoice.party} 
                items={previewInvoice.items} 
                totals={{
                  subtotal: previewInvoice.subtotal,
                  cgst: previewInvoice.cgstAmount,
                  sgst: previewInvoice.sgstAmount,
                  igst: previewInvoice.igstAmount,
                  total: previewInvoice.totalAmount
                }} 
              />
            )}
            {previewInvoice.template === 'template3' && (
              <InvoiceTemplate3 
                invoice={previewInvoice} 
                business={currentBusiness} 
                party={previewInvoice.party} 
                items={previewInvoice.items} 
                totals={{
                  subtotal: previewInvoice.subtotal,
                  cgst: previewInvoice.cgstAmount,
                  sgst: previewInvoice.sgstAmount,
                  igst: previewInvoice.igstAmount,
                }} 
              />
            )}
            {previewInvoice.template === 'alphesh' && (
              <EstimateTemplateAlphesh 
                invoice={previewInvoice} 
                business={currentBusiness} 
                party={previewInvoice.party} 
                items={previewInvoice.items} 
                totals={{
                  subtotal: previewInvoice.subtotal,
                  cgst: previewInvoice.cgstAmount,
                  sgst: previewInvoice.sgstAmount,
                  igst: previewInvoice.igstAmount,
                  total: previewInvoice.totalAmount
                }} 
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InvoiceRow({ inv, onCopy, onEdit, onDelete, onDownload, onPrint }) {
  return (
    <tr className="group hover:bg-indigo-50/30 transition-colors">
      <td className="px-6 py-4"><input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" /></td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-white transition-colors">
            <FileText className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold text-gray-900">#{inv.invoiceNumber}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] text-white font-bold">
            {inv.party?.name?.[0]?.toUpperCase() || 'P'}
          </div>
          <span className="text-sm font-bold text-gray-700">{inv.party?.name || inv.partyName}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col">
          <span className="text-sm text-gray-500 font-medium">{inv.party?.email || 'no-email@artha.in'}</span>
          <button 
             onClick={() => onCopy(inv.party?.email || 'no-email@artha.in')}
             className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Copy className="w-3 h-3" /> Copy
          </button>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
           <span>{format(new Date(inv.date), 'MMM dd')} - {inv.dueDate ? format(new Date(inv.dueDate), 'MMM dd, yyyy') : 'No Due'}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-1.5 font-black text-gray-900">
          <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] text-emerald-600 border border-emerald-200">₹</div>
          ₹{inv.totalAmount?.toLocaleString()}
        </div>
      </td>
      <td className="px-6 py-4">
        <span className="text-sm font-bold text-gray-400">₹{(inv.totalAmount - inv.subtotal).toLocaleString() || '$45.00'}</span>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-wrap gap-1">
          {inv.tags?.length > 0 ? (
            inv.tags.map((tag, idx) => (
              <Badge key={idx} variant="default" className="text-[10px] px-2 py-0 bg-indigo-50 text-indigo-600 border-indigo-100">{tag}</Badge>
            ))
          ) : (
            <span className="text-[10px] text-gray-300 font-medium italic">No tags</span>
          )}
        </div>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
           <button onClick={onEdit} className="p-2 hover:bg-white rounded-lg text-gray-400 hover:text-indigo-600" title="Edit Invoice"><Pencil className="w-4 h-4" /></button>
           <button onClick={onPrint} className="p-2 hover:bg-white rounded-lg text-gray-400 hover:text-indigo-600" title="Print"><Printer className="w-4 h-4" /></button>
           <button onClick={onDownload} className="p-2 hover:bg-white rounded-lg text-gray-400 hover:text-indigo-600" title="Download PDF"><Download className="w-4 h-4" /></button>
           <button onClick={onDelete} className="p-2 hover:bg-white rounded-lg text-gray-400 hover:text-red-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
        </div>
      </td>
    </tr>
  );
}

export default Invoices;
