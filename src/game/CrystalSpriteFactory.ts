export type SpriteRows = string[];

function remapRows(rows: SpriteRows, mapping: Record<string, string>): SpriteRows {
  return rows.map((row) =>
    row
      .split("")
      .map((char) => mapping[char] ?? char)
      .join("")
  );
}

const PLAYER_FRONT_TEMPLATE: SpriteRows = [
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
];

const PLAYER_BACK_TEMPLATE: SpriteRows = [
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
];

const PLAYER_SIDE_TEMPLATE: SpriteRows = [
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
];

const TRAVELER_FRONT_TEMPLATE = remapRows(PLAYER_FRONT_TEMPLATE, {
  '0': '1',
  '1': '0',
  '2': '2',
  '3': '3',
});

const SHEEP_TEMPLATE: SpriteRows = [
  '                ',
  '    00000000    ',
  '   0010101000   ',
  '  001111111100  ',
  '  011111111110  ',
  '  011101110110  ',
  '  011111111110  ',
  '   0011111100   ',
  '    33300333    ',
  '   333000333    ',
  '   330323033    ',
  '   333333333    ',
  '    33    33    ',
  '    33    33    ',
  '    33    33    ',
  '                ',
];

const ROSE_TEMPLATE: SpriteRows = [
  '                ',
  '      11        ',
  '     1001       ',
  '    101101      ',
  '    100001      ',
  '    101101      ',
  '     1221       ',
  '      22        ',
  '      22        ',
  '     232        ',
  '    2232        ',
  '   22222        ',
  '  223222        ',
  '   22222        ',
  '      2         ',
  '                ',
];

const SHRINE_TEMPLATE: SpriteRows = [
  '       33       ',
  '      3333      ',
  '    33333333    ',
  '   3311111133   ',
  '  331122221133  ',
  '  331122221133  ',
  '  331122221133  ',
  '  331122221133  ',
  '  331122221133  ',
  '  331122221133  ',
  '  331122221133  ',
  '  333322223333  ',
  '   3333333333   ',
  '    33    33    ',
  '   333    333   ',
  '                ',
];

const CRYSTAL_TEMPLATE: SpriteRows = [
  '       33       ',
  '      3113      ',
  '     311113     ',
  '    31122113    ',
  '   3111221113   ',
  '   3111111113   ',
  '  311100111113  ',
  '  311100011113  ',
  '  311110011113  ',
  '   3111111113   ',
  '   3111111113   ',
  '    31111113    ',
  '     311113     ',
  '      3113      ',
  '       33       ',
  '                ',
];

const FIRE_TEMPLATE: SpriteRows = [
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
  '  001233221100  ',
  '  001333331100  ',
  '   003333300    ',
  '    003300      ',
  '                ',
];

const SIGN_TEMPLATE: SpriteRows = [
  '                ',
  '    3333333     ',
  '   322222223    ',
  '   321111123    ',
  '   321111123    ',
  '   321111123    ',
  '   322222223    ',
  '    3333333     ',
  '      33        ',
  '      33        ',
  '      33        ',
  '      33        ',
  '      33        ',
  '      33        ',
  '      33        ',
  '                ',
];

const LEYLINE_TEMPLATE: SpriteRows = [
  '                ',
  '      0000      ',
  '    00111100    ',
  '   0011221100   ',
  '   0110000110   ',
  '  011003300110  ',
  '  011001100110  ',
  '  011011010110  ',
  '  011001100110  ',
  '  011003300110  ',
  '   0110000110   ',
  '   0011221100   ',
  '    00111100    ',
  '      0000      ',
  '                ',
  '                ',
];

const DEMON_TEMPLATE: SpriteRows = [
  '   3         3  ',
  '  333       333 ',
  ' 33 33333333 33 ',
  ' 33 32222223 33 ',
  ' 333333333333333',
  ' 33 11333311 33 ',
  ' 33 10333301 33 ',
  ' 33 11333311 33 ',
  ' 333333333333333',
  ' 33 33333333 33 ',
  '  33323333333 3 ',
  '   3333333333   ',
  '   33       33  ',
  '   33       33  ',
  '  333       333 ',
  '                ',
];

export const CRYSTAL_SPRITE_ROWS = {
  playerDown: PLAYER_FRONT_TEMPLATE,
  playerUp: PLAYER_BACK_TEMPLATE,
  playerLeft: PLAYER_SIDE_TEMPLATE,
  traveler: TRAVELER_FRONT_TEMPLATE,
  sheep: SHEEP_TEMPLATE,
  rose: ROSE_TEMPLATE,
  shrine: SHRINE_TEMPLATE,
  crystal: CRYSTAL_TEMPLATE,
  fire: FIRE_TEMPLATE,
  sign: SIGN_TEMPLATE,
  leyline: LEYLINE_TEMPLATE,
  demon: DEMON_TEMPLATE,
} as const;

export const CRYSTAL_SPRITE_EXPORTS = {
  player: { rows: CRYSTAL_SPRITE_ROWS.playerDown, paletteKey: 'PLAYER' },
  traveler: { rows: CRYSTAL_SPRITE_ROWS.traveler, paletteKey: 'TRAVELER' },
  sheep: { rows: CRYSTAL_SPRITE_ROWS.sheep, paletteKey: 'SHEEP' },
  rose: { rows: CRYSTAL_SPRITE_ROWS.rose, paletteKey: 'ROSE' },
  shrine: { rows: CRYSTAL_SPRITE_ROWS.shrine, paletteKey: 'SHRINE' },
  crystal: { rows: CRYSTAL_SPRITE_ROWS.crystal, paletteKey: 'CRYSTAL' },
  fire: { rows: CRYSTAL_SPRITE_ROWS.fire, paletteKey: 'FIRE' },
  sign: { rows: CRYSTAL_SPRITE_ROWS.sign, paletteKey: 'SIGN' },
  leyline: { rows: CRYSTAL_SPRITE_ROWS.leyline, paletteKey: 'LEYLINE' },
  demon: { rows: CRYSTAL_SPRITE_ROWS.demon, paletteKey: 'DEMON' },
} as const;
