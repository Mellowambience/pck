import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { EvolutionChain, EVOLUTION_STAGES } from '../game/Evolutions';

interface EvolutionScreenProps {
  spirit: { name: string; level: number; type: string };
  chain: EvolutionChain;
  onComplete: (newName: string) => void;
  onCancel: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  Fire: '#f97316', Water: '#3b82f6', Grass: '#22c55e', Fairy: '#c084fc',
  Shadow: '#7c3aed', Sand: '#d97706', Wind: '#a3e635',
};

type Phase = 'confirm' | 'flash' | 'reveal' | 'done';

export const EvolutionScreen: React.FC<EvolutionScreenProps> = ({
  spirit, chain, onComplete, onCancel
}) => {
  const [phase, setPhase] = useState<Phase>('confirm');
  const [flashCount, setFlashCount] = useState(0);

  const fromStage = EVOLUTION_STAGES[chain.from];
  const toStage = EVOLUTION_STAGES[chain.to];
  const typeColor = TYPE_COLORS[fromStage?.type || spirit.type] || '#94a3b8';
  const toColor = TYPE_COLORS[toStage?.type || spirit.type] || '#c084fc';

  useEffect(() => {
    if (phase !== 'flash') return;
    if (flashCount < 8) {
      const t = setTimeout(() => setFlashCount(c => c + 1), 200 + flashCount * 40);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => setPhase('reveal'), 300);
      return () => clearTimeout(t);
    }
  }, [phase, flashCount]);

  const startEvo = () => { setPhase('flash'); setFlashCount(0); };
  const finish = () => { setPhase('done'); setTimeout(() => onComplete(chain.to), 1200); };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-[90] flex items-center justify-center overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at center, #0f0a1e 0%, #000 100%)' }}
    >
      {/* Particle field */}
      {Array.from({ length: 24 }).map((_, i) => (
        <motion.div key={i}
          className="absolute rounded-full pointer-events-none"
          style={{ width: 3 + (i % 3) * 2, height: 3 + (i % 3) * 2, backgroundColor: i % 2 === 0 ? typeColor : toColor, opacity: 0.6 }}
          animate={{ x: [0, (Math.sin(i * 1.3) * 200)], y: [0, (Math.cos(i * 0.9) * 200)], opacity: [0, 0.8, 0], scale: [0, 1.5, 0] }}
          transition={{ duration: 2 + (i % 3), delay: phase === 'flash' ? i * 0.08 : 99, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}

      <div className="relative flex flex-col items-center gap-6 px-8 max-w-sm w-full text-center">

        <AnimatePresence mode="wait">
          {phase === 'confirm' && (
            <motion.div key="confirm" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
              className="flex flex-col items-center gap-6">
              <div className="text-4xl font-bold text-white tracking-wide" style={{ fontFamily: "'Courier New', monospace" }}>
                What?!
              </div>
              <div className="flex items-center gap-8">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-24 h-24 rounded-full border-2 flex items-center justify-center text-5xl"
                    style={{ borderColor: typeColor, backgroundColor: typeColor + '18', boxShadow: `0 0 30px ${typeColor}50` }}>
                    {fromStage?.sprite || '✨'}
                  </div>
                  <span className="text-xs font-mono text-slate-400">{chain.from}</span>
                </div>
                <motion.div animate={{ x: [-4, 4, -4] }} transition={{ repeat: Infinity, duration: 0.8 }}
                  className="text-2xl text-white/60">→</motion.div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-24 h-24 rounded-full border-2 flex items-center justify-center text-5xl opacity-40"
                    style={{ borderColor: toColor, backgroundColor: toColor + '18' }}>
                    {toStage?.sprite || '🌟'}
                  </div>
                  <span className="text-xs font-mono text-slate-500">???</span>
                </div>
              </div>
              <p className="text-sm text-slate-300 font-mono leading-relaxed">
                {chain.from} is trying to evolve!
              </p>
              <div className="flex gap-3 w-full">
                <button onClick={startEvo}
                  className="flex-1 py-3 rounded text-sm font-bold border transition-all"
                  style={{ borderColor: typeColor + '80', color: typeColor, backgroundColor: typeColor + '15' }}>
                  ✨ Evolve
                </button>
                <button onClick={onCancel}
                  className="px-4 py-3 rounded text-sm font-bold border border-slate-700 text-slate-400 hover:text-white transition-all">
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          {phase === 'flash' && (
            <motion.div key="flash" className="flex flex-col items-center gap-4">
              <motion.div
                animate={{ scale: [1, 1.3, 0.9, 1.4, 0.8, 1.5, 0.7, 1.6, 0.5, 1],
                            filter: [`brightness(1)`, `brightness(4)`, `brightness(1)`, `brightness(5)`,
                                     `brightness(1)`, `brightness(6)`, `brightness(1)`, `brightness(8)`, `brightness(20)`, `brightness(20)`] }}
                transition={{ duration: flashCount * 0.2 + 0.5, ease: 'easeInOut' }}
                className="w-32 h-32 rounded-full border-4 flex items-center justify-center text-6xl"
                style={{ borderColor: typeColor, backgroundColor: typeColor + '30', boxShadow: `0 0 60px ${typeColor}` }}>
                {fromStage?.sprite || '✨'}
              </motion.div>
              <p className="text-white/60 text-sm font-mono animate-pulse">Evolving…</p>
            </motion.div>
          )}

          {(phase === 'reveal' || phase === 'done') && (
            <motion.div key="reveal" initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="flex flex-col items-center gap-5">
              <motion.div
                animate={{ boxShadow: [`0 0 30px ${toColor}80`, `0 0 80px ${toColor}`, `0 0 30px ${toColor}80`] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-32 h-32 rounded-full border-4 flex items-center justify-center text-6xl"
                style={{ borderColor: toColor, backgroundColor: toColor + '20' }}>
                {toStage?.sprite || '🌟'}
              </motion.div>
              <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
                className="space-y-2">
                <h2 className="text-2xl font-bold text-white tracking-wider" style={{ fontFamily: "'Courier New', monospace" }}>
                  {chain.to}!
                </h2>
                <p className="text-xs text-slate-400 font-mono leading-relaxed max-w-xs">{chain.description}</p>
                {chain.newMoves.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 justify-center mt-2">
                    {chain.newMoves.map(m => (
                      <span key={m} className="text-[10px] px-2 py-0.5 rounded border font-mono"
                        style={{ color: toColor, borderColor: toColor + '50', backgroundColor: toColor + '15' }}>
                        + {m}
                      </span>
                    ))}
                  </div>
                )}
                {toStage && (
                  <div className="flex gap-4 justify-center mt-2 text-xs font-mono text-slate-400">
                    <span>HP +{Math.round((chain.statBoost.hp - 1) * 100)}%</span>
                    <span>ATK +{Math.round((chain.statBoost.attack - 1) * 100)}%</span>
                    <span>SPD +{Math.round((chain.statBoost.speed - 1) * 100)}%</span>
                  </div>
                )}
              </motion.div>
              {phase !== 'done' && (
                <button onClick={finish}
                  className="w-full py-3 rounded text-sm font-bold border transition-all"
                  style={{ borderColor: toColor + '80', color: toColor, backgroundColor: toColor + '15' }}>
                  Amazing! ✨
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
