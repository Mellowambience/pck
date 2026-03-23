import type { DMResponse } from './DungeonMaster';

// Tile constants (mirrors MapData)
const GRASS = 0, TALL_GRASS = 1, WATER = 2, PATH = 3, TREE = 4,
      WALL = 5, DOOR = 6, SAND = 7, DEEP_WATER = 8, MOUNTAIN = 9;
const SOLID = new Set([TREE, WALL, MOUNTAIN, DEEP_WATER]);

const NARRATIVES = {
  grass:    ['The earth pulses softly beneath your feet.', 'A whisper drifts through the tall reeds.', 'Something stirs in the roots below.'],
  tallGrass:['The grass parts — eyes watch from within.', 'Ancient seeds scatter at your touch.', 'The blades hum with latent energy.'],
  water:    ['Ripples spread outward, carrying a message.', 'The current bends toward you.', 'A reflection shows something different.'],
  path:     ['Old footprints overlap yours.', 'The road remembers everyone who walked it.', 'Dust rises, then settles wrong.'],
  tree:     ['The tree shudders and yields.', 'Bark peels back to reveal glowing rings.', 'The wood remembers the fire.'],
  sand:     ['Sand shifts — something was buried here.', 'Heat mirages flicker into shapes.', 'Grains count time differently.'],
  mountain: ['The stone grumbles and resettles.', 'An echo returns with extra words.', 'Cold wind pours from a crack in the peak.'],
  default:  ['The world responds.', 'Something changes.', 'The Atlas notes this.'],
};

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

const ITEM_DROPS: Record<string, { item: string; chance: number }[]> = {
  [TREE]:     [{ item: 'Verdant Shard', chance: 0.08 }],
  [MOUNTAIN]: [{ item: 'Void Crystal',  chance: 0.06 }],
  [SAND]:     [{ item: 'Dune Relic',    chance: 0.07 }],
  [WATER]:    [{ item: 'Tide Pearl',    chance: 0.07 }],
};

export type ItemDrop = { item: string; x: number; y: number };

export function generateProceduralResponse(
  x: number, y: number,
  clickedTile: number,
  playerPos: { x: number; y: number },
  onItemDrop?: (drop: ItemDrop) => void
): DMResponse {
  const updates: { x: number; y: number; tileType: number }[] = [];
  const entities: { x: number; y: number; type: string; name?: string; isCorrupted?: boolean }[] = [];
  const neighbors = [
    { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 },
    { dx: -1, dy: -1 }, { dx: 1, dy: -1 }, { dx: -1, dy: 1 }, { dx: 1, dy: 1 },
  ];

  let narrative = '';
  let resonanceChange = 5;

  switch (clickedTile) {
    case GRASS: {
      const r = Math.random();
      if (r < 0.25) updates.push({ x, y, tileType: TALL_GRASS });
      else if (r < 0.45) updates.push({ x, y, tileType: PATH });
      else if (r < 0.55) { entities.push({ x, y, type: 'rose', name: 'Wild Rose' }); resonanceChange = 15; }
      else if (r < 0.62) { entities.push({ x, y, type: 'sheep', name: 'Lost Wanderer' }); }
      narrative = pick(NARRATIVES.grass);
      break;
    }
    case TALL_GRASS: {
      const r = Math.random();
      if (r < 0.3) updates.push({ x, y, tileType: GRASS });
      else if (r < 0.5) { entities.push({ x, y, type: 'demon', name: 'Grass Wraith', isCorrupted: true }); resonanceChange = -5; }
      else if (r < 0.6) { entities.push({ x, y, type: 'crystal', name: 'Seed Crystal' }); resonanceChange = 10; }
      narrative = pick(NARRATIVES.tallGrass);
      break;
    }
    case WATER: {
      const n = neighbors[Math.floor(Math.random() * 4)];
      if (Math.random() > 0.6) updates.push({ x: x + n.dx, y: y + n.dy, tileType: WATER });
      if (Math.random() > 0.8) updates.push({ x, y, tileType: DEEP_WATER });
      if (Math.random() > 0.75) { entities.push({ x, y, type: 'shrine', name: 'Water Shrine' }); resonanceChange = 12; }
      narrative = pick(NARRATIVES.water);
      break;
    }
    case PATH: {
      const r = Math.random();
      if (r < 0.3) updates.push({ x, y, tileType: GRASS });
      else if (r < 0.5) { entities.push({ x, y, type: 'sign', name: 'Road Marker' }); }
      else if (r < 0.65) { entities.push({ x, y, type: 'traveler', name: 'Wandering Sage' }); }
      narrative = pick(NARRATIVES.path);
      break;
    }
    case TREE: {
      const r = Math.random();
      if (r < 0.4) updates.push({ x, y, tileType: GRASS });
      else if (r < 0.6) updates.push({ x, y, tileType: TALL_GRASS });
      else if (r < 0.75) { entities.push({ x, y, type: 'crystal', name: 'Tree Spirit' }); resonanceChange = 8; }
      // Item drop chance
      const drop = ITEM_DROPS[TREE]?.[0];
      if (drop && Math.random() < drop.chance && onItemDrop) onItemDrop({ item: drop.item, x, y });
      narrative = pick(NARRATIVES.tree);
      break;
    }
    case SAND: {
      const r = Math.random();
      if (r < 0.3) updates.push({ x, y, tileType: GRASS });
      else if (r < 0.5) { entities.push({ x, y, type: 'leyline', name: 'Sand Leyline', isCorrupted: Math.random() > 0.5 }); resonanceChange = 10; }
      else if (r < 0.65) { entities.push({ x, y, type: 'demon', name: 'Sand Wraith', isCorrupted: true }); resonanceChange = -8; }
      const drop = ITEM_DROPS[SAND]?.[0];
      if (drop && Math.random() < drop.chance && onItemDrop) onItemDrop({ item: drop.item, x, y });
      narrative = pick(NARRATIVES.sand);
      break;
    }
    case DEEP_WATER: {
      updates.push({ x, y, tileType: WATER });
      if (Math.random() > 0.7) { entities.push({ x, y, type: 'shrine', name: 'Sunken Shrine' }); resonanceChange = 15; }
      narrative = pick(NARRATIVES.water);
      break;
    }
    case MOUNTAIN: {
      const r = Math.random();
      if (r < 0.35) updates.push({ x, y, tileType: TREE });
      else if (r < 0.55) { entities.push({ x, y, type: 'leyline', name: 'Mountain Leyline', isCorrupted: true }); resonanceChange = -10; }
      else if (r < 0.7) { entities.push({ x, y, type: 'crystal', name: 'Peak Crystal' }); resonanceChange = 12; }
      const drop = ITEM_DROPS[MOUNTAIN]?.[0];
      if (drop && Math.random() < drop.chance && onItemDrop) onItemDrop({ item: drop.item, x, y });
      narrative = pick(NARRATIVES.mountain);
      break;
    }
    default:
      updates.push({ x, y, tileType: Math.floor(Math.random() * 4) });
      narrative = pick(NARRATIVES.default);
  }

  // Safety: never block player position with solid tile
  const safeUpdates = updates.filter(u => {
    if (u.x === playerPos.x && u.y === playerPos.y && SOLID.has(u.tileType)) return false;
    return true;
  });

  return {
    mapUpdates: safeUpdates,
    entityUpdates: entities,
    resonanceChange,
    narrativeResponse: narrative,
  };
}
