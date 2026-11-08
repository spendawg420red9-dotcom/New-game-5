# v10 - map builder power-up, GLB Game Intel

## Map builder
- NEW Terrain category: Hills, Platforms, Floor Patches (paint the floor), Ramps, Stairs, Pits (underground rooms), Tunnels, Bridge, Floating platform.
- Map Settings: Map size (60 m to 2000 m wide), floor colour/swatches/plain colour/tile size/shine, sky + fog colour and thickness,
  void floor (no floor), plain sky, grid/debris/stars switches, edge walls.
- Zombies: "Around you" (normal), "My spawners" (only at spawners you place) or "None".
- Blank map / Void map starters (New map buttons + "Start from nothing" in Map Settings): no zombies, no crafting table, no decoration.
- Toolbar for the selected item: Height up/down, "On surface", Paint colour.
- My Maps: Export all maps / Import maps. Put the exported file in public/my-maps/ and list it in index.json to ship it with every build.
- New template: Terrain Park.

## Game
- Player, zombies, bots and grenades follow hills / platforms / stairs / ramps / pits. Maps without terrain skip all of it (older maps unchanged).

## Game Intel
- 3D view uses public/assets/zombies/<enemy>.glb when present (normal, runner, tank, inferno, parasite, crawler, brute, dragon, elephant, ogre, worm, mushroom_keeper), else the old model.

Not run here: npm install is blocked in this workspace, so run `npm run build` once and play-test Terrain Park.
