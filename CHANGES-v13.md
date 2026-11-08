# v13 changes (built on v12)

- Ladders: climbing to the top now steps you onto the platform; stand at the top edge and push back to climb down; Jump lets go of the ladder.
- Image crash: map images load through a safe loader (safeTexture.ts). Big photos are shrunk to 512px, the same image is only decoded once, and a bad image shows the plain colour instead of crashing. Custom floor images use it too.
- Lag: wall collision uses a spatial grid, so the player and zombies only test nearby walls instead of every wall on the map.
- Not build-tested here (no network for npm install). Run `npm install && npm run build` and play-test ladders and image maps.

## Part 2
- Builder 3D view: WASD/arrow keys slide the view, Q/E zoom, Shift is faster, F jumps to the selected piece.
- New terrain (Terrain tab): Mountain, Giant Mountain, Mesa, Dome, Crater Rim, Round Platform, Round Tower, Smooth Ramp, Quarter Pipe, Small/Normal/Deep Bowl. Built from the existing hill/platform/ramp/pit types with a shape label, so old maps are unchanged.
- Hill textures follow the surface, so steep slopes are no longer smeared.
- Traps: hazard (hurts), bounce (launches) and spin (spinning blade) now work in play. New pieces: Spike Trap, Fire Pit, Acid Pool, Bounce Pad, Spinning Blade. Note: older maps whose floor patches were marked hazard will now hurt too.
- Crawlers: crawl on all fours with arm/leg animation, and walkers now swing arms and legs. Shot hitboxes follow each zombie type's real size and pose (crawler, brute, tank, runner, parasite).
