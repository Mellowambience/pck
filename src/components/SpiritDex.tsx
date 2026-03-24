import React from 'react';
import { getBattleCreatureVisual } from '../game/BattleSprites';
import { BattlePixelSprite } from './BattlePixelSprite';

export interface SpiritEntry {
  name: string;
  type: string;
  level: number;
  variantSeed?: string;
}

interface SpiritDexProps {
  spirits: SpiritEntry[];
}

export const SpiritDex: React.FC<SpiritDexProps> = ({ spirits }) => {
  return (
    <div className="bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-2xl w-72 shadow-xl pointer-events-auto max-h-[280px] overflow-y-auto">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-emerald-300" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-300">SpiritDex</h3>
      </div>
      <div className="space-y-2">
        {spirits.length === 0 ? (
          <p className="text-xs text-neutral-400">No spirits yet. Catch them in tall grass!</p>
        ) : spirits.map((spirit, idx) => (
          (() => {
            const visual = getBattleCreatureVisual(spirit.name, spirit.type, spirit.variantSeed || `${spirit.name}:${spirit.type}:${idx}`);
            return (
              <div key={`${spirit.name}-${idx}`} className="border border-white/10 rounded-lg p-2 bg-white/5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg border border-white/10 bg-black/20 flex items-center justify-center">
                      <BattlePixelSprite sprite={visual.sprite} palette={visual.palette} size={2} />
                    </div>
                    <div>
                      <div className="text-xs text-white font-semibold">{spirit.name}</div>
                      <p className="text-[10px] text-neutral-300">{spirit.type} spirit</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-300 font-mono">Lv {spirit.level}</span>
                </div>
              </div>
            );
          })()
        ))}
      </div>
    </div>
  );
};
