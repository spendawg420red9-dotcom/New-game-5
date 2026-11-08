# Z-Town v20 changes

**Creator Studio – live in-game preview.** The Guns tab now has a 3D preview pinned at the top (Hide/Show button). It draws the gun you are editing with the game's own code from the game's own camera spot ("In game"), or "Orbit" to look around it. Fire / Reload buttons play the animation, muzzle flash and sounds. Nothing needs saving to see a change.

**Gun size in hand.** New "In your hand" section for every custom gun (built-in model or your .glb): size, left/right, up/down, forward/back, turn, tip, roll. The old .glb "Size" is now "Model size (inside its own fit)".

**More gun detail.** Muzzle flash (on/off, colour, size, duration, position on the barrel – drawn on the held gun and in the world), shot sound and reload sound (11 shot + 6 reload built-in sounds, or upload your own under 600 KB, with volume and pitch, Test button), spread / accuracy.

**My Skin no longer twists.** Your own skin .glb is now drawn as a solid model (all its parts, nothing bent). Skin tab has a live 3D preview (back / front / side, holding any gun) with Facing (0/90/180/270 + fine turn), height, gun size/position in the hands, and an optional "Bend arms" switch for T-pose models. Map-chosen avatars are unchanged.

Everything else is unchanged. Gun names are unchanged; saved guns from v19 keep working (new fields default to the old look).

## v20 follow-up
- Creator Studio > In your hand: one-tap Flip front/back, Turn 90 left/right, Tip 90, Roll 90, Flip upside down (watch the live preview) for guns held the wrong way.

- HUD: perk icons are smaller (28px) and wrap in a narrow block, so the Level / Timer / Points bars no longer stretch across the whole screen when you have many perks.

## v20 – all 22 perk icons + Multiplayer map builder
- HUD: Stronghold, Blood Pack and Elemental Burst icons were missing; all 22 perks now show (small icons).
- Custom Game > Multiplayer now has a **Multiplayer Map Builder** panel: Use my map, pick a saved map, Open Map Builder. The full builder (buildings, walls, terrain, models, perks, wall guns, map size, etc.) works for Multiplayer; Play from the builder keeps Multiplayer.
- New builder category **Multiplayer** with markers: Team 1 spawn, Team 2 spawn, Free-For-All spawn, Hardpoint zone, Team 1 / Team 2 flag (CTF). Markers are hidden in the match. No markers = old behaviour.
- Free For All / Gun Game use FFA spawns; Team Deathmatch / CTF use team spawns; Hardpoint cycles your zones in the order placed; CTF uses your flag bases.
- Online rooms still use built-in maps (your own map plays offline with bots).

## v20 – stability, videos, Shape Studio
- **Stuck in buildings fixed:** if you are ever inside a solid wall (spawned in one, or two buildings overlap) the game now moves you to the nearest open spot within about half a second.
- **Crash protection:** the whole app and the game view are wrapped so one bad model/texture can no longer blank the game (it retries, then offers Try again / Back to menu). Models with millions of triangles are drawn as a box instead of crashing the graphics. The perk 3D viewer uses lighter graphics settings and survives lost graphics memory.
- **Smoother with lots of models:** 3D props far from you (140 m+) are not drawn.
- **Video Screens:** builder > Walls & Props > Video Screen. Select it, tap 🎬 Video (upload mp4/webm, up to 600 MB, kept on this device) or 🔗 Link, 🔊/🔇 for sound (fades in as you get close). Videos pause when you are far away.
- **Shape Studio** (builder > My Models > 🎨 Shape Studio): build from boxes, cylinders, hollow pipes, pipe bends, rings, cones, balls, capsules and ramps with a live 3D view, or ✏️ draw an outline (made solid) or a pipe path (made into a tube) with your finger. Save puts a real .glb in My Models, so you can place it as a building/prop, a perk machine, a gun or a skin.
