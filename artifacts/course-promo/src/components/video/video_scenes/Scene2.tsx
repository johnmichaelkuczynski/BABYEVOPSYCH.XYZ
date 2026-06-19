import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),   // heading + depth card
      setTimeout(() => setPhase(2), 3200),  // tutor card
      setTimeout(() => setPhase(3), 5800),  // streaming answer
      setTimeout(() => setPhase(4), 8000),  // exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-[6vw]"
      initial={{ opacity: 0, x: '5%' }}
      animate={{ opacity: 1, x: '0%' }}
      exit={{ opacity: 0, x: '-5%', filter: 'blur(8px)' }}
      transition={{ duration: 0.6 }}
    >
      <motion.h2
        className="text-[3.2vw] font-black text-text-primary mb-[4vh] text-center"
        style={{ fontFamily: 'var(--font-display)' }}
        initial={{ y: 30, opacity: 0 }}
        animate={phase >= 1 ? { y: 0, opacity: 1 } : { y: 30, opacity: 0 }}
        transition={{ duration: 0.6 }}
      >
        Read it your way. Ask anything.
      </motion.h2>

      <div className="flex gap-[3vw] w-full max-w-[80vw] items-stretch">
        {/* Card 1: three reading depths */}
        <motion.div
          className="flex-1 bg-white rounded-2xl shadow-xl border border-black/5 p-[2.4vw]"
          initial={{ y: 40, opacity: 0 }}
          animate={phase >= 1 ? { y: 0, opacity: 1 } : { y: 40, opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <p className="text-[1.6vw] font-bold text-text-primary mb-[2.5vh]">Three reading depths</p>
          <div className="flex gap-3 items-end h-[16vh]">
            <motion.div
              className="flex-1 rounded-t-lg flex items-end justify-center pb-2 text-white text-[1vw] font-semibold bg-secondary"
              initial={{ height: 0 }}
              animate={phase >= 1 ? { height: '40%' } : { height: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              Short
            </motion.div>
            <motion.div
              className="flex-1 rounded-t-lg flex items-end justify-center pb-2 text-white text-[1vw] font-semibold bg-primary"
              initial={{ height: 0 }}
              animate={phase >= 1 ? { height: '70%' } : { height: 0 }}
              transition={{ delay: 0.45, duration: 0.5 }}
            >
              Medium
            </motion.div>
            <motion.div
              className="flex-1 rounded-t-lg flex items-end justify-center pb-2 text-white text-[1vw] font-semibold bg-accent"
              initial={{ height: 0 }}
              animate={phase >= 1 ? { height: '100%' } : { height: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              Long
            </motion.div>
          </div>
          <p className="text-[1.05vw] text-text-secondary mt-[2.5vh] leading-snug">
            The same lesson, rewritten to the length you want.
          </p>
        </motion.div>

        {/* Card 2: section-scoped tutor */}
        <motion.div
          className="flex-1 bg-white rounded-2xl shadow-xl border border-black/5 p-[2.4vw] flex flex-col"
          initial={{ y: 40, opacity: 0 }}
          animate={phase >= 2 ? { y: 0, opacity: 1 } : { y: 40, opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-[1.6vw] font-bold text-text-primary mb-[2.5vh]">A tutor for each section</p>
          <div className="flex flex-col gap-3 flex-1">
            <div className="self-end bg-secondary text-white rounded-2xl rounded-br-sm px-4 py-3 text-[1vw] max-w-[82%]">
              Why would this trait survive?
            </div>
            <motion.div
              className="self-start bg-bg-muted text-text-primary rounded-2xl rounded-bl-sm px-4 py-3 text-[1vw] max-w-[88%]"
              initial={{ opacity: 0, y: 10 }}
              animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              transition={{ duration: 0.4 }}
            >
              Because it gave our ancestors an edge
              <span className="inline-flex gap-1 ml-1 align-middle">
                {[0, 1, 2].map(d => (
                  <motion.span
                    key={d}
                    className="w-[0.5vw] h-[0.5vw] rounded-full bg-text-muted inline-block"
                    animate={phase >= 3 ? { opacity: [0.3, 1, 0.3] } : { opacity: 0.3 }}
                    transition={{ duration: 1, repeat: Infinity, delay: d * 0.2 }}
                  />
                ))}
              </span>
            </motion.div>
          </div>
          <p className="text-[1.05vw] text-text-secondary mt-[2.5vh] leading-snug">
            Answers stream in, grounded in the exact passage you're reading.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
