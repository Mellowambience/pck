import React from 'react';

interface MinimapProps {
  data: number[];
  radius: number;
}

export const Minimap: React.FC<MinimapProps> = ({ data, radius }) => {
  const size = radius * 2 + 1;
  
  const getTileColor = (tile: number) => {
    switch (tile) {
      case 0: return '#4ade80'; // Grass
      case 1: return '#166534'; // Tree
      case 2: return '#3b82f6'; // Water
      case 3: return '#d6d3d1'; // Path
      case 4: return '#78716c'; // Wall
      case 5: return '#8b5cf6'; // Door
      case 6: return '#fde047'; // Sand
      case 7: return '#1e3a8a'; // Deep Water
      case 8: return '#44403c'; // Mountain
      default: return '#000';
    }
  };

  return (
    <div 
      className="grid gap-[1px] bg-black/20 p-1 rounded-lg border border-white/10"
      style={{ 
        gridTemplateColumns: `repeat(${size}, 1fr)`,
        width: '120px',
        height: '120px'
      }}
    >
      {data.map((tile, i) => (
        <div 
          key={i} 
          style={{ backgroundColor: getTileColor(tile) }}
          className={`w-full h-full rounded-[1px] ${i === Math.floor(data.length / 2) ? 'ring-1 ring-white scale-125 z-10' : ''}`}
        />
      ))}
    </div>
  );
};
