import { TILE_SIZE, CHUNK_SIZE, generateChunk, TILE_GRASS, TILE_TALL_GRASS, TILE_WATER, TILE_PATH, TILE_TREE } from './MapData';

export interface Entity {
  id: string;
  gridX: number;
  gridY: number;
  pixelX: number;
  pixelY: number;
  type: 'sheep' | 'traveler' | 'rose' | 'shrine' | 'crystal' | 'fire' | 'sign' | 'leyline' | 'demon';
  name: string;
  isMoving: boolean;
  isCorrupted?: boolean;
}

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  animationFrameId: number = 0;
  lastTime: number = 0;
  globalTime: number = 0;
  dayTime: number = 0; // 0 to 1, representing day cycle
  onInteract: (x: number, y: number, tileType: number) => void;
  onEntityInteract: (entity: Entity) => void;
  onEncounter?: (creature: any) => void;

  isPaused: boolean = false;
  zoom: number = 3; // Zoomed in focus

  player = {
    gridX: 9,
    gridY: 8,
    pixelX: 9 * TILE_SIZE,
    pixelY: 8 * TILE_SIZE,
    direction: 'down',
    isMoving: false,
    speed: 128, // pixels per second
    animPhase: 0,
    path: [] as {x: number, y: number}[]
  };

  hoverX: number = -1;
  hoverY: number = -1;
  rosesCollected: number = 0;
  leylinesHealed: number = 0;
  onRoseCollected?: (count: number) => void;
  onLeylineHealed?: (count: number) => void;

  chunks: Map<string, number[][]> = new Map();
  entities: Entity[] = [];
  sprites: Record<string, string[]> = {};
  apiKey: string = '';
  
  fireflies: {x: number, y: number, phase: number, speed: number}[] = [];
  keys: Record<string, boolean> = {};

  lastTileX: number = 9;
  lastTileY: number = 8;

  constructor(
    canvas: HTMLCanvasElement, 
    onInteract: (x: number, y: number, tileType: number) => void, 
    onEntityInteract: (entity: Entity) => void,
    onEncounter?: (creature: any) => void,
    apiKey?: string
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.onInteract = onInteract;
    this.onEntityInteract = onEntityInteract;
    this.onEncounter = onEncounter;
    this.apiKey = apiKey || '';

    this.loadBuiltInSprites();
    
    // Initialize fireflies
    for (let i = 0; i < 50; i++) {
      this.fireflies.push({
        x: Math.random() * 2000 - 1000,
        y: Math.random() * 2000 - 1000,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1.5
      });
    }

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    
    this.loadSprites();
  }

  private generateSprite(color: string, accent?: string): string[] {
    const sprite: string[] = Array(256).fill('');
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const idx = y * 16 + x;
        if (x === 0 || x === 15 || y === 0 || y === 15) {
          sprite[idx] = accent || color;
        } else {
          sprite[idx] = color;
        }
      }
    }
    return sprite;
  }

  private loadBuiltInSprites() {
    this.sprites['player'] = this.generateSprite('#3b82f6', '#93c5fd');
    this.sprites['rose'] = this.generateSprite('#e11d48', '#fb7185');
    this.sprites['sheep'] = this.generateSprite('#f8fafc', '#cbd5e1');
    this.sprites['shrine'] = this.generateSprite('#818cf8', '#60a5fa');
    this.sprites['crystal'] = this.generateSprite('#a855f7', '#d8b4fe');
    this.sprites['fire'] = this.generateSprite('#f97316', '#fb923c');
    this.sprites['sign'] = this.generateSprite('#78350f', '#a16207');
    this.sprites['leyline'] = this.generateSprite('#38bdf8', '#7dd3fc');
    this.sprites['demon'] = this.generateSprite('#1e293b', '#f97316');
  }

  public async loadSprites() {
    if (!this.apiKey) return;
    
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

    for (const entity of entitiesToGenerate) {
      if (this.sprites[entity.id]) continue;
      try {
        const response = await fetch('/api/generate-sprite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: entity.prompt, id: entity.id, apiKey: this.apiKey })
        });
        if (response.ok) {
          const data = await response.json();
          this.sprites[entity.id] = data.pixels;
        }
      } catch (err) {
        console.error(`Failed to load sprite for ${entity.id}`, err);
      }
    }
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (this.isPaused) return;
    this.keys[e.key.toLowerCase()] = true;
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = false;
  };

  private loadChunk(cx: number, cy: number) {
    const key = this.getChunkKey(cx, cy);
    if (!this.chunks.has(key)) {
      this.chunks.set(key, generateChunk(cx, cy));
      
      // 30% chance to spawn an entity in a new chunk
      if (Math.random() < 0.3) {
        const ex = cx * CHUNK_SIZE + Math.floor(Math.random() * CHUNK_SIZE);
        const ey = cy * CHUNK_SIZE + Math.floor(Math.random() * CHUNK_SIZE);
        const localTile = this.chunks.get(key)![ey - cy * CHUNK_SIZE][ex - cx * CHUNK_SIZE];
        const solidTiles = [TILE_WATER, TILE_TREE];
        
        if (!solidTiles.includes(localTile)) {
          const rand = Math.random();
          let type: Entity['type'] = 'sheep';
          let name = 'Sheep';
          let isCorrupted = false;
          
          if (rand > 0.98) {
            type = 'demon';
            name = 'Corrupted Spirit';
            isCorrupted = true;
          } else if (rand > 0.96) {
            type = 'leyline';
            name = 'Dormant Leyline';
            isCorrupted = true;
          } else if (rand > 0.93) {
            type = 'shrine';
            name = 'Ancient Shrine';
          } else if (rand > 0.9) {
            type = 'crystal';
            name = 'Aether Crystal';
          } else if (rand > 0.85) {
            type = 'fire';
            name = 'Mars Flame';
          } else if (rand > 0.8) {
            type = 'sign';
            name = 'Ancient Signpost';
          } else if (rand > 0.7) {
            type = 'rose';
            name = 'Mystical Rose';
          } else if (rand > 0.4) {
            type = 'traveler';
            const travelerNames = ["Elara", "Thorne", "Lyra", "Kael", "Sylas", "Aria", "Rowan", "Finn", "Maeve", "Caleb"];
            name = travelerNames[Math.floor(Math.random() * travelerNames.length)];
          }

          this.entities.push({
            id: Math.random().toString(36).substring(2, 9),
            gridX: ex, gridY: ey,
            pixelX: ex * TILE_SIZE, pixelY: ey * TILE_SIZE,
            type: type,
            name: name,
            isMoving: false,
            isCorrupted: isCorrupted
          });
        }
      }
    }
  }

  public spawnEntity(x: number, y: number, type: Entity['type'], name: string, isCorrupted: boolean = false) {
    this.entities.push({
      id: Math.random().toString(36).substring(2, 9),
      gridX: x, gridY: y,
      pixelX: x * TILE_SIZE, pixelY: y * TILE_SIZE,
      type: type,
      name: name,
      isMoving: false,
      isCorrupted: isCorrupted
    });
  }

  getChunkKey(cx: number, cy: number) {
    return `${cx},${cy}`;
  }

  getTile(x: number, y: number): number {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cy = Math.floor(y / CHUNK_SIZE);
    this.loadChunk(cx, cy);
    
    const lx = x - cx * CHUNK_SIZE;
    const ly = y - cy * CHUNK_SIZE;
    return this.chunks.get(this.getChunkKey(cx, cy))![ly][lx];
  }

  setTile(x: number, y: number, tileType: number) {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cy = Math.floor(y / CHUNK_SIZE);
    this.loadChunk(cx, cy);
    
    const lx = x - cx * CHUNK_SIZE;
    const ly = y - cy * CHUNK_SIZE;
    this.chunks.get(this.getChunkKey(cx, cy))![ly][lx] = tileType;
  }

  cleanup() {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  public handleMouseMove(clickX: number, clickY: number) {
    if (this.isPaused) return;
    const { gridX, gridY } = this.screenToGrid(clickX, clickY);
    this.hoverX = gridX;
    this.hoverY = gridY;
  }

  public handleCanvasClick(clickX: number, clickY: number) {
    if (this.isPaused) return;
    const { gridX, gridY } = this.screenToGrid(clickX, clickY);

    const clickedEnt = this.entities.find(e => e.gridX === gridX && e.gridY === gridY);
    if (clickedEnt) {
      this.findPathToAdjacent(gridX, gridY);
      this.onEntityInteract(clickedEnt);
      return;
    }

    const tileType = this.getTile(gridX, gridY);
    if (this.isSolid(gridX, gridY)) {
      this.findPathToAdjacent(gridX, gridY);
      this.onInteract(gridX, gridY, tileType);
    } else {
      this.findPath(gridX, gridY);
      this.onInteract(gridX, gridY, tileType);
    }
  }

  private screenToGrid(screenX: number, screenY: number) {
    const cameraX = Math.floor(this.canvas.width / 2 - this.player.pixelX * this.zoom - (TILE_SIZE * this.zoom / 2));
    const cameraY = Math.floor(this.canvas.height / 2 - this.player.pixelY * this.zoom - (TILE_SIZE * this.zoom / 2));
    const worldX = (screenX - cameraX) / this.zoom;
    const worldY = (screenY - cameraY) / this.zoom;
    return {
      gridX: Math.floor(worldX / TILE_SIZE),
      gridY: Math.floor(worldY / TILE_SIZE)
    };
  }

  start() {
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  private loop = (time: number) => {
    let deltaTime = (time - this.lastTime) / 1000;
    
    // Prevent negative deltaTime (can happen if rAF and performance.now use different origins)
    if (deltaTime < 0) deltaTime = 0;
    // Cap deltaTime to prevent huge jumps if tab was inactive
    if (deltaTime > 0.1) deltaTime = 0.1;

    this.lastTime = time;
    this.globalTime += deltaTime;
    this.dayTime = (Math.sin(this.globalTime * 0.1) + 1) / 2; // Slow cycle

    this.update(deltaTime);
    this.draw();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private isSolid(x: number, y: number) {
    const tile = this.getTile(x, y);
    const isTileSolid = tile === TILE_WATER || tile === TILE_TREE;
    const isEntitySolid = this.entities.some(e => {
      if (e.gridX !== x || e.gridY !== y) return false;
      // Roses, fire, and leylines are not solid, everything else is
      return !['rose', 'fire', 'leyline'].includes(e.type);
    });
    return isTileSolid || isEntitySolid;
  }

  private findPath(targetX: number, targetY: number) {
    const startX = this.player.gridX;
    const startY = this.player.gridY;
    
    if (startX === targetX && startY === targetY) return;

    // A* Pathfinding for much better long-distance routing
    const openSet = [{ x: startX, y: startY, path: [] as {x: number, y: number}[], g: 0, f: 0 }];
    const closedSet = new Set<string>();
    
    const heuristic = (x: number, y: number) => Math.abs(x - targetX) + Math.abs(y - targetY);

    let iterations = 0;
    const MAX_ITERATIONS = 8000; // A* is directed, so 8000 can cross huge distances

    while (openSet.length > 0 && iterations < MAX_ITERATIONS) {
      iterations++;
      
      // Find node with lowest f score
      let lowestIndex = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < openSet[lowestIndex].f) {
          lowestIndex = i;
        }
      }
      
      const current = openSet.splice(lowestIndex, 1)[0];
      const currentKey = `${current.x},${current.y}`;
      
      if (current.x === targetX && current.y === targetY) {
        this.player.path = current.path;
        return;
      }

      closedSet.add(currentKey);

      const neighbors = [
        { x: current.x, y: current.y - 1 },
        { x: current.x, y: current.y + 1 },
        { x: current.x - 1, y: current.y },
        { x: current.x + 1, y: current.y }
      ];

      for (const n of neighbors) {
        const nKey = `${n.x},${n.y}`;
        if (closedSet.has(nKey) || this.isSolid(n.x, n.y)) continue;

        const gScore = current.g + 1;
        const existingNode = openSet.find(node => node.x === n.x && node.y === n.y);

        if (!existingNode) {
          openSet.push({
            x: n.x,
            y: n.y,
            path: [...current.path, { x: n.x, y: n.y }],
            g: gScore,
            f: gScore + heuristic(n.x, n.y)
          });
        } else if (gScore < existingNode.g) {
          existingNode.g = gScore;
          existingNode.f = gScore + heuristic(n.x, n.y);
          existingNode.path = [...current.path, { x: n.x, y: n.y }];
        }
      }
    }
  }

  private findPathToAdjacent(targetX: number, targetY: number) {
    const neighbors = [
      { x: targetX, y: targetY - 1 },
      { x: targetX, y: targetY + 1 },
      { x: targetX - 1, y: targetY },
      { x: targetX + 1, y: targetY }
    ];

    let closest = null;
    let minDistance = Infinity;

    for (const n of neighbors) {
      if (!this.isSolid(n.x, n.y)) {
        const dist = Math.abs(this.player.gridX - n.x) + Math.abs(this.player.gridY - n.y);
        if (dist < minDistance) {
          minDistance = dist;
          closest = n;
        }
      }
    }

    if (closest) {
      this.findPath(closest.x, closest.y);
    }
  }

  private triggerEncounter() {
    this.isPaused = true;
    this.keys = {};
    this.player.path = [];
    
    const monsters = [
      { name: 'Emberfox', type: 'Fire', hp: 20, maxHp: 20, color: '#ff5500', level: Math.floor(Math.random() * 5) + 2, shield: 2 },
      { name: 'Aquapup', type: 'Water', hp: 22, maxHp: 22, color: '#00aaff', level: Math.floor(Math.random() * 5) + 2, shield: 3 },
      { name: 'Leafbug', type: 'Grass', hp: 18, maxHp: 18, color: '#55aa00', level: Math.floor(Math.random() * 5) + 2, shield: 1 },
      { name: 'Aether-kin', type: 'Fairy', hp: 25, maxHp: 25, color: '#e0aaff', level: Math.floor(Math.random() * 5) + 5, shield: 4 },
    ];
    const wild = monsters[Math.floor(Math.random() * monsters.length)];
    
    if (this.onEncounter) {
      this.onEncounter(wild);
    }
  }

  private update(deltaTime: number) {
    if (this.isPaused) return;

    if (this.player.path.length === 0 && !this.player.isMoving) {
      let dx = 0;
      let dy = 0;
      if (this.keys['w'] || this.keys['arrowup']) { dy = -1; this.player.direction = 'up'; }
      else if (this.keys['s'] || this.keys['arrowdown']) { dy = 1; this.player.direction = 'down'; }
      else if (this.keys['a'] || this.keys['arrowleft']) { dx = -1; this.player.direction = 'left'; }
      else if (this.keys['d'] || this.keys['arrowright']) { dx = 1; this.player.direction = 'right'; }

      if (dx !== 0 || dy !== 0) {
        const nextX = this.player.gridX + dx;
        const nextY = this.player.gridY + dy;
        if (!this.isSolid(nextX, nextY)) {
          this.player.path.push({x: nextX, y: nextY});
        }
      }
    }

    if (!this.player.isMoving) {
      if (this.player.path.length > 0) {
        const nextStep = this.player.path.shift()!;
        const dx = nextStep.x - this.player.gridX;
        const dy = nextStep.y - this.player.gridY;
        
        if (dx === 1) this.player.direction = 'right';
        else if (dx === -1) this.player.direction = 'left';
        else if (dy === 1) this.player.direction = 'down';
        else if (dy === -1) this.player.direction = 'up';

        this.player.gridX = nextStep.x;
        this.player.gridY = nextStep.y;
        this.player.isMoving = true;
      }
    } else {
      const targetPixelX = this.player.gridX * TILE_SIZE;
      const targetPixelY = this.player.gridY * TILE_SIZE;
      const moveAmt = this.player.speed * deltaTime;

      if (this.player.pixelX < targetPixelX) {
        this.player.pixelX = Math.min(this.player.pixelX + moveAmt, targetPixelX);
      } else if (this.player.pixelX > targetPixelX) {
        this.player.pixelX = Math.max(this.player.pixelX - moveAmt, targetPixelX);
      }

      if (this.player.pixelY < targetPixelY) {
        this.player.pixelY = Math.min(this.player.pixelY + moveAmt, targetPixelY);
      } else if (this.player.pixelY > targetPixelY) {
        this.player.pixelY = Math.max(this.player.pixelY - moveAmt, targetPixelY);
      }

      if (this.player.pixelX === targetPixelX && this.player.pixelY === targetPixelY) {
        this.player.isMoving = false;
        
        if (this.player.gridX !== this.lastTileX || this.player.gridY !== this.lastTileY) {
          this.lastTileX = this.player.gridX;
          this.lastTileY = this.player.gridY;
          
          const currentTile = this.getTile(this.player.gridX, this.player.gridY);
          if (currentTile === TILE_TALL_GRASS) {
            if (Math.random() < 0.15) {
              this.triggerEncounter();
            }
          }
        }

        // Check for rose collection
        const roseIndex = this.entities.findIndex(e => e.type === 'rose' && e.gridX === this.player.gridX && e.gridY === this.player.gridY);
        if (roseIndex !== -1) {
          this.entities.splice(roseIndex, 1);
          this.rosesCollected++;
          if (this.onRoseCollected) this.onRoseCollected(this.rosesCollected);
        }
      }
    }

    // Player idle/animation phase
    this.player.animPhase += deltaTime * 4;
    if (this.player.animPhase > Math.PI * 2) this.player.animPhase -= Math.PI * 2;

    // Update entities
    for (const ent of this.entities) {
      if (!ent.isMoving && Math.random() < 0.02) {
        const dirs = [{dx:0,dy:1},{dx:0,dy:-1},{dx:1,dy:0},{dx:-1,dy:0}];
        const d = dirs[Math.floor(Math.random()*dirs.length)];
        if (!this.isSolid(ent.gridX+d.dx, ent.gridY+d.dy)) {
          ent.gridX += d.dx;
          ent.gridY += d.dy;
          ent.isMoving = true;
        }
      }
      if (ent.isMoving) {
        const tx = ent.gridX * TILE_SIZE;
        const ty = ent.gridY * TILE_SIZE;
        const speed = 64 * deltaTime;
        if (ent.pixelX < tx) ent.pixelX = Math.min(ent.pixelX + speed, tx);
        else if (ent.pixelX > tx) ent.pixelX = Math.max(ent.pixelX - speed, tx);
        if (ent.pixelY < ty) ent.pixelY = Math.min(ent.pixelY + speed, ty);
        else if (ent.pixelY > ty) ent.pixelY = Math.max(ent.pixelY - speed, ty);
        if (ent.pixelX === tx && ent.pixelY === ty) ent.isMoving = false;
      }
    }

    // Update fireflies
    for (const ff of this.fireflies) {
      ff.x += Math.sin(this.globalTime * ff.speed + ff.phase) * 20 * deltaTime;
      ff.y += Math.cos(this.globalTime * ff.speed * 0.8 + ff.phase) * 15 * deltaTime;
      
      // Keep fireflies somewhat near the player
      const dx = ff.x - this.player.pixelX;
      const dy = ff.y - this.player.pixelY;
      if (dx * dx + dy * dy > 1000000) {
        ff.x = this.player.pixelX + (Math.random() * 1000 - 500);
        ff.y = this.player.pixelY + (Math.random() * 1000 - 500);
      }
    }
  }

  private drawSprite(px: number, py: number, pixels: string[]) {
    if (!pixels || pixels.length !== 256) return false;
    
    for (let i = 0; i < 256; i++) {
      const color = pixels[i];
      if (color && color !== "") {
        const x = i % 16;
        const y = Math.floor(i / 16);
        this.ctx.fillStyle = color;
        this.ctx.fillRect(px + x * 2, py + y * 2, 2, 2);
      }
    }
    return true;
  }

  private draw() {
    const { ctx, canvas } = this;
    ctx.fillStyle = '#0f172a'; // Darker background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cameraX = Math.floor(canvas.width / 2 - this.player.pixelX * this.zoom - (TILE_SIZE * this.zoom / 2));
    const cameraY = Math.floor(canvas.height / 2 - this.player.pixelY * this.zoom - (TILE_SIZE * this.zoom / 2));

    // Parallax Background
    ctx.save();
    const parallaxX = cameraX * 0.2;
    const parallaxY = cameraY * 0.2;
    ctx.translate(parallaxX % 100, parallaxY % 100);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i = -100; i < canvas.width + 100; i += 50) {
      for (let j = -100; j < canvas.height + 100; j += 50) {
        ctx.beginPath();
        ctx.arc(i, j, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    ctx.save();
    ctx.translate(cameraX, cameraY);
    ctx.scale(this.zoom, this.zoom);

    const pseudoRandom = (x: number, y: number) => {
      const sin = Math.sin(x * 12.9898 + y * 78.233);
      return (sin * 43758.5453123) - Math.floor(sin * 43758.5453123);
    };

    // Calculate visible bounds to optimize drawing
    const startCol = Math.floor(-cameraX / (TILE_SIZE * this.zoom)) - 1;
    const endCol = Math.ceil((canvas.width - cameraX) / (TILE_SIZE * this.zoom)) + 1;
    const startRow = Math.floor(-cameraY / (TILE_SIZE * this.zoom)) - 1;
    const endRow = Math.ceil((canvas.height - cameraY) / (TILE_SIZE * this.zoom)) + 1;

    for (let y = startRow; y <= endRow; y++) {
      for (let x = startCol; x <= endCol; x++) {
        const tile = this.getTile(x, y);
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        
        // Base tile colors
        if (tile === TILE_GRASS) ctx.fillStyle = '#4ade80'; // Grass
        else if (tile === TILE_TREE) ctx.fillStyle = '#4ade80'; // Tree base (grass)
        else if (tile === TILE_WATER) ctx.fillStyle = '#3b82f6'; // Water
        else if (tile === TILE_PATH) ctx.fillStyle = '#d6d3d1'; // Path
        else if (tile === TILE_TALL_GRASS) ctx.fillStyle = '#22c55e'; // Tall Grass
        else ctx.fillStyle = '#000';

        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

        // Details
        if (tile === TILE_GRASS || tile === TILE_TREE || tile === TILE_TALL_GRASS) {
          // Grass blades
          ctx.fillStyle = tile === TILE_TALL_GRASS ? '#16a34a' : '#22c55e';
          for(let i=0; i<4; i++) {
            let rx = pseudoRandom(x, y+i) * (TILE_SIZE - 2);
            let ry = pseudoRandom(x+i, y) * (TILE_SIZE - 4);
            ctx.fillRect(px + rx, py + ry, 2, tile === TILE_TALL_GRASS ? 8 : 4);
          }
        }

        if (tile === TILE_WATER) {
          // Water waves
          ctx.fillStyle = 'rgba(255,255,255,0.2)';
          let waveOffset = Math.sin(this.globalTime * 2 + x * 0.5 + y * 0.5) * 4;
          ctx.fillRect(px + 4 + waveOffset, py + 8, 12, 2);
          ctx.fillRect(px + 16 - waveOffset, py + 20, 10, 2);
        }

        if (tile === TILE_TREE) {
          // Tree shadow
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.beginPath(); ctx.ellipse(px + 16, py + 28, 12, 6, 0, 0, Math.PI*2); ctx.fill();
          // Trunk
          ctx.fillStyle = '#78350f';
          ctx.fillRect(px + 12, py + 16, 8, 14);
          // Leaves (Pine)
          ctx.fillStyle = '#166534';
          ctx.beginPath(); ctx.moveTo(px + 16, py - 4); ctx.lineTo(px + 28, py + 20); ctx.lineTo(px + 4, py + 20); ctx.fill();
          ctx.fillStyle = '#14532d'; // darker shade for depth
          ctx.beginPath(); ctx.moveTo(px + 16, py - 4); ctx.lineTo(px + 28, py + 20); ctx.lineTo(px + 16, py + 20); ctx.fill();
        } 

        // Draw hover highlight
        if (x === this.hoverX && y === this.hoverY && !this.isPaused) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 2;
          ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    // Draw path highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    for (const step of this.player.path) {
      ctx.beginPath();
      ctx.arc(step.x * TILE_SIZE + 16, step.y * TILE_SIZE + 16, 6, 0, Math.PI*2);
      ctx.fill();
    }

    // Y-Sorting: Combine entities and player, sort by pixelY
    const renderables = [
      ...this.entities.filter(ent => ent.gridX >= startCol && ent.gridX <= endCol && ent.gridY >= startRow && ent.gridY <= endRow).map(ent => ({ ...ent, isPlayer: false })),
      { ...this.player, isPlayer: true, type: 'player' as const }
    ];

    renderables.sort((a, b) => a.pixelY - b.pixelY);

    for (const item of renderables) {
      const bob = item.isPlayer ? Math.sin(this.player.animPhase) * 2 : 0;
      const px = item.pixelX;
      const py = item.pixelY - bob;

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.ellipse(px + 16, py + 28 + bob, 10, 5, 0, 0, Math.PI*2); ctx.fill();

      if (item.isPlayer) {
        if (this.sprites['player']) {
          this.drawSprite(px, py, this.sprites['player']);
        } else {
          // Player Body (Jacket/Shirt)
          ctx.fillStyle = '#3b82f6'; // Blue jacket
          ctx.fillRect(px + 10, py + 14, 12, 10);
          
          // Arms
          ctx.fillStyle = '#2563eb'; // Darker blue sleeves
          ctx.fillRect(px + 8, py + 14, 4, 8);
          ctx.fillRect(px + 20, py + 14, 4, 8);

          // Hands
          ctx.fillStyle = '#fcd34d'; // Skin
          ctx.fillRect(px + 8, py + 22, 4, 3);
          ctx.fillRect(px + 20, py + 22, 4, 3);

          // Pants
          ctx.fillStyle = '#1e293b'; // Dark pants
          ctx.fillRect(px + 10, py + 24, 12, 6);

          // Shoes
          ctx.fillStyle = '#ef4444'; // Red shoes
          ctx.fillRect(px + 9, py + 28, 6, 4);
          ctx.fillRect(px + 17, py + 28, 6, 4);
          
          // Head
          ctx.fillStyle = '#fcd34d'; // Skin
          ctx.beginPath(); ctx.arc(px + 16, py + 10, 7, 0, Math.PI*2); ctx.fill();
          
          // Hat
          ctx.fillStyle = '#ef4444'; // Red hat
          ctx.beginPath(); ctx.arc(px + 16, py + 8, 7, Math.PI, 0); ctx.fill();
          // Hat brim
          if (this.player.direction === 'down') {
            ctx.fillRect(px + 9, py + 7, 14, 2);
          } else if (this.player.direction === 'left') {
            ctx.fillRect(px + 7, py + 7, 8, 2);
          } else if (this.player.direction === 'right') {
            ctx.fillRect(px + 17, py + 7, 8, 2);
          } else if (this.player.direction === 'up') {
            // Brim in back, mostly hidden
          }

          // Direction indicator (eyes/face)
          ctx.fillStyle = '#1e1b4b';
          if (this.player.direction === 'down') {
            ctx.fillRect(px + 13, py + 10, 2, 2);
            ctx.fillRect(px + 17, py + 10, 2, 2);
          } else if (this.player.direction === 'left') {
            ctx.fillRect(px + 11, py + 10, 2, 2);
          } else if (this.player.direction === 'right') {
            ctx.fillRect(px + 19, py + 10, 2, 2);
          }
        }
      } else {
        const ent = item as any;
        if (this.sprites[ent.type]) {
          this.drawSprite(px, py, this.sprites[ent.type]);
        } else if (ent.type === 'sheep') {
          // Body
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath(); ctx.ellipse(px + 16, py + 20, 12, 8, 0, 0, Math.PI*2); ctx.fill();
          // Head
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(px + 22, py + 14, 6, 6);
          // Legs
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(px + 10, py + 26, 2, 4);
          ctx.fillRect(px + 20, py + 26, 2, 4);
        } else if (ent.type === 'traveler') {
          // Body (Jacket/Shirt)
          ctx.fillStyle = '#10b981'; // Green jacket
          ctx.fillRect(px + 10, py + 14, 12, 10);
          
          // Arms
          ctx.fillStyle = '#059669'; // Darker green sleeves
          ctx.fillRect(px + 8, py + 14, 4, 8);
          ctx.fillRect(px + 20, py + 14, 4, 8);

          // Hands
          ctx.fillStyle = '#fcd34d'; // Skin
          ctx.fillRect(px + 8, py + 22, 4, 3);
          ctx.fillRect(px + 20, py + 22, 4, 3);

          // Pants
          ctx.fillStyle = '#1e293b'; // Dark pants
          ctx.fillRect(px + 10, py + 24, 12, 6);

          // Shoes
          ctx.fillStyle = '#f59e0b'; // Orange shoes
          ctx.fillRect(px + 9, py + 28, 6, 4);
          ctx.fillRect(px + 17, py + 28, 6, 4);
          
          // Head
          ctx.fillStyle = '#fcd34d'; // Skin
          ctx.beginPath(); ctx.arc(px + 16, py + 10, 7, 0, Math.PI*2); ctx.fill();
          
          // Hair
          ctx.fillStyle = '#78350f'; // Brown hair
          ctx.beginPath(); ctx.arc(px + 16, py + 8, 7, Math.PI, 0); ctx.fill();
          ctx.fillRect(px + 9, py + 7, 14, 3);
        } else if (ent.type === 'rose') {
          ctx.fillStyle = '#e11d48';
          ctx.beginPath(); ctx.arc(px + 16, py + 16, 4, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#16a34a';
          ctx.fillRect(px + 15, py + 20, 2, 8);
        } else if (ent.type === 'shrine') {
          ctx.fillStyle = '#475569';
          ctx.fillRect(px + 4, py + 4, 24, 24);
          ctx.fillStyle = '#818cf8';
          ctx.beginPath(); ctx.arc(px + 16, py + 16, 6, 0, Math.PI*2); ctx.fill();
        } else if (ent.type === 'crystal') {
          ctx.fillStyle = '#a855f7';
          ctx.beginPath(); ctx.moveTo(px + 16, py + 4); ctx.lineTo(px + 24, py + 24); ctx.lineTo(px + 8, py + 24); ctx.fill();
          
          // Crystal particles
          const t = this.globalTime * 2;
          ctx.fillStyle = 'rgba(216, 180, 254, 0.6)';
          for (let i = 0; i < 3; i++) {
            const offset = (t + i * 2) % 4;
            ctx.fillRect(px + 12 + Math.sin(t + i)*8, py + 20 - offset*4, 2, 2);
          }
        } else if (ent.type === 'fire') {
          ctx.fillStyle = '#f97316';
          ctx.beginPath(); ctx.moveTo(px + 16, py + 8); ctx.lineTo(px + 24, py + 28); ctx.lineTo(px + 8, py + 28); ctx.fill();
          
          // Fire particles
          const t = this.globalTime * 5;
          ctx.fillStyle = 'rgba(253, 186, 116, 0.8)';
          for (let i = 0; i < 4; i++) {
            const offset = (t + i * 1.5) % 5;
            ctx.fillRect(px + 14 + Math.sin(t + i)*4, py + 24 - offset*3, 3, 3);
          }
        } else if (ent.type === 'sign') {
          ctx.fillStyle = '#78350f';
          ctx.fillRect(px + 14, py + 16, 4, 14);
          ctx.fillRect(px + 6, py + 8, 20, 10);
        } else if (ent.type === 'leyline') {
          const alpha = (Math.sin(this.globalTime * 2) + 1) / 2;
          ctx.fillStyle = ent.isCorrupted ? `rgba(249, 115, 22, ${alpha * 0.5})` : `rgba(56, 189, 248, ${alpha * 0.8})`;
          ctx.beginPath(); ctx.arc(px + 16, py + 16, 12, 0, Math.PI * 2); ctx.fill();
        } else if (ent.type === 'demon') {
          ctx.fillStyle = '#1e293b';
          ctx.beginPath(); ctx.arc(px + 16, py + 16, 10, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#f97316';
          ctx.fillRect(px + 12, py + 12, 2, 2);
          ctx.fillRect(px + 18, py + 12, 2, 2);
        }
      }
    }

    // Draw fireflies
    const cycleLength = 60;
    const timeOfDay = (this.globalTime % cycleLength) / cycleLength;
    const darkness = Math.max(0, Math.sin(timeOfDay * Math.PI * 2 - Math.PI / 2)) * 0.7;
    
    if (darkness > 0.2) {
      ctx.globalCompositeOperation = 'screen';
      for (const ff of this.fireflies) {
        // Only draw fireflies that are on screen
        if (
          ff.x > -cameraX - 50 && ff.x < -cameraX + canvas.width + 50 &&
          ff.y > -cameraY - 50 && ff.y < -cameraY + canvas.height + 50
        ) {
          const brightness = (Math.sin(this.globalTime * 3 + ff.phase) + 1) / 2; // 0 to 1
          const alpha = brightness * (darkness / 0.7); // Scale by darkness
          
          ctx.fillStyle = `rgba(167, 243, 208, ${alpha})`; // Emerald-200
          ctx.beginPath();
          ctx.arc(ff.x, ff.y, 1.5 / this.zoom, 0, Math.PI * 2);
          ctx.fill();
          
          // Glow
          const glow = ctx.createRadialGradient(ff.x, ff.y, 0, ff.x, ff.y, 8 / this.zoom);
          glow.addColorStop(0, `rgba(167, 243, 208, ${alpha * 0.5})`);
          glow.addColorStop(1, 'rgba(167, 243, 208, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(ff.x, ff.y, 8 / this.zoom, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.restore();

    // Day/Night Cycle Overlay
    if (darkness > 0) {
      // Create a dark overlay
      ctx.fillStyle = `rgba(10, 10, 30, ${darkness})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add a soft light around the player at night using destination-out
      if (darkness > 0.3) {
        ctx.globalCompositeOperation = 'destination-out';
        const playerScreenX = canvas.width / 2;
        const playerScreenY = canvas.height / 2;
        
        const gradient = ctx.createRadialGradient(
          playerScreenX, playerScreenY, 0,
          playerScreenX, playerScreenY, 150 * this.zoom
        );
        gradient.addColorStop(0, `rgba(0, 0, 0, ${darkness * 0.8})`);
        gradient.addColorStop(0.5, `rgba(0, 0, 0, ${darkness * 0.4})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(playerScreenX, playerScreenY, 150 * this.zoom, 0, Math.PI * 2);
        ctx.fill();

        // Also add light cutouts for glowing entities (like fire, shrine, crystals)
        for (const ent of this.entities) {
          if (ent.type === 'fire' || ent.type === 'crystal' || ent.type === 'shrine' || ent.type === 'leyline') {
            const entScreenX = (ent.pixelX * this.zoom) + cameraX * this.zoom + (16 * this.zoom);
            const entScreenY = (ent.pixelY * this.zoom) + cameraY * this.zoom + (16 * this.zoom);
            
            // Only draw if on screen
            if (entScreenX > -100 && entScreenX < canvas.width + 100 && entScreenY > -100 && entScreenY < canvas.height + 100) {
              const entGradient = ctx.createRadialGradient(
                entScreenX, entScreenY, 0,
                entScreenX, entScreenY, 80 * this.zoom
              );
              entGradient.addColorStop(0, `rgba(0, 0, 0, ${darkness * 0.9})`);
              entGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
              
              ctx.fillStyle = entGradient;
              ctx.beginPath();
              ctx.arc(entScreenX, entScreenY, 80 * this.zoom, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    // Post-processing: Vignette
    const gradient = ctx.createRadialGradient(
      canvas.width/2, canvas.height/2, canvas.height/3, 
      canvas.width/2, canvas.height/2, canvas.height
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  public getMinimapData(radius: number) {
    const data = [];
    const px = this.player.gridX;
    const py = this.player.gridY;
    
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = px + dx;
        const ny = py + dy;
        data.push(this.getTile(nx, ny));
      }
    }
    return data;
  }

  public getTimeOfDay() {
    const cycleLength = 60;
    return (this.globalTime % cycleLength) / cycleLength;
  }
}
