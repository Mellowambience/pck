import React from 'react';
import { Sun, Moon } from 'lucide-react';

interface ClockProps {
  time: number; // 0 to 1
}

export const Clock: React.FC<ClockProps> = ({ time }) => {
  const isDay = time > 0.25 && time < 0.75;
  
  // Map 0-1 to 00:00 - 23:59
  const totalMinutes = Math.floor(time * 24 * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full shadow-lg">
      {isDay ? (
        <Sun className="w-3.5 h-3.5 text-yellow-400" />
      ) : (
        <Moon className="w-3.5 h-3.5 text-indigo-300" />
      )}
      <span className="text-[10px] font-mono font-bold text-white tracking-widest">
        {formattedTime}
      </span>
    </div>
  );
};
