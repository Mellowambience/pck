import { GoogleGenAI } from "@google/genai";

export const SPRITE_KEYS = [
  'grass', 'tree', 'water', 'path', 'wall', 'door', 'sand', 'deep_water', 'mountain',
  'player', 'traveler', 'sheep'
];

export const SPRITE_PROMPTS: Record<string, string> = {
  'grass': 'A seamless top-down 2D RPG texture of lush vibrant green grass. 16-bit SNES pixel art style, highly detailed, rich colors.',
  'tree': 'A top-down 2D RPG sprite of a beautiful green leafy tree with a brown trunk. 16-bit SNES pixel art style, highly detailed, vibrant colors, isolated on black background.',
  'water': 'A seamless top-down 2D RPG texture of sparkling blue water with gentle waves. 16-bit SNES pixel art style, highly detailed, vibrant colors.',
  'path': 'A seamless top-down 2D RPG texture of a worn dirt path with small pebbles. 16-bit SNES pixel art style, highly detailed, earthy colors.',
  'wall': 'A seamless top-down 2D RPG texture of a sturdy gray stone wall. 16-bit SNES pixel art style, highly detailed, textured.',
  'door': 'A top-down 2D RPG sprite of a heavy wooden door with iron hinges. 16-bit SNES pixel art style, highly detailed, isolated on black background.',
  'sand': 'A seamless top-down 2D RPG texture of warm yellow desert sand with subtle dunes. 16-bit SNES pixel art style, highly detailed, vibrant colors.',
  'deep_water': 'A seamless top-down 2D RPG texture of deep, dark, mysterious blue ocean water. 16-bit SNES pixel art style, highly detailed.',
  'mountain': 'A top-down 2D RPG sprite of a rugged, snow-capped rocky mountain peak. 16-bit SNES pixel art style, highly detailed, isolated on black background.',
  'player': 'A top-down 2D RPG sprite of a brave hero character facing forward, wearing colorful armor. 16-bit SNES pixel art style, highly detailed, isolated on black background.',
  'traveler': 'A top-down 2D RPG sprite of a mysterious traveler NPC wearing a dark hooded cloak. 16-bit SNES pixel art style, highly detailed, isolated on black background.',
  'sheep': 'A top-down 2D RPG sprite of a cute, fluffy white sheep facing forward. 16-bit SNES pixel art style, highly detailed, isolated on black background.'
};

export async function generateSprite(key: string, apiKey: string): Promise<string> {
  const client = new GoogleGenAI({ apiKey });
  
  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: SPRITE_PROMPTS[key] }] },
    config: { 
      imageConfig: { 
        aspectRatio: "1:1"
      } 
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      const dataUrl = `data:image/png;base64,${part.inlineData.data}`;
      
      // For sprites that should have transparent backgrounds, process them
      const needsTransparency = ['tree', 'door', 'mountain', 'player', 'traveler', 'sheep'].includes(key);
      
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
