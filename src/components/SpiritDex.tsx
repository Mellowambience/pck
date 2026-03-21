import React from 'react';

export interface SpiritEntry {
  name: string;
  type: string;
  level: number;
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
          <div key={`${spirit.name}-${idx}`} className="border border-white/10 rounded-lg p-2 bg-white/5">
            <div className="flex justify-between items-center text-xs text-white font-semibold">
              <span>{spirit.name}</span>
              <span>Lv {spirit.level}</span>
            </div>
            <p className="text-[10px] text-neutral-300">{spirit.type} spirit</p>
          </div>
        ))}
      </div>
    </div>
  );
};
