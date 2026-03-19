import React, { useState, useRef, useEffect } from 'react';
import { GameCanvas, GameCanvasRef } from './components/GameCanvas';
import { generateDMResponse, generateProceduralResponse, generateNPCResponse } from './services/DungeonMaster';
import { tileNames } from './game/MapData';
import { Sparkles, Zap, MessageSquare, X, Send, Key, Image as ImageIcon } from 'lucide-react';
import { AssetStudio } from './components/AssetStudio';

export default function App() {
  const [isThinking, setIsThinking] = useState(false);
  const [resonance, setResonance] = useState(0);
  
  // Chat State
  const [activeNPC, setActiveNPC] = useState<any>(null);
  const [chatHistory, setChatHistory] = useState<{role: string, text: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [showAssetStudio, setShowAssetStudio] = useState(false);
  const [apiKey, setApiKey] = useState(process.env.GEMINI_API_KEY || "");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const gameRef = useRef<GameCanvasRef>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSpritesUpdated = () => {
    if (gameRef.current) {
      // Force the game engine to reload sprites
      // We can do this by calling a method on the ref if we expose it, 
      // or just re-mounting the canvas, but exposing a method is better.
      // For now, we'll just let the user refresh or we can add a reload method to GameCanvasRef.
      // Let's add a reloadSprites method to GameCanvasRef.
      gameRef.current.reloadSprites();
    }
  };

  const handleEntityInteract = (entity: any) => {
    setActiveNPC(entity);
    if (entity.type === 'sheep') {
      setChatHistory([{ role: 'npc', text: 'Baa.' }]);
    } else {
      setChatHistory([{ role: 'npc', text: 'Greetings, traveler. What brings you to these parts?' }]);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeNPC || activeNPC.type === 'sheep') return;
    
    const userMsg = chatInput;
    setChatInput("");
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsChatting(true);
    
    const localMap = gameRef.current?.getMapWindow(activeNPC.gridX, activeNPC.gridY, 3) || [];
    const localMapStr = localMap.map(t => `(${t.x},${t.y}): ${tileNames[t.type]}`).join(', ');
    
    const response = await generateNPCResponse(activeNPC.name, activeNPC.type, userMsg, localMapStr, apiKey);
    setChatHistory(prev => [...prev, { role: 'npc', text: response }]);
    setIsChatting(false);
  };

  const handleInteract = async (x: number, y: number, tileType: number) => {
    if (isThinking || activeNPC) return; // Prevent spamming clicks while AI is thinking or chatting

    const playerPos = gameRef.current?.getPlayerPosition() || { x: 0, y: 0 };

    if (resonance < 100) {
      // Local Procedural Update (Saves Tokens)
      const response = generateProceduralResponse(x, y, tileType, playerPos);
      if (response.mapUpdates && response.mapUpdates.length > 0) {
        gameRef.current?.updateMap(response.mapUpdates);
      }
      // Increase resonance. Every 4-5 clicks triggers an Atlas Event.
      setResonance(prev => Math.min(100, prev + 25)); 
    } else {
      // Atlas Event (Gemini API Call)
      setIsThinking(true);
      try {
        const localMap = gameRef.current?.getMapWindow(x, y, 2) || [];
        const response = await generateDMResponse(x, y, tileType, "", localMap, playerPos, apiKey);
        
        if (response.mapUpdates && response.mapUpdates.length > 0) {
          gameRef.current?.updateMap(response.mapUpdates);
        }
        setResonance(0); // Reset after a major shift
      } catch (e) {
        console.error("Atlas connection lost", e);
      }
      setIsThinking(false);
    }
  };

  return (
    <div className="h-screen w-full bg-neutral-950 relative font-sans text-neutral-200 overflow-hidden">
      {/* Game Area */}
      <GameCanvas ref={gameRef} onInteract={handleInteract} onEntityInteract={handleEntityInteract} />
      
      {/* Settings Button */}
      <div className="absolute top-6 left-6 flex flex-col gap-3 z-50">
        <button 
          onClick={() => setShowApiConfig(true)}
          className="p-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          title="API Configuration"
        >
          <Key className="w-5 h-5" />
        </button>
        <button 
          onClick={() => setShowAssetStudio(true)}
          className="p-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Asset Studio"
        >
          <ImageIcon className="w-5 h-5" />
        </button>
      </div>

      {/* API Config Modal */}
      {showApiConfig && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-medium text-white">API Configuration</h2>
              <button 
                onClick={() => setShowApiConfig(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">
                  Gemini API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50"
                />
                <p className="text-xs text-neutral-500 mt-2">
                  Used for NPC dialogue and Atlas Events. If left blank, the game will use procedural fallbacks.
                </p>
              </div>
              
              <button
                onClick={() => setShowApiConfig(false)}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg transition-colors"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Asset Studio Modal */}
      {showAssetStudio && (
        <AssetStudio 
          onClose={() => setShowAssetStudio(false)} 
          apiKey={apiKey} 
          onSpritesUpdated={handleSpritesUpdated} 
        />
      )}

      {/* Subtle Loading Indicator */}
      {isThinking && (
        <div className="absolute top-6 right-6 bg-black/40 backdrop-blur-md border border-indigo-500/20 px-4 py-2 rounded-full flex items-center gap-3 z-50 shadow-lg">
          <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
          <span className="text-xs font-medium tracking-widest uppercase text-indigo-300/80">Reality Shifting...</span>
        </div>
      )}

      {/* Resonance Meter */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-40 pointer-events-none">
        <div className="flex items-center gap-2">
          <Zap className={`w-4 h-4 ${resonance >= 100 ? 'text-indigo-400 animate-pulse' : 'text-neutral-600'}`} />
          <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${resonance >= 100 ? 'text-indigo-300' : 'text-neutral-500'}`}>
            {resonance >= 100 ? 'Atlas Alignment Critical' : 'World Resonance'}
          </span>
        </div>
        <div className="w-64 h-1.5 bg-neutral-900 rounded-full overflow-hidden border border-white/5 shadow-inner">
          <div 
            className={`h-full transition-all duration-500 ease-out ${resonance >= 100 ? 'bg-indigo-400 shadow-[0_0_12px_rgba(129,140,248,0.8)]' : 'bg-indigo-900'}`}
            style={{ width: `${resonance}%` }}
          />
        </div>
      </div>

      {/* NPC Chat Overlay */}
      {activeNPC && (
        <div className="absolute inset-x-0 bottom-0 top-auto md:top-0 md:bottom-auto md:inset-y-0 md:right-0 md:left-auto md:w-[400px] bg-neutral-900/95 backdrop-blur-xl border-t md:border-t-0 md:border-l border-white/10 z-50 flex flex-col shadow-2xl transition-all duration-300">
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-900/50 flex items-center justify-center border border-indigo-500/30">
                <MessageSquare className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-white font-medium">{activeNPC.name}</h3>
                <p className="text-xs text-neutral-400 capitalize">{activeNPC.type}</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveNPC(null)}
              className="p-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[40vh] md:max-h-none custom-scrollbar">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-br-sm' 
                    : 'bg-neutral-800 text-neutral-200 rounded-bl-sm border border-white/5'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isChatting && (
              <div className="flex justify-start">
                <div className="bg-neutral-800 text-neutral-400 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm border border-white/5 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {activeNPC.type !== 'sheep' && (
            <form onSubmit={handleSendMessage} className="p-4 bg-black/40 border-t border-white/10">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Say something..."
                  className="w-full bg-neutral-800 border border-white/10 rounded-full pl-4 pr-12 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  disabled={isChatting}
                />
                <button 
                  type="submit"
                  disabled={!chatInput.trim() || isChatting}
                  className="absolute right-2 p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-700 disabled:text-neutral-500 text-white rounded-full transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
