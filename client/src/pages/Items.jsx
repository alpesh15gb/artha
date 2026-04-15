import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Edit, Trash2, Package, Save, 
  ArrowUpRight, ArrowDownRight, Filter, 
  ChevronDown, Box, AlertTriangle, List, 
  Layers, ShoppingBag, Info
} from 'lucide-react';
import api from '../services/api';
import { useBusinessStore } from '../store/auth';
import { Button, Input, Select, Card, Badge, Modal, cn } from '../components/ui';
import toast from 'react-hot-toast';

function Items() {
  const { currentBusiness } = useBusinessStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [stockFilter, setStockFilter] = useState('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['items', currentBusiness?.id, search],
    queryFn: () => api.get(`/items/business/${currentBusiness.id}?search=${search}`).then(r => r.data),
    enabled: !!currentBusiness?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['items']);
      toast.success('Item archived');
    },
  });

  const items = data?.data || [];

  const filteredItems = useMemo(() => {
    let list = items;
    if (stockFilter === 'LOW') list = list.filter(i => !i.isService && i.currentStock <= (i.reorderLevel || 0) && i.currentStock > 0);
    if (stockFilter === 'OUT') list = list.filter(i => !i.isService && i.currentStock <= 0);
    if (stockFilter === 'SERVICES') list = list.filter(i => i.isService);
    return list;
  }, [items, stockFilter]);

  const stats = useMemo(() => {
    return {
      total: items.length,
      low: items.filter(i => !i.isService && i.currentStock <= (i.reorderLevel || 0) && i.currentStock > 0).length,
      out: items.filter(i => !i.isService && i.currentStock <= 0).length,
    };
  }, [items]);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Inventory</h1>
          <p className="text-sm text-gray-500 font-medium">Track your stock levels, services, and product catalogs.</p>
        </div>
        <Button icon={Plus} onClick={() => setShowModal(true)}>Add New Item</Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <StatBox title="Active Items" value={stats.total} icon={Layers} color="indigo" />
         <StatBox title="Low Stock" value={stats.low} icon={AlertTriangle} color="amber" />
         <StatBox title="Out of Stock" value={stats.out} icon={Box} color="rose" />
      </div>

      {/* Filters Area */}
      <Card className="!p-3 border-none shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
         <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl w-full md:w-96 border border-gray-100 group">
           <Search className="w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
           <input 
             type="text" 
             placeholder="Search items, SKU, or HSN..." 
             value={search}
             onChange={(e) => setSearch(e.target.value)}
             className="bg-transparent border-none focus:ring-0 text-sm w-full font-medium"
           />
         </div>
         <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
            {['ALL', 'LOW', 'OUT', 'SERVICES'].map((f) => (
              <button 
                key={f}
                onClick={() => setStockFilter(f)}
                className={cn("px-4 py-2 text-xs font-bold rounded-lg transition-all", stockFilter === f ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400")}
              >
                {f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
         </div>
      </Card>

      {/* Items List */}
      <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 border-b border-gray-100">
             <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-8 py-5">Product / Service</th>
                <th className="px-8 py-5">Identifiers</th>
                <th className="px-8 py-5 text-right">Pricing (Sale/Pur)</th>
                <th className="px-8 py-5 text-center">Stock Level</th>
                <th className="px-8 py-5 text-right">Actions</th>
             </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredItems.map((item) => (
              <tr key={item.id} className="group hover:bg-indigo-50/30 transition-colors">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shadow-lg",
                      item.isService ? "bg-purple-50 text-purple-600 shadow-purple-100" : "bg-indigo-50 text-indigo-600 shadow-indigo-100"
                    )}>
                      {item.isService ? <Info className="w-5 h-5" /> : item.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900 tracking-tight">{item.name}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{item.category || '-'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                   <div className="space-y-1">
                      <p className="text-xs font-bold text-gray-700">SKU: <span className="font-medium text-gray-500">{item.sku || 'N/A'}</span></p>
                      <p className="text-xs font-bold text-gray-700">HSN: <span className="font-medium text-gray-500">{item.hsnCode || 'N/A'}</span></p>
                   </div>
                </td>
                <td className="px-8 py-6 text-right">
                   <div className="space-y-1">
                      <p className="text-sm font-black text-gray-900">₹{item.sellingPrice?.toLocaleString()}</p>
                      <p className="text-[10px] font-bold text-gray-400">Pur: ₹{item.purchasePrice?.toLocaleString()}</p>
                   </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex flex-col items-center">
                    {item.isService ? (
                      <Badge variant="purple" className="text-[10px] font-black tracking-widest">SERVICE</Badge>
                    ) : (
                      <>
                        <p className={cn(
                          "text-sm font-black tracking-tight",
                          item.currentStock <= 0 ? "text-rose-500" : item.currentStock <= (item.reorderLevel || 0) ? "text-amber-500" : "text-emerald-600"
                        )}>
                          {item.currentStock} {item.unit}
                        </p>
                        <div className="w-20 h-1 bg-gray-100 rounded-full mt-2 overflow-hidden">
                           <div 
                             className={cn("h-full rounded-full", item.currentStock <= 0 ? "bg-rose-500" : item.currentStock <= (item.reorderLevel || 0) ? "bg-amber-500" : "bg-emerald-500")}
                             style={{ width: `${Math.min(100, (item.currentStock / ((item.reorderLevel || 1) * 2)) * 100)}%` }}
                           />
                        </div>
                      </>
                    )}
                  </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingItem(item); setShowModal(true); }} className="p-2.5 hover:bg-white rounded-xl text-gray-400 hover:text-indigo-600 shadow-sm transition-all"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => deleteMutation.mutate(item.id)} className="p-2.5 hover:bg-white rounded-xl text-gray-400 hover:text-red-500 shadow-sm transition-all"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredItems.length === 0 && (
           <div className="py-20 flex flex-col items-center justify-center text-center text-gray-500">
              <ShoppingBag className="w-12 h-12 text-gray-200 mb-4" />
              <p className="font-bold">No results found for your filter</p>
           </div>
        )}
      </div>

      <ItemModal isOpen={showModal} onClose={() => { setShowModal(false); setEditingItem(null); }} item={editingItem} businessId={currentBusiness?.id} />
    </div>
  );
}

function StatBox({ title, value, icon: Icon, color }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600 shadow-indigo-100",
    amber: "bg-amber-50 text-amber-600 shadow-amber-100",
    rose: "bg-rose-50 text-rose-600 shadow-rose-100"
  };
  return (
    <Card className="!p-6 border-none shadow-sm flex items-center gap-4 bg-white">
      <div className={cn("p-3 rounded-2xl", colors[color])}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</p>
        <p className="text-xl font-black text-gray-900">{value}</p>
      </div>
    </Card>
  );
}

function ItemModal({ isOpen, onClose, item, businessId }) {
  const queryClient = useQueryClient();
  const isEditing = !!item;

  const mutation = useMutation({
    mutationFn: (data) => isEditing ? api.put(`/items/${item.id}`, data) : api.post('/items', { ...data, businessId }),
    onSuccess: () => { 
      queryClient.invalidateQueries(['items']); 
      toast.success(isEditing ? 'Item updated' : 'Item created'); 
      onClose(); 
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Action failed'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      sku: formData.get('sku'),
      hsnCode: formData.get('hsnCode'),
      category: formData.get('category'),
      unit: formData.get('unit'),
      taxRate: parseFloat(formData.get('taxRate')) || 18,
      sellingPrice: parseFloat(formData.get('sellingPrice')) || 0,
      purchasePrice: parseFloat(formData.get('purchasePrice')) || 0,
      mrp: parseFloat(formData.get('mrp')) || null,
      openingStock: parseFloat(formData.get('openingStock')) || 0,
      currentStock: parseFloat(formData.get('currentStock')) || 0,
      reorderLevel: parseFloat(formData.get('reorderLevel')) || 0,
      isService: formData.get('isService') === 'true',
    };
    mutation.mutate(data);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Item Details' : 'Register New Item'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl self-start">
           <label className="flex-1 cursor-pointer">
              <input type="radio" name="isService" value="false" defaultChecked={!item?.isService} className="hidden peer" />
              <div className="px-4 py-2 text-xs font-bold rounded-lg text-center transition-all peer-checked:bg-white peer-checked:text-indigo-600 peer-checked:shadow-sm text-gray-400">PRODUCT</div>
           </label>
           <label className="flex-1 cursor-pointer">
              <input type="radio" name="isService" value="true" defaultChecked={item?.isService} className="hidden peer" />
              <div className="px-4 py-2 text-xs font-bold rounded-lg text-center transition-all peer-checked:bg-white peer-checked:text-indigo-600 peer-checked:shadow-sm text-gray-400">SERVICE</div>
           </label>
        </div>

        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
           <Input label="Item Name *" name="name" defaultValue={item?.name} placeholder="e.g. Graphic Card RTX 4090" required />
           <div className="grid grid-cols-2 gap-4">
              <Input label="SKU / Item Code" name="sku" defaultValue={item?.sku} placeholder="SKU001" />
              <Input label="HSN Code" name="hsnCode" defaultValue={item?.hsnCode} placeholder="1234" />
           </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
           <Input label="Category" name="category" defaultValue={item?.category} placeholder="Electronics" />
           <Input label="Unit" name="unit" defaultValue={item?.unit || 'NOS'} placeholder="NOS / PCS" />
        </div>

        <div className="p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/50">
           <p className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-4">Pricing & Stock</p>
           <div className="grid grid-cols-3 gap-4">
              <Input label="Selling Price" name="sellingPrice" type="number" defaultValue={item?.sellingPrice} />
              <Input label="Purchase Price" name="purchasePrice" type="number" defaultValue={item?.purchasePrice} />
              <Input label="Tax Rate (%)" name="taxRate" type="number" defaultValue={item?.taxRate || 18} />
           </div>
           <div className="grid grid-cols-3 gap-4 mt-4">
              <Input label="Opening Stock" name="openingStock" type="number" defaultValue={item?.openingStock || 0} />
              <Input label="Current Stock" name="currentStock" type="number" defaultValue={item?.currentStock || 0} />
              <Input label="Min Alert level" name="reorderLevel" type="number" defaultValue={item?.reorderLevel || 0} />
           </div>
        </div>

        <div className="flex justify-end pt-4 gap-3">
           <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
           <Button type="submit" loading={mutation.isPending} icon={Save}>
             {isEditing ? 'Save Changes' : 'Register Item'}
           </Button>
        </div>
      </form>
    </Modal>
  );
}

export default Items;
