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

2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key (optional - game works with fallback sprites)

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:3000 in your browser

## Controls

- **WASD** or **Arrow Keys**: Move player
- **Mouse**: Interact with entities and tiles
- **Click**: Select options in battle/NPC dialogs

## Development

### Sprite Generation

Sprites are generated using AI prompts specifically crafted for retro pixel art style:

```bash
npm run generate-sprites
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
