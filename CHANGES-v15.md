# Z-Town v15 changes

**Emblems** – new Emblem Editor (components/EmblemEditor.tsx): 11 shape categories, A-Z/0-9, 12 one-tap starter designs, 7 backdrops, gradients, glow, shadow, blur, skew, fonts, hide/lock layers, pinch/rotate on touch, saved designs, UTF-8-safe share codes (old codes still import).

**Held guns from your .glb** – no more stretching. Guns are fitted with uniform scale, auto-oriented (long side to the barrel), with Turn/Tip/Roll/Flip/Size/Nudge/Tint controls. Works for custom guns and for any built-in gun (pick a .glb from the gun's 3D view).

**Creator Studio** – 16 procedural camo patterns (woodland, digital, tiger, hex, carbon, flames, galaxy, scales, lightning, circuit...), colours 2 and 3, pattern size, shuffle, upload your own picture, moving effects (pulse/rainbow/flicker/shift) with speed, live preview. Full gun-fit controls for your .glb guns.

**3D views + photos** – Arsenal gun cards and a 3D gun viewer (can load a .glb for any gun). Bestiary: .glb photos for each model, add your own custom enemies. Perk machines: tap a perk for a 3D view, and use a .glb as the machine skin in game.

**Map builder** – tiny nudges (0.01-10 step), facing-relative moves, up/down, for every placed item/perk.

**Invisible walls** – large .glb props (R9S jet, crash plane) now get colliders built from the model's actual shape, so you can walk up to them.

**Performance** – adaptive resolution (drops/raises DPR to hold frame rate, all devices), no antialias on high-DPR screens, stencil off, smaller textures on phones, non-suspending weapon textures, removed a per-render console.log.

Everything else is unchanged.

## Held-gun fix (follow-up)
- Auto-orientation now measures the model's main body (7%-93% of its points) so a baked-in arm/hand no longer gets mistaken for the barrel.
- New "In your hands" live preview in the gun's 3D view: shows the gun exactly where the game holds it, with red zombie posts ahead. Tap Turn / Tip / Roll / Flip and watch it until the barrel points at them.
