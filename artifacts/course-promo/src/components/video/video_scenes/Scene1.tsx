import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(10px)' }}
      transition={{ duration: 0.8 }}
    >
      <div className="relative z-10 text-center flex flex-col items-center px-[8vw]">
        <motion.span
          className="text-[1.3vw] font-semibold tracking-[0.45em] text-secondary uppercase"
          initial={{ y: 20, opacity: 0 }}
          animate={phase >= 1 ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          An AI-taught course
        </motion.span>

        <motion.h1
          className="text-[6.2vw] font-black text-text-primary leading-[1.05] mt-5"
          style={{ fontFamily: 'var(--font-display)' }}
          initial={{ y: 40, opacity: 0 }}
          animate={phase >= 1 ? { y: 0, opacity: 1 } : { y: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
        >
          Evolutionary<br />Psychology
        </motion.h1>

        <motion.div
          className="h-[3px] bg-accent mt-8"
          initial={{ width: 0 }}
          animate={phase >= 2 ? { width: '14vw' } : { width: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />

        <motion.p
          className="text-[2vw] text-text-secondary mt-8 font-medium"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          Why your mind works the way it does.
        </motion.p>
      </div>
    </motion.div>
  );
}
