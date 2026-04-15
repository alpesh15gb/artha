import { useState } from 'react';
import { useAuthStore, useBusinessStore } from '../store/auth';
import { Card, Button, Input, Select, cn } from '../components/ui';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, LogOut, Business, User, Shield, 
  Settings as SettingsIcon, Bell, CreditCard,
  Building2, Globe, FileCheck, Landmark, ArrowUpRight
} from 'lucide-react';
import toast from 'react-hot-toast';

function Settings() {
  const { currentBusiness } = useBusinessStore();
  const logout = useAuthStore(state => state.logout);
  const [activeLayer, setActiveLayer] = useState('profile');

  const [formData, setFormData] = useState({
     name: currentBusiness?.name || '',
     gstin: currentBusiness?.gstin || '',
     email: currentBusiness?.email || '',
     phone: '',
     address: '',
     currency: 'INR',
     dateFormat: 'DD/MM/YYYY'
  });

  const handleSave = (e) => {
    e.preventDefault();
    toast.success('Business preferences synchronized!');
  };

  const navItems = [
    { id: 'profile', label: 'Business Profile', icon: Building2 },
    { id: 'tax', label: 'Tax & GST', icon: FileCheck },
    { id: 'banking', label: 'Bank Details', icon: Landmark },
    { id: 'billing', label: 'Plan & Billing', icon: CreditCard },
  ];

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-100 pb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">App Settings</h1>
          <p className="text-sm text-gray-400 font-medium mt-1">Configure your workspace and global accounting defaults.</p>
        </div>
        <Button variant="danger" icon={LogOut} onClick={() => { logout(); window.location.href = '/login'; }}>
          Sign Out of Workspace
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-2">
           {navItems.map((item) => {
             const Icon = item.icon;
             return (
               <button 
                key={item.id}
                onClick={() => setActiveLayer(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm text-left",
                  activeLayer === item.id 
                    ? "bg-indigo-600 text-white shadow-xl shadow-indigo-500/20" 
                    : "text-gray-400 hover:bg-gray-100 hover:text-gray-900"
                )}
               >
                 <Icon className="w-4 h-4" />
                 {item.label}
               </button>
             );
           })}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <Card className="!p-8 border-none shadow-xl shadow-gray-200/50">
             <AnimatePresence mode="wait">
               {activeLayer === 'profile' && (
                 <motion.div key="profile" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                    <div className="flex items-center gap-4 mb-8">
                       <div className="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600">
                          <Building2 className="w-8 h-8" />
                       </div>
                       <div>
                          <h3 className="text-xl font-black text-gray-900 tracking-tight">Business Profile</h3>
                          <p className="text-sm text-gray-400 font-medium">Public information for your invoices</p>
                       </div>
                    </div>

                    <form onSubmit={handleSave} className="space-y-6">
                       <div className="grid grid-cols-2 gap-6">
                          <Input label="Business Legal Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                          <Input label="Support Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                       </div>
                       <div className="grid grid-cols-2 gap-6">
                          <Input label="Contact Phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                          <Input label="Website URL" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="https://..." />
                       </div>
                       
                       <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100 space-y-4">
                          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Regional Settings</p>
                          <div className="grid grid-cols-2 gap-6">
                             <Select label="Base Currency" value={formData.currency} options={[{value:'INR', label:'Indian Rupee (₹)'}, {value:'USD', label:'US Dollar ($)'}]} />
                             <Select label="Date Format" value={formData.dateFormat} options={[{value:'DD/MM/YYYY', label:'DD / MM / YYYY'}, {value:'MM/DD/YYYY', label:'MM / DD / YYYY'}]} />
                          </div>
                       </div>

                       <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-8">
                          <Button type="submit" icon={Save}>Update Workspace</Button>
                       </div>
                    </form>
                 </motion.div>
               )}

               {activeLayer === 'tax' && (
                 <motion.div key="tax" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-8">
                    <div className="flex items-center gap-4">
                       <div className="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center text-emerald-600">
                          <FileCheck className="w-8 h-8" />
                       </div>
                       <div>
                          <h3 className="text-xl font-black text-gray-900 tracking-tight">Tax Configuration</h3>
                          <p className="text-sm text-gray-400 font-medium">Manage GSTIN and tax calculations</p>
                       </div>
                    </div>

                    <div className="p-8 bg-emerald-50 rounded-[2.5rem] space-y-6">
                       <Input label="Business GSTIN" value={formData.gstin} onChange={e => setFormData({...formData, gstin: e.target.value})} className="bg-white border-none shadow-sm" />
                       <p className="text-xs font-bold text-emerald-600/60 uppercase tracking-widest">Validating this GSTIN will automatically fetch your compliance data.</p>
                       <Button variant="outline" className="text-emerald-600 border-emerald-200">Verify with GST Network</Button>
                    </div>
                 </motion.div>
               )}

               {activeLayer === 'billing' && (
                 <motion.div key="billing" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="py-12 text-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600 shadow-sm">
                       <CreditCard className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900">Artha Cloud Premium</h3>
                    <p className="text-sm text-gray-400 font-black mt-1 uppercase tracking-widest">Subscription ends in 242 days</p>
                    <div className="mt-8">
                       <Button icon={ArrowUpRight}>Manage Subscription</Button>
                    </div>
                 </motion.div>
               )}
             </AnimatePresence>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Settings;
