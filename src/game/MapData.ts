import { createNoise2D } from 'simplex-noise';

export const TILE_SIZE = 32;
export const CHUNK_SIZE = 32;

// Tile Types:
export const TILE_GRASS = 0;
export const TILE_TALL_GRASS = 1;
export const TILE_WATER = 2;
export const TILE_PATH = 3;
export const TILE_TREE = 4;

export const tileNames: Record<number, string> = {
  0: 'Grass', 1: 'Tall Grass', 2: 'Water', 3: 'Path', 4: 'Tree'
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
      
      if (e < -0.4) tile = TILE_WATER;
      else if (e > 0.5) tile = TILE_TREE;
      else {
        if (m > 0.3) tile = TILE_TALL_GRASS;
        else if (m < -0.4) tile = TILE_PATH;
        else tile = TILE_GRASS;
      }
      row.push(tile);
    }
    chunk.push(row);
  }
  return chunk;
}
