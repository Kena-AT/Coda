import { motion } from 'framer-motion';
import { ParallaxBackground } from '../layout/ParallaxBackground';

interface WelcomePageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export const WelcomePage: React.FC<WelcomePageProps> = ({ onGetStarted, onLogin }) => {
  return (
    <div className="relative min-h-screen flex flex-col bg-[#0a0a0c] text-white overflow-hidden selection:bg-[#e60000] selection:text-white">
      <ParallaxBackground />

      {/* Header */}
      <header className="fixed top-0 left-0 w-full h-14 border-b border-[#222226] bg-black/40 backdrop-blur-xl px-12 flex items-center justify-between z-50">
        <div className="flex items-center gap-4">
          <div className="w-2 h-2 bg-[#e60000] animate-pulse rounded-full" />
          <div className="text-[#e60000] font-bold text-lg tracking-[4px] font-mono">CODA</div>
        </div>
        <button 
          onClick={onLogin}
          className="text-[10px] tracking-[3px] text-[#88888c] hover:text-[#e60000] transition-all border border-[#222226] hover:border-[#e60000] px-6 py-2 bg-black uppercase font-bold"
        >
          SIGN_IN.EXE
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-12 pt-24 z-10">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-center max-w-5xl"
        >
          <div className="flex items-center justify-center gap-3 mb-8">
            <span className="w-12 h-[1px] bg-[#e60000]" />
            <span className="text-[#e60000] font-mono text-[10px] tracking-[5px] uppercase">ARCHIVE // CODE // V1.2</span>
            <span className="w-12 h-[1px] bg-[#e60000]" />
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-10 tracking-tight leading-[0.95] glitch-text">
            REUSABLE CODE <br />
            <span className="text-[#88888c]">SMARTER THAN EVER.</span>
          </h1>

          <p className="text-[#88888c] text-sm md:text-base leading-relaxed mb-14 max-w-xl mx-auto font-medium">
            High-performance code snippet architecture for professional developers. 
            Store, search, and deploy patterns across projects with sub-millisecond latency.
          </p>
          
          <div className="flex items-center justify-center gap-6">
            <button 
              onClick={onGetStarted}
              className="group relative bg-[#e60000] text-white px-10 py-4 font-bold text-sm tracking-[2px] uppercase shadow-[0_0_20px_rgba(230,0,0,0.2)] hover:shadow-[0_0_40px_rgba(230,0,0,0.4)] transition-all overflow-hidden"
            >
              <span className="relative z-10">INITIALIZE_SYSTEM</span>
              <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300" />
            </button>
          </div>
        </motion.div>

        {/* Bento Grid Teaser */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-1 mt-32 w-full max-w-7xl">
          <div className="bg-[#121214]/80 backdrop-blur-md border border-[#222226] p-10 hover:border-[#e6000033] transition-all group relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 text-[10px] font-mono text-zinc-800">01</div>
             <h3 className="text-[#e60000] font-bold text-xs tracking-widest mb-6 uppercase">Fuzzy Search</h3>
             <p className="text-[#88888c] text-xs leading-relaxed">Full-text indexing with white-space and comment filtering for precise pattern matching.</p>
          </div>
          <div className="bg-[#121214]/80 backdrop-blur-md border border-[#222226] p-10 hover:border-[#e6000033] transition-all group relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 text-[10px] font-mono text-zinc-800">02</div>
             <h3 className="text-[#e60000] font-bold text-xs tracking-widest mb-6 uppercase">Versioning</h3>
             <p className="text-[#88888c] text-xs leading-relaxed">Immutable snapshots for every edit. Rollback your entire library to any point in time.</p>
          </div>
          <div className="bg-[#121214]/80 backdrop-blur-md border border-[#222226] p-10 hover:border-[#e6000033] transition-all group relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 text-[10px] font-mono text-zinc-800">03</div>
             <h3 className="text-[#e60000] font-bold text-xs tracking-widest mb-6 uppercase">Local First</h3>
             <p className="text-[#88888c] text-xs leading-relaxed">Offline-first desktop architecture. Your code never leaves your local hardware.</p>
          </div>
        </div>
      </div>
      
      {/* Footer detail */}
      <footer className="py-12 flex flex-col items-center opacity-20 mt-12">
        <div className="w-[1px] h-12 bg-white mb-6" />
        <span className="text-[9px] tracking-[4px] uppercase font-mono">system.status : operational</span>
      </footer>
    </div>
  );
};
