import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),   // adaptive practice
      setTimeout(() => setPhase(2), 3800),  // AI grading
      setTimeout(() => setPhase(3), 7000),  // integrity reveal
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center px-[8vw] bg-bg-muted"
      initial={{ opacity: 0, scale: 1.05 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
      transition={{ duration: 0.7 }}
    >
      {/* P1: Adaptive practice */}
      <motion.div
        className="absolute flex flex-col items-center text-center"
        initial={{ opacity: 0, y: 30 }}
        animate={
          phase === 1 ? { opacity: 1, y: 0 } :
          phase > 1 ? { opacity: 0, y: -30 } :
          { opacity: 0, y: 30 }
        }
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-[3.6vw] font-black text-text-primary" style={{ fontFamily: 'var(--font-display)' }}>
          Practice that adapts.
        </h2>
        <p className="text-[1.7vw] text-text-secondary mt-3">
          Harder after a streak. Gentler after a miss.
        </p>
        <div className="flex gap-3 items-end h-[20vh] mt-10">
          {[30, 45, 62, 50, 72, 88].map((h, i) => (
            <motion.div
              key={i}
              className="w-[3vw] rounded-t-lg bg-secondary"
              initial={{ height: 0 }}
              animate={phase >= 1 ? { height: `${h}%` } : { height: 0 }}
              transition={{ delay: 0.2 + i * 0.12, type: 'spring', stiffness: 120, damping: 14 }}
            />
          ))}
        </div>
      </motion.div>

      {/* P2: AI grading */}
      <motion.div
        className="absolute flex flex-col items-center text-center w-[70vw]"
        initial={{ opacity: 0, y: 30 }}
        animate={
          phase === 2 ? { opacity: 1, y: 0 } :
          phase > 2 ? { opacity: 0, y: -30 } :
          { opacity: 0, y: 30 }
        }
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-[3.6vw] font-black text-text-primary" style={{ fontFamily: 'var(--font-display)' }}>
          Graded with real feedback.
        </h2>
        <p className="text-[1.7vw] text-text-secondary mt-3">
          Homework, unit tests, and a final — scored by AI.
        </p>
        <div className="flex gap-[2vw] mt-10">
          {['Homework', 'Unit Test', 'Final'].map((t, i) => (
            <motion.div
              key={t}
              className="bg-white rounded-2xl shadow-lg border border-black/5 px-[2.4vw] py-[2.4vh] flex flex-col items-center gap-2"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={phase >= 2 ? { scale: 1, opacity: 1 } : { scale: 0.85, opacity: 0 }}
              transition={{ delay: 0.3 + i * 0.15, type: 'spring', stiffness: 200, damping: 18 }}
            >
              <span className="flex items-center justify-center w-[3vw] h-[3vw] rounded-full bg-secondary text-white text-[1.8vw] font-black">
                ✓
              </span>
              <span className="text-[1.2vw] font-semibold text-text-primary">{t}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* P3: Academic integrity reveal */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center bg-bg-dark text-white z-20 px-[8vw]"
        initial={{ clipPath: 'circle(0% at 50% 50%)' }}
        animate={phase >= 3 ? { clipPath: 'circle(150% at 50% 50%)' } : { clipPath: 'circle(0% at 50% 50%)' }}
        transition={{ duration: 0.9, ease: 'easeInOut' }}
      >
        <h2 className="text-[3.8vw] font-black text-center" style={{ fontFamily: 'var(--font-display)' }}>
          Built to keep it honest.
        </h2>
        <p className="text-[1.7vw] text-white/70 mt-5 text-center max-w-[58vw] leading-snug">
          Every submission is screened for AI-written answers — by both text analysis and typing behavior.
        </p>
        <div className="flex gap-[2vw] mt-10">
          {['Text analysis', 'Keystroke patterns'].map((t, i) => (
            <motion.div
              key={t}
              className="border border-white/25 rounded-full px-[2.4vw] py-[1.4vh] text-[1.3vw] font-semibold"
              initial={{ opacity: 0, y: 20 }}
              animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ delay: 0.6 + i * 0.2, duration: 0.5 }}
            >
              {t}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
