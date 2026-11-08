import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { GLBBoundary } from './GLBProp';
import { WeaponModel, WEAPONS_STATS } from './Scene';
import { CustomGun, PREVIEW_GUN, registerPreviewGun, unregisterPreviewGun } from '../customContent';
import { soundService } from '../services/soundService';

// Live 3D preview for the Creator Studio. It draws the gun you are editing (saved or not) with the SAME code the game uses,
// from the SAME camera spot, so what you see here is what you get in your hands. Fire / Reload play the animation,
// the muzzle flash and the sounds.
export const GunLivePreview: React.FC<{ gun: CustomGun; className?: string }> = ({ gun, className = 'h-48' }) => {
  const [mode, setMode] = useState<'game' | 'orbit'>('game');
  const key = JSON.stringify({ ...gun, id: '', name: '' });
  // register before the 3D scene draws, so the preview always reads the newest settings
  useMemo(() => { registerPreviewGun(gun, WEAPONS_STATS); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => unregisterPreviewGun(WEAPONS_STATS), []);

  const fire = () => { try { window.dispatchEvent(new Event('gun-fire')); } catch { /* ignore */ } soundService.playShoot(PREVIEW_GUN); };
  const reload = () => { try { window.dispatchEvent(new Event('gun-reload')); } catch { /* ignore */ } soundService.playReload(PREVIEW_GUN); };
  const btn = 'px-3 py-1.5 text-[11px] font-black uppercase';

  return (
    <div className="bg-black/80 border border-white/10">
      <div className={`relative bg-gradient-to-b from-slate-700 to-slate-950 overflow-hidden ${className}`}>
        <Canvas key={mode} dpr={[1, 1.5]}
          camera={mode === 'game' ? { position: [0, 0, 0], fov: 60, near: 0.05, far: 50 } : { position: [1.3, 0.45, 0.9], fov: 40, near: 0.05, far: 50 }}
          gl={{ antialias: true, powerPreference: 'low-power' }}>
          <ambientLight intensity={0.9} />
          <directionalLight position={[2, 4, 3]} intensity={2} />
          <directionalLight position={[-3, 1, -2]} intensity={0.8} />
          {mode === 'game' ? (
            <>
              {/* exactly where the game holds the gun in first person */}
              <group position={[0.25, -0.3, -0.5]}>
                <Suspense fallback={null}><GLBBoundary fallback={null}><WeaponModel weaponName={PREVIEW_GUN} camo={'none' as any} /></GLBBoundary></Suspense>
              </group>
              {[-1.2, 0, 1.2].map(x => <mesh key={x} position={[x, -0.3, -4]}><boxGeometry args={[0.5, 1.6, 0.4]} /><meshStandardMaterial color="#7f1d1d" /></mesh>)}
              <mesh position={[0, -1, -4]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[30, 30]} /><meshStandardMaterial color="#1e293b" /></mesh>
            </>
          ) : (
            <>
              <group scale={2.1}>
                <Suspense fallback={null}><GLBBoundary fallback={null}><WeaponModel weaponName={PREVIEW_GUN} camo={'none' as any} /></GLBBoundary></Suspense>
              </group>
              <OrbitControls makeDefault enablePan={false} minDistance={0.6} maxDistance={4} />
            </>
          )}
        </Canvas>
        {mode === 'game' && <div className="absolute left-1/2 top-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 border border-white/60 rounded-full pointer-events-none" />}
        <div className="absolute bottom-1 left-2 text-[9px] font-black uppercase text-white/50 pointer-events-none">
          {mode === 'game' ? 'As it looks in the game (barrel points at the red posts)' : 'Drag to look around it'}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-px bg-white/10">
        <button onClick={() => setMode('game')} className={`${btn} ${mode === 'game' ? 'bg-amber-600' : 'bg-zinc-900'}`}>In game</button>
        <button onClick={() => setMode('orbit')} className={`${btn} ${mode === 'orbit' ? 'bg-amber-600' : 'bg-zinc-900'}`}>Orbit</button>
        <button onClick={fire} className={`${btn} bg-red-800`}>Fire</button>
        <button onClick={reload} className={`${btn} bg-zinc-900`}>Reload</button>
      </div>
    </div>
  );
};
