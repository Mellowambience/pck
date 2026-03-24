import { TILE_SIZE, CHUNK_SIZE, generateChunk, TILE_GRASS, TILE_TALL_GRASS, TILE_WATER, TILE_PATH, TILE_TREE, TILE_WALL, TILE_DOOR, TILE_SAND, TILE_DEEP_WATER, TILE_MOUNTAIN, SOLID_TILES } from './MapData';
import {
  PAL, Palette, PixelSprite, drawPixelSprite,
  drawGrassTile, drawTallGrassTile, drawWaterTile, drawDeepWaterTile,
  drawPathTile, drawTreeTile, drawSandTile, drawWallTile, drawDoorTile, drawMountainTile,
  SPRITE_PLAYER_DOWN, SPRITE_PLAYER_UP, SPRITE_PLAYER_LEFT,
  SPRITE_TRAVELER, SPRITE_SHEEP, SPRITE_ROSE, SPRITE_SHRINE,
  SPRITE_CRYSTAL, SPRITE_FIRE, SPRITE_SIGN, SPRITE_LEYLINE, SPRITE_DEMON,
} from './PixelArt';
import { getCrystalVariantVisual } from './CrystalVariants';

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
  onBiomeChange?: (biome: string) => void;

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
  apiKey: string = '';
  variantVisualCache: Map<string, { sprite: PixelSprite; palette: Palette }> = new Map();
  
  fireflies: {x: number, y: number, phase: number, speed: number}[] = [];
  keys: Record<string, boolean> = {};

  lastTileX: number = 9;
  lastTileY: number = 8;

  constructor(
    canvas: HTMLCanvasElement, 
    onInteract: (x: number, y: number, tileType: number) => void, 
    onEntityInteract: (entity: Entity) => void,
    onEncounter?: (creature: any) => void,
    apiKey?: string,
    onBiomeChange?: (biome: string) => void
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.onInteract = onInteract;
    this.onEntityInteract = onEntityInteract;
    this.onEncounter = onEncounter;
    this.onBiomeChange = onBiomeChange;
    this.apiKey = apiKey || '';
    
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

          const entity = {
            id: Math.random().toString(36).substring(2, 9),
            gridX: ex, gridY: ey,
            pixelX: ex * TILE_SIZE, pixelY: ey * TILE_SIZE,
            type: type,
            name: name,
            isMoving: false,
            isCorrupted: isCorrupted
          };
          this.entities.push(entity);
          this.variantVisualCache.delete(entity.id);
        }
      }
    }
  }

  public spawnEntity(x: number, y: number, type: Entity['type'], name: string, isCorrupted: boolean = false) {
    const entity = {
      id: Math.random().toString(36).substring(2, 9),
      gridX: x, gridY: y,
      pixelX: x * TILE_SIZE, pixelY: y * TILE_SIZE,
      type: type,
      name: name,
      isMoving: false,
      isCorrupted: isCorrupted
    };
    this.entities.push(entity);
    this.variantVisualCache.delete(entity.id);
  }

  private getEntityVariantVisual(entity: Entity) {
    const tileType = this.getTile(entity.gridX, entity.gridY);
    const cacheKey = `${entity.id}:${tileType}:${entity.isCorrupted ? '1' : '0'}`;
    const cached = this.variantVisualCache.get(cacheKey);
    if (cached) return cached;

    const visual = getCrystalVariantVisual(entity, tileType);
    this.variantVisualCache.set(cacheKey, visual);
    return visual;
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

    // Determine current biome from the tile the player is standing on
    const tile = this.getTile(this.player.gridX, this.player.gridY);
    const biome = tile === TILE_WATER || tile === TILE_DEEP_WATER ? 'water'
                : tile === TILE_SAND  ? 'sand'
                : tile === TILE_MOUNTAIN ? 'mountain'
                : tile === TILE_PATH  ? 'path'
                : 'grass';

    type EncounterEntry = { name: string; type: string; hp: number; maxHp: number; color: string; level: number; shield: number; variantSeed?: string };

    const BIOME_POOLS: Record<string, EncounterEntry[]> = {
      grass: [
        { name: 'Emberfox',   type: 'Fire',   hp: 22, maxHp: 22, color: '#f97316', level: 0, shield: 2 },
        { name: 'Leafbug',    type: 'Grass',  hp: 18, maxHp: 18, color: '#22c55e', level: 0, shield: 1 },
        { name: 'Aether-Kin', type: 'Fairy',  hp: 25, maxHp: 25, color: '#c084fc', level: 0, shield: 4 },
        { name: 'Mosshound',  type: 'Grass',  hp: 26, maxHp: 26, color: '#16a34a', level: 0, shield: 2 },
        { name: 'Glimmerfly', type: 'Fairy',  hp: 20, maxHp: 20, color: '#e879f9', level: 0, shield: 3 },
      ],
      water: [
        { name: 'Aquapup',    type: 'Water',  hp: 22, maxHp: 22, color: '#3b82f6', level: 0, shield: 3 },
        { name: 'Leafbug',    type: 'Grass',  hp: 18, maxHp: 18, color: '#22c55e', level: 0, shield: 1 },
        { name: 'Aquapup',    type: 'Water',  hp: 22, maxHp: 22, color: '#3b82f6', level: 0, shield: 3 }, // weighted
      ],
      sand: [
        { name: 'Dunecrawler', type: 'Sand',  hp: 24, maxHp: 24, color: '#d97706', level: 0, shield: 2 },
        { name: 'Sandsprite',  type: 'Wind',  hp: 20, maxHp: 20, color: '#a3e635', level: 0, shield: 2 },
        { name: 'Emberfox',    type: 'Fire',  hp: 22, maxHp: 22, color: '#f97316', level: 0, shield: 2 },
      ],
      mountain: [
        { name: 'RoadWraith',  type: 'Shadow', hp: 20, maxHp: 20, color: '#7c3aed', level: 0, shield: 3 },
        { name: 'Sandsprite',  type: 'Wind',   hp: 20, maxHp: 20, color: '#a3e635', level: 0, shield: 2 },
        { name: 'Dunecrawler', type: 'Sand',   hp: 24, maxHp: 24, color: '#d97706', level: 0, shield: 2 },
      ],
      path: [
        { name: 'RoadWraith',  type: 'Shadow', hp: 20, maxHp: 20, color: '#7c3aed', level: 0, shield: 3 },
        { name: 'Emberfox',    type: 'Fire',   hp: 22, maxHp: 22, color: '#f97316', level: 0, shield: 2 },
        { name: 'Aether-Kin',  type: 'Fairy',  hp: 25, maxHp: 25, color: '#c084fc', level: 0, shield: 4 },
      ],
    };

    const pool = BIOME_POOLS[biome] || BIOME_POOLS['grass'];
    const template = { ...pool[Math.floor(Math.random() * pool.length)] };
    // Scale level to rough player position (distance from spawn)
    const dist = Math.floor(Math.sqrt(this.player.gridX ** 2 + this.player.gridY ** 2) / 8);
    const lvl = Math.max(1, Math.min(30, dist + Math.floor(Math.random() * 4) + 1));
    template.level = lvl;
    template.variantSeed = `${template.name}:${biome}:${this.player.gridX}:${this.player.gridY}:${lvl}`;
    // Scale HP with level
    const scaledHp = Math.round(template.maxHp * (1 + lvl * 0.12));
    template.hp = scaledHp;
    template.maxHp = scaledHp;

    // Emit current biome so App can use it
    if (this.onBiomeChange) this.onBiomeChange(biome);

    if (this.onEncounter) {
      this.onEncounter(template);
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
            if (Math.random() < 0.05) { // Reduced from 15% to 5% chance
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
    // Fallback if no pixels
    if (!pixels || pixels.length === 0) {
      console.warn('drawSprite: no pixels array', { px, py, length: pixels?.length });
      this.ctx.fillStyle = '#FF0000';
      this.ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      return false;
    }
    
    // Draw sprite pixels
    let pixelsDrawn = 0;
    for (let i = 0; i < 256; i++) {
      const color = pixels[i];
      if (color && color !== "") {
        const x = i % 16;
        const y = Math.floor(i / 16);
        this.ctx.fillStyle = color;
        this.ctx.fillRect(px + x * 6, py + y * 6, 6, 6);
        pixelsDrawn++;
      }
    }
    
    // If nothing was drawn, show a placeholder
    if (pixelsDrawn === 0) {
      console.warn('drawSprite: no pixels drawn, showing yellow placeholder', { px, py });
      this.ctx.fillStyle = '#FFFF00';
      this.ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
    } else {
      console.log('drawSprite: drew', pixelsDrawn, 'pixels at', px, py);
    }
    
    return true;
  }

  private draw() {
    const { ctx, canvas } = this;

    ctx.fillStyle = '#87ceeb'; // Sky blue background (like Pokémon games)
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cameraX = Math.floor(canvas.width / 2 - this.player.pixelX * this.zoom - (TILE_SIZE * this.zoom / 2));
    const cameraY = Math.floor(canvas.height / 2 - this.player.pixelY * this.zoom - (TILE_SIZE * this.zoom / 2));

    // Parallax Background (subtle clouds)
    ctx.save();
    const parallaxX = cameraX * 0.1;
    const parallaxY = cameraY * 0.1;
    ctx.translate(parallaxX % 200, parallaxY % 200);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i = -200; i < canvas.width + 200; i += 100) {
      for (let j = -200; j < canvas.height + 200; j += 100) {
        ctx.beginPath();
        ctx.arc(i, j, 2, 0, Math.PI * 2);
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
        
        // GBC pixel art tile drawing
        const pr_ = pseudoRandom;
        switch (tile) {
          case TILE_GRASS:      drawGrassTile(ctx, px, py, TILE_SIZE, pr_, x, y); break;
          case TILE_TALL_GRASS: drawTallGrassTile(ctx, px, py, TILE_SIZE, pr_, x, y, this.globalTime); break;
          case TILE_WATER:      drawWaterTile(ctx, px, py, TILE_SIZE, x, y, this.globalTime); break;
          case TILE_DEEP_WATER: drawDeepWaterTile(ctx, px, py, TILE_SIZE, x, y, this.globalTime); break;
          case TILE_PATH:       drawPathTile(ctx, px, py, TILE_SIZE, pr_, x, y); break;
          case TILE_TREE:       drawTreeTile(ctx, px, py, TILE_SIZE, pr_, x, y); break;
          case TILE_WALL:       drawWallTile(ctx, px, py, TILE_SIZE); break;
          case TILE_DOOR:       drawDoorTile(ctx, px, py, TILE_SIZE); break;
          case TILE_SAND:       drawSandTile(ctx, px, py, TILE_SIZE, pr_, x, y); break;
          case TILE_MOUNTAIN:   drawMountainTile(ctx, px, py, TILE_SIZE); break;
          default:
            ctx.fillStyle = '#111827';
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        }

        // Hover highlight
        if (x === this.hoverX && y === this.hoverY && !this.isPaused) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.lineWidth = 1 / this.zoom;
          ctx.strokeRect(px + 0.5, py + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
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
        // GBC pixel art player
        const S = 2;
        const dir = this.player.direction;
        if (dir === 'up') drawPixelSprite(ctx, SPRITE_PLAYER_UP, PAL.PLAYER, px, py, S);
        else if (dir === 'left') drawPixelSprite(ctx, SPRITE_PLAYER_LEFT, PAL.PLAYER, px, py, S);
        else if (dir === 'right') drawPixelSprite(ctx, SPRITE_PLAYER_LEFT, PAL.PLAYER, px, py, S, true);
        else drawPixelSprite(ctx, SPRITE_PLAYER_DOWN, PAL.PLAYER, px, py, S);
      } else {
        const ent = item as any;
        const t = this.globalTime;
        const S = 2;
        switch (ent.type) {
          case 'sheep': {
            const visual = this.getEntityVariantVisual(ent);
            drawPixelSprite(ctx, visual.sprite, visual.palette, px, py, S);
            break;
          }
          case 'traveler': {
            const visual = this.getEntityVariantVisual(ent);
            drawPixelSprite(ctx, visual.sprite, visual.palette, px, py, S);
            ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(px + 2, py - 9, 28, 8);
            ctx.fillStyle = visual.palette[0]; ctx.font = '5px monospace';
            ctx.fillText((ent.name || 'NPC').slice(0, 6), px + 3, py - 2);
            break;
          }
          case 'rose':
            drawPixelSprite(ctx, SPRITE_ROSE, PAL.ROSE, px, py, S);
            ctx.globalAlpha = 0.25 + Math.sin(t * 3) * 0.15;
            ctx.fillStyle = PAL.ROSE[0]; ctx.beginPath(); ctx.arc(px + 16, py + 12, 10, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1; break;
          case 'shrine':
            drawPixelSprite(ctx, SPRITE_SHRINE, PAL.SHRINE, px, py, S);
            ctx.globalAlpha = 0.3 + Math.sin(t * 2) * 0.2;
            ctx.fillStyle = PAL.SHRINE[1]; ctx.beginPath(); ctx.arc(px + 16, py + 16, 12, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1; break;
          case 'crystal': {
            const visual = this.getEntityVariantVisual(ent);
            drawPixelSprite(ctx, visual.sprite, visual.palette, px, py, S);
            for (let i = 0; i < 3; i++) {
              const off = ((t * 1.5 + i * 1.1) % 2.5);
              ctx.globalAlpha = 0.7 * (1 - off / 2.5);
              ctx.fillStyle = visual.palette[0];
              ctx.fillRect(px + 10 + Math.round(Math.sin(t * 2 + i) * 5), py + 20 - Math.round(off * 7), 2, 2);
            }
            ctx.globalAlpha = 1; break;
          }
          case 'fire':
            drawPixelSprite(ctx, SPRITE_FIRE, PAL.FIRE, px, py, S);
            for (let i = 0; i < 3; i++) {
              const off = ((t * 5 + i * 1.3) % 4);
              ctx.globalAlpha = 0.8 * (1 - off / 4);
              ctx.fillStyle = PAL.FIRE[0];
              ctx.fillRect(px + 12 + Math.round(Math.sin(t * 4 + i) * 3), py + 16 - Math.round(off * 3), 2, 2);
            }
            ctx.globalAlpha = 1; break;
          case 'sign':  drawPixelSprite(ctx, SPRITE_SIGN, PAL.SIGN, px, py, S); break;
          case 'leyline': {
            const visual = this.getEntityVariantVisual(ent);
            drawPixelSprite(ctx, visual.sprite, visual.palette, px, py, S);
            const al = (Math.sin(t * 2) + 1) / 2;
            ctx.globalAlpha = al * 0.35;
            ctx.strokeStyle = visual.palette[1]; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(px + 16, py + 16, 16 + al * 4, 0, Math.PI * 2); ctx.stroke();
            ctx.globalAlpha = 1; break;
          }
          case 'demon': {
            const visual = this.getEntityVariantVisual(ent);
            drawPixelSprite(ctx, visual.sprite, visual.palette, px, py, S);
            ctx.globalAlpha = 0.7 + Math.sin(t * 7) * 0.3;
            ctx.fillStyle = visual.palette[1];
            ctx.fillRect(px + 10, py + 12, 3, 3); ctx.fillRect(px + 19, py + 12, 3, 3);
            ctx.globalAlpha = 1; break;
          }
          default:
            ctx.fillStyle = '#7c3aed'; ctx.fillRect(px + 8, py + 8, 16, 16);
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
          
          ctx.fillStyle = `rgba(255, 255, 0, ${alpha * 0.8})`; // Yellow fireflies
          ctx.beginPath();
          ctx.arc(ff.x, ff.y, 1 / this.zoom, 0, Math.PI * 2);
          ctx.fill();
          
          // Glow (subtle)
          const glow = ctx.createRadialGradient(ff.x, ff.y, 0, ff.x, ff.y, 4 / this.zoom);
          glow.addColorStop(0, `rgba(255, 255, 0, ${alpha * 0.3})`);
          glow.addColorStop(1, 'rgba(255, 255, 0, 0)');
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
    
    // DEBUG: Draw visible marker at end to verify canvas rendering
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(canvas.width - 60, canvas.height - 60, 50, 50);
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
