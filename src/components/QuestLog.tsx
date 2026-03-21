import React from 'react';

export interface Quest {
  id: string;
  title: string;
  progress: number;
  goal: number;
  completed: boolean;
}

interface QuestLogProps {
  quests: Quest[];
}

export const QuestLog: React.FC<QuestLogProps> = ({ quests }) => {
  return (
    <div className="bg-black/35 backdrop-blur-md border border-white/10 p-4 rounded-2xl w-72 shadow-xl pointer-events-auto space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-full bg-sky-300" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-sky-300">Quest Log</h3>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {quests.map((quest) => (
          <div key={quest.id} className="rounded-lg border border-white/10 p-2">
            <div className="text-xs font-semibold text-white">{quest.title}</div>
            <div className="text-[10px] text-neutral-300">{quest.progress}/{quest.goal}</div>
            <div className="w-full h-1 bg-white/10 rounded mt-1">
              <div style={{ width: `${Math.min(100, (quest.progress/quest.goal) * 100)}%`, height: '100%', backgroundColor: quest.completed ? '#34d399' : '#38bdf8', borderRadius:'9999px' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
