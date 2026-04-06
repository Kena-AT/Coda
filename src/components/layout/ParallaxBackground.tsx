import React, { useEffect, useState, useRef, useMemo } from 'react';

interface ParallaxBackgroundProps {
  className?: string;
  glow?: boolean;
}

interface OrbitalPoint {
  x: number;
  y: number;
  z: number;
  ringIndex: number;
  angle: number;
}

export const ParallaxBackground: React.FC<ParallaxBackgroundProps> = ({ className = '', glow = true }) => {
  const [points, setPoints] = useState<OrbitalPoint[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0, centerX: 0, centerY: 0 });
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>(0);

  // Generate spherical orbital points
  const generateOrbitalPoints = (centerX: number, centerY: number): OrbitalPoint[] => {
    const rings = 8;
    const pointsPerRing = 24;
    const maxRadius = Math.min(centerX, centerY) * 1.3; // INCREASED from 0.85 to 1.3
    const newPoints: OrbitalPoint[] = [];

    for (let r = 0; r < rings; r++) {
      const ringProgress = r / (rings - 1);
      const radius = 80 + (maxRadius - 80) * ringProgress;
      
      // Create tilted rings at different angles for 3D sphere effect
      const tiltX = (r % 3) * 0.3;
      const tiltY = (r % 2) * 0.5;
      
      for (let i = 0; i < pointsPerRing; i++) {
        const angle = (i / pointsPerRing) * Math.PI * 2;
        
        // 3D coordinates
        let x = Math.cos(angle) * radius;
        let y = Math.sin(angle) * radius;
        let z = 0;
        
        // Apply tilt rotations
        const cosTiltX = Math.cos(tiltX);
        const sinTiltX = Math.sin(tiltX);
        const cosTiltY = Math.cos(tiltY);
        const sinTiltY = Math.sin(tiltY);
        
        const y1 = y * cosTiltX - z * sinTiltX;
        const z1 = y * sinTiltX + z * cosTiltX;
        const x2 = x * cosTiltY + z1 * sinTiltY;
        const z2 = -x * sinTiltY + z1 * cosTiltY;
        
        newPoints.push({
          x: centerX + x2,
          y: centerY + y1,
          z: z2,
          ringIndex: r,
          angle: angle
        });
      }
    }

    // Add spiral arms (galactic effect)
    const spiralArms = 3;
    const spiralPoints = 60;
    for (let arm = 0; arm < spiralArms; arm++) {
      const armOffset = (arm / spiralArms) * Math.PI * 2;
      for (let i = 0; i < spiralPoints; i++) {
        const progress = i / spiralPoints;
        const radius = 60 + maxRadius * 0.7 * progress;
        const angle = armOffset + progress * Math.PI * 4;
        
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const z = Math.sin(progress * Math.PI) * 50 - 25;
        
        newPoints.push({
          x: centerX + x,
          y: centerY + y,
          z: z,
          ringIndex: -1,
          angle: angle
        });
      }
    }

    return newPoints;
  };

  // Initialize dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        setDimensions({ width: rect.width, height: rect.height, centerX, centerY });
        setPoints(generateOrbitalPoints(centerX, centerY));
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // Smooth rotation animation
  useEffect(() => {
    const animate = () => {
      setRotation(prev => ({
        x: prev.x + (mousePos.y * 0.0005 - prev.x) * 0.05,
        y: prev.y + (mousePos.x * 0.0005 - prev.y) * 0.05
      }));
      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [mousePos]);

  // Mouse tracking
  useEffect(() => {
    let animationFrameId: number;

    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const x = e.clientX - rect.left - centerX;
        const y = e.clientY - rect.top - centerY;
        
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(() => {
          setMousePos({ x, y });
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Transform points based on rotation and cursor repulsion
  const transformedPoints = useMemo(() => {
    const cosRotX = Math.cos(rotation.x);
    const sinRotX = Math.sin(rotation.x);
    const cosRotY = Math.cos(rotation.y);
    const sinRotY = Math.sin(rotation.y);

    return points.map(point => {
      const y1 = point.y - dimensions.centerY;
      const z1 = point.z;
      const y2 = y1 * cosRotX - z1 * sinRotX;
      const z2 = y1 * sinRotX + z1 * cosRotX;

      const x1 = point.x - dimensions.centerX;
      const x2 = x1 * cosRotY + z2 * sinRotY;
      const z3 = -x1 * sinRotY + z2 * cosRotY;

      // Final position before cursor interaction
      let finalX = dimensions.centerX + x2;
      let finalY = dimensions.centerY + y2;
      let finalZ = z3;

      // Cursor repulsion effect - nodes move away from cursor
      // Use actual cursor position (not scaled) for repulsion calculation
      const cursorX = dimensions.centerX + mousePos.x;
      const cursorY = dimensions.centerY + mousePos.y;
      
      const dx = finalX - cursorX;
      const dy = finalY - cursorY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Dynamic influence radius - larger for outer nodes
      const distanceFromCenter = Math.sqrt(
        Math.pow(finalX - dimensions.centerX, 2) + 
        Math.pow(finalY - dimensions.centerY, 2)
      );
      const influenceRadius = 200 + (distanceFromCenter / dimensions.centerX) * 150;

      if (dist < influenceRadius && dist > 0) {
        const force = Math.pow(1 - dist / influenceRadius, 2) * 100;
        const pushX = (dx / dist) * force;
        const pushY = (dy / dist) * force;
        
        finalX += pushX;
        finalY += pushY;
        // Also push back in Z slightly for depth effect
        finalZ -= force * 0.4;
      }

      return {
        x: finalX,
        y: finalY,
        z: finalZ,
        ringIndex: point.ringIndex,
        originalZ: point.z
      };
    });
  }, [points, rotation, dimensions, mousePos]);

  // Connection lines for wireframe effect
  const connections = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number; opacity: number }[] = [];
    
    const ringGroups = new Map<number, typeof transformedPoints>();
    transformedPoints.forEach(p => {
      if (p.ringIndex >= 0) {
        if (!ringGroups.has(p.ringIndex)) ringGroups.set(p.ringIndex, []);
        ringGroups.get(p.ringIndex)!.push(p);
      }
    });

    ringGroups.forEach(ringPoints => {
      ringPoints.sort((a, b) => {
        const angleA = Math.atan2(a.y - dimensions.centerY, a.x - dimensions.centerX);
        const angleB = Math.atan2(b.y - dimensions.centerY, b.x - dimensions.centerX);
        return angleA - angleB;
      });

      for (let i = 0; i < ringPoints.length; i++) {
        const current = ringPoints[i];
        const next = ringPoints[(i + 1) % ringPoints.length];
        
        if (current.z > -50 && next.z > -50) {
          const avgZ = (current.z + next.z) / 2;
          const opacity = Math.max(0.1, Math.min(0.4, (avgZ + 100) / 200));
          lines.push({
            x1: current.x,
            y1: current.y,
            x2: next.x,
            y2: next.y,
            opacity
          });
        }
      }
    });

    return lines;
  }, [transformedPoints, dimensions]);

  return (
    <div ref={containerRef} className={`absolute inset-0 z-0 pointer-events-none overflow-hidden ${className}`}>
      
      {glow && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[800px] h-[800px] bg-[#e60000] blur-[250px] rounded-full opacity-[0.15]" />
          <div className="absolute w-[500px] h-[500px] bg-[#ff3333] blur-[120px] rounded-full opacity-[0.1]" />
        </div>
      )}

      <svg className="absolute inset-0 w-full h-full">
        {/* Connection lines - wireframe effect */}
        {connections.map((line, i) => (
          <line
            key={`line-${i}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="#e60000"
            strokeWidth="0.5"
            opacity={line.opacity * 0.5}
          />
        ))}

        {/* Points */}
        {transformedPoints.map((point, i) => {
          const depth = (point.z + 100) / 200;
          const opacity = Math.max(0.2, Math.min(1, depth));
          const size = point.ringIndex === -1 ? 1.2 : 1.5 + depth * 1;
          
          const isSpiral = point.ringIndex === -1;
          const color = isSpiral 
            ? `rgba(255, 51, 51, ${opacity})` 
            : `rgba(230, 0, 0, ${opacity})`;

          return (
            <circle
              key={`point-${i}`}
              cx={point.x}
              cy={point.y}
              r={size}
              fill={color}
            />
          );
        })}

        {/* Center core glow */}
        <circle
          cx={dimensions.centerX}
          cy={dimensions.centerY}
          r="3"
          fill="#ff0000"
          opacity="0.8"
        />
        <circle
          cx={dimensions.centerX}
          cy={dimensions.centerY}
          r="8"
          fill="none"
          stroke="#e60000"
          strokeWidth="0.5"
          opacity="0.3"
        />
      </svg>
    </div>
  );
};
