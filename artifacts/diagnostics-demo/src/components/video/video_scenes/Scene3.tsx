import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video/animations';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1600),
      setTimeout(() => setPhase(4), 2200),
      setTimeout(() => setPhase(5), 2800),
      setTimeout(() => setPhase(6), 3400),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const milestones = [
    { label: 'Before', desc: 'Pre-course' },
    { label: 'One-Third', desc: 'Through Topic 2' },
    { label: 'Two-Thirds', desc: 'Through Topic 4' },
    { label: 'After', desc: 'Course complete' },
  ];

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col justify-center items-center px-16 z-10"
      {...sceneTransitions.clipCircle}
    >
      <motion.h2 
        className="text-[3vw] font-display text-white italic mb-16"
        initial={{ opacity: 0, y: -20 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
      >
        Tracked across the term
      </motion.h2>

      <div className="w-full max-w-[80%] relative h-32 flex items-center">
        {/* Base line */}
        <motion.div 
          className="absolute left-0 right-0 h-[2px] bg-white/20"
          initial={{ scaleX: 0, transformOrigin: 'left' }}
          animate={phase >= 1 ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
        />

        <div className="w-full flex justify-between relative z-10">
          {milestones.map((m, i) => (
            <motion.div 
              key={i} 
              className="flex flex-col items-center relative"
              initial={{ opacity: 0, y: 20 }}
              animate={phase >= i + 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <div className="w-4 h-4 rounded-full bg-[var(--color-accent)] shadow-[0_0_15px_rgba(212,175,55,0.5)] mb-4" />
              <span className="text-[1vw] font-semibold text-white uppercase tracking-wider">{m.label}</span>
              <span className="text-[0.9vw] text-white/50">{m.desc}</span>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.div 
        className="mt-16 bg-[var(--color-bg-muted)]/50 backdrop-blur-sm border border-[var(--color-accent)]/30 rounded-full px-8 py-4"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={phase >= 6 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.6 }}
      >
        <p className="text-[1.2vw] text-white font-light">
          <span className="text-[var(--color-accent)] font-semibold">8 assessments</span> — two kinds across four phases — to measure true growth.
        </p>
      </motion.div>
    </motion.div>
  );
}