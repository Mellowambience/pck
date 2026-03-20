import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// In-memory cache for sprites to avoid regenerating them
const spriteCache: Record<string, string[]> = {};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      apiKeySet: !!process.env.GEMINI_API_KEY,
      apiKeyValue: process.env.GEMINI_API_KEY
    });
  });

  app.post("/api/generate-sprite", async (req, res) => {
    const { prompt, id, apiKey } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    if (id && spriteCache[id]) {
      return res.json({ pixels: spriteCache[id] });
    }

    try {
      console.log(`Generating sprite for: ${prompt}`);
      const genAI = new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY || '' });
      const response = await genAI.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: `You are a professional pixel art generator. Create a 16x16 pixel art sprite based on the prompt. 
          Output a JSON object with a 'pixels' array of exactly 256 elements. Each element must be a hex color string (e.g., "#FF0000") or an empty string "" for transparency. 
          Focus on clear silhouettes and readable designs. The sprite should be centered.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              pixels: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "An array of exactly 256 hex color strings or empty strings for transparency"
              }
            },
            required: ["pixels"]
          }
        }
      });

      if (!response.text) throw new Error("Empty response from AI");
      
      const data = JSON.parse(response.text);
      
      if (id) {
        spriteCache[id] = data.pixels;
      }
      
      res.json({ pixels: data.pixels });
    } catch (error: any) {
      console.error("Error generating sprite:", error);
      res.status(500).json({ error: error.message || "Failed to generate sprite" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
