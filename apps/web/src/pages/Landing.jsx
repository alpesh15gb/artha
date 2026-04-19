import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, Zap, Users, BarChart3, 
  ArrowRight, Globe, Check, Cloud,
  Laptop, Smartphone, Database, Lock
} from 'lucide-react';
import { Button, cn } from '../components/ui';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="bg-white text-gray-900 selection:bg-indigo-100 italic-none">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Zap className="w-6 h-6 fill-white" />
            </div>
            <span className="text-2xl font-black tracking-tighter">Artha</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-bold text-gray-500 hover:text-indigo-600 transition-colors">Features</a>
            <a href="#solutions" className="text-sm font-bold text-gray-500 hover:text-indigo-600 transition-colors">Solutions</a>
            <a href="#pricing" className="text-sm font-bold text-gray-500 hover:text-indigo-600 transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/login')} className="text-sm font-bold text-gray-600 hover:text-indigo-600 px-4 py-2 transition-all">Log in</button>
            <Button onClick={() => navigate('/register')} className="!rounded-full px-8 py-6 bg-indigo-600 shadow-xl shadow-indigo-200">Start for Free</Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-20">
            <div className="flex-1 text-center lg:text-left">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black uppercase tracking-widest mb-6">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                  </span>
                  Trusted by 5,000+ Indian Businesses
                </div>
                <h1 className="text-6xl lg:text-8xl font-black tracking-tight leading-[0.9] mb-8">
                  Accounting that <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Feels Like Magic.</span>
                </h1>
                <p className="text-xl text-gray-500 font-medium max-w-xl mb-12 leading-relaxed">
                  Artha simplifies GST billing, inventory tracking, and financial reporting with a premium, high-performance interface. No more spreadsheets.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                  <Button onClick={() => navigate('/register')} className="w-full sm:w-auto !rounded-full px-10 py-8 text-lg bg-gray-900 shadow-2xl shadow-gray-300">
                    Get Started Now
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-2">Free for 365 Days • No Card Required</p>
                </div>
              </motion.div>
            </div>
            <div className="flex-1 relative">
               <motion.div 
                 initial={{ opacity: 0, scale: 0.8, rotateY: 20 }}
                 animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                 transition={{ duration: 1, ease: 'easeOut' }}
                 className="relative z-10"
               >
                  <div className="glass p-4 rounded-[40px] shadow-3xl shadow-indigo-500/10 border-white/50 border">
                    <img 
                      src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2426" 
                      alt="Dashboard Preview" 
                      className="rounded-[32px] shadow-inner"
                    />
                  </div>
               </motion.div>
               {/* Decorative Blobs */}
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-indigo-100/50 rounded-full blur-[120px] -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="py-20 bg-gray-50/50 border-y border-gray-100">
         <div className="max-w-7xl mx-auto px-6">
            <p className="text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-12">Universal Integrated Ecosystem</p>
            <div className="flex flex-wrap justify-center items-center gap-16 opacity-40 grayscale group hover:grayscale-0 transition-all duration-700">
               <Laptop className="w-12 h-12" />
               <Smartphone className="w-12 h-12" />
               <Database className="w-12 h-12" />
               <Cloud className="w-12 h-12" />
               <Lock className="w-12 h-12" />
               <Globe className="w-12 h-12" />
            </div>
         </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-black tracking-tight mb-4">Everything you need to <br/> scale your enterprise.</h2>
            <p className="text-gray-500 font-medium">Built for speed, accuracy, and peace of mind.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={Shield} 
              title="GST Compliance" 
              desc="Automatic GSTR summary generation (GSTR-1, 3B) with built-in HSN code tracking."
              color="indigo"
            />
            <FeatureCard 
              icon={BarChart3} 
              title="Real-time Analytics" 
              desc="Instantly visualize your cash flow, P&L, and trial balance with high-fidelity charts."
              color="emerald"
            />
            <FeatureCard 
              icon={Zap} 
              title="Rapid Invoicing" 
              desc="Create professional tax invoices in under 30 seconds with automated numbering."
              color="amber"
            />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32">
         <div className="max-w-7xl mx-auto px-6">
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[3rem] p-12 lg:p-32 text-center text-white relative overflow-hidden shadow-3xl shadow-indigo-500/20">
               <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-48 -mt-48" />
               <h2 className="text-5xl lg:text-7xl font-black tracking-tight mb-8">Ready to modernize <br/> your ledger?</h2>
               <p className="text-xl text-indigo-100/80 mb-12 max-w-2xl mx-auto font-medium leading-relaxed">Join thousands of entrepreneurs who have switched to Artha for a stress-free accounting experience.</p>
               <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
                  <Button onClick={() => navigate('/register')} className="w-full sm:w-auto !rounded-full px-12 py-8 text-xl bg-white text-indigo-600 shadow-2xl transition-transform hover:scale-105">Create Free Account</Button>
                  <button onClick={() => navigate('/login')} className="text-lg font-black text-white hover:text-indigo-200 underline decoration-2 underline-offset-8">Visit Dashboard</button>
               </div>
            </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-gray-100 bg-gray-50/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-indigo-600" />
              <span className="text-xl font-black tracking-tighter">Artha</span>
            </div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">© 2026 Artha Ecosystems. All Rights Reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc, color }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="p-10 rounded-[3rem] bg-gray-50/50 border border-transparent hover:border-gray-100 hover:bg-white transition-all duration-500 group">
      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-8 shadow-sm group-hover:scale-110 transition-transform duration-500", colors[color])}>
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">{title}</h3>
      <p className="text-gray-500 font-medium leading-relaxed">{desc}</p>
    </div>
  );
}
