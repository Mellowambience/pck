import React, { useState, useRef, useEffect } from 'react';
import { GameCanvas, GameCanvasRef } from './components/GameCanvas';
import { generateDMResponse, generateProceduralResponse, generateNPCResponse } from './services/DungeonMaster';
import { tileNames } from './game/MapData';
import { Sparkles, Zap, MessageSquare, X, Send, Key, Image as ImageIcon, Map as MapIcon } from 'lucide-react';
import { AssetStudio } from './components/AssetStudio';
import { Minimap } from './components/Minimap';
import { Clock } from './components/Clock';
import { auth, db } from './firebase';
import { signInAnonymously, onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';

export default function App() {
  const [isThinking, setIsThinking] = useState(false);
  const [resonance, setResonance] = useState(0);
  
  // Auth & Persistence State
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Chat State
  const [activeNPC, setActiveNPC] = useState<any>(null);
  const [chatHistory, setChatHistory] = useState<{role: string, text: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [showAssetStudio, setShowAssetStudio] = useState(false);
  const [roseCount, setRoseCount] = useState(0);
  const [leylinesHealed, setLeylinesHealed] = useState(0);
  const [demonsTamed, setDemonsTamed] = useState(0);
  const [apiKey, setApiKey] = useState(process.env.GEMINI_API_KEY || "");
  
  // Engine State
  const [minimapData, setMinimapData] = useState<number[]>([]);
  const [currentTime, setCurrentTime] = useState(0);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GameCanvasRef>(null);

  // Auth Setup
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        loadGameState(u.uid);
      } else {
        // Attempt anonymous sign-in, but catch errors if provider is disabled
        signInAnonymously(auth).catch(err => {
          if (err.code === 'auth/admin-restricted-operation') {
            console.warn("Anonymous auth is disabled in Firebase Console. Please enable it or use Google Login.");
          } else {
            console.error("Auth error:", err);
          }
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  // Polling for Minimap and Time
  useEffect(() => {
    const interval = setInterval(() => {
      if (gameRef.current) {
        setMinimapData(gameRef.current.getMinimapData(5));
        setCurrentTime(gameRef.current.getTimeOfDay());
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const loadGameState = async (uid: string) => {
    try {
      const docRef = doc(db, 'game_states', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setResonance(data.resonance || 0);
        setRoseCount(data.roseCount || 0);
        setLeylinesHealed(data.leylinesHealed || 0);
        setDemonsTamed(data.demonsTamed || 0);
      }
      setIsLoaded(true);
    } catch (error) {
      console.error("Error loading game state:", error);
      setIsLoaded(true);
    }
  };

  const saveGameState = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'game_states', user.uid), {
        resonance,
        roseCount,
        leylinesHealed,
        demonsTamed,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error("Error saving game state:", error);
    }
  };

  // Auto-save on state changes
  useEffect(() => {
    if (isLoaded) {
      const timer = setTimeout(saveGameState, 2000);
      return () => clearTimeout(timer);
    }
  }, [resonance, roseCount, leylinesHealed, demonsTamed, isLoaded]);

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
    if (entity.type === 'rose') return; // Roses are collected on move
    
    setActiveNPC(entity);
    if (entity.type === 'sheep') {
      setChatHistory([{ role: 'npc', text: 'Baa.' }]);
    } else if (entity.type === 'shrine') {
      setChatHistory([{ role: 'npc', text: 'The ancient stone circle hums with aetheric energy. You feel a deep connection to the world.' }]);
      setResonance(prev => Math.min(100, prev + 50));
    } else if (entity.type === 'crystal') {
      setChatHistory([{ role: 'npc', text: 'The violet crystal pulses with light. It seems to be a source of pure aether.' }]);
      setResonance(prev => Math.min(100, prev + 20));
    } else if (entity.type === 'fire') {
      setChatHistory([{ role: 'npc', text: 'The Mars-flame warms your spirit. It never seems to go out.' }]);
    } else if (entity.type === 'sign') {
      setChatHistory([{ role: 'npc', text: 'The sign reads: "Welcome to Aetherhaven. Seek the roses, find the truth."' }]);
    } else if (entity.type === 'leyline') {
      if (entity.isCorrupted) {
        if (roseCount >= 3) {
          setChatHistory([{ role: 'npc', text: 'You use 3 Mystical Roses to heal the leyline. Aether flows freely once more!' }]);
          setRoseCount(prev => prev - 3);
          setLeylinesHealed(prev => prev + 1);
          entity.isCorrupted = false;
          entity.name = "Healed Leyline";
          setResonance(prev => Math.min(100, prev + 40));
        } else {
          setChatHistory([{ role: 'npc', text: 'This leyline is dormant and corrupted by Mars-flame. You need 3 Mystical Roses to heal it.' }]);
        }
      } else {
        setChatHistory([{ role: 'npc', text: 'The leyline is vibrant and healthy. It pulses with the heartbeat of Aetherhaven.' }]);
      }
    } else if (entity.type === 'demon') {
      if (entity.isCorrupted) {
        if (roseCount >= 5) {
          setChatHistory([{ role: 'npc', text: 'You offer 5 Mystical Roses to the corrupted spirit. Its shadows fade, revealing a gentle Aether-Kin!' }]);
          setRoseCount(prev => prev - 5);
          setDemonsTamed(prev => prev + 1);
          entity.isCorrupted = false;
          entity.type = 'sheep';
          entity.name = "Tamed Spirit";
          setResonance(prev => Math.min(100, prev + 60));
        } else {
          setChatHistory([{ role: 'npc', text: 'A spirit corrupted by Mars-shadows. It growls at you. Perhaps 5 Mystical Roses could soothe its pain?' }]);
        }
      } else {
        setChatHistory([{ role: 'npc', text: 'A gentle spirit you have tamed. It seems happy.' }]);
      }
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
      // Increase resonance. Every 10 clicks triggers an Atlas Event.
      setResonance(prev => Math.min(100, prev + 10)); 
    } else {
      // Atlas Event (Gemini API Call)
      setIsThinking(true);
      try {
        const localMap = gameRef.current?.getMapWindow(x, y, 2) || [];
        const response = await generateDMResponse(x, y, tileType, "", localMap, playerPos, apiKey);
        
        if (response.mapUpdates && response.mapUpdates.length > 0) {
          gameRef.current?.updateMap(response.mapUpdates);
        }

        if (response.entityUpdates && response.entityUpdates.length > 0) {
          response.entityUpdates.forEach(ent => {
            gameRef.current?.spawnEntity(ent.x, ent.y, ent.type as any, ent.name, ent.isCorrupted);
          });
        }

        if (response.resonanceChange) {
          setResonance(prev => Math.max(0, Math.min(100, prev + response.resonanceChange!)));
        }

        if (response.narrativeResponse) {
          setChatHistory(prev => [...prev, { role: 'dm', text: response.narrativeResponse! }]);
        }

        setResonance(0); // Reset after a major shift
      } catch (e: any) {
        console.error("Atlas connection lost", e);
        
        // Check for Quota Error (429)
        const isQuotaError = e.message?.includes('429') || e.status === 'RESOURCE_EXHAUSTED';
        
        // FALLBACK: If API fails, do a procedural update
        const fallback = generateProceduralResponse(x, y, tileType, playerPos);
        if (fallback.mapUpdates) {
          gameRef.current?.updateMap(fallback.mapUpdates);
        }
        
        // Set resonance back to 90 so it doesn't immediately retry but stays close
        setResonance(90); 
        
        const errorMsg = isQuotaError 
          ? "The Atlas is resting. The world shifts by instinct alone." 
          : "The Atlas is momentarily silent. The world shifts by instinct alone.";
          
        setChatHistory(prev => [...prev, { role: 'dm', text: errorMsg }]);
      }
      setIsThinking(false);
    }
  };

  return (
    <div className="h-screen w-full bg-neutral-950 relative font-sans text-neutral-200 overflow-hidden">
      {/* Game Area */}
      <GameCanvas 
        ref={gameRef} 
        onInteract={handleInteract} 
        onEntityInteract={handleEntityInteract} 
        onRoseCollected={(count) => setRoseCount(count)}
        onLeylineHealed={(count) => setLeylinesHealed(count)}
      />

      {/* Minimap & Clock */}
      <div className="absolute bottom-6 left-6 z-40 flex flex-col gap-4 pointer-events-none">
        <Clock time={currentTime} />
        <div className="pointer-events-auto">
          <Minimap data={minimapData} radius={5} />
        </div>
      </div>
      
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
        {!user || user.isAnonymous ? (
          <button 
            onClick={handleGoogleLogin}
            className="p-2 bg-indigo-600/40 backdrop-blur-md border border-indigo-500/30 rounded-full text-indigo-300 hover:text-white hover:bg-indigo-500/40 transition-colors"
            title="Connect Google Account"
          >
            <Sparkles className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-9 h-9 rounded-full border border-emerald-500/50 overflow-hidden shadow-lg shadow-emerald-500/20" title={`Logged in as ${user.displayName}`}>
            <img src={user.photoURL || ""} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
        )}
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

      {/* Mission Log */}
      <div className="absolute top-6 right-6 flex flex-col gap-2 z-40 pointer-events-none">
        <div className="bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-2xl w-64 shadow-xl pointer-events-auto">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-300">Mission: Save Earth</h3>
          </div>
          <div className="space-y-3">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] text-neutral-400 uppercase">
                <span>Heal Leylines</span>
                <span>{leylinesHealed}/3</span>
              </div>
              <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                <div className="h-full bg-sky-500 transition-all" style={{ width: `${(leylinesHealed / 3) * 100}%` }} />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] text-neutral-400 uppercase">
                <span>Tame Spirits</span>
                <span>{demonsTamed}/2</span>
              </div>
              <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 transition-all" style={{ width: `${(demonsTamed / 2) * 100}%` }} />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] text-neutral-400 uppercase">
                <span>Preserve Land</span>
                <span>{roseCount}/10</span>
              </div>
              <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 transition-all" style={{ width: `${Math.min(100, (roseCount / 10) * 100)}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subtle Loading Indicator */}
      {isThinking && (
        <div className="absolute top-40 right-6 bg-black/40 backdrop-blur-md border border-indigo-500/20 px-4 py-2 rounded-full flex items-center gap-3 z-50 shadow-lg">
          <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
          <span className="text-xs font-medium tracking-widest uppercase text-indigo-300/80">Reality Shifting...</span>
        </div>
      )}

      {/* Resonance Meter */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-40 pointer-events-none">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Zap className={`w-4 h-4 ${resonance >= 100 ? 'text-indigo-400 animate-pulse' : 'text-neutral-600'}`} />
            <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${resonance >= 100 ? 'text-indigo-300' : 'text-neutral-500'}`}>
              {resonance >= 100 ? 'Atlas Alignment Critical' : 'World Resonance'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-rose-400" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-300">
              {roseCount} Roses
            </span>
          </div>
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
