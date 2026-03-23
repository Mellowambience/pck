import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, Star } from 'lucide-react';

export interface StoredSpirit {
  id: string;
  name: string;
  type: string;
  level: number;
  hp: number;
  maxHp: number;
  moves: string[];
  catchDate: string;
  inParty: boolean;
}

interface SpiritBoxProps {
  spirits: StoredSpirit[];
  bonds?: Record<string, number>;
  onClose: () => void;
  onToggleParty: (id: string) => void;
  onRelease: (id: string) => void;
}

const TYPE_COLORS: Record<string, string> = {
  Fire: '#f97316', Water: '#3b82f6', Grass: '#22c55e', Fairy: '#c084fc',
  Shadow: '#7c3aed', Sand: '#d97706', Wind: '#a3e635',
};

const TYPE_BG: Record<string, string> = {
  Fire: 'from-orange-900/60 to-red-900/40', Water: 'from-blue-900/60 to-cyan-900/40',
  Grass: 'from-green-900/60 to-emerald-900/40', Fairy: 'from-purple-900/60 to-pink-900/40',
  Shadow: 'from-violet-900/60 to-slate-900/40', Sand: 'from-yellow-900/60 to-orange-900/40',
  Wind: 'from-lime-900/60 to-teal-900/40',
};

const CREATURE_EMOJI: Record<string, string> = {
  Emberfox: '🦊', Aquapup: '🐾', Leafbug: '🐛', 'Aether-kin': '✨', 'Aether-Kin': '✨',
  Mosshound: '🌿', Glimmerfly: '🦋', Dunecrawler: '🦂', Sandsprite: '🌪️', RoadWraith: '👻',
};

const TYPE_EMOJI: Record<string, string> = {
  Fire: '🦊', Water: '🐾', Grass: '🐛', Fairy: '✨', Shadow: '👻', Sand: '🦂', Wind: '🦋',
};

function getEmoji(name: string, type: string) {
  return CREATURE_EMOJI[name] || TYPE_EMOJI[type] || '🌟';
}

const BOX_SIZE = 20;

function StatBar({ val, max, color }: { val: number; max: number; color: string }) {
  return (
    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (val / max) * 100)}%`, backgroundColor: color }} />
    </div>
  );
}

function getMoveTypeColor(moveName: string): string {
  if (['Ember','FlameCharge','Inferno','ScorchAura'].includes(moveName)) return '#f97316';
  if (['Bubble','WaterPulse','TidalCrash','AquaHeal'].includes(moveName)) return '#3b82f6';
  if (['VineWhip','SporeDust','LeafBlade',"Nature's Bind",'NaturesBind'].includes(moveName)) return '#22c55e';
  if (['DarkPulse','ShadowSneak','Nightmare','VoidSlash'].includes(moveName)) return '#7c3aed';
  if (['AetherPulse','MoonVeil','StarStrike','FaerieDust'].includes(moveName)) return '#c084fc';
  if (['SandBlast','QuickSand','DuneCrush','GritArmor'].includes(moveName)) return '#d97706';
  if (['GustSlice','Tailwind','Cyclone','AirCutter'].includes(moveName)) return '#a3e635';
  return '#94a3b8';
}

export const SpiritBox: React.FC<SpiritBoxProps> = ({ spirits, bonds = {}, onClose, onToggleParty, onRelease }) => {
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<StoredSpirit | null>(null);
  const [confirmRelease, setConfirmRelease] = useState(false);

  const partySpirits = spirits.filter(s => s.inParty);
  const boxSpirits = spirits.filter(s => !s.inParty);
  const pageSpirits = boxSpirits.slice(page * BOX_SIZE, (page + 1) * BOX_SIZE);
  const totalPages = Math.max(1, Math.ceil(boxSpirits.length / BOX_SIZE));
  const typeColor = selected ? (TYPE_COLORS[selected.type] || '#94a3b8') : '#94a3b8';

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
        className="bg-slate-950 border border-white/10 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        style={{ fontFamily: "'Courier New', monospace" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-indigo-400 shadow-[0_0_8px_#818cf8]" />
            <h2 className="text-white font-bold tracking-widest uppercase text-sm">Spirit Box</h2>
            <span className="text-slate-500 text-xs font-mono">{spirits.length} collected</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: grid */}
          <div className="w-1/2 flex flex-col border-r border-white/10">
            {/* Party strip */}
            <div className="px-4 pt-3 pb-2 border-b border-white/5">
              <div className="text-xs text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Star className="w-3 h-3 text-amber-400" /> Party ({partySpirits.length}/6)
              </div>
              <div className="flex gap-1.5 flex-wrap min-h-[36px]">
                {partySpirits.map(s => (
                  <button key={s.id} onClick={() => setSelected(s)}
                    className={`w-8 h-8 rounded flex items-center justify-center text-base transition-all border ${selected?.id === s.id ? 'border-amber-400 bg-amber-400/15' : 'border-white/10 bg-white/5 hover:border-amber-400/50'}`}
                    title={`${s.name} Lv${s.level}`}>
                    {getEmoji(s.name, s.type)}
                  </button>
                ))}
                {partySpirits.length === 0 && <span className="text-[10px] text-slate-600 italic">No party members</span>}
              </div>
            </div>

            {/* Box grid */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1 text-slate-400 hover:text-white disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-slate-400 font-mono uppercase tracking-widest">Box {page + 1} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1 text-slate-400 hover:text-white disabled:opacity-30">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {boxSpirits.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-600 text-sm">Box is empty.</p>
                  <p className="text-slate-700 text-xs mt-1">Catch spirits in tall grass!</p>
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-1.5">
                  {Array.from({ length: BOX_SIZE }).map((_, i) => {
                    const spirit = pageSpirits[i];
                    if (!spirit) return <div key={i} className="w-10 h-10 rounded border border-white/5 bg-slate-900/30" />;
                    const tc = TYPE_COLORS[spirit.type] || '#94a3b8';
                    return (
                      <button key={spirit.id} onClick={() => setSelected(spirit)}
                        className="w-10 h-10 rounded flex items-center justify-center text-xl transition-all border relative hover:border-white/30"
                        style={selected?.id === spirit.id ? { borderColor: tc + '80', backgroundColor: tc + '18', boxShadow: `0 0 8px ${tc}40` } : { borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(15,23,42,0.5)' }}
                        title={`${spirit.name} Lv${spirit.level}`}>
                        {getEmoji(spirit.name, spirit.type)}
                        <span className="absolute bottom-0.5 right-0.5 text-[7px] text-slate-400 font-mono">{spirit.level}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: detail */}
          <div className="w-1/2 flex flex-col">
            <AnimatePresence mode="wait">
              {selected ? (
                <motion.div key={selected.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex flex-col h-full">
                  <div className={`p-5 bg-gradient-to-br ${TYPE_BG[selected.type] || 'from-slate-800/60 to-slate-900/40'} border-b border-white/5`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-4xl mb-1">{getEmoji(selected.name, selected.type)}</div>
                        <h3 className="text-white font-bold text-lg tracking-wide">{selected.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 rounded-full font-mono border"
                            style={{ color: typeColor, borderColor: typeColor + '60', backgroundColor: typeColor + '18' }}>
                            {selected.type}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">Lv {selected.level}</span>
                          {selected.inParty && <span className="text-[10px] text-amber-400 flex items-center gap-1"><Star className="w-2.5 h-2.5" />Party</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500 font-mono">#{selected.id.slice(0, 4).toUpperCase()}</div>
                        <div className="text-xs text-slate-600 font-mono mt-1">{new Date(selected.catchDate).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-slate-400 font-mono mb-1"><span>HP</span><span>{selected.hp}/{selected.maxHp}</span></div>
                      <StatBar val={selected.hp} max={selected.maxHp} color={selected.hp / selected.maxHp > 0.5 ? '#34d399' : selected.hp / selected.maxHp > 0.25 ? '#fbbf24' : '#f87171'} />
                    </div>
                  </div>

                  <div className="p-4 border-b border-white/5 flex-1">
                    <div className="text-xs text-slate-500 uppercase tracking-widest mb-2">Moves</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {selected.moves.map(m => {
                        const mc = getMoveTypeColor(m);
                        return (
                          <div key={m} className="px-2.5 py-1.5 rounded border text-xs font-mono"
                            style={{ borderColor: mc + '40', backgroundColor: mc + '10', color: mc }}>
                            {m}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-4 flex gap-2 flex-wrap">
                    <button
                      onClick={() => { onToggleParty(selected.id); setSelected(s => s ? { ...s, inParty: !s.inParty } : null); }}
                      disabled={!selected.inParty && partySpirits.length >= 6}
                      className="flex-1 text-xs font-bold py-2 rounded border transition-all disabled:opacity-30"
                      style={{ borderColor: typeColor + '60', color: selected.inParty ? '#f87171' : typeColor, backgroundColor: selected.inParty ? 'rgba(239,68,68,0.1)' : typeColor + '15' }}>
                      {selected.inParty ? '← Remove from Party' : '+ Add to Party'}
                    </button>
                    {!confirmRelease ? (
                      <button onClick={() => setConfirmRelease(true)} className="px-3 py-2 text-xs font-bold rounded border border-red-800/50 text-red-500 bg-red-950/30 hover:bg-red-900/40 transition-all">
                        Release
                      </button>
                    ) : (
                      <div className="flex gap-1.5 w-full">
                        <button onClick={() => { onRelease(selected.id); setSelected(null); setConfirmRelease(false); }} className="flex-1 text-xs font-bold py-2 rounded bg-red-800/60 border border-red-600 text-red-200 hover:bg-red-700/60">
                          Confirm Release
                        </button>
                        <button onClick={() => setConfirmRelease(false)} className="px-3 py-2 text-xs font-bold rounded border border-slate-600 text-slate-400 hover:text-white">
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full text-center p-8">
                  <div className="text-5xl mb-4 opacity-20">📦</div>
                  <p className="text-slate-600 text-sm">Select a spirit to view details</p>
                  <p className="text-slate-700 text-xs mt-2">Click any icon in the box or party</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
