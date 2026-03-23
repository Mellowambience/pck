import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Move, buildMove, getCreatureMoves, pickAIMove, PLAYER_MOVES } from '../game/Moves';

interface Creature {
  name: string; type: string; hp: number; maxHp: number;
  color: string; level: number; shield?: number;
}

interface BattleScreenProps {
  wildCreature: Creature;
  onFlee: () => void;
  onCatch: () => void;
  aetherOrbs: number;
  onUseAetherOrb: () => void;
  playerLevel?: number;
  playerHpMax?: number;
  onXpGain?: (xp: number) => void;
}

const typeChart: Record<string, Record<string, number>> = {
  Fire:   { Grass: 2, Water: 0.5, Fire: 0.5, Sand: 1,   Wind: 1,   Shadow: 0.5, Fairy: 1   },
  Water:  { Fire: 2,  Grass: 0.5, Water: 0.5, Sand: 2,  Wind: 1,   Shadow: 1,   Fairy: 1   },
  Grass:  { Water: 2, Fire: 0.5,  Grass: 0.5, Sand: 0.5, Wind: 2,  Shadow: 1,   Fairy: 1   },
  Fairy:  { Shadow: 2, Fire: 1,   Water: 1,   Grass: 1,  Sand: 1,  Wind: 1,     Fairy: 0.5 },
  Shadow: { Fairy: 0.5, Fire: 2,  Water: 1,   Grass: 1,  Sand: 1,  Wind: 0.5,   Shadow: 0  },
  Sand:   { Wind: 2,  Fire: 1,    Water: 0.5, Grass: 0.5, Sand: 0.5, Shadow: 1, Fairy: 1   },
  Wind:   { Sand: 0.5, Fire: 1,   Water: 1,   Grass: 0.5, Fairy: 1, Shadow: 2,  Wind: 0.5  },
};

function getTypeMult(atk: string, def: string) { return typeChart[atk]?.[def] ?? 1; }
function effMsg(mult: number) {
  if (mult >= 2) return 'Super effective!';
  if (mult > 0 && mult < 1) return 'Not very effective...';
  if (mult === 0) return 'No effect!';
  return '';
}

const TYPE_COLORS: Record<string, string> = {
  Fire: '#f97316', Water: '#3b82f6', Grass: '#22c55e', Fairy: '#c084fc',
  Shadow: '#7c3aed', Sand: '#d97706', Wind: '#a3e635',
};

const STATUS_COLORS: Record<string, string> = {
  burn: '#f97316', freeze: '#7dd3fc', paralyze: '#facc15', confuse: '#e879f9',
};
const STATUS_ICONS: Record<string, string> = {
  burn: '🔥', freeze: '❄️', paralyze: '⚡', confuse: '💫',
};

interface StatusEffect { type: 'burn' | 'freeze' | 'paralyze' | 'confuse'; turnsLeft: number; }

function calcDamage(move: Move, atkLevel: number, defType: string, isBroken: boolean, atkBoost = 0) {
  if (move.power === 0) return { damage: 0, mult: 1 };
  const base = Math.floor(move.power * (1 + atkLevel * 0.05) * (0.85 + Math.random() * 0.3));
  const mult = getTypeMult(move.type, defType);
  const boost = 1 + atkBoost * 0.3;
  return { damage: Math.max(1, Math.floor(base * mult * (isBroken ? 2 : 1) * boost)), mult };
}

const hpColor = (p: number) => p > 50 ? '#34d399' : p > 25 ? '#fbbf24' : '#f87171';

const CREATURE_EMOJI: Record<string, string> = {
  Fire: '🦊', Water: '🐾', Grass: '🐛', Fairy: '✨', Shadow: '👻', Sand: '🦂', Wind: '🦋',
};

export const BattleScreen: React.FC<BattleScreenProps> = ({
  wildCreature, onFlee, onCatch, aetherOrbs, onUseAetherOrb,
  playerLevel = 1, playerHpMax = 100, onXpGain,
}) => {
  const [playerHp, setPlayerHp] = useState(playerHpMax);
  const [wildHp, setWildHp] = useState(wildCreature.hp);
  const maxShield = wildCreature.shield ?? 3;
  const [wildShield, setWildShield] = useState(maxShield);
  const [isBroken, setIsBroken] = useState(false);
  const [playerBp, setPlayerBp] = useState(2);
  const [atkBoost, setAtkBoost] = useState(0);
  const [playerStatus, setPlayerStatus] = useState<StatusEffect | null>(null);
  const [wildStatus, setWildStatus] = useState<StatusEffect | null>(null);
  const [playerMoves] = useState<Move[]>(() => PLAYER_MOVES.map(buildMove));
  const [wildMoves, setWildMoves] = useState<Move[]>(() => getCreatureMoves(wildCreature.name));
  const [phase, setPhase] = useState<'intro' | 'choose' | 'animate' | 'enemy' | 'catch' | 'end'>('intro');
  const [message, setMessage] = useState(`A wild ${wildCreature.name} appeared!`);
  const [subMessage, setSubMessage] = useState('');
  const [shakeWild, setShakeWild] = useState(false);
  const [shakePlayer, setShakePlayer] = useState(false);
  const [flashWild, setFlashWild] = useState(false);
  const [flashPlayer, setFlashPlayer] = useState(false);
  const [showMoves, setShowMoves] = useState(false);

  const typeColor = TYPE_COLORS[wildCreature.type] || '#94a3b8';
  const hpPct = (wildHp / wildCreature.maxHp) * 100;
  const playerHpPct = (playerHp / playerHpMax) * 100;

  useEffect(() => {
    const t = setTimeout(() => { setPhase('choose'); setShowMoves(true); }, 1600);
    return () => clearTimeout(t);
  }, []);

  const addMsg = (msg: string, sub = '') => { setMessage(msg); setSubMessage(sub); };
  const delay = (ms: number) => new Promise<void>(res => setTimeout(res, ms));
  const shake = (who: 'wild' | 'player') => {
    if (who === 'wild') { setShakeWild(true); setFlashWild(true); setTimeout(() => { setShakeWild(false); setFlashWild(false); }, 400); }
    else { setShakePlayer(true); setFlashPlayer(true); setTimeout(() => { setShakePlayer(false); setFlashPlayer(false); }, 400); }
  };

  const nextPlayerTurn = useCallback(() => {
    setPlayerBp(p => Math.min(5, p + 1));
    setPhase('choose'); setShowMoves(true);
  }, []);

  const enemyTurn = useCallback(async () => {
    setPhase('enemy'); setShowMoves(false);
    await delay(400);

    if (wildStatus?.type === 'confuse' && Math.random() < 0.33) {
      addMsg(`${wildCreature.name} is confused and hurt itself!`);
      setWildHp(p => Math.max(0, p - Math.floor(Math.random() * 6 + 3)));
      shake('wild');
      await delay(1400);
    }
    if (wildStatus?.type === 'paralyze' && Math.random() < 0.25) {
      addMsg(`${wildCreature.name} is paralyzed!`);
      await delay(1200); nextPlayerTurn(); return;
    }
    if (wildStatus?.type === 'freeze') {
      addMsg(`${wildCreature.name} is frozen!`);
      setWildStatus(p => p ? { ...p, turnsLeft: p.turnsLeft - 1 } : null);
      await delay(1200); nextPlayerTurn(); return;
    }

    const move = pickAIMove(wildMoves);
    setWildMoves(prev => prev.map(m => m.name === move.name ? { ...m, ppLeft: Math.max(0, m.ppLeft - 1) } : m));

    if (move.power === 0) {
      if (move.effect === 'heal') {
        const healed = Math.floor(wildCreature.maxHp * 0.25);
        setWildHp(p => Math.min(wildCreature.maxHp, p + healed));
        addMsg(`${wildCreature.name} used ${move.name}!`, `+${healed} HP`);
      } else {
        addMsg(`${wildCreature.name} used ${move.name}!`);
        if (move.effect && move.effectChance && Math.random() < move.effectChance && !playerStatus) {
          const statusable = ['burn', 'freeze', 'paralyze', 'confuse'];
          if (statusable.includes(move.effect)) {
            setPlayerStatus({ type: move.effect as any, turnsLeft: 3 });
            addMsg(`${wildCreature.name} used ${move.name}!`, `${STATUS_ICONS[move.effect]} You are ${move.effect}ed!`);
          }
        }
      }
      await delay(1400);
    } else {
      const { damage, mult } = calcDamage(move, wildCreature.level, 'Fairy', false);
      addMsg(`${wildCreature.name} used ${move.name}!`, effMsg(mult));
      shake('player');
      await delay(800);
      if (mult > 0) {
        setPlayerHp(p => {
          const next = Math.max(0, p - damage);
          if (next === 0) setTimeout(() => { addMsg('You fainted...'); setPhase('end'); setTimeout(onFlee, 2000); }, 400);
          return next;
        });
        if (move.effect && move.effectChance && Math.random() < move.effectChance && !playerStatus) {
          const statusable = ['burn', 'freeze', 'paralyze', 'confuse'];
          if (move.effect && statusable.includes(move.effect)) {
            setPlayerStatus({ type: move.effect as any, turnsLeft: 3 });
          }
        }
      }
      await delay(1200);
    }

    if (wildStatus?.type === 'burn') {
      const dot = Math.floor(wildCreature.maxHp * 0.06);
      setWildHp(p => Math.max(0, p - dot));
      shake('wild'); addMsg(`${wildCreature.name} is hurt by burn!`);
      await delay(900);
    }
    setWildStatus(p => p ? { ...p, turnsLeft: p.turnsLeft - 1 } : null);
    nextPlayerTurn();
  }, [wildMoves, wildStatus, playerStatus, wildCreature, onFlee, nextPlayerTurn]);

  const handleMove = useCallback(async (move: Move) => {
    if (phase !== 'choose' || move.ppLeft <= 0) return;
    setPhase('animate'); setShowMoves(false);
    move.ppLeft = Math.max(0, move.ppLeft - 1);

    if (playerStatus?.type === 'confuse' && Math.random() < 0.33) {
      addMsg('You are confused and hurt yourself!');
      setPlayerHp(p => Math.max(0, p - Math.floor(Math.random() * 8 + 3)));
      shake('player');
      setPlayerStatus(p => p ? (p.turnsLeft <= 1 ? null : { ...p, turnsLeft: p.turnsLeft - 1 }) : null);
      await delay(1400); enemyTurn(); return;
    }
    if (playerStatus?.type === 'paralyze' && Math.random() < 0.25) {
      addMsg("You're paralyzed and can't move!");
      setPlayerStatus(p => p ? (p.turnsLeft <= 1 ? null : { ...p, turnsLeft: p.turnsLeft - 1 }) : null);
      await delay(1200); enemyTurn(); return;
    }

    addMsg(`You used ${move.name}!`);

    if (move.power === 0) {
      if (move.effect === 'heal') {
        const healed = Math.floor(playerHpMax * 0.25);
        setPlayerHp(p => Math.min(playerHpMax, p + healed));
        addMsg(`You used ${move.name}!`, `+${healed} HP`);
      } else if (move.effect === 'raise_atk') {
        setAtkBoost(p => Math.min(3, p + 1));
        addMsg(`You used ${move.name}!`, 'Attack rose!');
      } else if (move.effect === 'shield_break') {
        const ns = Math.max(0, wildShield - 1);
        setWildShield(ns);
        if (ns === 0 && !isBroken) { setIsBroken(true); addMsg(`You used ${move.name}!`, `${wildCreature.name} is BROKEN!`); }
        else addMsg(`You used ${move.name}!`, 'Shield cracked!');
      } else {
        if (move.effect && move.effectChance && Math.random() < move.effectChance && !wildStatus) {
          const statusable = ['burn','freeze','paralyze','confuse'];
          if (statusable.includes(move.effect)) {
            setWildStatus({ type: move.effect as any, turnsLeft: 3 });
            addMsg(`You used ${move.name}!`, `${STATUS_ICONS[move.effect]} ${wildCreature.name} is ${move.effect}ed!`);
          }
        }
      }
      await delay(1400);
    } else {
      const { damage, mult } = calcDamage(move, playerLevel, wildCreature.type, isBroken, atkBoost);
      addMsg(`You used ${move.name}!`, effMsg(mult));
      shake('wild');
      await delay(700);

      if (mult === 0) { addMsg(`You used ${move.name}!`, `Immune!`); await delay(1200); enemyTurn(); return; }

      if (!isBroken) {
        const newShield = Math.max(0, wildShield - Math.ceil(damage / 10));
        setWildShield(newShield);
        if (newShield === 0) { setIsBroken(true); addMsg(`You used ${move.name}!`, `${wildCreature.name} is BROKEN! ${effMsg(mult)}`); await delay(600); }
      }

      if (move.effect && move.effectChance && Math.random() < move.effectChance && !wildStatus) {
        const statusable = ['burn','freeze','paralyze','confuse'];
        if (statusable.includes(move.effect)) {
          setWildStatus({ type: move.effect as any, turnsLeft: 3 });
          addMsg(`You used ${move.name}!`, `${effMsg(mult)} ${STATUS_ICONS[move.effect]} ${wildCreature.name} is ${move.effect}ed!`);
        }
      }

      const newHp = Math.max(0, wildHp - damage);
      setWildHp(newHp);
      await delay(600);

      if (newHp === 0) {
        const xp = Math.floor(wildCreature.level * 20 + Math.random() * 10);
        addMsg(`${wildCreature.name} fainted!`, `+${xp} XP`);
        onXpGain?.(xp);
        setPhase('end');
        await delay(2200); onFlee(); return;
      }
    }

    if (playerStatus?.type === 'burn') {
      const dot = Math.floor(playerHpMax * 0.06);
      setPlayerHp(p => Math.max(0, p - dot));
      shake('player'); addMsg('You are hurt by burn!');
      await delay(900);
    }
    setPlayerStatus(p => p ? (p.turnsLeft <= 1 ? null : { ...p, turnsLeft: p.turnsLeft - 1 }) : null);

    if (isBroken) {
      setIsBroken(false); setWildShield(maxShield);
      addMsg(`${wildCreature.name} recovered!`);
      await delay(1200); nextPlayerTurn(); return;
    }
    enemyTurn();
  }, [phase, playerMoves, playerStatus, wildStatus, wildShield, wildHp, isBroken, atkBoost, playerLevel, wildCreature, playerHpMax, maxShield, onXpGain, onFlee, enemyTurn, nextPlayerTurn]);

  const handleCatch = async () => {
    if (aetherOrbs <= 0) { addMsg('Out of Aether Orbs!'); return; }
    setPhase('catch'); setShowMoves(false);
    onUseAetherOrb();
    addMsg('You threw an Aether Orb!');
    await delay(2000);
    const hpRatio = wildHp / wildCreature.maxHp;
    const catchRate = 0.2 + (1 - hpRatio) * 0.5 + (isBroken ? 0.2 : 0) + (wildStatus ? 0.15 : 0);
    if (Math.random() < catchRate) {
      addMsg(`Gotcha! ${wildCreature.name} was caught!`);
      await delay(1800); onCatch();
    } else {
      addMsg(`${wildCreature.name} broke free!`);
      await delay(800); enemyTurn();
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex flex-col bg-slate-950 text-white font-serif overflow-hidden">
      <div className="absolute inset-0 opacity-25 bg-[url('https://picsum.photos/seed/battle-dark/1920/1080?blur=3')] bg-cover" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(30,10,60,0.7)_0%,rgba(0,0,0,0.95)_100%)]" />

      {/* Wild HUD */}
      <div className="relative p-5 flex justify-end">
        <motion.div initial={{ x: 120, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3, type: 'spring', stiffness: 120 }}
          className="bg-slate-900/85 p-4 rounded border-t-2 border-b-2 w-72 shadow-2xl backdrop-blur-md"
          style={{ borderColor: typeColor + '80' }}>
          <div className="flex justify-between items-start mb-2">
            <div>
              <h2 className="text-xl font-bold tracking-wider">{wildCreature.name}</h2>
              {wildStatus && (
                <span className="text-xs px-2 py-0.5 rounded-full font-mono mt-1 inline-block"
                  style={{ backgroundColor: STATUS_COLORS[wildStatus.type] + '30', color: STATUS_COLORS[wildStatus.type], border: `1px solid ${STATUS_COLORS[wildStatus.type]}60` }}>
                  {STATUS_ICONS[wildStatus.type]} {wildStatus.type} ({wildStatus.turnsLeft})
                </span>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs font-mono px-2 py-0.5 rounded border" style={{ color: typeColor, borderColor: typeColor + '50', backgroundColor: typeColor + '15' }}>{wildCreature.type}</span>
              <span className="text-xs text-slate-400 font-mono">Lv {wildCreature.level}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex gap-1">
              {Array.from({ length: maxShield }).map((_, i) => (
                <motion.div key={i} animate={{ scale: i < wildShield ? 1 : 0.7 }}
                  className={`w-4 h-4 rounded-sm border transition-all ${i < wildShield ? 'bg-blue-500 border-blue-300 shadow-[0_0_5px_#3b82f6]' : 'bg-slate-800 border-slate-600 opacity-30'}`} />
              ))}
            </div>
            {isBroken && <span className="text-rose-400 font-bold text-xs animate-pulse">BROKEN!</span>}
          </div>
          <div className="flex justify-between text-xs text-slate-400 font-mono mb-1"><span>HP</span><span>{wildHp}/{wildCreature.maxHp}</span></div>
          <div className="w-full bg-slate-800 h-2 overflow-hidden border border-slate-700 rounded-sm">
            <motion.div className="h-full" style={{ backgroundColor: hpColor(hpPct) }} animate={{ width: `${hpPct}%` }} transition={{ duration: 0.5 }} />
          </div>
        </motion.div>
      </div>

      {/* Arena */}
      <div className="flex-1 relative flex items-center justify-between px-16">
        <div className="absolute right-1/4 top-0 flex flex-col items-center">
          <motion.div animate={{ y: [0, -14, 0], scale: shakeWild ? [1, 1.1, 0.9, 1] : 1 }}
            transition={{ y: { repeat: Infinity, duration: 3, ease: 'easeInOut' }, scale: { duration: 0.3 } }}>
            <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center text-5xl ${flashWild ? 'opacity-30' : 'opacity-100'} transition-opacity`}
              style={{ borderColor: typeColor, boxShadow: `0 0 40px ${typeColor}50`, backgroundColor: typeColor + '18' }}>
              {CREATURE_EMOJI[wildCreature.type] || '🌟'}
            </div>
          </motion.div>
        </div>
        <div className="absolute left-1/4 bottom-4">
          <motion.div animate={{ scale: shakePlayer ? [1, 1.1, 0.9, 1] : 1 }} transition={{ duration: 0.3 }}>
            <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center text-4xl ${flashPlayer ? 'opacity-30' : 'opacity-100'} transition-opacity`}
              style={{ borderColor: '#c084fc', boxShadow: '0 0 30px rgba(192,132,252,0.4)', backgroundColor: 'rgba(192,132,252,0.1)' }}>
              🧙‍♀️
            </div>
          </motion.div>
        </div>
        <div className="absolute top-2 left-1/2 -translate-x-1/2">
          {(() => { const m = getTypeMult('Fairy', wildCreature.type); if (m >= 2) return <span className="text-xs text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-700">⚡ Type advantage!</span>; if (m < 1) return <span className="text-xs text-rose-400 bg-rose-950/80 px-3 py-1 rounded-full border border-rose-800">⚠ Type disadvantage</span>; return null; })()}
        </div>
      </div>

      {/* Player HUD */}
      <div className="relative p-4">
        <motion.div initial={{ x: -120, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5, type: 'spring', stiffness: 120 }}
          className="bg-slate-900/85 p-4 rounded border-t-2 border-b-2 w-72 shadow-2xl backdrop-blur-md mb-3" style={{ borderColor: 'rgba(192,132,252,0.7)' }}>
          <div className="flex justify-between items-center mb-2">
            <div>
              <h2 className="text-lg font-bold tracking-wider">Amara</h2>
              {playerStatus && (
                <span className="text-xs px-2 py-0.5 rounded-full font-mono mt-1 inline-block"
                  style={{ backgroundColor: STATUS_COLORS[playerStatus.type] + '30', color: STATUS_COLORS[playerStatus.type], border: `1px solid ${STATUS_COLORS[playerStatus.type]}60` }}>
                  {STATUS_ICONS[playerStatus.type]} {playerStatus.type} ({playerStatus.turnsLeft})
                </span>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-xs font-mono px-2 py-0.5 rounded border" style={{ color: '#c084fc', borderColor: 'rgba(192,132,252,0.5)', backgroundColor: 'rgba(192,132,252,0.15)' }}>Fairy</span>
              <span className="text-xs text-slate-400 font-mono">Lv {playerLevel}</span>
            </div>
          </div>
          <div className="flex justify-between text-xs text-slate-400 font-mono mb-1"><span>HP</span><span>{playerHp}/{playerHpMax}</span></div>
          <div className="w-full bg-slate-800 h-2 overflow-hidden border border-slate-700 rounded-sm mb-3">
            <motion.div className="h-full" style={{ backgroundColor: hpColor(playerHpPct) }} animate={{ width: `${playerHpPct}%` }} transition={{ duration: 0.4 }} />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-amber-400 font-mono">BP</span>
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={`w-5 h-3 rounded-sm border transition-all ${i < playerBp ? 'bg-amber-400 border-amber-300' : 'bg-slate-800 border-slate-600 opacity-25'}`} />
              ))}
            </div>
          </div>
          {atkBoost > 0 && <div className="flex gap-1 items-center mt-1"><span className="text-xs text-rose-300 font-mono">ATK</span>{Array.from({ length: atkBoost }).map((_, i) => <span key={i} className="text-rose-400 text-xs">▲</span>)}</div>}
        </motion.div>

        <div className="bg-slate-950/90 border border-slate-700 p-3 rounded-sm mb-3 min-h-[52px]">
          <AnimatePresence mode="wait">
            <motion.div key={message + subMessage} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <p className="text-sm font-serif tracking-wide text-slate-100">{message}</p>
              {subMessage && <p className="text-xs text-slate-400 mt-0.5 font-mono">{subMessage}</p>}
            </motion.div>
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {showMoves && phase === 'choose' && (
            <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }} className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {playerMoves.map(move => {
                  const mc = TYPE_COLORS[move.type] || '#94a3b8';
                  return (
                    <button key={move.name} onClick={() => handleMove(move)} disabled={move.ppLeft <= 0}
                      className="relative text-left p-2.5 rounded border transition-all group overflow-hidden disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{ borderColor: mc + '50', backgroundColor: mc + '10' }}>
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-white tracking-wide">{move.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ color: mc, backgroundColor: mc + '25' }}>{move.type}</span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-[10px] text-slate-400 font-mono">{move.power > 0 ? `PWR ${move.power}` : 'STATUS'}{move.effect ? ` · ${STATUS_ICONS[move.effect] || ''}${move.effect}` : ''}</span>
                        <span className="text-[10px] font-mono" style={{ color: move.ppLeft <= 1 ? '#f87171' : '#94a3b8' }}>{move.ppLeft}/{move.pp} PP</span>
                      </div>
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 rounded" style={{ boxShadow: `inset 0 0 20px ${mc}30` }} />
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => { if (playerBp > 0 && atkBoost < 3) { setPlayerBp(p => p - 1); setAtkBoost(p => p + 1); addMsg('Aether charged!', `Attack ×${atkBoost + 1}`); } }} disabled={playerBp <= 0 || atkBoost >= 3}
                  className="bg-amber-800/60 hover:bg-amber-700/80 border border-amber-600/50 text-amber-200 text-xs font-bold py-2 rounded disabled:opacity-25">
                  ⚡ Boost ({playerBp})
                </button>
                <button onClick={handleCatch} disabled={aetherOrbs <= 0}
                  className="bg-violet-800/60 hover:bg-violet-700/80 border border-violet-600/50 text-violet-200 text-xs font-bold py-2 rounded disabled:opacity-25">
                  🔮 Catch ({aetherOrbs})
                </button>
                <button onClick={onFlee} className="bg-slate-800/60 hover:bg-slate-700/80 border border-slate-600/50 text-slate-300 text-xs font-bold py-2 rounded">
                  🏃 Flee
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
