import fs from 'fs';
import path from 'path';

const GRID_SIZE = 16;

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

async function generateSprite(prompt: string, id: string) {
  console.log(`Generating sprite for: ${prompt}`);
  try {
    const response = await fetch('http://localhost:3000/api/generate-sprite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const outputPath = path.join(process.cwd(), 'src', 'game', 'sprites.json');
  fs.writeFileSync(outputPath, JSON.stringify(sprites, null, 2));
  console.log(`Successfully generated sprites and saved to ${outputPath}`);
}

main();
