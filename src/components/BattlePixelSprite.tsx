import React, { useEffect, useRef } from 'react';
import { drawPixelSprite, type Palette, type PixelSprite } from '../game/PixelArt';

interface BattlePixelSpriteProps {
  sprite: PixelSprite;
  palette: Palette;
  size?: number;
  flipped?: boolean;
}

export function BattlePixelSprite({ sprite, palette, size = 8, flipped = false }: BattlePixelSpriteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 16 * size;
    canvas.height = 16 * size;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    drawPixelSprite(ctx, sprite, palette, 0, 0, size, flipped);
  }, [sprite, palette, size, flipped]);

  return <canvas ref={canvasRef} className="block" style={{ imageRendering: 'pixelated' }} />;
}
