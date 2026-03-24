import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { config as loadEnv } from 'dotenv';

// Load local environment files for development convenience.
loadEnv({ path: '.env.local' });
loadEnv();

// In-memory cache for sprites to avoid regenerating them
const spriteCache: Record<string, string[]> = {};
const rateLimitStore = new Map<string, { count: number; windowStart: number }>();

const SPRITE_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const SPRITE_RATE_LIMIT_MAX_REQUESTS = 30;
const MAX_PROMPT_LENGTH = 600;
const MAX_ID_LENGTH = 64;
const MAX_API_KEY_LENGTH = 256;
const SPRITE_AUTH_HEADER = "x-sprite-auth";
const SPRITE_AUTH_MODE = (process.env.SPRITE_AUTH_MODE || "auto").toLowerCase();
const ALLOW_ANONYMOUS_SPRITE_AUTH = (process.env.SPRITE_ALLOW_ANONYMOUS_AUTH || "").toLowerCase() === "true";
const SPRITE_AUTH_ALLOWED_EMAILS = new Set(
  (process.env.SPRITE_AUTH_ALLOWED_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

let firebaseAuth: Auth | null = null;
let firebaseAuthInitialized = false;

type SpriteAuthMode = "none" | "token" | "firebase";

function safeTokenMatch(received: string, expected: string): boolean {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  if (receivedBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

function initFirebaseAuth(): Auth | null {
  if (firebaseAuthInitialized) return firebaseAuth;
  firebaseAuthInitialized = true;

  try {
    if (!getApps().length) {
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
      if (serviceAccountJson) {
        const serviceAccount = serviceAccountJson.startsWith("{")
          ? JSON.parse(serviceAccountJson)
          : JSON.parse(fs.readFileSync(serviceAccountJson, "utf-8"));
        initializeApp({ credential: cert(serviceAccount) });
      } else {
        initializeApp({ credential: applicationDefault() });
      }
    }
    firebaseAuth = getAuth();
    return firebaseAuth;
  } catch (error) {
    console.warn("Firebase admin auth is unavailable.", error);
    firebaseAuth = null;
    return null;
  }
}

function resolveSpriteAuthMode(): SpriteAuthMode {
  if (SPRITE_AUTH_MODE === "none") return "none";
  if (SPRITE_AUTH_MODE === "token") return "token";
  if (SPRITE_AUTH_MODE === "firebase") {
    return initFirebaseAuth() ? "firebase" : "none";
  }

  if ((process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS) && initFirebaseAuth()) {
    return "firebase";
  }
  if (process.env.SPRITE_API_TOKEN) {
    return "token";
  }
  return "none";
}

function getBearerToken(req: express.Request): string | null {
  const authHeader = req.header("authorization");
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(" ");
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== "bearer") return null;
  return token.trim();
}

function cleanupRateLimitStore(now: number) {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.windowStart > SPRITE_RATE_LIMIT_WINDOW_MS) {
      rateLimitStore.delete(key);
    }
  }
}

function spriteRateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const now = Date.now();
  cleanupRateLimitStore(now);

  const clientIp = req.ip || req.socket.remoteAddress || "unknown";
  const key = `sprite:${clientIp}`;
  const entry = rateLimitStore.get(key);

  if (!entry || now - entry.windowStart > SPRITE_RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return next();
  }

  if (entry.count >= SPRITE_RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSec = Math.ceil((entry.windowStart + SPRITE_RATE_LIMIT_WINDOW_MS - now) / 1000);
    res.setHeader("Retry-After", String(retryAfterSec));
    return res.status(429).json({ error: "Rate limit exceeded. Please try again later." });
  }

  entry.count += 1;
  return next();
}

async function spriteAuthGuard(req: express.Request, res: express.Response, next: express.NextFunction) {
  const mode = resolveSpriteAuthMode();
  if (mode === "none") {
    return next();
  }

  if (mode === "token") {
    const expectedToken = process.env.SPRITE_API_TOKEN?.trim();
    if (!expectedToken) {
      return res.status(503).json({ error: "Server auth is misconfigured." });
    }

    const providedHeader = req.header(SPRITE_AUTH_HEADER);
    if (!providedHeader || !safeTokenMatch(providedHeader.trim(), expectedToken)) {
      return res.status(401).json({ error: "Unauthorized." });
    }
    return next();
  }

  const bearerToken = getBearerToken(req);
  if (!bearerToken) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  const auth = initFirebaseAuth();
  if (!auth) {
    return res.status(503).json({ error: "Server auth is unavailable." });
  }

  try {
    const decoded = await auth.verifyIdToken(bearerToken, true);
    const signInProvider = decoded.firebase?.sign_in_provider;
    const email = typeof decoded.email === "string" ? decoded.email.toLowerCase() : "";

    if (!ALLOW_ANONYMOUS_SPRITE_AUTH && signInProvider === "anonymous") {
      return res.status(403).json({ error: "Interactive sign-in is required for sprite generation." });
    }

    if (SPRITE_AUTH_ALLOWED_EMAILS.size > 0 && (!email || !SPRITE_AUTH_ALLOWED_EMAILS.has(email))) {
      return res.status(403).json({ error: "This account is not allowed to generate sprites." });
    }

    return next();
  } catch {
    return res.status(401).json({ error: "Unauthorized." });
  }
}

function validateGenerateSpriteInput(rawBody: unknown): { prompt: string; id?: string; apiKey?: string } {
  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    throw new Error("Request body must be a JSON object.");
  }

  const body = rawBody as Record<string, unknown>;
  const promptRaw = body.prompt;
  if (typeof promptRaw !== "string") {
    throw new Error("Prompt must be a string.");
  }

  const prompt = promptRaw.trim();
  if (!prompt) {
    throw new Error("Prompt is required.");
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    throw new Error(`Prompt is too long (max ${MAX_PROMPT_LENGTH} characters).`);
  }

  let id: string | undefined;
  if (body.id !== undefined) {
    if (typeof body.id !== "string") {
      throw new Error("id must be a string when provided.");
    }
    const trimmedId = body.id.trim();
    if (!trimmedId) {
      throw new Error("id cannot be empty when provided.");
    }
    if (trimmedId.length > MAX_ID_LENGTH) {
      throw new Error(`id is too long (max ${MAX_ID_LENGTH} characters).`);
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedId)) {
      throw new Error("id contains invalid characters.");
    }
    id = trimmedId;
  }

  let apiKey: string | undefined;
  if (body.apiKey !== undefined) {
    if (typeof body.apiKey !== "string") {
      throw new Error("apiKey must be a string when provided.");
    }
    const trimmedApiKey = body.apiKey.trim();
    if (!trimmedApiKey) {
      throw new Error("apiKey cannot be empty when provided.");
    }
    if (trimmedApiKey.length > MAX_API_KEY_LENGTH) {
      throw new Error(`apiKey is too long (max ${MAX_API_KEY_LENGTH} characters).`);
    }
    apiKey = trimmedApiKey;
  }

  return { prompt, id, apiKey };
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  app.set("trust proxy", true);

  app.use(express.json({ limit: "32kb" }));
  
  // Add CSP headers
  app.use((req, res, next) => {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://ai.google.dev; connect-src 'self' wss: https: http: ws:; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
    );
    next();
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      apiKeySet: !!process.env.GEMINI_API_KEY,
      spriteAuthMode: resolveSpriteAuthMode()
    });
  });

  app.post("/api/generate-sprite", spriteAuthGuard, spriteRateLimiter, async (req, res) => {
    let prompt: string;
    let id: string | undefined;
    let apiKey: string | undefined;
    try {
      ({ prompt, id, apiKey } = validateGenerateSpriteInput(req.body));
    } catch (error: any) {
      return res.status(400).json({ error: error.message || "Invalid request body." });
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
