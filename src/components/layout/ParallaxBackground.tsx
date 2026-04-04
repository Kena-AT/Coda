import React, { useEffect, useState, useRef } from 'react';

interface ParallaxBackgroundProps {
  className?: string;
  glow?: boolean;
}

export const ParallaxBackground: React.FC<ParallaxBackgroundProps> = ({ className = '', glow = true }) => {
  const [dots, setDots] = useState<{ x: number; y: number }[]>([]);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate a fixed grid of dots
    const spacing = 40;
    const padding = 100;
    const newDots = [];
    const width = window.innerWidth;
    const height = 1000;

    for (let x = -padding; x < width + padding; x += spacing) {
      for (let y = -padding; y < height + padding; y += spacing) {
        newDots.push({ x, y });
      }
    }
    setDots(newDots);

    let animationFrameId: number;

    const handleMouseMove = (e: MouseEvent) => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      animationFrameId = requestAnimationFrame(() => {
        setMousePos({ x: e.clientX, y: e.clientY });
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  // Compute offset per render
  const rect = containerRef.current?.getBoundingClientRect();
  const localMouseX = rect ? mousePos.x - rect.left : mousePos.x;
  const localMouseY = rect ? mousePos.y - rect.top : mousePos.y;

  return (
    <div ref={containerRef} className={`absolute inset-0 z-0 pointer-events-none overflow-hidden ${className}`}>
      
      {glow && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[800px] h-[800px] bg-[#e60000] blur-[150px] rounded-full opacity-[0.15]" />
        </div>
      )}

      <svg className="absolute inset-0 w-full h-full">
        {dots.map((dot, i) => {
          const dx = localMouseX - dot.x;
          const dy = localMouseY - dot.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          // Influence radius - Snappier motion
          const radius = 300; 
          let offsetX = 0;
          let offsetY = 0;

          if (dist < radius) {
            // Apply squared force decay for more impact at the center
            const force = Math.pow(1 - dist / radius, 2) * 25;
            offsetX = -(dx / dist) * force;
            offsetY = -(dy / dist) * force;
          }

          return (
            <circle 
              key={i}
              cx={dot.x + offsetX} 
              cy={dot.y + offsetY} 
              r="1.5" 
              fill="#e60000" 
              className="opacity-60"
            />
          );
        })}
      </svg>
    </div>
  );
};
