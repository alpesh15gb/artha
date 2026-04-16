import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { Button, Input } from '../components/ui';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

function Login() {
  const navigate = useNavigate();
  const login = useAuthStore(state => state.login);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    try {
      await login(formData.get('email'), formData.get('password'));
      toast.success('Welcome back to Artha!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center mesh-gradient p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-white/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-md w-full glass rounded-[2.5rem] p-10 shadow-2xl relative z-10"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/20 rotate-3 group">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight">Artha Cloud</h2>
          <p className="text-gray-500 font-bold mt-2 uppercase tracking-widest text-[10px]">Premium Accounting Infrastructure</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input 
              label="Professional Email" 
              name="email" 
              type="email" 
              required 
              placeholder="name@company.com"
              className="!bg-white/50 focus:!bg-white transition-all duration-300"
            />
            <Input 
              label="Secured Password" 
              name="password" 
              type="password" 
              required 
              placeholder="••••••••"
              className="!bg-white/50 focus:!bg-white transition-all duration-300"
            />
          </div>

          <div className="flex items-center justify-between text-xs font-bold px-1">
            <label className="flex items-center gap-2 cursor-pointer text-gray-500 hover:text-indigo-600 transition-colors">
              <input type="checkbox" className="w-4 h-4 rounded-lg border-gray-200 text-indigo-600 focus:ring-indigo-500" />
              Remember device
            </label>
            <Link to="#" className="text-indigo-600 hover:text-indigo-700">Forgot credentials?</Link>
          </div>

          <Button 
            type="submit" 
            loading={loading} 
            className="w-full btn-primary h-14 rounded-2xl flex items-center justify-center gap-2"
          >
            <span>Initialize Session</span>
            <ArrowRight className="w-4 h-4 mt-0.5" />
          </Button>

          <p className="text-center text-sm font-bold text-gray-400 mt-8">
            New to the ecosystem? <Link to="/register" className="text-indigo-600 hover:underline decoration-2 underline-offset-4">Create access</Link>
          </p>
        </form>

        <div className="mt-12 pt-8 border-t border-gray-100 flex items-center justify-center gap-6 opacity-40">
           <Sparkles className="w-4 h-4" />
           <p className="text-[10px] font-black uppercase tracking-[0.2em]">Secure & Encrypted</p>
           <Sparkles className="w-4 h-4" />
        </div>
      </motion.div>
    </div>
  );
}

export default Login;
