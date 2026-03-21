import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface Creature {
  name: string;
  type: string;
  hp: number;
  maxHp: number;
  color: string;
  level: number;
  shield?: number;
}

interface BattleScreenProps {
  wildCreature: Creature;
  onFlee: () => void;
  onCatch: () => void;
  aetherOrbs: number;
  onUseAetherOrb: () => void;
}

export const BattleScreen: React.FC<BattleScreenProps> = ({ wildCreature, onFlee, onCatch }) => {
  const [playerHp, setPlayerHp] = useState(100);
  const [wildHp, setWildHp] = useState(wildCreature.hp);
  const [wildShield, setWildShield] = useState(wildCreature.shield || 3);
  const [isBroken, setIsBroken] = useState(false);
  const [playerBp, setPlayerBp] = useState(1);
  const [boosting, setBoosting] = useState(0);
  const [message, setMessage] = useState(`A wild ${wildCreature.name} appeared!`);
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowActions(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleBoost = () => {
    if (playerBp > 0 && boosting < 3) {
      setPlayerBp(prev => prev - 1);
      setBoosting(prev => prev + 1);
    }
  };

  const handleAttack = () => {
    setShowActions(false);
    
    // Simple type advantage logic (Player is currently assumed 'Water' for demo)
    const playerType = 'Water';
    let multiplier = 1 + (boosting * 0.5); // Boost increases damage multiplier
    let effectMsg = '';
    let shieldDamage = 1 + boosting; // Boost increases shield damage

    if (playerType === 'Water' && wildCreature.type === 'Fire') {
      multiplier *= 2;
      effectMsg = " It's super effective!";
    } else if (playerType === 'Water' && wildCreature.type === 'Grass') {
      multiplier *= 0.5;
      effectMsg = " It's not very effective...";
    }

    if (isBroken) {
      multiplier *= 2; // Double damage when broken
      effectMsg = " CRITICAL HIT!";
    }

    setMessage(`You attacked ${wildCreature.name}!${boosting > 0 ? ` (Boost x${boosting})` : ''}${effectMsg}`);
    
    setTimeout(() => {
      let newShield = wildShield;
      let newlyBroken = false;
      
      if (!isBroken && shieldDamage > 0) {
        newShield = Math.max(0, wildShield - shieldDamage);
        setWildShield(newShield);
        if (newShield === 0) {
          newlyBroken = true;
          setIsBroken(true);
          setMessage(`${wildCreature.name} is BROKEN!`);
        }
      }

      setTimeout(() => {
        const baseDamage = Math.floor(Math.random() * 8) + 4;
        const damage = Math.floor(baseDamage * multiplier);
        const newHp = Math.max(0, wildHp - damage);
        setWildHp(newHp);
        
        if (newHp === 0) {
          setMessage(`${wildCreature.name} fainted! You won!`);
          setTimeout(onFlee, 2000);
        } else if (newlyBroken) {
          // Broken enemies lose their turn
          setTimeout(() => {
            setIsBroken(false);
            setWildShield(wildCreature.shield || 3);
            setPlayerBp(prev => Math.min(5, prev + 1)); // Gain BP on new turn
            setBoosting(0);
            setMessage(`${wildCreature.name} recovered from break!`);
            setTimeout(() => setShowActions(true), 1500);
          }, 1500);
        } else {
          setMessage(`${wildCreature.name} attacked back!`);
          setTimeout(() => {
            setPlayerHp(prev => Math.max(0, prev - (Math.floor(Math.random() * 5) + 2)));
            setPlayerBp(prev => Math.min(5, prev + 1)); // Gain BP on new turn
            setBoosting(0);
            setShowActions(true);
          }, 1500);
        }
      }, newlyBroken ? 1500 : 0);
    }, 1500);
  };

  const [showCatchEffect, setShowCatchEffect] = useState(false);

  const handleCatch = () => {
    if (aetherOrbs <= 0) {
      setMessage(`Out of Aether Orbs! Find more roses to craft.`);
      return;
    }

    onUseAetherOrb();
    setShowActions(false);
    setMessage(`You threw an Aether Orb!`);

    setTimeout(() => {
      const catchRate = 1 - (wildHp / wildCreature.maxHp);
      if (Math.random() < catchRate + 0.2) {
        setMessage(`Gotcha! ${wildCreature.name} was caught!`);
        setShowCatchEffect(true);
        setTimeout(() => {
          setShowCatchEffect(false);
          onCatch();
        }, 1800);
      } else {
        setMessage(`Oh no! The creature broke free!`);
        setTimeout(() => setShowActions(true), 1500);
      }
    }, 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex flex-col bg-slate-950 text-white font-serif overflow-hidden"
    >
      {/* Background Parallax / Styling */}
      <div className="absolute inset-0 opacity-40 bg-[url('https://picsum.photos/seed/fantasy-forest/1920/1080?blur=2')] bg-cover bg-center" />
      
      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none" />

      {/* Top HUD - Wild Creature */}
      <div className="relative p-8 flex justify-end">
        <motion.div 
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.5, type: 'spring' }}
          className="bg-slate-900/80 p-5 rounded-sm border-t-2 border-b-2 border-slate-500 w-72 shadow-2xl backdrop-blur-md"
        >
          <div className="flex justify-between items-end mb-2">
            <h2 className="text-2xl font-bold tracking-wider">{wildCreature.name}</h2>
            <div className="flex flex-col items-end">
              <span className="text-xs text-slate-400 font-mono mb-1 px-2 py-0.5 rounded border border-slate-600 bg-slate-800">{wildCreature.type}</span>
              <span className="text-sm text-slate-400 font-mono">Lv {wildCreature.level}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex gap-1">
              {Array.from({ length: wildCreature.shield || 3 }).map((_, i) => (
                <div key={i} className={`w-4 h-4 rounded-sm border ${i < wildShield ? 'bg-blue-500 border-blue-300' : 'bg-slate-700 border-slate-600'}`} />
              ))}
            </div>
            {isBroken && <span className="text-rose-400 font-bold text-sm animate-pulse">BROKEN!</span>}
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-none overflow-hidden border border-slate-950">
            <motion.div 
              className="h-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" 
              initial={{ width: '100%' }}
              animate={{ width: `${(wildHp / wildCreature.maxHp) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </motion.div>
      </div>

      {/* Center - Sprites */}
      <div className="flex-1 relative flex items-center justify-center">
        {/* Wild Sprite */}
        <motion.div 
          animate={{ y: [0, -15, 0] }} 
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          className="absolute top-1/4 right-1/4 w-48 h-48 rounded-full blur-3xl opacity-40"
          style={{ backgroundColor: wildCreature.color }}
        />
        <motion.div 
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1, y: [0, -15, 0] }} 
          transition={{ x: { delay: 0.2, type: 'spring' }, y: { repeat: Infinity, duration: 3, ease: "easeInOut" } }}
          className="absolute top-1/4 right-1/4 w-48 h-48 flex items-center justify-center"
        >
          <div className="w-32 h-32 shadow-[0_20px_50px_rgba(0,0,0,0.5)]" style={{ backgroundColor: wildCreature.color, border: '2px solid rgba(255,255,255,0.8)', transform: 'rotate(5deg)' }} />
        </motion.div>

        {/* Player Sprite */}
        <motion.div 
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="absolute bottom-1/4 left-1/4 w-48 h-48 flex items-end justify-center"
        >
          <div className="w-24 h-32 bg-blue-600 border-2 border-white/80 shadow-[0_20px_50px_rgba(0,0,0,0.5)]" style={{ transform: 'rotate(-5deg)' }} />
        </motion.div>
      </div>

      {/* Bottom HUD - Player & Actions */}
      <div className="relative p-8 flex justify-between items-end">
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, type: 'spring' }}
          className="bg-slate-900/80 p-5 rounded-sm border-t-2 border-b-2 border-slate-500 w-72 shadow-2xl backdrop-blur-md"
        >
          <div className="flex justify-between items-end mb-2">
            <h2 className="text-2xl font-bold tracking-wider">Traveler</h2>
            <span className="text-sm text-slate-400 font-mono">Lv 5</span>
          </div>
          <div className="flex items-center gap-1 mb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`w-3 h-3 rounded-full border ${i < playerBp ? 'bg-amber-400 border-amber-200 shadow-[0_0_5px_rgba(251,191,36,0.8)]' : 'bg-slate-700 border-slate-600'}`} />
            ))}
            {boosting > 0 && <span className="ml-2 text-amber-400 font-bold text-xs animate-pulse">BOOST x{boosting}</span>}
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-none overflow-hidden border border-slate-950">
            <motion.div 
              className="h-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" 
              animate={{ width: `${(playerHp / 100) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div className="text-right text-sm mt-2 text-slate-300 font-mono">{playerHp} / 100</div>
        </motion.div>

        {/* Dialog / Action Menu */}
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, type: 'spring' }}
          className="bg-slate-900/90 p-6 rounded-sm border-2 border-slate-400 w-1/2 min-h-[140px] shadow-2xl backdrop-blur-md flex flex-col justify-center"
        >
          {!showActions ? (
            <p className="text-xl tracking-wide leading-relaxed">{message}</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 font-mono text-lg">
              <button onClick={handleAttack} className="bg-slate-800 hover:bg-rose-900/80 p-3 text-left font-bold tracking-widest transition-all border border-slate-600 hover:border-rose-400 hover:pl-6">
                ATTACK
              </button>
              <button onClick={handleBoost} disabled={playerBp === 0 || boosting >= 3} className={`bg-slate-800 p-3 text-left font-bold tracking-widest transition-all border border-slate-600 ${playerBp > 0 && boosting < 3 ? 'hover:bg-amber-900/80 hover:border-amber-400 hover:pl-6' : 'opacity-50 cursor-not-allowed'}`}>
                BOOST
              </button>
              <button onClick={handleCatch} disabled={aetherOrbs <= 0} className={`bg-slate-800 p-3 text-left font-bold tracking-widest transition-all border border-slate-600 ${aetherOrbs > 0 ? 'hover:bg-emerald-900/80 hover:border-emerald-400 hover:pl-6' : 'opacity-50 cursor-not-allowed'}`}>
                CATCH
                <span className="ml-1 text-xs text-slate-400">({aetherOrbs})</span>
              </button>
              <button onClick={onFlee} className="bg-slate-800 hover:bg-slate-700 p-3 text-left font-bold tracking-widest transition-all border border-slate-600 hover:pl-6">
                FLEE
              </button>
            </div>
          )}
        </motion.div>
      </div>

      {showCatchEffect && (
        <div className="absolute inset-0 z-[60] pointer-events-none flex items-center justify-center">
          <div className="w-36 h-36 rounded-full border-2 border-cyan-300/80 animate-ping" />
          <div className="w-24 h-24 rounded-full border-2 border-emerald-300/90 animate-pulse absolute" />
          <div className="w-12 h-12 rounded-full bg-white/90 absolute" />
        </div>
      )}
    </motion.div>
  );
};
