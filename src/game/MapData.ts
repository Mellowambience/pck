import { createNoise2D } from 'simplex-noise';

export const TILE_SIZE = 32;
export const CHUNK_SIZE = 32;

// Tile Types:
// 0: Grass
// 1: Tree (Solid)
// 2: Water (Solid)
// 3: Path
// 4: House Wall (Solid)
// 5: House Door (Solid)
// 6: Sand
// 7: Deep Water (Solid)
// 8: Mountain (Solid)

export const tileNames: Record<number, string> = {
  0: 'Grass', 1: 'Tree', 2: 'Water', 3: 'Path', 4: 'Wall', 5: 'Door', 6: 'Sand', 7: 'Deep Water', 8: 'Mountain'
};

// Instantiate noise functions once so they are consistent across all chunks
const noise2D_elevation = createNoise2D();
const noise2D_moisture = createNoise2D();

export function generateChunk(chunkX: number, chunkY: number): number[][] {
  const chunk: number[][] = [];
  const scale = 0.04; // Controls the "zoom" of the terrain features

  for (let y = 0; y < CHUNK_SIZE; y++) {
    const row: number[] = [];
    for (let x = 0; x < CHUNK_SIZE; x++) {
      const globalX = chunkX * CHUNK_SIZE + x;
      const globalY = chunkY * CHUNK_SIZE + y;

      // Force a safe spawn area around (9, 8)
      if (Math.abs(globalX - 9) <= 1 && Math.abs(globalY - 8) <= 1) {
        row.push(0); // Grass
        continue;
      }

      // Octaves for more natural, fractal-like terrain (NMS style)
      let e = 1 * noise2D_elevation(globalX * scale, globalY * scale) + 
              0.5 * noise2D_elevation(globalX * scale * 2, globalY * scale * 2) + 
              0.25 * noise2D_elevation(globalX * scale * 4, globalY * scale * 4);
      e = e / (1 + 0.5 + 0.25); // Normalize back to roughly -1 to 1

      let m = 1 * noise2D_moisture(globalX * scale, globalY * scale) + 
              0.5 * noise2D_moisture(globalX * scale * 2, globalY * scale * 2);
      m = m / (1 + 0.5);

      let tile = 0; // Default grass
      
      // Biome determination based on elevation and moisture
      // Adjusted thresholds to make the world much more open and walkable
      if (e < -0.4) tile = 7; // Deep Water
      else if (e < -0.2) tile = 2; // Water
      else if (e < -0.1) tile = 6; // Sand (Beach)
      else if (e > 0.7) tile = 8; // Mountain peaks
      else {
        if (m > 0.5) tile = 1; // Dense Forest
        else if (m > 0.2 && Math.random() > 0.8) tile = 1; // Sparse Trees
        else tile = 0; // Grasslands
      }
      row.push(tile);
    }
    chunk.push(row);
  }
  return chunk;
}
