# Evolution Log

## 2026-03-20 (Part 2)
- **Dynamic Lighting:** Upgraded the day/night cycle overlay to use `destination-out` global composite operation, creating true light cutouts around the player and glowing entities (fire, crystals, shrines, leylines).
- **Overworld Particles:** Added simple particle effects to fire and crystal entities in the overworld.
- **Battle System - HD-2D Styling:** Overhauled the `BattleScreen` UI to match the Octopath Traveler aesthetic. Added a vignette, parallax background, drop shadows, and updated typography. Wrapped the component in `AnimatePresence` for smooth transitions.
- **Battle System - Break Mechanic:** Implemented a shield system for wild creatures. Hitting a creature with a super effective attack reduces its shield. When the shield reaches 0, the creature is "Broken", taking double damage and losing its next turn.
- **Battle System - Boost Mechanic:** Added a Boost Point (BP) system. The player gains 1 BP per turn (up to 5). BP can be spent to boost an attack (up to 3 times), increasing both damage and shield break potential.
