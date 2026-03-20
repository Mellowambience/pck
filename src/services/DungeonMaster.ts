import { GoogleGenAI, Type } from '@google/genai';
import { tileNames } from '../game/MapData';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface DMResponse {
  mapUpdates?: { x: number, y: number, tileType: number }[];
  entityUpdates?: { x: number, y: number, type: string, name?: string, isCorrupted?: boolean }[];
  resonanceChange?: number;
  narrativeResponse?: string;
}

export async function generateNPCResponse(npcName: string, npcType: string, playerMessage: string, localMapContext: string, apiKey: string): Promise<string> {
  const keyToUse = apiKey || process.env.GEMINI_API_KEY;
  if (!keyToUse) return "The traveler stares at you blankly.";
  
  const client = new GoogleGenAI({ apiKey: keyToUse });

  const prompt = `You are playing the role of an NPC in a top-down 2D procedural exploration game.
Your name is ${npcName}. You are a ${npcType}.
The player says to you: "${playerMessage}"

Here is what is around you right now:
${localMapContext}

Respond in character. Keep it brief (1-3 sentences). Be mysterious, quirky, or helpful. Mention the surroundings if it makes sense. Do not break character. Do not use quotes around your response.`;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            response: {
              type: Type.STRING,
              description: "The NPC's spoken response."
            }
          },
          required: ["response"]
        }
      }
    });
    
    if (response.text) {
        const data = JSON.parse(response.text);
        return data.response || "*silence*";
    }
    return "*silence*";
  } catch (error) {
    console.error("NPC Error:", error);
    return "*The traveler seems lost in thought.*";
  }
}

export async function generateDMResponse(
  x: number, 
  y: number, 
  tileType: number, 
  recentContext: string,
  localMap: {x: number, y: number, type: number}[],
  playerPos: {x: number, y: number},
  apiKey: string
): Promise<DMResponse> {
  const keyToUse = apiKey || process.env.GEMINI_API_KEY;
  if (!keyToUse) {
    return { mapUpdates: [] };
  }

  const client = new GoogleGenAI({ apiKey: keyToUse });

  const tileName = tileNames[tileType] || 'Unknown Terrain';
  const localMapStr = localMap.map(t => `(${t.x},${t.y}): ${tileNames[t.type]}`).join(', ');
  
  const prompt = `You are the "Atlas", an Agentic AI acting as the core reality engine for Aetherhaven.
The mission is to save Earth from becoming a barren Mars-like wasteland.
The player must heal leylines, tame corrupted spirits (demons), and preserve the land by collecting mystical roses.

The player just interacted with a ${tileName} tile at coordinates (X: ${x}, Y: ${y}).
The player is currently standing at coordinates (X: ${playerPos.x}, Y: ${playerPos.y}).

Local Map Context (radius 2 around click):
${localMapStr}

Recent story context:
${recentContext}

Your job is to silently generate the outcome of this action by modifying the map and spawning entities. Be mysterious, surprising, and creative.

CRITICAL INSTRUCTION: You MUST actively BUILD and MODIFY the game world. 
Whenever the player interacts with the world, you should change the map or spawn entities to reflect the consequences.
For example:
- If they click a Tree, maybe it turns into a Path (3) or Sand (6).
- If they click Grass, maybe a monolith (Wall 4) appears.
- If they click Water, maybe a Path (3) forms a bridge or Sand (6) creates an island.
- You can spawn entities: 'rose', 'sheep', 'shrine', 'crystal', 'fire', 'sign', 'leyline', 'demon'.
- 'leyline' and 'demon' can be "isCorrupted: true".

SAFETY RULES:
- NEVER place a solid tile (1, 2, 4, 5, 7, 8) exactly on the player's current position (X: ${playerPos.x}, Y: ${playerPos.y}).
- NEVER completely surround the player with solid tiles. Always ensure there is a walkable path (0, 3, 6) so they don't get trapped.

Return a JSON object with:
1. "mapUpdates": An array of objects {x, y, tileType} to change the map.
2. "entityUpdates": An array of objects {x, y, type, name, isCorrupted} to spawn entities.
3. "resonanceChange": A number to change the world resonance by (e.g., -5 to +10).
4. "narrativeResponse": A brief (1 sentence) narrative response to the action.

Available Tile Types: 
0: Grass, 1: Tree, 2: Water, 3: Path, 4: Wall, 5: Door, 6: Sand, 7: Deep Water, 8: Mountain.`;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mapUpdates: {
              type: Type.ARRAY,
              description: "Any changes to the map tiles based on the interaction.",
              items: {
                type: Type.OBJECT,
                properties: {
                  x: { type: Type.INTEGER },
                  y: { type: Type.INTEGER },
                  tileType: { type: Type.INTEGER, description: "0: Grass, 1: Tree, 2: Water, 3: Path, 4: Wall, 5: Door, 6: Sand, 7: Deep Water, 8: Mountain" }
                },
                required: ["x", "y", "tileType"]
              }
            },
            entityUpdates: {
              type: Type.ARRAY,
              description: "Any new entities to spawn.",
              items: {
                type: Type.OBJECT,
                properties: {
                  x: { type: Type.INTEGER },
                  y: { type: Type.INTEGER },
                  type: { type: Type.STRING, description: "rose, sheep, shrine, crystal, fire, sign, leyline, demon" },
                  name: { type: Type.STRING },
                  isCorrupted: { type: Type.BOOLEAN }
                },
                required: ["x", "y", "type"]
              }
            },
            resonanceChange: { type: Type.NUMBER },
            narrativeResponse: { type: Type.STRING }
          },
          required: ["mapUpdates"]
        }
      }
    });
    
    const result = JSON.parse(response.text || "{}");
    return {
      mapUpdates: result.mapUpdates || [],
      entityUpdates: result.entityUpdates || [],
      resonanceChange: result.resonanceChange || 0,
      narrativeResponse: result.narrativeResponse || ""
    };
  } catch (error) {
    console.error("DM Error:", error);
    return { mapUpdates: [] };
  }
}
