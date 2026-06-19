import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1800),
      setTimeout(() => setPhase(3), 3200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center bg-bg-dark text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(16px)' }}
      transition={{ duration: 0.8 }}
    >
      <motion.span
        className="text-[1.25vw] font-semibold tracking-[0.4em] uppercase text-accent"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6 }}
      >
        Taught · Tutored · Graded by AI
      </motion.span>

      <motion.h1
        className="text-[5.6vw] font-black text-center leading-[1.05] mt-6"
        style={{ fontFamily: 'var(--font-display)' }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={phase >= 1 ? { scale: 1, opacity: 1 } : { scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 18 }}
      >
        Basic Evolutionary Psychology
      </motion.h1>

      <motion.div
        className="h-[3px] bg-accent mt-8"
        initial={{ width: 0 }}
        animate={phase >= 2 ? { width: '16vw' } : { width: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      />

      <motion.p
        className="text-[2vw] text-white/80 mt-8 font-medium"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6 }}
      >
        Learn it your way.
      </motion.p>
    </motion.div>
  );
}
