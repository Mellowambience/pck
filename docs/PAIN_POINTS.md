# Pain Points

- **Performance:** HTML5 Canvas rendering can be slow with too many entities and complex lighting overlays. Need to optimize chunk drawing and lighting cutouts.
- **Sprite Generation:** Gemini API takes time to generate sprites. We need a good loading state or placeholder system (currently using hardcoded shapes).
- **Architecture:** Transitioning from a Bevy/Rust mindset to a React/TypeScript/Canvas mindset requires adapting ECS concepts to a simpler object-oriented or functional approach suitable for the web.
