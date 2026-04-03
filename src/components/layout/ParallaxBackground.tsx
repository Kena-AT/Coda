import React, { useEffect } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';

export const ParallaxBackground: React.FC = () => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth out mouse movement
  const springConfig = { damping: 20, stiffness: 100 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse position to -1 to 1
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      mouseX.set(x);
      mouseY.set(y);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#0a0a0c]">
      {/* Scanline Effect */}
      <div className="cyber-scanline" />
      
      {/* Layer 1: Distant Stars/Glows (Slowest) */}
      <motion.div 
        style={{
          x: smoothX.get() * 10,
          y: smoothY.get() * 10,
        }}
        className="absolute inset-[-10%] opacity-20"
      >
        <div className="absolute top-[20%] left-[10%] w-96 h-96 bg-[#e60000] blur-[150px] rounded-full opacity-30" />
        <div className="absolute bottom-[20%] right-[10%] w-[500px] h-[500px] bg-[#00f5ff] blur-[180px] rounded-full opacity-10" />
      </motion.div>

      {/* Layer 2: Grid (Medium) */}
      <motion.div 
        style={{
          x: smoothX.get() * -25,
          y: smoothY.get() * -25,
        }}
        className="absolute inset-[-20%] cyber-grid opacity-[0.03]"
      />

      {/* Layer 3: Foreground Accents (Fastest) */}
      <motion.div 
        style={{
          x: smoothX.get() * -50,
          y: smoothY.get() * -50,
        }}
        className="absolute inset-[-30%] opacity-[0.05] pointer-events-none"
      >
        <div className="absolute top-[40%] left-[45%] w-1 h-32 bg-white blur-[2px]" />
        <div className="absolute top-[10%] right-[25%] w-32 h-[1px] bg-[#e60000] blur-[1px]" />
      </motion.div>
    </div>
  );
};
