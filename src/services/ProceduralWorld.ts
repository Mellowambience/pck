import type { DMResponse } from './DungeonMaster';

// Local procedural algorithm to save tokens
export function generateProceduralResponse(x: number, y: number, clickedTile: number, playerPos: {x: number, y: number}): DMResponse {
  const updates: {x: number, y: number, tileType: number}[] = [];
  const neighbors = [
    {dx: 0, dy: -1}, {dx: 1, dy: 0}, {dx: 0, dy: 1}, {dx: -1, dy: 0},
    {dx: -1, dy: -1}, {dx: 1, dy: -1}, {dx: -1, dy: 1}, {dx: 1, dy: 1}
  ];

  switch (clickedTile) {
    case 0:
      updates.push({ x, y, tileType: Math.random() > 0.7 ? 1 : 3 });
      break;
    case 1:
      updates.push({ x, y, tileType: 0 });
      break;
    case 2: {
      const n = neighbors[Math.floor(Math.random() * 4)];
      updates.push({ x: x + n.dx, y: y + n.dy, tileType: 2 });
      if (Math.random() > 0.8) updates.push({ x, y, tileType: 7 });
      break;
    }
    case 3:
      updates.push({ x, y, tileType: 6 });
      break;
    case 4:
      updates.push({ x, y, tileType: 8 });
      break;
    case 6:
      updates.push({ x, y, tileType: 0 });
      break;
    case 7:
      updates.push({ x, y, tileType: 2 });
      break;
    case 8: {
      updates.push({ x, y, tileType: 4 });
      const n2 = neighbors[Math.floor(Math.random() * 8)];
      updates.push({ x: x + n2.dx, y: y + n2.dy, tileType: 4 });
      break;
    }
    default:
      updates.push({ x, y, tileType: Math.floor(Math.random() * 9) });
  }

  const solidTiles = [1, 2, 4, 5, 7, 8];
  const safeUpdates = updates.filter(u => {
    const isPlayerPos = u.x === playerPos.x && u.y === playerPos.y;
    const isSolid = solidTiles.includes(u.tileType);
    return !(isPlayerPos && isSolid);
  });

  return { mapUpdates: safeUpdates };
}
