import { createNoise2D } from 'simplex-noise';

export const TILE_SIZE = 32;
export const CHUNK_SIZE = 32;

// Tile Types:
export const TILE_GRASS = 0;
export const TILE_TALL_GRASS = 1;
export const TILE_WATER = 2;
export const TILE_PATH = 3;
export const TILE_TREE = 4;
export const TILE_WALL = 5;
export const TILE_DOOR = 6;
export const TILE_SAND = 7;
export const TILE_DEEP_WATER = 8;
export const TILE_MOUNTAIN = 9;
export const SOLID_TILES = new Set([TILE_TREE, TILE_WALL, TILE_MOUNTAIN, TILE_DEEP_WATER]);

export const tileNames: Record<number, string> = {
  0: 'Grass', 1: 'Tall Grass', 2: 'Water', 3: 'Path', 4: 'Tree',
  5: 'Wall', 6: 'Door', 7: 'Sand', 8: 'Deep Water', 9: 'Mountain'
};

const noise2D_elevation = createNoise2D();
const noise2D_moisture = createNoise2D();

export function generateChunk(chunkX: number, chunkY: number): number[][] {
  const chunk: number[][] = [];
  const scale = 0.05;

  for (let y = 0; y < CHUNK_SIZE; y++) {
    const row: number[] = [];
    for (let x = 0; x < CHUNK_SIZE; x++) {
      const globalX = chunkX * CHUNK_SIZE + x;
      const globalY = chunkY * CHUNK_SIZE + y;

      if (Math.abs(globalX - 9) <= 1 && Math.abs(globalY - 8) <= 1) {
        row.push(TILE_PATH);
        continue;
      }

      let e = 1 * noise2D_elevation(globalX * scale, globalY * scale) + 
              0.5 * noise2D_elevation(globalX * scale * 2, globalY * scale * 2) +
              0.25 * noise2D_elevation(globalX * scale * 4, globalY * scale * 4);
      e = e / 1.75;

      let m = 1 * noise2D_moisture(globalX * scale, globalY * scale) + 
              0.5 * noise2D_moisture(globalX * scale * 2, globalY * scale * 2) +
              0.25 * noise2D_moisture(globalX * scale * 4, globalY * scale * 4);
      m = m / 1.75;

      let tile = TILE_GRASS;
      
      if (e < -0.55) tile = TILE_DEEP_WATER;
      else if (e < -0.35) tile = TILE_WATER;
      else if (e > 0.65) tile = TILE_MOUNTAIN;
      else if (e > 0.45) tile = TILE_TREE;
      else if (m > 0.55) tile = TILE_SAND;
      else {
        if (m > 0.25) tile = TILE_TALL_GRASS;
        else if (m < -0.4) tile = TILE_PATH;
        else tile = TILE_GRASS;
      }
      row.push(tile);
    }
    chunk.push(row);
  }
  return chunk;
}
