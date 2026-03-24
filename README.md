# AetherMon - Pokémon Crystal/Yellow Inspired RPG

A spiritual successor to classic Pokémon games, featuring procedural world generation, AI-powered encounters, and retro pixel art graphics inspired by Pokémon Crystal and Yellow.

## Features

- **Retro Pixel Art Graphics**: 16x16 pixel sprites and tiles in the style of Game Boy Color Pokémon games
- **Procedural World**: Infinite procedurally generated overworld with diverse biomes
- **AI-Powered Encounters**: Dynamic creature generation and NPC interactions using Gemini AI
- **Battle System**: Turn-based combat with unique creatures and abilities
- **Day/Night Cycle**: Dynamic lighting and atmospheric effects
- **Quest System**: Collect mystical roses, heal leylines, and tame spirits

## Graphics Style

The game features authentic retro pixel art inspired by Pokémon Crystal and Yellow:
- **Color Palette**: Game Boy Color inspired colors (greens, blues, browns)
- **Sprites**: 16x16 pixel characters and objects with clean silhouettes
- **Tiles**: Procedurally detailed terrain with grass, water, trees, and paths
- **Effects**: Subtle lighting, particle effects, and atmospheric overlays

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set environment variables in `.env.local`:
   - `GEMINI_API_KEY` (optional, game works with fallback sprites)
   - `SPRITE_AUTH_MODE` (`auto`, `firebase`, `token`, or `none`)
   - For `firebase` mode: `FIREBASE_SERVICE_ACCOUNT_JSON` (or `GOOGLE_APPLICATION_CREDENTIALS`)
   - Optional for `firebase` mode: `SPRITE_ALLOW_ANONYMOUS_AUTH=false` and `SPRITE_AUTH_ALLOWED_EMAILS`
   - For `token` mode: `SPRITE_API_TOKEN` and `VITE_SPRITE_API_TOKEN` (same value)

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:3000 in your browser

## API Security

- `POST /api/generate-sprite` supports server-side auth modes:
- `firebase` (recommended): validates `Authorization: Bearer <Firebase ID token>` with Firebase Admin.
- In `firebase` mode, anonymous users are rejected by default unless `SPRITE_ALLOW_ANONYMOUS_AUTH=true`.
- `SPRITE_AUTH_ALLOWED_EMAILS` can further restrict generation to a specific set of signed-in users.
- `token`: validates shared header `x-sprite-auth: <token>`.
- `none`: disables endpoint auth (not recommended outside local debugging).
- `auto` (default): uses `firebase` when admin credentials exist, otherwise `token` if configured.
- Requests are also rate limited per IP and input-validated.

## Controls

- **WASD** or **Arrow Keys**: Move player
- **Mouse**: Interact with entities and tiles
- **Click**: Select options in battle/NPC dialogs

## Development

### Sprite Generation

Sprites now default to a local Crystal-style template pipeline with locked palettes, hand-tuned silhouettes, and stable seeded variants for creatures and NPCs:

```bash
npm run generate-sprites
```

If you explicitly want to hit the server sprite endpoint instead, run:

```bash
SPRITE_GENERATOR_MODE=remote npm run generate-sprites
```

### Building

```bash
npm run build
```

### Architecture

- **Frontend**: React + TypeScript + Canvas 2D rendering
- **Backend**: Node.js + Express (for AI sprite generation)
- **AI**: Google Gemini for dynamic content generation
- **Storage**: Firebase Firestore for save data
