import { TILE_SIZE, CHUNK_SIZE, generateChunk } from './MapData';
import { loadSprite, SPRITE_KEYS } from '../services/SpriteGenerator';

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

  player = {
    gridX: 9,
    gridY: 8,
    pixelX: 9 * TILE_SIZE,
    pixelY: 8 * TILE_SIZE,
    direction: 'down',
    isMoving: false,
    speed: 128, // pixels per second
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
  spriteImages: Record<string, HTMLImageElement> = {};
  
  fireflies: {x: number, y: number, phase: number, speed: number}[] = [];

  constructor(canvas: HTMLCanvasElement, onInteract: (x: number, y: number, tileType: number) => void, public onEntityInteract: (entity: Entity) => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.onInteract = onInteract;
    this.loadSprites();
    
    // Initialize fireflies
    for (let i = 0; i < 50; i++) {
      this.fireflies.push({
        x: Math.random() * 2000 - 1000,
        y: Math.random() * 2000 - 1000,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1.5
      });
    }
  }

  public loadSprites() {
    SPRITE_KEYS.forEach(key => {
      const dataUrl = loadSprite(key);
      if (dataUrl) {
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
          this.spriteImages[key] = img;
        };
      } else {
        delete this.spriteImages[key];
      }
    });
  }

  private loadChunk(cx: number, cy: number) {
    const key = this.getChunkKey(cx, cy);
    if (!this.chunks.has(key)) {
      this.chunks.set(key, generateChunk(cx, cy));
      
      // 30% chance to spawn an entity in a new chunk
      if (Math.random() < 0.3) {
        const ex = cx * CHUNK_SIZE + Math.floor(Math.random() * CHUNK_SIZE);
        const ey = cy * CHUNK_SIZE + Math.floor(Math.random() * CHUNK_SIZE);
        const localTile = this.chunks.get(key)![ey - cy * CHUNK_SIZE][ex - cx * CHUNK_SIZE];
        const solidTiles = [1, 2, 4, 5, 7, 8];
        
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
  }

  public handleMouseMove(clickX: number, clickY: number) {
    const { gridX, gridY } = this.screenToGrid(clickX, clickY);
    this.hoverX = gridX;
    this.hoverY = gridY;
  }

  public handleCanvasClick(clickX: number, clickY: number) {
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
    const cameraX = Math.floor(this.canvas.width / 2 - this.player.pixelX - (TILE_SIZE / 2));
    const cameraY = Math.floor(this.canvas.height / 2 - this.player.pixelY - (TILE_SIZE / 2));
    const worldX = screenX - cameraX;
    const worldY = screenY - cameraY;
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
    const isTileSolid = tile === 1 || tile === 2 || tile === 4 || tile === 5 || tile === 7 || tile === 8;
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

  private update(deltaTime: number) {
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
        
        // Check for rose collection
        const roseIndex = this.entities.findIndex(e => e.type === 'rose' && e.gridX === this.player.gridX && e.gridY === this.player.gridY);
        if (roseIndex !== -1) {
          this.entities.splice(roseIndex, 1);
          this.rosesCollected++;
          if (this.onRoseCollected) this.onRoseCollected(this.rosesCollected);
        }
      }
    }

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

  private draw() {
    const { ctx, canvas } = this;
    ctx.fillStyle = '#0f172a'; // Darker background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cameraX = Math.floor(canvas.width / 2 - this.player.pixelX - (TILE_SIZE / 2));
    const cameraY = Math.floor(canvas.height / 2 - this.player.pixelY - (TILE_SIZE / 2));

    ctx.save();
    ctx.translate(cameraX, cameraY);

    const pseudoRandom = (x: number, y: number) => {
      const sin = Math.sin(x * 12.9898 + y * 78.233);
      return (sin * 43758.5453123) - Math.floor(sin * 43758.5453123);
    };

    // Calculate visible bounds to optimize drawing
    const startCol = Math.floor(-cameraX / TILE_SIZE);
    const endCol = Math.ceil((canvas.width - cameraX) / TILE_SIZE);
    const startRow = Math.floor(-cameraY / TILE_SIZE);
    const endRow = Math.ceil((canvas.height - cameraY) / TILE_SIZE);

    for (let y = startRow; y <= endRow; y++) {
      for (let x = startCol; x <= endCol; x++) {
        const tile = this.getTile(x, y);
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        
        const tileKeyMap: Record<number, string> = {
          0: 'grass', 1: 'tree', 2: 'water', 3: 'path', 4: 'wall', 5: 'door', 6: 'sand', 7: 'deep_water', 8: 'mountain'
        };
        const spriteKey = tileKeyMap[tile];

        if (this.spriteImages[spriteKey]) {
          // If it's a tree or mountain, draw grass underneath first
          if (tile === 1 || tile === 8) {
            if (this.spriteImages['grass']) {
              ctx.drawImage(this.spriteImages['grass'], px, py, TILE_SIZE, TILE_SIZE);
            } else {
              ctx.fillStyle = '#4ade80';
              ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            }
          }
          ctx.drawImage(this.spriteImages[spriteKey], px, py, TILE_SIZE, TILE_SIZE);
        } else {
          // Base tile colors
          if (tile === 0) ctx.fillStyle = '#4ade80'; // Grass
          else if (tile === 1) ctx.fillStyle = '#4ade80'; // Tree base (grass)
          else if (tile === 2) ctx.fillStyle = '#3b82f6'; // Water
          else if (tile === 3) ctx.fillStyle = '#d6d3d1'; // Path
          else if (tile === 4) ctx.fillStyle = '#78716c'; // Wall
          else if (tile === 5) ctx.fillStyle = '#8b5cf6'; // Door
          else if (tile === 6) ctx.fillStyle = '#fde047'; // Sand
          else if (tile === 7) ctx.fillStyle = '#1e3a8a'; // Deep Water
          else if (tile === 8) ctx.fillStyle = '#4ade80'; // Mountain base (grass)

          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

          // Details
          if (tile === 0 || tile === 1 || tile === 8) {
            // Grass blades
            ctx.fillStyle = '#22c55e';
            for(let i=0; i<4; i++) {
              let rx = pseudoRandom(x, y+i) * (TILE_SIZE - 2);
              let ry = pseudoRandom(x+i, y) * (TILE_SIZE - 4);
              ctx.fillRect(px + rx, py + ry, 2, 4);
            }
          }
          
          if (tile === 6) {
            // Sand speckles
            ctx.fillStyle = '#eab308';
            for(let i=0; i<5; i++) {
              let rx = pseudoRandom(x, y+i) * (TILE_SIZE - 2);
              let ry = pseudoRandom(x+i, y) * (TILE_SIZE - 2);
              ctx.fillRect(px + rx, py + ry, 2, 2);
            }
          }

          if (tile === 2 || tile === 7) {
            // Water waves
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            let waveOffset = Math.sin(this.globalTime * 2 + x * 0.5 + y * 0.5) * 4;
            ctx.fillRect(px + 4 + waveOffset, py + 8, 12, 2);
            ctx.fillRect(px + 16 - waveOffset, py + 20, 10, 2);
          }

          if (tile === 1) {
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
          
          if (tile === 8) {
            // Mountain shadow
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.beginPath(); ctx.ellipse(px + 16, py + 28, 18, 8, 0, 0, Math.PI*2); ctx.fill();
            // Base
            ctx.fillStyle = '#57534e';
            ctx.beginPath(); ctx.moveTo(px + 16, py - 12); ctx.lineTo(px + 36, py + 32); ctx.lineTo(px - 4, py + 32); ctx.fill();
            // Snow cap
            ctx.fillStyle = '#e7e5e4';
            ctx.beginPath(); ctx.moveTo(px + 16, py - 12); ctx.lineTo(px + 24, py + 6); ctx.lineTo(px + 16, py + 10); ctx.lineTo(px + 8, py + 6); ctx.fill();
          }
        }

        // Draw hover highlight
        if (x === this.hoverX && y === this.hoverY) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 2;
          ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    // Draw Entities
    for (const ent of this.entities) {
      if (ent.gridX >= startCol && ent.gridX <= endCol && ent.gridY >= startRow && ent.gridY <= endRow) {
        const px = ent.pixelX;
        const py = ent.pixelY;
        
        if (this.spriteImages[ent.type]) {
          ctx.drawImage(this.spriteImages[ent.type], px, py, TILE_SIZE, TILE_SIZE);
        } else {
          // Shadow
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          ctx.beginPath(); ctx.ellipse(px + 16, py + 28, 10, 5, 0, 0, Math.PI*2); ctx.fill();

          if (ent.type === 'sheep') {
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
            // Cloak
            ctx.fillStyle = '#9f1239'; // red cloak
            ctx.beginPath(); ctx.moveTo(px + 16, py + 8); ctx.lineTo(px + 24, py + 28); ctx.lineTo(px + 8, py + 28); ctx.fill();
            // Head
            ctx.fillStyle = '#fcd34d'; // skin
            ctx.beginPath(); ctx.arc(px + 16, py + 10, 6, 0, Math.PI*2); ctx.fill();
            // Hood
            ctx.fillStyle = '#881337';
            ctx.beginPath(); ctx.arc(px + 16, py + 8, 7, Math.PI, 0); ctx.fill();
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
          } else if (ent.type === 'fire') {
            ctx.fillStyle = '#f97316';
            ctx.beginPath(); ctx.moveTo(px + 16, py + 8); ctx.lineTo(px + 24, py + 28); ctx.lineTo(px + 8, py + 28); ctx.fill();
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
    }

    // Draw path highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    for (const step of this.player.path) {
      ctx.beginPath();
      ctx.arc(step.x * TILE_SIZE + 16, step.y * TILE_SIZE + 16, 6, 0, Math.PI*2);
      ctx.fill();
    }

    // Draw Player
    const px = this.player.pixelX;
    const py = this.player.pixelY;

    if (this.spriteImages['player']) {
      ctx.drawImage(this.spriteImages['player'], px, py, TILE_SIZE, TILE_SIZE);
    } else {
      // Player Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.ellipse(px + 16, py + 28, 10, 5, 0, 0, Math.PI*2); ctx.fill();
      
      // Player Body (Cloak)
      ctx.fillStyle = '#6366f1'; // Indigo cloak
      ctx.beginPath(); 
      ctx.moveTo(px + 16, py + 8); 
      ctx.lineTo(px + 24, py + 28); 
      ctx.lineTo(px + 8, py + 28); 
      ctx.fill();
      
      // Head
      ctx.fillStyle = '#fcd34d'; // Skin
      ctx.beginPath(); ctx.arc(px + 16, py + 10, 6, 0, Math.PI*2); ctx.fill();
      
      // Hood
      ctx.fillStyle = '#4f46e5';
      ctx.beginPath(); ctx.arc(px + 16, py + 8, 7, Math.PI, 0); ctx.fill();

      // Direction indicator (eyes/face)
      ctx.fillStyle = '#1e1b4b';
      if (this.player.direction === 'down') {
        ctx.fillRect(px + 13, py + 9, 2, 2);
        ctx.fillRect(px + 17, py + 9, 2, 2);
      } else if (this.player.direction === 'left') {
        ctx.fillRect(px + 11, py + 9, 2, 2);
      } else if (this.player.direction === 'right') {
        ctx.fillRect(px + 19, py + 9, 2, 2);
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
          ctx.arc(ff.x, ff.y, 1.5, 0, Math.PI * 2);
          ctx.fill();
          
          // Glow
          const glow = ctx.createRadialGradient(ff.x, ff.y, 0, ff.x, ff.y, 8);
          glow.addColorStop(0, `rgba(167, 243, 208, ${alpha * 0.5})`);
          glow.addColorStop(1, 'rgba(167, 243, 208, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(ff.x, ff.y, 8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.restore();

    // Day/Night Cycle Overlay
    if (darkness > 0) {
      ctx.fillStyle = `rgba(10, 10, 30, ${darkness})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add a soft light around the player at night
      if (darkness > 0.3) {
        const playerScreenX = px + cameraX + 16;
        const playerScreenY = py + cameraY + 16;
        
        const gradient = ctx.createRadialGradient(
          playerScreenX, playerScreenY, 0,
          playerScreenX, playerScreenY, 150
        );
        gradient.addColorStop(0, `rgba(255, 200, 100, ${darkness * 0.5})`);
        gradient.addColorStop(1, 'rgba(255, 200, 100, 0)');
        
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(playerScreenX, playerScreenY, 150, 0, Math.PI * 2);
        ctx.fill();
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
