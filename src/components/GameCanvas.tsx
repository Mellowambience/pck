import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { GameEngine } from '../game/Engine';

interface Props {
  onInteract: (x: number, y: number, tileType: number) => void;
  onEntityInteract: (entity: any) => void;
  onRoseCollected?: (count: number) => void;
  onLeylineHealed?: (count: number) => void;
  onEncounter?: (creature: any) => void;
  onBiomeChange?: (biome: string) => void;
  apiKey?: string;
}

export interface GameCanvasRef {
  updateMap: (updates: {x: number, y: number, tileType: number}[]) => void;
  getMapWindow: (x: number, y: number, radius: number) => {x: number, y: number, type: number}[];
  getPlayerPosition: () => { x: number, y: number };
  spawnEntity: (x: number, y: number, type: 'rose' | 'sheep' | 'shrine' | 'crystal' | 'fire' | 'sign' | 'leyline' | 'demon', name?: string, isCorrupted?: boolean) => void;
  getMinimapData: (radius: number) => number[];
  getTimeOfDay: () => number;
  resumeGame: () => void;
}

export const GameCanvas = forwardRef<GameCanvasRef, Props>(({ onInteract, onEntityInteract, onRoseCollected, onLeylineHealed, onEncounter, onBiomeChange, apiKey }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const onInteractRef = useRef(onInteract);
  const onEntityInteractRef = useRef(onEntityInteract);
  const onRoseCollectedRef = useRef(onRoseCollected);
  const onLeylineHealedRef = useRef(onLeylineHealed);
  const onEncounterRef = useRef(onEncounter);
  const onBiomeChangeRef = useRef(onBiomeChange);

  useEffect(() => {
    onInteractRef.current = onInteract;
  }, [onInteract]);

  useEffect(() => {
    onEntityInteractRef.current = onEntityInteract;
  }, [onEntityInteract]);

  useEffect(() => {
    onRoseCollectedRef.current = onRoseCollected;
  }, [onRoseCollected]);

  useEffect(() => {
    onLeylineHealedRef.current = onLeylineHealed;
  }, [onLeylineHealed]);

  useEffect(() => {
    onEncounterRef.current = onEncounter;
    onBiomeChangeRef.current = onBiomeChange;
  }, [onEncounter, onBiomeChange]);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    const resizeCanvas = () => {
      if (canvasRef.current && canvasRef.current.parentElement) {
        canvasRef.current.width = canvasRef.current.parentElement.clientWidth;
        canvasRef.current.height = canvasRef.current.parentElement.clientHeight;
      }
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const engine = new GameEngine(
      canvasRef.current, 
      (x, y, t) => onInteractRef.current(x, y, t),
      (entity) => onEntityInteractRef.current(entity),
      (creature) => onEncounterRef.current?.(creature),
      apiKey,
      (biome) => onBiomeChangeRef.current?.(biome)
    );
    engine.onRoseCollected = (count) => onRoseCollectedRef.current?.(count);
    engine.onLeylineHealed = (count) => onLeylineHealedRef.current?.(count);
    engine.start();
    engineRef.current = engine;

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      engine.cleanup();
    };
  }, []);

  useImperativeHandle(ref, () => ({
    updateMap: (updates) => {
      if (engineRef.current) {
        const engine = engineRef.current;
        const solidTiles = [2, 4]; // Water, Tree
        
        let pathBlocked = false;

        for (const update of updates) {
          // Prevent placing solid tiles directly on the player
          if (update.x === engine.player.gridX && update.y === engine.player.gridY && solidTiles.includes(update.tileType)) {
            continue; // Skip this update to avoid trapping the player
          }
          
          engine.setTile(update.x, update.y, update.tileType);

          // Check if the update blocks the player's current path
          if (solidTiles.includes(update.tileType)) {
            for (const step of engine.player.path) {
              if (step.x === update.x && step.y === update.y) {
                pathBlocked = true;
              }
            }
          }
        }

        // If a new solid tile blocks the path, stop the player after their current step
        if (pathBlocked) {
          engine.player.path = [];
        }
      }
    },
    getMapWindow: (x, y, radius) => {
      const window = [];
      if (engineRef.current) {
        const engine = engineRef.current;
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            window.push({ x: nx, y: ny, type: engine.getTile(nx, ny) });
          }
        }
      }
      return window;
    },
    getPlayerPosition: () => {
      if (engineRef.current) {
        return { x: engineRef.current.player.gridX, y: engineRef.current.player.gridY };
      }
      return { x: 0, y: 0 };
    },
    spawnEntity: (x, y, type, name, isCorrupted) => {
      if (engineRef.current) {
        engineRef.current.spawnEntity(x, y, type, name, isCorrupted);
      }
    },
    getMinimapData: (radius) => {
      if (engineRef.current) {
        return engineRef.current.getMinimapData(radius);
      }
      return [];
    },
    getTimeOfDay: () => {
      if (engineRef.current) {
        return engineRef.current.getTimeOfDay();
      }
      return 0;
    },
    resumeGame: () => {
      if (engineRef.current) {
        engineRef.current.isPaused = false;
      }
    }
  }));

  const getCoordinates = (e: React.MouseEvent | React.PointerEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleClick = (e: React.MouseEvent) => {
    const { x, y } = getCoordinates(e);
    engineRef.current?.handleCanvasClick(x, y);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const { x, y } = getCoordinates(e);
    engineRef.current?.handleMouseMove(x, y);
  };

  return (
    <div className="w-full h-full overflow-hidden">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        className="bg-black cursor-pointer block"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
});
