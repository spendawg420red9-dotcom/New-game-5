# v14 (built on v13)
- NEW Creator Studio (start menu button): make your own guns and camos.
  - Guns: name, which existing gun's 3D model/feel to use, damage, fire rate, clip, reserve, reload, gun colour, bullet-trail colour, hit effect (fire / ice / electric). They appear in Loadout, gun game and everywhere guns are listed.
  - Camos: base colour, glow colour/strength, metal, rough. Pick them in Loadout > Weapon Camos.
  - Saved in localStorage; the game reloads after saving so lists refresh.
- Files: customContent.ts, components/CreatorStudio.tsx; small hooks in App.tsx, Scene.tsx, types.ts.
- NOT build-tested (no network/npm here). Run `npm install && npm run lint && npm run build`.
- Still to do: uploaded .glb guns, animations editor, emblem upgrades, bestiary .glb, multiplayer mode builder, wall details, achievement effects.

## Part 2
- Bestiary: hover preview now uses your .glb too. In an enemy's Tactical Intel screen, "Use my .glb" assigns any file to that enemy ("Reset model" undoes it). Files dropped in public/assets/zombies/<enemy>.glb still work.
- Gun creator: upload your own .glb gun model (with 0/90/180/270 turn so the barrel points forward). Falls back to the built-in model if the file fails.
- Emblems: Undo/Redo buttons, ~50 more shapes (geometric, animals, crowns, medals), 2 new one-tap starters.
- Achievement effects: Creator Studio > Effects. Confetti / fireworks / rain / glow, banner animation, two colours, time on screen, preview. The pop-up now shows in a match as well as the menu.
- Syntax-checked only (all edited files parse). Still not built or play-tested.
- Not done: multiplayer mode builder (flags etc.) and .glb skin swap, building wall details, gun animation editor.

## Part 3
- Building walls: window frames and sills, side-wall windows, trim band at every floor, base plinth, door lamp/handle/steps, roof parapet (BuildingDetails in Scene.tsx).
- My Modes (Custom Game > Multiplayer): save the current rules under your own name, load, delete, share as a code, import a friend's code (components/MyModesPanel.tsx).
- Syntax-checked only; not built or play-tested.
- Still not done: real new game types like Capture the Flag (needs bot AI, flag objects, scoring in Scene.tsx), swapping player skins to .glb in multiplayer, gun animation editor.

## Part 4
- Capture The Flag (Custom Game > Multiplayer > Game Type). Team bases at x=-35 (Team 1, green) and x=+35 (Team 2, red). Touch the enemy flag to carry it, bring it to your base while your own flag is home to score. Touch your dropped flag to return it. Bots go for flags. Default score limit 3 (changes back to 35 when you switch off CTF). HUD shows scores and pickup/capture messages; results screen included. Flag bases are fixed spots, so on a map with a wall there they may be blocked.
- Creator Studio > Skin: upload a .glb to use as your player model on every map (third person). Only your own player; other players in online rooms are unchanged.
- Gun animations (Creator Studio > Guns): fire animation (kick / twist / muzzle jump / none), reload animation (spin / dip / tilt), kick strength. "Default" keeps the original look.
- Syntax-checked only; not built or play-tested.
