import React from 'react';
import { motion } from 'framer-motion';
import { ParallaxBackground } from '../layout/ParallaxBackground';

interface WelcomePageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export const WelcomePage: React.FC<WelcomePageProps> = ({ onGetStarted, onLogin }) => {
  return (
    <div className="relative min-h-screen flex flex-col bg-[#111111] text-[#ffffff] overflow-x-hidden selection:bg-[#e60000] selection:text-white">

      {/* Header - Top Navigation Bar */}
      <header className="absolute top-0 left-0 w-full h-[56px] bg-[#19191c] border-b border-[#222226] px-6 flex items-center justify-between z-50">
        <div className="text-[#e60000] font-main font-bold text-[14px] tracking-[2px]">CODA</div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center pt-[56px] z-10 w-full max-w-[1280px] mx-auto pb-24">
        
        {/* Hero Section */}
        <section className="relative w-full flex flex-col items-center justify-center pt-32 pb-24 px-6 text-center h-[700px] border-b border-[#222226]/50">
          
          {/* This is the red parallax background specifically scoped to this area */}
          <ParallaxBackground className="absolute inset-0" glow={true} />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col items-center relative z-10"
          >
            <div className="border-l-2 border-[#e60000] bg-[#19191c]/80 px-4 py-1 mb-6 flex items-center justify-center backdrop-blur-sm">
              <span className="text-[#e60000] font-main text-[10px] tracking-[1.2px] uppercase">SYSTEM READY // V1.0.0-STABLE</span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-[72px] font-main font-bold leading-[0.95] tracking-[-4px] text-[#fffbfe] mb-6 flex flex-col pt-4">
              <span>ARCHIVE.</span>
              <span>ORGANIZE.</span>
              <span>ACCELERATE.</span>
            </h1>

            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="max-w-[550px] font-mono text-[#adaaad] text-sm leading-relaxed mb-10"
            >
              The sovereign terminal for developers. Pressurize your workflow with high-precision snippet management and advanced neural discovery.
            </motion.p>

            <div className="flex items-center gap-4">
              <button 
                onClick={onGetStarted}
                className="bg-[#e60000] text-[#04f5ff] font-main font-bold text-xs tracking-[1.8px] hover:bg-[#ff0000] transition-all px-8 py-4 uppercase border border-[#e60000]"
              >
                Get Started
              </button>
              <button 
                onClick={onLogin}
                className="border border-[#e60000] text-[#e60000] hover:bg-[#e6000010] bg-[#19191c]/60 backdrop-blur-sm transition-colors font-main font-bold text-xs tracking-[1.8px] uppercase px-8 py-4"
              >
                Sign In
              </button>
            </div>
          </motion.div>
        </section>

        {/* Section - Bento Grid Benefits */}
        <section className="w-full max-w-[900px] px-6 mt-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-auto">
             
            {/* Benefit 1: Large Feature (Organize - LEFT STACKED) */}
            <div className="lg:col-span-8 bg-[#1f1f22] border-l-2 border-[#f3ffca] p-8 flex flex-col justify-end relative overflow-hidden group min-h-[300px]">
               <div className="z-10 mt-auto">
                 <div className="mb-4">
                    {/* Folder Icon Placeholder */}
                    <div className="w-6 h-6 border-2 border-[#f3ffca] rounded-sm flex flex-col">
                       <div className="w-3 h-1 border-b-2 border-[#f3ffca]" />
                       <div className="flex-1" />
                    </div>
                 </div>
                 <h3 className="text-[#fffbfe] font-main font-bold text-2xl mb-3">Organize snippets with ease</h3>
                 <p className="text-[#adaaad] font-mono text-xs leading-relaxed max-w-[340px]">
                   Multi-dimensional categorization using our proprietary tagging engine. Never lose a logic block again.
                 </p>
               </div>
               {/* Right side abstract dark box as depicted */}
               <div className="absolute right-0 top-0 w-[40%] h-full bg-[#2a2a2d]" />
            </div>

            {/* Benefit 2: Search (Top Right) */}
            <div className="lg:col-span-4 bg-[#1f1f22] p-8 flex flex-col justify-between min-h-[300px]">
               <div>
                  <div className="mb-4 text-[#e60000]">
                    {/* Search Icon Placeholder */}
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  </div>
                  <h3 className="text-[#fffbfe] font-main font-bold text-lg mb-2">Smart Search</h3>
                  <p className="text-[#adaaad] font-mono text-[10px] leading-relaxed">
                    Semantic analysis of your codebase. Search by intent, not just syntax.
                  </p>
               </div>
               <div className="pt-8">
                 <span className="text-[#e60000] font-main text-[8px] tracking-[1px] uppercase">QUERY_EXECUTED: 0.002MS</span>
               </div>
            </div>

            {/* Benefit 3: Recommendations (Bottom Left) */}
            <div className="lg:col-span-4 bg-[#1f1f22] p-8 flex flex-col">
               <div>
                  <div className="mb-4 text-[#e60000]">
                    {/* Sparkle Icon Placeholder */}
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                  </div>
                  <h3 className="text-[#fffbfe] font-main font-bold text-lg mb-2 leading-tight">Advanced<br/>Recommendations</h3>
                  <p className="text-[#adaaad] font-mono text-[10px] leading-relaxed mb-8">
                    AI-driven patterns that suggest your next code block before you even think of it.
                  </p>
               </div>
               <div className="mt-auto">
                  <div className="w-full h-1 bg-[#ff59e3]/20 relative">
                     <div className="absolute top-0 left-0 h-full w-[60%] bg-[#e60000]" />
                  </div>
               </div>
            </div>

            {/* Benefit 4: Versioning (Bottom Right) */}
            <div className="lg:col-span-8 bg-[#1f1f22] border-r-2 border-[#e60000] p-8 flex items-center relative gap-8 group">
               <div className="z-10 flex-1">
                 <div className="mb-4 text-[#e60000]">
                    {/* Clock Icon Placeholder */}
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                 </div>
                 <h3 className="text-[#fffbfe] font-main font-bold text-xl mb-3">Versioning & History</h3>
                 <p className="text-[#adaaad] font-mono text-xs leading-relaxed max-w-[340px]">
                   Full immutable logs for every snippet. Revert, branch, and merge logic clusters like a professional.
                 </p>
               </div>
               
               {/* Abstract graph representation right side */}
               <div className="w-[120px] h-[100px] border border-black bg-black flex flex-col justify-center items-start gap-2 p-4">
                  <div className="w-16 h-1 bg-[#47605d]" />
                  <div className="w-20 h-1 bg-[#47605d]" />
                  <div className="w-16 h-1 bg-[#47605d]" />
                  <div className="w-12 h-1 bg-[#47605d]" />
               </div>
            </div>

          </div>
        </section>
      </main>
    </div>
  );
};
