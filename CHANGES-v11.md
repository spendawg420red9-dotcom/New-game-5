# v11 changes (built on v10)

NOT build-tested here (no npm access in the workspace). Run `npm install && npm run build` and play-test.

## Custom map builder
- 2D view: pinch/drag pan + zoom, +/- and arrow pad, Fit button. 3D view: move pad, damped orbit, drags no longer drop items.
- 16 procedural textures (grass, dirt, sand, snow, rock, brick, concrete, wood, metal, asphalt, tiles, marble, lava, water, moss, carpet): Map Settings -> Floor textures, and the "Surface" chips for the selected hill/platform/ramp/stairs/pit.
- Hills, ramps, stairs and ladders now sit on whatever is under them (e.g. the pit floor), not at ground level.
- Ladders (Terrain assets): walk into one and push forward/back to climb. Stairs and ramps work inside pits.
- Posters: "Poster / Picture Frame" prop + the 🖼 Image button on any box/wall; your photo is shrunk and stored in the map.
- Dragon Heart asset: place up to 3 heart spots; the game uses them in your custom map (random fill for missing ones).
- .zip import of .glb models (My Models upload accepts .zip). Streams one model at a time, so big zips do not crash the page.

## Game
- Dance/finisher moves: all 19 previously missing moves have their own animation, poses reset between moves, dances play 12 s, finishers 8 s. Preview lists show every move.
- 9 new achievements.
- Crawler/parasite .glb models: sized by longest side, no extra bobbing, sensible clip choice (never a death/attack clip).
- Emblem editor: quick tool bar (add, copy, flip, mirror, centre, glow, front/back, delete), one-tap starter emblems, help text.
- Hall of Fame: new "Maps" tab (other players' published maps, Like, "Add to my maps"); custom maps in the map picker; personal list sorted top 10.
- Server: leaderboard and published maps are saved to `data/` (set DATA_DIR to a persistent disk). Needs the Node server (socket.io) hosted somewhere that stays on (Render/Railway/Fly). Vercel static hosting cannot run it, which is why friends/world boards are empty there.

## Not done yet
Gun .glb assets, multiplayer flag mode and player .glb skins.
