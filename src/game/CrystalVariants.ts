import { buildSprite, PAL, type Palette, type PixelSprite } from './PixelArt';
import { CRYSTAL_SPRITE_ROWS, type SpriteRows } from './CrystalSpriteFactory';
import {
  TILE_DEEP_WATER,
  TILE_MOUNTAIN,
  TILE_PATH,
  TILE_SAND,
  TILE_WATER,
} from './MapData';

type VariantEntity = {
  id: string;
  type: 'sheep' | 'traveler' | 'rose' | 'shrine' | 'crystal' | 'fire' | 'sign' | 'leyline' | 'demon';
  name: string;
  isCorrupted?: boolean;
};

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function cloneRows(rows: SpriteRows): SpriteRows {
  return rows.map((row) => row.slice());
}

function setPixel(rows: SpriteRows, x: number, y: number, value: string) {
  if (!rows[y] || x < 0 || x >= rows[y].length) return;
  rows[y] = `${rows[y].slice(0, x)}${value}${rows[y].slice(x + 1)}`;
}

function inferBiome(tileType: number): 'grass' | 'water' | 'sand' | 'mountain' | 'path' {
  if (tileType === TILE_WATER || tileType === TILE_DEEP_WATER) return 'water';
  if (tileType === TILE_SAND) return 'sand';
  if (tileType === TILE_MOUNTAIN) return 'mountain';
  if (tileType === TILE_PATH) return 'path';
  return 'grass';
}

function paletteFrom(values: [string, string, string, string]): Palette {
  return values;
}

function travelerPaletteForBiome(biome: ReturnType<typeof inferBiome>): Palette {
  switch (biome) {
    case 'water':
      return paletteFrom(['#d8f0f8', '#68b8d8', '#2c708c', '#123448']);
    case 'sand':
      return paletteFrom(['#f8e4b0', '#d0a45c', '#8a5d2a', '#3f2712']);
    case 'mountain':
      return paletteFrom(['#e0e0e0', '#8f98a8', '#52596b', '#202532']);
    case 'path':
      return paletteFrom(['#f0e8c8', '#b88e56', '#6e4a26', '#2d1c11']);
    default:
      return PAL.TRAVELER;
  }
}

function crystalPaletteForBiome(biome: ReturnType<typeof inferBiome>): Palette {
  switch (biome) {
    case 'water':
      return paletteFrom(['#d7f6ff', '#72d5ff', '#2f83bd', '#10395d']);
    case 'sand':
      return paletteFrom(['#ffe7b8', '#f2bb62', '#b27729', '#5b3610']);
    case 'mountain':
      return paletteFrom(['#f1e8ff', '#c4a0ff', '#7654b5', '#31194d']);
    default:
      return PAL.CRYSTAL;
  }
}

function leylinePalette(seed: number, corrupted: boolean): Palette {
  if (corrupted) {
    return seed % 2 === 0
      ? paletteFrom(['#ffd7a8', '#ff9b54', '#cf4a1d', '#6b210f'])
      : paletteFrom(['#f7c2a8', '#ec6b3d', '#9f2f1d', '#54160e']);
  }

  return seed % 3 === 0
    ? paletteFrom(['#d6fff8', '#5de3d0', '#1e8c83', '#0c3f43'])
    : seed % 3 === 1
      ? paletteFrom(['#d6f8ff', '#69d6ff', '#2e88b8', '#113d5a'])
      : PAL.LEYLINE;
}

function mutateTraveler(rows: SpriteRows, seed: number): SpriteRows {
  const next = cloneRows(rows);

  if (seed & 1) {
    setPixel(next, 5, 1, '3');
    setPixel(next, 10, 1, '3');
    setPixel(next, 4, 2, '3');
    setPixel(next, 11, 2, '3');
  }
  if (seed & 2) {
    setPixel(next, 6, 11, '2');
    setPixel(next, 7, 11, '2');
    setPixel(next, 8, 12, '2');
  }
  if (seed & 4) {
    setPixel(next, 4, 14, '2');
    setPixel(next, 11, 14, '2');
  }

  return next;
}

function mutateSheep(rows: SpriteRows, seed: number): SpriteRows {
  const next = cloneRows(rows);

  if (seed & 1) {
    setPixel(next, 3, 2, '3');
    setPixel(next, 12, 2, '3');
  }
  if (seed & 2) {
    setPixel(next, 5, 5, '3');
    setPixel(next, 10, 5, '3');
  }
  if (seed & 4) {
    setPixel(next, 6, 10, '2');
    setPixel(next, 9, 10, '2');
  }

  return next;
}

function mutateCrystal(rows: SpriteRows, seed: number): SpriteRows {
  const next = cloneRows(rows);

  if (seed & 1) {
    setPixel(next, 8, 4, '2');
    setPixel(next, 9, 5, '2');
  }
  if (seed & 2) {
    setPixel(next, 6, 8, '0');
    setPixel(next, 9, 8, '0');
  }
  if (seed & 4) {
    setPixel(next, 7, 11, '2');
    setPixel(next, 8, 12, '2');
  }

  return next;
}

function mutateLeyline(rows: SpriteRows, seed: number): SpriteRows {
  const next = cloneRows(rows);

  if (seed & 1) {
    setPixel(next, 6, 7, '2');
    setPixel(next, 9, 7, '2');
  }
  if (seed & 2) {
    setPixel(next, 7, 4, '2');
    setPixel(next, 8, 10, '2');
  }
  if (seed & 4) {
    setPixel(next, 5, 8, '1');
    setPixel(next, 10, 8, '1');
  }

  return next;
}

function mutateDemon(rows: SpriteRows, seed: number): SpriteRows {
  const next = cloneRows(rows);

  if (seed & 1) {
    setPixel(next, 2, 1, '2');
    setPixel(next, 13, 1, '2');
  }
  if (seed & 2) {
    setPixel(next, 6, 6, '2');
    setPixel(next, 9, 6, '2');
  }
  if (seed & 4) {
    setPixel(next, 5, 10, '2');
    setPixel(next, 10, 10, '2');
  }

  return next;
}

export function getCrystalVariantVisual(entity: VariantEntity, tileType: number): { sprite: PixelSprite; palette: Palette } {
  const biome = inferBiome(tileType);
  const seed = hashString(`${entity.id}:${entity.name}:${entity.type}:${entity.isCorrupted ? 'c' : 'n'}`);

  switch (entity.type) {
    case 'traveler':
      return {
        sprite: buildSprite(mutateTraveler(CRYSTAL_SPRITE_ROWS.traveler, seed)),
        palette: travelerPaletteForBiome(biome),
      };
    case 'sheep':
      return {
        sprite: buildSprite(mutateSheep(CRYSTAL_SPRITE_ROWS.sheep, seed)),
        palette: biome === 'sand'
          ? paletteFrom(['#f6e7c9', '#d8c29b', '#9f865c', '#56432b'])
          : biome === 'mountain'
            ? paletteFrom(['#f2f2f2', '#c5c9d1', '#7a8191', '#424857'])
            : PAL.SHEEP,
      };
    case 'crystal':
      return {
        sprite: buildSprite(mutateCrystal(CRYSTAL_SPRITE_ROWS.crystal, seed)),
        palette: crystalPaletteForBiome(biome),
      };
    case 'leyline':
      return {
        sprite: buildSprite(mutateLeyline(CRYSTAL_SPRITE_ROWS.leyline, seed)),
        palette: leylinePalette(seed, !!entity.isCorrupted),
      };
    case 'demon':
      return {
        sprite: buildSprite(mutateDemon(CRYSTAL_SPRITE_ROWS.demon, seed)),
        palette: biome === 'mountain'
          ? paletteFrom(['#ddd1f2', '#8b63b8', '#46235e', '#180c25'])
          : biome === 'sand'
            ? paletteFrom(['#efc3b0', '#b45e4e', '#612028', '#2a0d12'])
            : PAL.DEMON,
      };
    default:
      return { sprite: buildSprite(CRYSTAL_SPRITE_ROWS.rose), palette: PAL.ROSE };
  }
}
