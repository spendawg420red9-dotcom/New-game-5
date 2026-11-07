MY MAPS (kept in every rebuild)

1. In the map builder open "My Maps" -> "Export all maps". You get a .json file.
2. Put that file in this folder (public/my-maps/).
3. Put its file name in index.json, e.g.  ["ztown-maps-2026-11-07.json"]
4. Every build now carries your maps. When the game opens, any map in these files that is not
   already in the browser is added automatically. Maps you already have are never overwritten.

Your GLB models: put them in public/assets/zombies/ (Game Intel 3D view), named after the enemy:
normal.glb runner.glb tank.glb inferno.glb parasite.glb crawler.glb brute.glb
dragon.glb elephant.glb ogre.glb worm.glb mushroom_keeper.glb
