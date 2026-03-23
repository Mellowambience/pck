// ============================================================
// Aetherhaven — GBC-style Pixel Art Renderer
// Pokémon Crystal / Yellow inspired palettes & sprites
// ============================================================

export const PAL = {
  GRASS:       ['#c8e890', '#88c070', '#408060', '#204830'] as const,
  TALL_GRASS:  ['#a0d058', '#68b038', '#307030', '#184818'] as const,
  TREE:        ['#88c070', '#408060', '#204830', '#102818'] as const,
  WATER:       ['#98d8f8', '#58a8e8', '#2870c0', '#103860'] as const,
  DEEP_WATER:  ['#78b8e8', '#3870c0', '#183890', '#081840'] as const,
  PATH:        ['#f0e0b8', '#d0b878', '#a07840', '#604820'] as const,
  SAND:        ['#f8d878', '#e0b040', '#a87820', '#604010'] as const,
  WALL:        ['#d0c8b8', '#988870', '#605040', '#302820'] as const,
  MOUNTAIN:    ['#e8e0d0', '#b0a890', '#786858', '#402820'] as const,
  DOOR:        ['#c89050', '#906030', '#583010', '#301808'] as const,
  PLAYER:      ['#f8f8d8', '#f0c040', '#c06030', '#501810'] as const,
  TRAVELER:    ['#c8f0c8', '#60c860', '#287830', '#0c3810'] as const,
  SHEEP:       ['#f8f8f8', '#d8d8c8', '#988870', '#504838'] as const,
  ROSE:        ['#f8a8c8', '#e83870', '#901840', '#500818'] as const,
  SHRINE:      ['#d8c8f8', '#9070e0', '#503090', '#281848'] as const,
  CRYSTAL:     ['#f0c8f8', '#c060e8', '#782098', '#380848'] as const,
  FIRE:        ['#f8e878', '#f8b028', '#e04810', '#780808'] as const,
  LEYLINE:     ['#c8f0f8', '#50c8e8', '#1878b0', '#083048'] as const,
  DEMON:       ['#d8a8d8', '#903090', '#481058', '#200828'] as const,
  SIGN:        ['#f0d898', '#c09050', '#785030', '#382010'] as const,
};

export type Palette = readonly [string, string, string, string];
export type PixelSprite = Uint8Array;

export function drawPixelSprite(
  ctx: CanvasRenderingContext2D,
  sprite: PixelSprite,
  pal: Palette,
  px: number,
  py: number,
  S: number = 2,
  flipX = false
) {
  for (let i = 0; i < 256; i++) {
    const ci = sprite[i];
    if (ci === 255) continue;
    ctx.fillStyle = pal[ci];
    const lx = i % 16;
    const ly = Math.floor(i / 16);
    const sx = flipX ? (15 - lx) : lx;
    ctx.fillRect(px + sx * S, py + ly * S, S, S);
  }
}

export function buildSprite(rows: string[]): PixelSprite {
  const arr = new Uint8Array(256).fill(255);
  for (let y = 0; y < 16; y++) {
    const row = rows[y] || '';
    for (let x = 0; x < 16; x++) {
      const c = row[x] ?? ' ';
      if (c === ' ') arr[y * 16 + x] = 255;
      else arr[y * 16 + x] = parseInt(c, 10) & 3;
    }
  }
  return arr;
}

// ── Tile draw functions ──────────────────────────────────────

export function drawGrassTile(ctx: CanvasRenderingContext2D, px: number, py: number, TS: number, pr: (x: number, y: number) => number, gx: number, gy: number) {
  ctx.fillStyle = PAL.GRASS[1];
  ctx.fillRect(px, py, TS, TS);
  ctx.fillStyle = PAL.GRASS[0];
  for (let dy = 0; dy < TS; dy += 8)
    for (let dx = 0; dx < TS; dx += 8)
      if ((dx / 8 + dy / 8) % 2 === 0) ctx.fillRect(px + dx, py + dy, 8, 8);
  ctx.fillStyle = PAL.GRASS[2];
  for (let i = 0; i < 3; i++) {
    const bx = Math.floor(pr(gx * 7 + i, gy) * (TS - 4));
    const by = Math.floor(pr(gx, gy * 7 + i) * (TS - 6));
    ctx.fillRect(px + bx, py + by, 2, 4);
    ctx.fillRect(px + bx + 1, py + by - 2, 2, 3);
  }
}

export function drawTallGrassTile(ctx: CanvasRenderingContext2D, px: number, py: number, TS: number, pr: (x: number, y: number) => number, gx: number, gy: number, t: number) {
  ctx.fillStyle = PAL.TALL_GRASS[2];
  ctx.fillRect(px, py, TS, TS);
  ctx.fillStyle = PAL.TALL_GRASS[1];
  for (let dy = 0; dy < TS; dy += 8)
    for (let dx = 0; dx < TS; dx += 8)
      if ((dx / 8 + dy / 8) % 2 === 0) ctx.fillRect(px + dx, py + dy, 8, 8);
  ctx.fillStyle = PAL.TALL_GRASS[0];
  for (let i = 0; i < 5; i++) {
    const bx = Math.floor(pr(gx + i * 3, gy) * (TS - 4));
    const by = Math.floor(pr(gx, gy + i * 3) * (TS - 10));
    const sway = Math.round(Math.sin(t * 2 + bx) * 1);
    ctx.fillRect(px + bx + sway, py + by, 2, 10);
    ctx.fillRect(px + bx + sway + 1, py + by, 2, 7);
  }
  ctx.fillStyle = PAL.TALL_GRASS[3];
  for (let i = 0; i < 3; i++) {
    const bx = Math.floor(pr(gx * 3 + i, gy * 3) * (TS - 4));
    const by = Math.floor(pr(gx * 2, gy * 2 + i) * (TS - 4));
    ctx.fillRect(px + bx, py + by, 2, 4);
  }
}

export function drawWaterTile(ctx: CanvasRenderingContext2D, px: number, py: number, TS: number, gx: number, gy: number, t: number) {
  ctx.fillStyle = PAL.WATER[2];
  ctx.fillRect(px, py, TS, TS);
  const wave = Math.round(Math.sin(t * 1.5 + gx * 0.8 + gy * 0.6) * 2);
  ctx.fillStyle = PAL.WATER[1];
  ctx.fillRect(px, py + 4 + wave, TS, 4);
  ctx.fillRect(px, py + 20 + wave, TS, 4);
  ctx.fillStyle = PAL.WATER[0];
  ctx.fillRect(px + 4, py + 6 + wave, TS - 8, 2);
  ctx.fillRect(px + 4, py + 22 + wave, TS - 8, 2);
  ctx.fillStyle = PAL.WATER[3];
  ctx.fillRect(px, py, TS, 2);
}

export function drawDeepWaterTile(ctx: CanvasRenderingContext2D, px: number, py: number, TS: number, gx: number, gy: number, t: number) {
  ctx.fillStyle = PAL.DEEP_WATER[3];
  ctx.fillRect(px, py, TS, TS);
  const wave = Math.round(Math.sin(t * 0.8 + gx * 0.5) * 1);
  ctx.fillStyle = PAL.DEEP_WATER[2];
  ctx.fillRect(px, py + 8 + wave, TS, 4);
  ctx.fillRect(px, py + 22 + wave, TS, 4);
  ctx.fillStyle = PAL.DEEP_WATER[1];
  ctx.fillRect(px + 6, py + 10 + wave, TS - 12, 2);
}

export function drawPathTile(ctx: CanvasRenderingContext2D, px: number, py: number, TS: number, pr: (x: number, y: number) => number, gx: number, gy: number) {
  ctx.fillStyle = PAL.PATH[1];
  ctx.fillRect(px, py, TS, TS);
  ctx.fillStyle = PAL.PATH[0];
  for (let dy = 0; dy < TS; dy += 8)
    for (let dx = 0; dx < TS; dx += 8)
      if ((dx / 8 + dy / 8) % 2 === 0) ctx.fillRect(px + dx, py + dy, 8, 8);
  ctx.fillStyle = PAL.PATH[2];
  for (let i = 0; i < 3; i++)
    ctx.fillRect(px + Math.floor(pr(gx + i, gy) * (TS - 3)), py + Math.floor(pr(gx, gy + i) * (TS - 2)), 2, 2);
}

export function drawTreeTile(ctx: CanvasRenderingContext2D, px: number, py: number, TS: number, pr: (x: number, y: number) => number, gx: number, gy: number) {
  ctx.fillStyle = PAL.GRASS[1];
  ctx.fillRect(px, py, TS, TS);
  ctx.fillStyle = PAL.TREE[3];
  ctx.fillRect(px + 10, py + 18, 12, 12);
  ctx.fillRect(px + 4, py + 2, 24, 8);
  ctx.fillRect(px + 2, py + 8, 28, 12);
  ctx.fillRect(px + 4, py + 16, 24, 4);
  ctx.fillStyle = PAL.TREE[2];
  ctx.fillRect(px + 12, py + 18, 8, 12);
  ctx.fillRect(px + 6, py + 4, 20, 6);
  ctx.fillRect(px + 4, py + 10, 24, 8);
  ctx.fillStyle = PAL.TREE[1];
  ctx.fillRect(px + 8, py + 5, 8, 4);
  ctx.fillRect(px + 6, py + 11, 14, 5);
  ctx.fillStyle = PAL.TREE[0];
  ctx.fillRect(px + 10, py + 6, 4, 2);
  ctx.fillStyle = PAL.TREE[3];
  ctx.fillRect(px, py + 28, TS, 4);
}

export function drawSandTile(ctx: CanvasRenderingContext2D, px: number, py: number, TS: number, pr: (x: number, y: number) => number, gx: number, gy: number) {
  ctx.fillStyle = PAL.SAND[1];
  ctx.fillRect(px, py, TS, TS);
  ctx.fillStyle = PAL.SAND[0];
  for (let dy = 0; dy < TS; dy += 8)
    for (let dx = 0; dx < TS; dx += 8)
      if ((dx / 8 + dy / 8) % 2 === 0) ctx.fillRect(px + dx, py + dy, 8, 8);
  ctx.fillStyle = PAL.SAND[2];
  for (let i = 0; i < 4; i++)
    ctx.fillRect(px + Math.floor(pr(gx * 5 + i, gy) * (TS - 4)), py + Math.floor(pr(gx, gy * 5 + i) * (TS - 2)), 4, 2);
}

export function drawWallTile(ctx: CanvasRenderingContext2D, px: number, py: number, TS: number) {
  ctx.fillStyle = PAL.WALL[2];
  ctx.fillRect(px, py, TS, TS);
  for (let row = 0; row < 4; row++) {
    const offset = (row % 2) * 10;
    ctx.fillStyle = PAL.WALL[1];
    for (let col = -1; col < 3; col++)
      ctx.fillRect(px + offset + col * 20, py + row * 8 + 1, 18, 6);
  }
  ctx.fillStyle = PAL.WALL[0];
  ctx.fillRect(px, py, TS, 2);
  ctx.fillStyle = PAL.WALL[3];
  ctx.fillRect(px, py + TS - 4, TS, 4);
}

export function drawMountainTile(ctx: CanvasRenderingContext2D, px: number, py: number, TS: number) {
  ctx.fillStyle = PAL.MOUNTAIN[2];
  ctx.fillRect(px, py, TS, TS);
  ctx.fillStyle = PAL.MOUNTAIN[1];
  ctx.beginPath(); ctx.moveTo(px + 16, py + 2); ctx.lineTo(px + 30, py + 30); ctx.lineTo(px + 2, py + 30); ctx.fill();
  ctx.fillStyle = PAL.MOUNTAIN[0];
  ctx.beginPath(); ctx.moveTo(px + 16, py + 2); ctx.lineTo(px + 22, py + 12); ctx.lineTo(px + 10, py + 12); ctx.fill();
  ctx.fillStyle = PAL.MOUNTAIN[3];
  ctx.fillRect(px + 14, py + 12, 2, 10);
  ctx.fillRect(px + 20, py + 18, 2, 8);
  ctx.fillRect(px + 2, py + 28, TS - 4, 4);
}

export function drawDoorTile(ctx: CanvasRenderingContext2D, px: number, py: number, TS: number) {
  ctx.fillStyle = PAL.DOOR[2];
  ctx.fillRect(px, py, TS, TS);
  ctx.fillStyle = PAL.DOOR[1];
  ctx.fillRect(px + 6, py + 4, 20, 26);
  ctx.fillStyle = PAL.DOOR[0];
  ctx.fillRect(px + 8, py + 6, 16, 22);
  ctx.fillStyle = PAL.DOOR[3];
  ctx.fillRect(px + 6, py + 4, 2, 26);
  ctx.fillRect(px + 24, py + 4, 2, 26);
  ctx.fillRect(px + 6, py + 4, 20, 2);
  ctx.fillStyle = PAL.SAND[0];
  ctx.fillRect(px + 20, py + 17, 3, 3);
}

// ── Entity sprites ────────────────────────────────────────────


export const SPRITE_PLAYER_DOWN = buildSprite([
  '     0000000    ',
  '    00222200    ',
  '   0022222200   ',
  '   0021212200   ',
  '   0022222200   ',
  '   0022122200   ',
  '   1111111111   ',
  '  111111111111  ',
  '  113333333311  ',
  '  113333333311  ',
  '  111133331111  ',
  '  111111111111  ',
  '   11222 22211  ',
  '   11222 22211  ',
  '  2222   22222  ',
  '  2222   22222  ',
]);

export const SPRITE_PLAYER_UP = buildSprite([
  '     0000000    ',
  '    00000000    ',
  '   0000000000   ',
  '   0000000000   ',
  '   0000000000   ',
  '    00000000    ',
  '   1111111111   ',
  '  111111111111  ',
  '  113333333311  ',
  '  113333333311  ',
  '  111133331111  ',
  '  111111111111  ',
  '   11222 22211  ',
  '   11222 22211  ',
  '  2222   22222  ',
  '  2222   22222  ',
]);

export const SPRITE_PLAYER_LEFT = buildSprite([
  '    0000000     ',
  '   000222200    ',
  '   002222220    ',
  '  0022122220    ',
  '  002222200     ',
  '   011111110    ',
  '  0111111110    ',
  '  0113333110    ',
  '  0113333110    ',
  '  0111111110    ',
  '  0111111110    ',
  '  0111331110    ',
  '  01122 110     ',
  '  01122 110     ',
  '  222   110     ',
  '  222   110     ',
]);

export const SPRITE_TRAVELER = buildSprite([
  '     1111111    ',
  '    10222001    ',
  '   1022222201   ',
  '   1021212201   ',
  '   1022222201   ',
  '   1022122201   ',
  '   0000000000   ',
  '  000000000000  ',
  '  002222222200  ',
  '  002222222200  ',
  '  000000000000  ',
  '  001111111100  ',
  '   0011  11000  ',
  '   0011  11000  ',
  '   3311  11333  ',
  '   3311  11333  ',
]);

export const SPRITE_SHEEP = buildSprite([
  '                ',
  '   000000000    ',
  '  00000000000   ',
  '  01010101010   ',
  '  00000000000   ',
  '  01000000010   ',
  '  00000000000   ',
  '   000000000    ',
  '    333 333     ',
  '   33333333     ',
  '   33232323     ',
  '   33333333     ',
  '    33 333      ',
  '    33 333      ',
  '    33 333      ',
  '                ',
]);

export const SPRITE_ROSE = buildSprite([
  '                ',
  '      11        ',
  '     1001       ',
  '    100001      ',
  '    100101      ',
  '    100001      ',
  '     1001       ',
  '      11        ',
  '      22        ',
  '     222        ',
  '    2222        ',
  '   22222        ',
  '  222222        ',
  '   22222        ',
  '                ',
  '                ',
]);

export const SPRITE_SHRINE = buildSprite([
  '  33          33',
  '  33          33',
  '  333        333',
  '  3333      3333',
  '  33 3333333 33 ',
  '  33  33333  33 ',
  '  33   222   33 ',
  '  33  21112  33 ',
  '  33  21112  33 ',
  '  33  21112  33 ',
  '  33   222   33 ',
  '  33         33 ',
  ' 3333        333',
  '33333        333',
  '3333          33',
  '333            3',
]);

export const SPRITE_CRYSTAL = buildSprite([
  '      33        ',
  '     3113       ',
  '    311113      ',
  '   31111113     ',
  '   31111113     ',
  '  3111111113    ',
  '  3110011113    ',
  '  3110011113    ',
  '  3111111113    ',
  '   31111113     ',
  '   31111113     ',
  '    311113      ',
  '     3113       ',
  '      33        ',
  '                ',
  '                ',
]);

export const SPRITE_FIRE = buildSprite([
  '                ',
  '       11       ',
  '      1221      ',
  '     012210     ',
  '    01122110    ',
  '   0111221100   ',
  '   0112221100   ',
  '  001122211100  ',
  '  001122211100  ',
  '  001122211100  ',
  '  001222211100  ',
  '  001222221100  ',
  '  001333331100  ',
  '   003333300    ',
  '    003300      ',
  '                ',
]);

export const SPRITE_SIGN = buildSprite([
  '                ',
  '   33333333     ',
  '  3222222233    ',
  '  3211112233    ',
  '  3211112233    ',
  '  3211112233    ',
  '  3222222233    ',
  '   33333333     ',
  '      33        ',
  '      33        ',
  '      33        ',
  '      33        ',
  '      33        ',
  '      33        ',
  '      33        ',
  '                ',
]);

export const SPRITE_LEYLINE = buildSprite([
  '                ',
  '      0000      ',
  '    00111100    ',
  '   0011111100   ',
  '   0110000110   ',
  '  011000000110  ',
  '  011001100110  ',
  '  011011010110  ',
  '  011001100110  ',
  '  011000000110  ',
  '   0110000110   ',
  '   0011111100   ',
  '    00111100    ',
  '      0000      ',
  '                ',
  '                ',
]);

export const SPRITE_DEMON = buildSprite([
  '   3         3  ',
  '  333       333 ',
  ' 33 33333333 33 ',
  ' 33 33333333 33 ',
  ' 333333333333333',
  ' 33 11333311 33 ',
  ' 33 10333301 33 ',
  ' 33 11333311 33 ',
  ' 333333333333333',
  ' 33 33333333 33 ',
  '  33333333333 3 ',
  '   3333333333   ',
  '   33       33  ',
  '   33       33  ',
  '  333       333 ',
  '                ',
]);
