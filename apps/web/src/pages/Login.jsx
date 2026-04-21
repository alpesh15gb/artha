import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { Button, Input, Badge } from '../components/ui';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowRight, Sparkles, User, Fingerprint, Lock } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

function Login() {
  const navigate = useNavigate();
  const login = useAuthStore(state => state.login);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    console.log('📝 [UI DEBUG] Form Submit State: ' + JSON.stringify({ email, passwordLength: password.length }));
    
    try {
      await login(email, password);
      toast.success('System Linked & Verified');
      navigate('/');
    } catch (error) {
      console.error('❌ [UI DEBUG] Login Error: ' + JSON.stringify(error.response?.data || error.message));
      toast.error(error.response?.data?.message || 'Verification Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 mesh-gradient relative overflow-hidden font-sans">
      {/* Visual Accents */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] -ml-64 -mt-64 animate-pulse" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] -mr-64 -mb-64 animate-pulse" style={{ animationDelay: '2s' }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className="max-w-md w-full relative z-10"
      >
        <div className="text-center mb-10 space-y-4">
           <div className="w-20 h-20 bg-slate-900 rounded-[2rem] shadow-2xl flex items-center justify-center mx-auto mb-6 ring-4 ring-white transition-transform duration-700 hover:rotate-12 group cursor-pointer">
              <span className="text-white font-black text-3xl tracking-tighter group-hover:scale-110 transition-all">A</span>
           </div>
           <Badge variant="indigo" className="px-5 py-1 text-[9px] uppercase font-black tracking-[0.3em] rounded-full border-none shadow-indigo-100 mb-2">Authenticated Access</Badge>
           <h2 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">Artha Terminal</h2>
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Connect to your professional financial hub</p>
        </div>

        <div className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-10 shadow-2xl shadow-indigo-200/40 border border-white/60">
          <form className="space-y-8" onSubmit={handleSubmit}>
            <div className="space-y-5">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                     <User className="w-3 h-3 text-indigo-500" /> Professional ID
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. alphesh@artha.com"
                    className="input-base !h-14 !text-base focus:scale-[1.01] transition-all"
                    autoComplete="email"
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                     <Lock className="w-3 h-3 text-indigo-500" /> Security Token
                  </label>
                  <input
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-base !h-14 !text-base focus:scale-[1.01] transition-all"
                    autoComplete="current-password"
                  />
               </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest px-1">
               <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" className="w-5 h-5 rounded-lg border-slate-200 text-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all" />
                  <span className="text-slate-400 group-hover:text-slate-600 transition-colors">Trust device</span>
               </label>
               <Link to="#" className="text-indigo-600 hover:text-indigo-700 transition-colors">Lost Access?</Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary !h-16 !rounded-[1.25rem] flex items-center justify-center gap-3 active:scale-95 transition-all text-sm font-black uppercase tracking-widest shadow-2xl shadow-indigo-600/30"
            >
              {loading ? 'Validating ID...' : <>Initialize Portal <ArrowRight className="w-5 h-5" /></>}
            </button>

            <div className="text-center">
               <p className="text-xs font-bold text-slate-400 mt-2">
                 New to Artha? <Link to="/register" className="text-indigo-600 hover:text-indigo-700 decoration-2 underline-offset-4 font-black">Register Identity</Link>
               </p>
            </div>
          </form>
        </div>

        <div className="mt-12 flex items-center justify-center gap-6 opacity-30 grayscale saturate-0">
           <Fingerprint className="w-5 h-5" />
           <p className="text-[9px] font-black uppercase tracking-[0.4em]">Biometric-Verified Ecosystem</p>
           <Sparkles className="w-5 h-5" />
        </div>
      </motion.div>
    </div>
  );
}

export default Login;
