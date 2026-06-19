import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video/animations';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 3000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const highlights = [
    "Three formats, three lengths",
    "Detailed written feedback",
    "Never affects your grade",
    "Freshly generated every attempt"
  ];

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col justify-center items-center px-12 z-10"
      {...sceneTransitions.fadeBlur}
    >
      <div className="flex flex-col items-center mb-16">
        <motion.div 
          className="text-6xl mb-6 text-[var(--color-accent)]"
          initial={{ opacity: 0, scale: 0, rotate: -45 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1, rotate: 0 } : { opacity: 0, scale: 0, rotate: -45 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          🧠
        </motion.div>
        
        <div className="grid grid-cols-2 gap-x-12 gap-y-6 mt-8">
          {highlights.map((h, i) => (
            <motion.div
              key={i}
              className="flex items-center gap-4 bg-[var(--color-bg-muted)]/40 border border-white/5 rounded-lg p-4 backdrop-blur-md"
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
            >
              <div className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
              <span className="text-[1.1vw] text-white/90">{h}</span>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.8 }}
      >
        <div className="w-[1px] h-12 bg-white/20 mx-auto mb-6" />
        <h1 className="text-[3vw] font-display text-white tracking-widest uppercase mb-2">Basic Evolutionary Psychology</h1>
        <p className="text-[1.2vw] text-[var(--color-accent)] italic font-display text-2xl tracking-widest">Your mind has a history.</p>
      </motion.div>
    </motion.div>
  );
}