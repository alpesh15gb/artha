import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { Button, Input, Badge } from '../components/ui';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowRight, Sparkles, User, Mail, Lock, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

function Register() {
  const navigate = useNavigate();
  const register = useAuthStore(state => state.register);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    try {
      await register(formData.get('email'), formData.get('password'), formData.get('name'));
      toast.success('Identity Provisioned');
      navigate('/onboarding');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Provisioning Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 mesh-gradient relative overflow-hidden font-sans">
      {/* ── Visual Accents ── */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] -mr-64 -mt-64 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] -ml-64 -mb-64 animate-pulse" style={{ animationDelay: '1.5s' }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className="max-w-md w-full relative z-10"
      >
        <div className="text-center mb-10 space-y-4">
           <div className="w-20 h-20 bg-white rounded-[2rem] shadow-2xl flex items-center justify-center mx-auto mb-6 ring-4 ring-slate-50 transition-transform duration-700 hover:-rotate-12 group cursor-pointer">
              <UserPlus className="w-10 h-10 text-indigo-600 group-hover:scale-110 transition-all" />
           </div>
           <Badge variant="purple" className="px-5 py-1 text-[9px] uppercase font-black tracking-[0.3em] rounded-full border-none shadow-purple-100 mb-2">Network Enrollment</Badge>
           <h2 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">Join Artha</h2>
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Construct your professional financial identity</p>
        </div>

        <div className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-10 shadow-2xl shadow-purple-200/40 border border-white/60">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                     <User className="w-3 h-3 text-purple-500" /> Full Identity
                  </label>
                  <input
                    name="name"
                    required
                    placeholder="e.g. Alphesh Gupta"
                    className="input-base !h-14 !text-base focus:scale-[1.01] transition-all"
                    autoComplete="name"
                  />
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                     <Mail className="w-3 h-3 text-purple-500" /> Professional Email
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="name@company.com"
                    className="input-base !h-14 !text-base focus:scale-[1.01] transition-all"
                    autoComplete="email"
                  />
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                     <Lock className="w-3 h-3 text-purple-500" /> Private Key
                  </label>
                  <input
                    name="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="input-base !h-14 !text-base focus:scale-[1.01] transition-all"
                    autoComplete="new-password"
                  />
               </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary !h-16 !rounded-[1.25rem] !bg-indigo-600 hover:!bg-indigo-700 flex items-center justify-center gap-3 active:scale-95 transition-all text-sm font-black uppercase tracking-widest shadow-2xl shadow-indigo-600/30 mt-4"
            >
              {loading ? 'Provisioning...' : <>Create Access <ArrowRight className="w-5 h-5" /></>}
            </button>

            <div className="text-center pt-4">
               <p className="text-xs font-bold text-slate-400">
                 Already enrolled? <Link to="/login" className="text-indigo-600 hover:text-indigo-700 decoration-2 underline-offset-4 font-black">Enter Terminal</Link>
               </p>
            </div>
          </form>
        </div>

        <div className="mt-12 flex items-center justify-center gap-6 opacity-30 grayscale saturate-0">
           <ShieldCheck className="w-5 h-5" />
           <p className="text-[9px] font-black uppercase tracking-[0.4em]">Enterprise-Grade Security</p>
           <Sparkles className="w-5 h-5" />
        </div>
      </motion.div>
    </div>
  );
}

export default Register;
