import fs from 'fs';
import path from 'path';
import { PAL } from '../src/game/PixelArt';
import { CRYSTAL_SPRITE_EXPORTS, type SpriteRows } from '../src/game/CrystalSpriteFactory';

const generatorMode = (process.env.SPRITE_GENERATOR_MODE || 'local').trim().toLowerCase();
const spriteAuthToken = (process.env.SPRITE_API_TOKEN || process.env.VITE_SPRITE_API_TOKEN || '').trim();
const firebaseIdToken = (process.env.FIREBASE_ID_TOKEN || '').trim();
const paletteMap = PAL as Record<string, readonly string[]>;

const entitiesToGenerate = [
  { id: 'player', prompt: 'A tiny 16x16 pixel art RPG hero character, top-down view.' },
  { id: 'rose', prompt: 'A glowing mystical red rose, 16x16 pixel art.' },
  { id: 'sheep', prompt: 'A fluffy white sheep, 16x16 pixel art, top-down view.' },
  { id: 'shrine', prompt: 'An ancient stone shrine with glowing runes, 16x16 pixel art.' },
  { id: 'crystal', prompt: 'A glowing purple aether crystal, 16x16 pixel art.' },
  { id: 'fire', prompt: 'A corrupted red and black mars-flame, 16x16 pixel art.' },
  { id: 'sign', prompt: 'A small wooden signpost, 16x16 pixel art.' },
  { id: 'leyline', prompt: 'A glowing blue magical leyline node on the ground, 16x16 pixel art.' },
  { id: 'demon', prompt: 'A dark, shadowy corrupted spirit with red eyes, 16x16 pixel art.' }
];

function rowsToHexPixels(rows: SpriteRows, palette: readonly string[]) {
  const pixels: string[] = [];
  for (let y = 0; y < 16; y++) {
    const row = rows[y] || '';
    for (let x = 0; x < 16; x++) {
      const char = row[x] ?? ' ';
      if (char === ' ') {
        pixels.push('');
      } else {
        pixels.push(palette[parseInt(char, 10)] || '');
      }
    }
  }
  return pixels;
}

function generateLocalSprite(id: string) {
  const entry = CRYSTAL_SPRITE_EXPORTS[id as keyof typeof CRYSTAL_SPRITE_EXPORTS];
  if (!entry) {
    return Array(256).fill('');
  }
  return rowsToHexPixels(entry.rows, paletteMap[entry.paletteKey]);
}

async function generateSprite(prompt: string, id: string) {
  if (generatorMode !== 'remote') {
    console.log(`Building local Crystal-style sprite for: ${id}`);
    return generateLocalSprite(id);
  }

  console.log(`Generating sprite for: ${prompt}`);
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (spriteAuthToken) {
      headers['x-sprite-auth'] = spriteAuthToken;
    }
    if (firebaseIdToken) {
      headers['Authorization'] = `Bearer ${firebaseIdToken}`;
    }

    const response = await fetch('http://localhost:3000/api/generate-sprite', {
      method: 'POST',
      headers,
      body: JSON.stringify({ prompt, id })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Server returned ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return data.pixels;
  } catch (err) {
    console.error(`Failed to generate: ${prompt}`, err);
    return Array(256).fill("");
  }
}

async function main() {
  const sprites: Record<string, string[]> = {};
  
  for (const entity of entitiesToGenerate) {
    const pixels = await generateSprite(entity.prompt, entity.id);
    sprites[entity.id] = pixels;
    if (generatorMode === 'remote') {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  const outputPath = path.join(process.cwd(), 'src', 'game', 'sprites.json');
  fs.writeFileSync(outputPath, JSON.stringify(sprites, null, 2));
  console.log(`Successfully generated sprites and saved to ${outputPath}`);
}

main();
