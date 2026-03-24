// ============================================================
// Aetherhaven — Evolution System
// ============================================================

export type EvolutionTrigger =
  | { type: 'level'; level: number }
  | { type: 'item'; item: string }
  | { type: 'bond'; threshold: number }
  | { type: 'biome'; biome: string; level: number };

export interface EvolutionChain {
  from: string;
  to: string;
  trigger: EvolutionTrigger;
  newMoves: string[];          // moves gained on evolution
  description: string;         // flavour text shown in evo sequence
  statBoost: {                 // multiplied on base stats
    hp: number;
    attack: number;
    speed: number;
  };
}

export interface EvolutionStage {
  name: string;
  type: string;
  stage: number;           // 0 = base, 1 = first evo, 2 = final
  baseHp: number;
  baseAtk: number;
}

// ── Stage data ───────────────────────────────────────────────
export const EVOLUTION_STAGES: Record<string, EvolutionStage> = {
  // Fire line
  Emberfox:     { name: 'Emberfox',     type: 'Fire',   stage: 0, baseHp: 30, baseAtk: 8  },
  Flamehound:   { name: 'Flamehound',   type: 'Fire',   stage: 1, baseHp: 50, baseAtk: 14 },
  Infernowolf:  { name: 'Infernowolf',  type: 'Fire',   stage: 2, baseHp: 80, baseAtk: 22 },

  // Water line
  Aquapup:      { name: 'Aquapup',      type: 'Water',  stage: 0, baseHp: 32, baseAtk: 7  },
  Tidehound:    { name: 'Tidehound',    type: 'Water',  stage: 1, baseHp: 52, baseAtk: 13 },
  Abyssalwolf:  { name: 'Abyssalwolf',  type: 'Water',  stage: 2, baseHp: 82, baseAtk: 20 },

  // Grass line
  Leafbug:      { name: 'Leafbug',      type: 'Grass',  stage: 0, baseHp: 28, baseAtk: 6  },
  Mosswing:     { name: 'Mosswing',     type: 'Grass',  stage: 1, baseHp: 46, baseAtk: 11 },
  Verdantdrake: { name: 'Verdantdrake', type: 'Grass',  stage: 2, baseHp: 76, baseAtk: 19 },

  // Fairy line
  'Aether-Kin': { name: 'Aether-Kin',   type: 'Fairy',  stage: 0, baseHp: 26, baseAtk: 9  },
  Glimmerkin:   { name: 'Glimmerkin',   type: 'Fairy',  stage: 1, baseHp: 44, baseAtk: 15 },
  Celestiant:   { name: 'Celestiant',   type: 'Fairy',  stage: 2, baseHp: 72, baseAtk: 24 },

  // Shadow line
  RoadWraith:   { name: 'RoadWraith',   type: 'Shadow', stage: 0, baseHp: 24, baseAtk: 11 },
  Voidshade:    { name: 'Voidshade',    type: 'Shadow', stage: 1, baseHp: 42, baseAtk: 18 },
  Nullreaper:   { name: 'Nullreaper',   type: 'Shadow', stage: 2, baseHp: 70, baseAtk: 28 },

  // Sand line
  Dunecrawler:  { name: 'Dunecrawler',  type: 'Sand',   stage: 0, baseHp: 34, baseAtk: 8  },
  Sandwarden:   { name: 'Sandwarden',   type: 'Sand',   stage: 1, baseHp: 56, baseAtk: 14 },
  Dunecolossal: { name: 'Dunecolossal', type: 'Sand',   stage: 2, baseHp: 90, baseAtk: 22 },

  // Wind line
  Sandsprite:   { name: 'Sandsprite',   type: 'Wind',   stage: 0, baseHp: 22, baseAtk: 10 },
  Stormwing:    { name: 'Stormwing',    type: 'Wind',   stage: 1, baseHp: 40, baseAtk: 17 },
  Tempestlord:  { name: 'Tempestlord',  type: 'Wind',   stage: 2, baseHp: 68, baseAtk: 26 },

  // Wild specials (no evolutions)
  Glimmerfly:   { name: 'Glimmerfly',   type: 'Fairy',  stage: 1, baseHp: 38, baseAtk: 12 },
  Mosshound:    { name: 'Mosshound',    type: 'Grass',  stage: 1, baseHp: 40, baseAtk: 11 },
};

// ── Evolution chains ─────────────────────────────────────────
export const EVOLUTION_CHAINS: EvolutionChain[] = [
  // Fire
  {
    from: 'Emberfox', to: 'Flamehound',
    trigger: { type: 'level', level: 16 },
    newMoves: ['FlameCharge', 'ScorchAura'],
    statBoost: { hp: 1.65, attack: 1.75, speed: 1.4 },
    description: 'Emberfox channels its inner blaze — its body erupts and reforms as a powerful Flamehound!',
  },
  {
    from: 'Flamehound', to: 'Infernowolf',
    trigger: { type: 'bond', threshold: 80 },
    newMoves: ['Inferno'],
    statBoost: { hp: 1.6, attack: 1.6, speed: 1.3 },
    description: 'Bound by deep trust, Flamehound unleashes its volcanic heart and ascends to Infernowolf!',
  },
  // Water
  {
    from: 'Aquapup', to: 'Tidehound',
    trigger: { type: 'level', level: 16 },
    newMoves: ['WaterPulse', 'TidalCrash'],
    statBoost: { hp: 1.6, attack: 1.85, speed: 1.35 },
    description: 'The tides call to Aquapup — it dives deep and rises as the mighty Tidehound!',
  },
  {
    from: 'Tidehound', to: 'Abyssalwolf',
    trigger: { type: 'biome', biome: 'water', level: 32 },
    newMoves: ['TidalCrash'],
    statBoost: { hp: 1.55, attack: 1.55, speed: 1.25 },
    description: 'Standing at the water\'s edge under moonlight, Tidehound dissolves into the deep and reforms!',
  },
  // Grass
  {
    from: 'Leafbug', to: 'Mosswing',
    trigger: { type: 'level', level: 14 },
    newMoves: ['LeafBlade', 'SporeDust'],
    statBoost: { hp: 1.65, attack: 1.85, speed: 1.5 },
    description: 'Leafbug wraps itself in a cocoon of vines and emerges with iridescent wings!',
  },
  {
    from: 'Mosswing', to: 'Verdantdrake',
    trigger: { type: 'item', item: 'Verdant Shard' },
    newMoves: ['NaturesBind'],
    statBoost: { hp: 1.65, attack: 1.7, speed: 1.3 },
    description: 'The Verdant Shard resonates with Mosswing\'s life force — a dragon of living green is born!',
  },
  // Fairy
  {
    from: 'Aether-Kin', to: 'Glimmerkin',
    trigger: { type: 'bond', threshold: 60 },
    newMoves: ['MoonVeil', 'StarStrike'],
    statBoost: { hp: 1.7, attack: 1.7, speed: 1.5 },
    description: 'Aether-Kin bathes in starlight, its bond with you transforming it into radiant Glimmerkin!',
  },
  {
    from: 'Glimmerkin', to: 'Celestiant',
    trigger: { type: 'level', level: 36 },
    newMoves: ['StarStrike'],
    statBoost: { hp: 1.65, attack: 1.6, speed: 1.4 },
    description: 'Glimmerkin reaches full resonance with the cosmos and ascends to the divine Celestiant!',
  },
  // Shadow
  {
    from: 'RoadWraith', to: 'Voidshade',
    trigger: { type: 'level', level: 18 },
    newMoves: ['DarkPulse', 'Nightmare'],
    statBoost: { hp: 1.75, attack: 1.55, speed: 1.6 },
    description: 'RoadWraith collapses into pure shadow — a deeper darkness births Voidshade!',
  },
  {
    from: 'Voidshade', to: 'Nullreaper',
    trigger: { type: 'item', item: 'Void Crystal' },
    newMoves: ['VoidSlash'],
    statBoost: { hp: 1.7, attack: 1.55, speed: 1.5 },
    description: 'The Void Crystal shatters — Voidshade absorbs the nothing inside and becomes Nullreaper!',
  },
  // Sand
  {
    from: 'Dunecrawler', to: 'Sandwarden',
    trigger: { type: 'level', level: 20 },
    newMoves: ['DuneCrush', 'GritArmor'],
    statBoost: { hp: 1.65, attack: 1.65, speed: 1.2 },
    description: 'The desert sun hardens Dunecrawler\'s shell — it stands tall as the armored Sandwarden!',
  },
  {
    from: 'Sandwarden', to: 'Dunecolossal',
    trigger: { type: 'biome', biome: 'sand', level: 36 },
    newMoves: ['DuneCrush'],
    statBoost: { hp: 1.6, attack: 1.6, speed: 1.1 },
    description: 'At the heart of a sandstorm, Sandwarden grows beyond measure — the Dunecolossal emerges!',
  },
  // Wind
  {
    from: 'Sandsprite', to: 'Stormwing',
    trigger: { type: 'level', level: 15 },
    newMoves: ['AirCutter', 'Tailwind'],
    statBoost: { hp: 1.8, attack: 1.6, speed: 1.7 },
    description: 'Sandsprite rides the highest thermal it can find — and never comes back down as itself!',
  },
  {
    from: 'Stormwing', to: 'Tempestlord',
    trigger: { type: 'bond', threshold: 90 },
    newMoves: ['Cyclone'],
    statBoost: { hp: 1.6, attack: 1.55, speed: 1.55 },
    description: 'Only the deepest bonds command the storm — Stormwing transforms into the legendary Tempestlord!',
  },
];

// ── Helpers ──────────────────────────────────────────────────

export function getEvolutionFor(name: string): EvolutionChain | null {
  return EVOLUTION_CHAINS.find(c => c.from === name) ?? null;
}

export function checkEvolution(
  name: string,
  level: number,
  bond: number,
  currentBiome: string,
  heldItem?: string
): EvolutionChain | null {
  const chain = getEvolutionFor(name);
  if (!chain) return null;
  const t = chain.trigger;
  if (t.type === 'level' && level >= t.level) return chain;
  if (t.type === 'bond' && bond >= t.threshold) return chain;
  if (t.type === 'item' && heldItem === t.item) return chain;
  if (t.type === 'biome' && currentBiome === t.biome && level >= t.level) return chain;
  return null;
}

export function applyEvolution(spirit: {
  name: string; level: number; hp: number; maxHp: number; moves: string[];
}, chain: EvolutionChain): { name: string; hp: number; maxHp: number; moves: string[] } {
  const stage = EVOLUTION_STAGES[chain.to];
  const newMaxHp = Math.round(spirit.maxHp * chain.statBoost.hp);
  const hpRatio = spirit.hp / spirit.maxHp;
  const newMoves = [...new Set([...spirit.moves, ...chain.newMoves])].slice(-4);
  return {
    name: chain.to,
    hp: Math.round(newMaxHp * hpRatio),
    maxHp: newMaxHp,
    moves: newMoves,
  };
}
