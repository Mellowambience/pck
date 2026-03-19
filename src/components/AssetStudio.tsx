import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Loader2, Trash2, Sparkles } from 'lucide-react';
import { SPRITE_KEYS, generateSprite, saveSprite, loadSprite, clearSprites } from '../services/SpriteGenerator';

interface AssetStudioProps {
  onClose: () => void;
  apiKey: string;
  onSpritesUpdated: () => void;
}

export function AssetStudio({ onClose, apiKey, onSpritesUpdated }: AssetStudioProps) {
  const [sprites, setSprites] = useState<Record<string, string | null>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, currentKey: '' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAllSprites();
  }, []);

  const loadAllSprites = () => {
    const loaded: Record<string, string | null> = {};
    SPRITE_KEYS.forEach(key => {
      loaded[key] = loadSprite(key);
    });
    setSprites(loaded);
  };

  const handleGenerateAll = async () => {
    const keyToUse = apiKey || process.env.GEMINI_API_KEY;
    if (!keyToUse) {
      setError("Please set a Gemini API Key in the settings first.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setProgress({ current: 0, total: SPRITE_KEYS.length, currentKey: '' });

    try {
      for (let i = 0; i < SPRITE_KEYS.length; i++) {
        const key = SPRITE_KEYS[i];
        setProgress({ current: i + 1, total: SPRITE_KEYS.length, currentKey: key });
        
        const dataUrl = await generateSprite(key, keyToUse);
        saveSprite(key, dataUrl);
        
        setSprites(prev => ({ ...prev, [key]: dataUrl }));
        onSpritesUpdated();
      }
    } catch (err: any) {
      console.error("Failed to generate sprites:", err);
      setError(err.message || "An error occurred while generating sprites.");
    } finally {
      setIsGenerating(false);
      setProgress({ current: 0, total: 0, currentKey: '' });
    }
  };

  const handleGenerateMissing = async () => {
    const keyToUse = apiKey || process.env.GEMINI_API_KEY;
    if (!keyToUse) {
      setError("Please set a Gemini API Key in the settings first.");
      return;
    }

    const missingKeys = SPRITE_KEYS.filter(key => !sprites[key]);
    if (missingKeys.length === 0) return;

    setIsGenerating(true);
    setError(null);
    setProgress({ current: 0, total: missingKeys.length, currentKey: '' });

    try {
      for (let i = 0; i < missingKeys.length; i++) {
        const key = missingKeys[i];
        setProgress({ current: i + 1, total: missingKeys.length, currentKey: key });
        
        const dataUrl = await generateSprite(key, keyToUse);
        saveSprite(key, dataUrl);
        
        // Update state incrementally
        setSprites(prev => ({ ...prev, [key]: dataUrl }));
        onSpritesUpdated();
      }
    } catch (err: any) {
      console.error("Failed to generate sprites:", err);
      setError(err.message || "An error occurred while generating sprites.");
    } finally {
      setIsGenerating(false);
      setProgress({ current: 0, total: 0, currentKey: '' });
    }
  };

  const handleGenerateSingle = async (key: string) => {
    const keyToUse = apiKey || process.env.GEMINI_API_KEY;
    if (!keyToUse) {
      setError("Please set a Gemini API Key in the settings first.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setProgress({ current: 1, total: 1, currentKey: key });

    try {
      const dataUrl = await generateSprite(key, keyToUse);
      saveSprite(key, dataUrl);
      setSprites(prev => ({ ...prev, [key]: dataUrl }));
      onSpritesUpdated();
    } catch (err: any) {
      console.error(`Failed to generate sprite for ${key}:`, err);
      setError(err.message || `An error occurred while generating ${key}.`);
    } finally {
      setIsGenerating(false);
      setProgress({ current: 0, total: 0, currentKey: '' });
    }
  };

  const handleClearAll = () => {
    if (confirm("Are you sure you want to delete all generated sprites?")) {
      clearSprites();
      loadAllSprites();
      onSpritesUpdated();
    }
  };

  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 max-w-3xl w-full shadow-2xl flex flex-col max-h-[90vh]">
        
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
              <ImageIcon className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-medium text-white">Asset Studio</h2>
              <p className="text-xs text-neutral-400">AI-Generated Game Textures</p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-6">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {SPRITE_KEYS.map(key => (
              <div key={key} className="flex flex-col items-center gap-2">
                <div className="w-20 h-20 rounded-lg border border-white/10 bg-black/50 flex items-center justify-center overflow-hidden relative group">
                  {sprites[key] ? (
                    <img src={sprites[key]!} alt={key} className="w-full h-full object-cover pixelated" />
                  ) : (
                    <span className="text-xs text-neutral-600 font-mono">Empty</span>
                  )}
                  {isGenerating && progress.currentKey === key && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                      <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                    </div>
                  )}
                  {!isGenerating && (
                    <button
                      onClick={() => handleGenerateSingle(key)}
                      className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                      title={`Generate ${key}`}
                    >
                      <Sparkles className="w-6 h-6 text-indigo-400" />
                    </button>
                  )}
                </div>
                <span className="text-xs text-neutral-400 font-mono capitalize">{key.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <button
              onClick={handleGenerateMissing}
              disabled={isGenerating || SPRITE_KEYS.every(k => sprites[k])}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
            >
              {isGenerating && progress.total > 1 ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating ({progress.current}/{progress.total})
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Missing
                </>
              )}
            </button>
            <button
              onClick={handleGenerateAll}
              disabled={isGenerating}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-900 disabled:text-neutral-600 text-white px-6 py-2.5 rounded-lg font-medium transition-colors border border-white/5"
            >
              Regenerate All
            </button>
            <button
              onClick={handleClearAll}
              disabled={isGenerating || SPRITE_KEYS.every(k => !sprites[k])}
              className="p-2.5 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
              title="Clear all sprites"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
          
          <p className="text-xs text-neutral-500 max-w-xs text-center sm:text-right">
            Uses Gemini 2.5 Flash to generate 32x32 pixel art textures. This may take a minute.
          </p>
        </div>

      </div>
    </div>
  );
}
