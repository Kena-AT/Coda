import React, { useEffect, useState } from 'react';

export const ParallaxBackground: React.FC = () => {
  const [dots, setDots] = useState<{ x: number; y: number }[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Generate a fixed grid of dots
    const spacing = 40;
    const padding = 100;
    const newDots = [];
    const width = window.innerWidth;
    const height = window.innerHeight;

    for (let x = -padding; x < width + padding; x += spacing) {
      for (let y = -padding; y < height + padding; y += spacing) {
        newDots.push({ x, y });
      }
    }
    setDots(newDots);

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#0a0a0c]">
      {/* Scanline Effect */}
      <div className="cyber-scanline" />
      
      <svg className="absolute inset-0 w-full h-full">
        {dots.map((dot, i) => {
          // Calculate distance from mouse to dot
          const dx = mousePos.x - dot.x;
          const dy = mousePos.y - dot.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          // Influence radius
          const radius = 250;
          let offsetX = 0;
          let offsetY = 0;

          if (dist < radius) {
            // Move dots away from mouse subtly
            const force = (1 - dist / radius) * 15;
            offsetX = -(dx / dist) * force;
            offsetY = -(dy / dist) * force;
          }

          return (
            <circle 
              key={i}
              cx={dot.x + offsetX} 
              cy={dot.y + offsetY} 
              r="1" 
              fill="#e60000" 
              className="opacity-40 transition-all duration-200 ease-out"
            />
          );
        })}
      </svg>

      {/* Subtle Ambient Glows */}
      <div className="absolute top-[20%] left-[10%] w-[600px] h-[600px] bg-[#e60000] blur-[250px] rounded-full opacity-[0.05]" />
    </div>
  );
};
