import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video/animations';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1600),
      setTimeout(() => setPhase(4), 2000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex justify-center items-center gap-12 px-12 z-10"
      {...sceneTransitions.splitVertical}
    >
      <motion.div 
        className="w-[35%] bg-[var(--color-bg-muted)] border border-white/5 rounded-xl p-10 relative overflow-hidden shadow-2xl"
        initial={{ opacity: 0, x: -50, rotateY: 20 }}
        animate={phase >= 1 ? { opacity: 1, x: 0, rotateY: 0 } : { opacity: 0, x: -50, rotateY: 20 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{ perspective: 1000 }}
      >
        <div className="absolute top-0 right-0 p-6 opacity-10">
          <span className="text-8xl font-display">01</span>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          <h3 className="text-[1.8vw] font-display text-[var(--color-accent)] font-semibold mb-2">Subject-Specific</h3>
          <p className="text-[1vw] text-[var(--color-text-secondary)] mb-6 uppercase tracking-wider font-semibold opacity-70">Evolutionary Psychology</p>
          <div className="space-y-4">
            <div className="h-[2px] w-12 bg-[var(--color-accent)]" />
            <p className="text-[1.1vw] text-[var(--color-text-primary)] font-light leading-relaxed">
              Questions generated from the course's own lecture content.
            </p>
            <p className="text-[1.1vw] text-[var(--color-text-secondary)] font-light leading-relaxed italic">
              Measures how much evolutionary psychology you actually know.
            </p>
          </div>
        </motion.div>
      </motion.div>

      <motion.div 
        className="w-[35%] bg-[var(--color-bg-muted)] border border-white/5 rounded-xl p-10 relative overflow-hidden shadow-2xl"
        initial={{ opacity: 0, x: 50, rotateY: -20 }}
        animate={phase >= 3 ? { opacity: 1, x: 0, rotateY: 0 } : { opacity: 0, x: 50, rotateY: -20 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{ perspective: 1000 }}
      >
        <div className="absolute top-0 right-0 p-6 opacity-10">
          <span className="text-8xl font-display">02</span>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          <h3 className="text-[1.8vw] font-display text-[var(--color-accent)] font-semibold mb-2">General Reasoning</h3>
          <p className="text-[1vw] text-[var(--color-text-secondary)] mb-6 uppercase tracking-wider font-semibold opacity-70">Genuine Reasoning</p>
          <div className="space-y-4">
            <div className="h-[2px] w-12 bg-[var(--color-accent)]" />
            <p className="text-[1.1vw] text-[var(--color-text-primary)] font-light leading-relaxed">
              Reasoning problems generated fresh on every attempt.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {['Multiple Choice', 'Hybrid', 'Written'].map((skill, i) => (
                <span key={skill} className="px-3 py-1 bg-[var(--color-bg-dark)] border border-white/10 rounded-full text-[0.8vw] text-[var(--color-text-secondary)]">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}