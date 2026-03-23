// ============================================================
// Aetherhaven — Move Database
// ============================================================

export type MoveEffect =
  | 'burn' | 'freeze' | 'paralyze' | 'confuse'
  | 'lower_def' | 'lower_spd' | 'raise_atk' | 'heal'
  | 'recharge' | 'shield_break';

export interface Move {
  name: string;
  type: string;
  power: number;
  accuracy: number;
  pp: number;
  ppLeft: number;
  effect?: MoveEffect;
  effectChance?: number;
  description: string;
}

export const MOVE_POOL: Record<string, Omit<Move, 'ppLeft'>> = {
  // Fire
  Ember:        { name: 'Ember',         type: 'Fire',   power: 10, accuracy: 1.0,  pp: 10, effect: 'burn',       effectChance: 0.1,  description: 'A small flame. May burn.' },
  FlameCharge:  { name: 'Flame Charge',  type: 'Fire',   power: 18, accuracy: 0.9,  pp: 8,  effect: 'raise_atk',  effectChance: 0.2,  description: 'Blazing rush that raises attack.' },
  Inferno:      { name: 'Inferno',       type: 'Fire',   power: 30, accuracy: 0.7,  pp: 5,  effect: 'burn',       effectChance: 0.4,  description: 'Raging blaze. Risky but powerful.' },
  ScorchAura:   { name: 'Scorch Aura',   type: 'Fire',   power: 0,  accuracy: 1.0,  pp: 5,  effect: 'burn',       effectChance: 0.9,  description: 'Wraps foe in heat. Likely to burn.' },
  // Water
  Bubble:       { name: 'Bubble',        type: 'Water',  power: 9,  accuracy: 1.0,  pp: 12, effect: 'lower_spd',  effectChance: 0.1,  description: 'A burst of bubbles. May slow.' },
  WaterPulse:   { name: 'Water Pulse',   type: 'Water',  power: 18, accuracy: 0.95, pp: 8,  effect: 'confuse',    effectChance: 0.2,  description: 'A pulsing wave. May confuse.' },
  TidalCrash:   { name: 'Tidal Crash',   type: 'Water',  power: 28, accuracy: 0.8,  pp: 5,                                            description: 'A crushing wave attack.' },
  AquaHeal:     { name: 'Aqua Heal',     type: 'Water',  power: 0,  accuracy: 1.0,  pp: 4,  effect: 'heal',       effectChance: 1.0,  description: 'Restores HP using water energy.' },
  // Grass
  VineWhip:     { name: 'Vine Whip',     type: 'Grass',  power: 10, accuracy: 1.0,  pp: 10,                                           description: 'Strikes with sharp vines.' },
  SporeDust:    { name: 'Spore Dust',    type: 'Grass',  power: 0,  accuracy: 0.9,  pp: 6,  effect: 'paralyze',   effectChance: 0.8,  description: 'Releases paralyzing spores.' },
  LeafBlade:    { name: 'Leaf Blade',    type: 'Grass',  power: 24, accuracy: 0.9,  pp: 6,                                            description: 'A razor-sharp leaf strike.' },
  NaturesBind:  { name: "Nature's Bind", type: 'Grass',  power: 12, accuracy: 0.85, pp: 8,  effect: 'lower_def',  effectChance: 0.5,  description: 'Roots ensnare the foe.' },
  // Fairy
  AetherPulse:  { name: 'Aether Pulse',  type: 'Fairy',  power: 14, accuracy: 1.0,  pp: 10,                                           description: 'A pulse of pure aether energy.' },
  MoonVeil:     { name: 'Moon Veil',     type: 'Fairy',  power: 0,  accuracy: 1.0,  pp: 5,  effect: 'confuse',    effectChance: 0.7,  description: 'Moonlight illusions.' },
  StarStrike:   { name: 'Star Strike',   type: 'Fairy',  power: 26, accuracy: 0.85, pp: 5,  effect: 'lower_def',  effectChance: 0.3,  description: 'Calls down stardust.' },
  FaerieDust:   { name: 'Faerie Dust',   type: 'Fairy',  power: 8,  accuracy: 1.0,  pp: 12, effect: 'shield_break', effectChance: 0.3, description: 'Shimmering dust that chips shields.' },
  // Shadow
  DarkPulse:    { name: 'Dark Pulse',    type: 'Shadow', power: 16, accuracy: 0.95, pp: 8,  effect: 'confuse',    effectChance: 0.2,  description: 'A surge of dark energy.' },
  ShadowSneak:  { name: 'Shadow Sneak',  type: 'Shadow', power: 12, accuracy: 1.0,  pp: 10,                                           description: 'Always strikes first.' },
  Nightmare:    { name: 'Nightmare',     type: 'Shadow', power: 0,  accuracy: 0.9,  pp: 5,  effect: 'confuse',    effectChance: 1.0,  description: 'Plunges foe into a nightmare.' },
  VoidSlash:    { name: 'Void Slash',    type: 'Shadow', power: 30, accuracy: 0.75, pp: 4,  effect: 'lower_def',  effectChance: 0.4,  description: 'A slash from the void.' },
  // Sand
  SandBlast:    { name: 'Sand Blast',    type: 'Sand',   power: 12, accuracy: 0.9,  pp: 10, effect: 'lower_spd',  effectChance: 0.2,  description: 'Blinding sand gust.' },
  QuickSand:    { name: 'Quick Sand',    type: 'Sand',   power: 0,  accuracy: 0.85, pp: 6,  effect: 'paralyze',   effectChance: 0.8,  description: 'Shifting sands.' },
  DuneCrush:    { name: 'Dune Crush',    type: 'Sand',   power: 26, accuracy: 0.8,  pp: 5,                                            description: 'Crushing wave of sand.' },
  GritArmor:    { name: 'Grit Armor',    type: 'Sand',   power: 0,  accuracy: 1.0,  pp: 5,  effect: 'raise_atk',  effectChance: 1.0,  description: 'Coats itself in hard grit.' },
  // Wind
  GustSlice:    { name: 'Gust Slice',    type: 'Wind',   power: 12, accuracy: 1.0,  pp: 10,                                           description: 'A slicing burst of wind.' },
  Tailwind:     { name: 'Tailwind',      type: 'Wind',   power: 0,  accuracy: 1.0,  pp: 4,  effect: 'raise_atk',  effectChance: 1.0,  description: 'Wind boost that raises attack.' },
  Cyclone:      { name: 'Cyclone',       type: 'Wind',   power: 28, accuracy: 0.75, pp: 4,  effect: 'confuse',    effectChance: 0.3,  description: 'A spinning cyclone.' },
  AirCutter:    { name: 'Air Cutter',    type: 'Wind',   power: 18, accuracy: 0.9,  pp: 7,  effect: 'lower_def',  effectChance: 0.25, description: 'Razor-sharp air blades.' },
};

export const CREATURE_MOVES: Record<string, string[]> = {
  Emberfox:     ['Ember', 'FlameCharge', 'Inferno', 'ScorchAura'],
  Aquapup:      ['Bubble', 'WaterPulse', 'TidalCrash', 'AquaHeal'],
  Leafbug:      ['VineWhip', 'SporeDust', 'LeafBlade', 'NaturesBind'],
  'Aether-kin': ['AetherPulse', 'MoonVeil', 'StarStrike', 'FaerieDust'],
  'Aether-Kin': ['AetherPulse', 'MoonVeil', 'StarStrike', 'FaerieDust'],
  Mosshound:    ['VineWhip', 'NaturesBind', 'LeafBlade', 'SporeDust'],
  Glimmerfly:   ['FaerieDust', 'AetherPulse', 'MoonVeil', 'StarStrike'],
  Dunecrawler:  ['SandBlast', 'DuneCrush', 'QuickSand', 'GritArmor'],
  Sandsprite:   ['GustSlice', 'SandBlast', 'Tailwind', 'AirCutter'],
  RoadWraith:   ['ShadowSneak', 'DarkPulse', 'Nightmare', 'VoidSlash'],
};

export const PLAYER_MOVES: string[] = ['AetherPulse', 'StarStrike', 'MoonVeil', 'FaerieDust'];

export function buildMove(moveName: string): Move {
  const base = MOVE_POOL[moveName];
  if (!base) throw new Error(`Unknown move: ${moveName}`);
  return { ...base, ppLeft: base.pp };
}

export function getCreatureMoves(creatureName: string): Move[] {
  const names = CREATURE_MOVES[creatureName] || ['Ember', 'Bubble', 'VineWhip', 'DarkPulse'];
  return names.map(buildMove);
}

export function pickAIMove(moves: Move[]): Move {
  const available = moves.filter(m => m.ppLeft > 0);
  if (available.length === 0) return moves[0];
  const weights = available.map(m => m.power + 5);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < available.length; i++) {
    r -= weights[i];
    if (r <= 0) return available[i];
  }
  return available[0];
}
