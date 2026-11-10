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

## v20 – gun angle, big models, mega asset pack, movers, zombie bodies
- **Gun angle in game:** on a tall phone screen the held gun sat past the edge of the picture, so it looked cut off, stretched and turned. Its sideways position now adapts to the screen shape (unchanged on wide screens). The Creator Studio preview uses the same rule.
- **Perk .glb / big models:** models from My Models now load one at a time (not all at once), models over the triangle budget (about 140k phone / 450k desktop) are simplified automatically with their textures kept, and big textures are shrunk before reaching graphics memory. The wolf spirit box was the "too heavy" guard; it now shows the real model.
- **Grid marks:** the green floor grid is no longer drawn on maps that use ramps, platforms, hills or pits.
- **Mega Pack: 440+ new pieces** in 5 new builder categories: Ramps & Platforms, Traps & Movers, Walls & Doors, More Buildings, Cover & Decor.
- **Moving platforms** (select any platform > Make it move): there & back or circle, distance in 3 directions, speed, wait, start delay. You ride along. Ready-made lifts, sliders and circling platforms are in Traps & Movers.
- **Teleporter pads** (Traps & Movers): stand on one and it sends you to the pad you link it to. Use them for hidden rooms and secrets.
- **Buy Doors:** wall pieces that disappear when a player pays; price set with the Door price buttons.
- **Design Studio:** new Multi-Shape tab (Shape Studio). Parts of a gun can now move on fire / reload (slide, magazine drop, spin, tilt...), with test buttons, and play in game.
- **Custom Zombie body:** every part (head, body, arms, legs) has its own shape, size, position, colour, glow and can be hidden; add extra parts (wings, tail, mohawk, tusks, spikes, claws, backpack, blank parts) stuck to any part; whole size, arm reach, walk swing, speed and health, eye size/gap/height; presets.

## v20 – mode playlists (multiple game modes in one)
- Custom Game > My Modes: every saved mode now has a **+List** button. Saved modes are your mini-games (each keeps its own map, game type, bots, score limit, starting weapon and points, so a Hardpoint on your own map, a Gun Game and a Capture The Flag can all be in one list).
- **▶ Play playlist from the start** starts the first one; when a match ends, **▶ Next: <name>** on the results screen loads and starts the next, round and round. Works for any saved mode, not only multiplayer.

## v20 – mini-game rules
- Custom Game > **Mini-game rules**: run speed (50%-200%), low gravity (floaty jumps), and "your shots kill in one hit". They are saved inside saved modes, so every saved mode (and playlist entry) can be its own mini-game.

## v20 – Shape Studio templates
- Shape Studio > "Start from a ready-made one": Pistol, Revolver, Rifle, Shotgun, Sniper, Ray blaster (guns already have moving parts: slides, magazine drops, spinning drums), plus House, Tower, Bridge, Car, Pipe set. Change anything, then Save to My Models.

## v20 – online rooms on your own map
- Hosting an online Multiplayer room with "Use my map" now sends your map to everyone who joins (server.ts accepts maps up to about 4 MB). Team spawns, hardpoint zones and CTF flags from the Multiplayer markers work online too. Models and videos you added from your own device are not sent, so they will not show for other players. The server part (server.ts) must be the new version for this to work.

## v20 – batching for big maps
- Plain solid / decor walls and boxes with the same look are now drawn together in a few batches instead of one by one (big maps and the Mega Pack walls). Pieces that move, hurt, bounce, open (Buy Doors) or are markers are drawn as before. Collisions are unchanged.
- If anything looks wrong, you can switch it off: in the browser console run localStorage.setItem('ztown_no_batch','1') and reload (remove the key to turn it back on).

- Moving platforms: their underside now moves with them, so you can walk under one that has lifted away (checked with a test of the floor logic: surface height follows the platform, you are carried with it, and the space beneath a lifted one is open).

## v20 – Multiplayer Arena template
- Map builder > Templates: **Multiplayer Arena (ready to play)**. Raised centre deck with four ramps, cover, a lift to a high side deck, a secret bunker reached by a linked pair of teleporter pads, and every Multiplayer marker already placed (5 spawns per team, 11 free-for-all spawns, 3 hardpoint zones, 2 CTF flags). Open it, tick "Use my map" in Multiplayer, pick a game type, play. (Checked in a test: all four ramps meet the deck at 4 m and the markers turn into spawns / zones / flags.)
- Phones now stop drawing 3D model props beyond 110 m (desktops 160 m).
