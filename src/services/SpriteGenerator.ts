import { GoogleGenAI } from "@google/genai";

export const SPRITE_KEYS = [
  'grass', 'tree', 'water', 'path', 'wall', 'door', 'sand', 'deep_water', 'mountain',
  'player', 'traveler', 'sheep', 'rose', 'shrine', 'crystal', 'fire', 'sign',
  'leyline', 'demon'
];

export const SPRITE_PROMPTS: Record<string, string> = {
  'grass': 'A seamless top-down 2D RPG texture of vibrant aether-misted grass with tiny glowing wild roses. 16-bit SNES pixel art style, highly detailed, rich colors.',
  'tree': 'A top-down 2D RPG sprite of an ancient druid oak tree with glowing runes on its trunk. 16-bit SNES pixel art style, highly detailed, vibrant colors, isolated on black background.',
  'water': 'A seamless top-down 2D RPG texture of sparkling aether-infused water with gentle violet waves. 16-bit SNES pixel art style, highly detailed, vibrant colors.',
  'path': 'A seamless top-down 2D RPG texture of a worn stone path with ancient Celtic runes. 16-bit SNES pixel art style, highly detailed, earthy colors.',
  'wall': 'A seamless top-down 2D RPG texture of a sturdy gray stone wall covered in Mars-thorned vines. 16-bit SNES pixel art style, highly detailed, textured.',
  'door': 'A top-down 2D RPG sprite of a heavy wooden door with iron hinges and a glowing faerie seal. 16-bit SNES pixel art style, highly detailed, isolated on black background.',
  'sand': 'A seamless top-down 2D RPG texture of warm yellow desert sand with subtle dunes and glowing aether dust. 16-bit SNES pixel art style, highly detailed, vibrant colors.',
  'deep_water': 'A seamless top-down 2D RPG texture of deep, dark, mysterious blue ocean water with glowing bioluminescent spirits. 16-bit SNES pixel art style, highly detailed.',
  'mountain': 'A top-down 2D RPG sprite of a rugged, snow-capped rocky mountain peak with Mars-flame glows. 16-bit SNES pixel art style, highly detailed, isolated on black background.',
  'player': 'A top-down 2D RPG sprite of a young faerie/druid apprentice facing forward, wearing a cloak of aether mists and roses. 16-bit SNES pixel art style, highly detailed, isolated on black background.',
  'traveler': 'A top-down 2D RPG sprite of a mysterious Grove Elder NPC wearing a dark hooded cloak with glowing runes. 16-bit SNES pixel art style, highly detailed, isolated on black background.',
  'sheep': 'A top-down 2D RPG sprite of a fluffy white Aether-Kin spirit facing forward, wreathed in soft glowing mists. 16-bit SNES pixel art style, highly detailed, isolated on black background.',
  'rose': 'A top-down 2D RPG sprite of a single, vibrant, glowing mystical rose wreathed in aether mists. 16-bit SNES pixel art style, highly detailed, isolated on black background.',
  'shrine': 'A top-down 2D RPG sprite of an ancient druid stone circle shrine with a glowing center. 16-bit SNES pixel art style, highly detailed, isolated on black background.',
  'crystal': 'A top-down 2D RPG sprite of a cluster of glowing violet aether crystals. 16-bit SNES pixel art style, highly detailed, isolated on black background.',
  'fire': 'A top-down 2D RPG sprite of a mystical Mars-flame campfire with orange and violet flames. 16-bit SNES pixel art style, highly detailed, isolated on black background.',
  'sign': 'A top-down 2D RPG sprite of a weathered wooden signpost with glowing faerie script. 16-bit SNES pixel art style, highly detailed, isolated on black background.',
  'leyline': 'A top-down 2D RPG sprite of a glowing, ethereal blue leyline node pulsing with nature energy. 16-bit SNES pixel art style, highly detailed, isolated on black background.',
  'demon': 'A top-down 2D RPG sprite of a small, shadowy Mars-corrupted spirit with glowing orange eyes. 16-bit SNES pixel art style, highly detailed, isolated on black background.'
};

export type ImageSize = '512px' | '1K' | '2K' | '4K';

export async function generateSprite(
  key: string, 
  apiKey: string, 
  model: string = 'gemini-2.5-flash-image',
  imageSize: ImageSize = '1K'
): Promise<string> {
  const client = new GoogleGenAI({ apiKey });
  
  const response = await client.models.generateContent({
    model: model,
    contents: { parts: [{ text: SPRITE_PROMPTS[key] }] },
    config: { 
      imageConfig: { 
        aspectRatio: "1:1",
        imageSize: model.includes('pro') || model.includes('3.1') ? imageSize : undefined
      } 
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      const dataUrl = `data:image/png;base64,${part.inlineData.data}`;
      
      // For sprites that should have transparent backgrounds, process them
      const needsTransparency = [
        'tree', 'door', 'mountain', 'player', 'traveler', 'sheep', 
        'rose', 'shrine', 'crystal', 'fire', 'sign', 'leyline', 'demon'
      ].includes(key);
      
      if (needsTransparency) {
        return await removeBlackBackground(dataUrl);
      }
      
      return dataUrl;
    }
  }
  throw new Error("No image generated");
}

async function removeBlackBackground(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Get the background color from the top-left pixel
      const bgR = data[0];
      const bgG = data[1];
      const bgB = data[2];
      
      const tolerance = 40; // Tolerance for background color variation
      
      // Flood fill from corners
      const width = canvas.width;
      const height = canvas.height;
      const visited = new Uint8Array(width * height);
      const stack: [number, number][] = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]];
      
      while (stack.length > 0) {
        const [x, y] = stack.pop()!;
        const idx = y * width + x;
        
        if (x < 0 || x >= width || y < 0 || y >= height || visited[idx]) {
          continue;
        }
        
        visited[idx] = 1;
        
        const pixelIdx = idx * 4;
        const r = data[pixelIdx];
        const g = data[pixelIdx + 1];
        const b = data[pixelIdx + 2];
        
        if (
          Math.abs(r - bgR) < tolerance &&
          Math.abs(g - bgG) < tolerance &&
          Math.abs(b - bgB) < tolerance
        ) {
          data[pixelIdx + 3] = 0; // Make transparent
          
          stack.push([x + 1, y]);
          stack.push([x - 1, y]);
          stack.push([x, y + 1]);
          stack.push([x, y - 1]);
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export function saveSprite(key: string, dataUrl: string) {
  try {
    localStorage.setItem(`sprite_${key}`, dataUrl);
  } catch (e) {
    console.error("Failed to save sprite", e);
  }
}

export function loadSprite(key: string): string | null {
  try {
    return localStorage.getItem(`sprite_${key}`);
  } catch (e) {
    return null;
  }
}

export function clearSprites() {
  SPRITE_KEYS.forEach(key => localStorage.removeItem(`sprite_${key}`));
}
