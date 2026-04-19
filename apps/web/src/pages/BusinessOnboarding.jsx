import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessStore } from '../store/auth';
import { Card, Button, Input, Select, Badge } from '../components/ui';
import { Building2, Save, ArrowRight, ShieldCheck, Sparkles, Globe2, Briefcase } from 'lucide-react';
import api from '../services/api';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

function BusinessOnboarding() {
  const navigate = useNavigate();
  const { fetchBusinesses, setCurrentBusiness } = useBusinessStore();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      legalName: formData.get('legalName'),
      gstin: formData.get('gstin'),
      address: {
        city: formData.get('city'),
        state: formData.get('state'),
      }
    };

    try {
      const res = await api.post('/businesses', data);
      if (res.data.success) {
        toast.success('Workspace Initialized');
        await fetchBusinesses();
        setCurrentBusiness(res.data.data);
        navigate('/');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Initialization failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen mesh-gradient flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* ── Background Elements ── */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -mr-64 -mt-64" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] -ml-64 -mb-64" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className="max-w-xl w-full"
      >
        <div className="text-center mb-10 space-y-4">
           <div className="w-16 h-16 bg-white rounded-3xl shadow-2xl flex items-center justify-center mx-auto ring-1 ring-slate-100 mb-6">
              <Building2 className="w-8 h-8 text-indigo-600" />
           </div>
           <Badge variant="indigo" className="px-4 py-1 text-[10px] uppercase font-black tracking-[0.2em] rounded-full border-none shadow-sm mx-auto">First Step</Badge>
           <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">Setup Your Workspace</h1>
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Connect your business to the artha financial engine</p>
        </div>

        <Card className="!p-10 border-none shadow-2xl shadow-indigo-200/50 bg-white/80 backdrop-blur-xl rounded-[2.5rem]">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                     <Briefcase className="w-3 h-3 text-indigo-500" />
                     Business Identity *
                  </label>
                  <input name="name" className="input-base !text-base focus:scale-[1.01] transition-all" placeholder="e.g. Acme Corporation" required autoComplete="off" />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Trade Label</label>
                     <input name="legalName" className="input-base" placeholder="Enter DBA if any" autoComplete="off" />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">GSTIN Number</label>
                     <input name="gstin" className="input-base uppercase font-mono" placeholder="22AAAAA0000A1Z5" maxLength={15} autoComplete="off" />
                  </div>
               </div>

               <div className="p-8 bg-slate-50/50 rounded-[2rem] border border-slate-100 space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                     <Globe2 className="w-4 h-4 text-indigo-600" />
                     <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Global Location</p>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">City Profile</label>
                       <input name="city" className="input-base !bg-white" placeholder="e.g. Mumbai" autoComplete="off" />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">State / Region</label>
                       <input name="state" className="input-base !bg-white" placeholder="e.g. Maharashtra" autoComplete="off" />
                    </div>
                  </div>
               </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary !h-16 !rounded-[1.25rem] flex items-center justify-center gap-3 active:scale-95 transition-all text-sm font-black uppercase tracking-widest"
            >
              {loading ? 'Initializing Engine...' : <>Activate Workspace <ArrowRight className="w-5 h-5" /></>}
            </button>

            <div className="flex items-center justify-center gap-3 opacity-30 pt-4 grayscale">
               <ShieldCheck className="w-4 h-4" />
               <p className="text-[9px] font-black uppercase tracking-widest">Statutory Compliant Environment</p>
               <Sparkles className="w-4 h-4" />
            </div>
          </form>
        </Card>

        <p className="text-center mt-12 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] opacity-50">Artha Cloud Systems © 2024</p>
      </motion.div>
    </div>
  );
}

export default BusinessOnboarding;
