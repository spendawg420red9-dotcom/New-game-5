import React, { Suspense, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { GLBBoundary, RigidGLBBody, PosedGLBBody } from './GLBProp';
import { WeaponModel } from './Scene';
import { SkinCfg } from '../skinConfig';
import { resolveModelUrl } from '../userModels';

// Live 3D preview of "My Skin" holding a gun, drawn by the same body code the game uses.
export const SkinPreview: React.FC<{ skinId: string; cfg: SkinCfg; gunName?: string }> = ({ skinId, cfg, gunName }) => {
  const [view, setView] = useState<'back' | 'front' | 'side'>('back');
  const moving = useRef(false); const shooting = useRef(false);
  const cam: [number, number, number] = view === 'back' ? [0, cfg.height * 0.8, -cfg.height * 2] : view === 'front' ? [0, cfg.height * 0.8, cfg.height * 2] : [cfg.height * 2, cfg.height * 0.8, 0];
  const weapon = gunName ? () => <WeaponModel weaponName={gunName} camo={'none' as any} /> : undefined;
  const btn = 'px-3 py-1.5 text-[11px] font-black uppercase';
  return (
    <div className="bg-black/80 border border-white/10">
      <div className="relative h-72 bg-gradient-to-b from-slate-700 to-slate-950 overflow-hidden">
        <Canvas key={view + cfg.height} dpr={[1, 1.5]} camera={{ position: cam, fov: 45, near: 0.05, far: 80 }} gl={{ antialias: true, powerPreference: 'low-power' }}>
          <ambientLight intensity={0.9} />
          <directionalLight position={[3, 5, 3]} intensity={2} />
          <directionalLight position={[-3, 2, -3]} intensity={0.8} />
          <Suspense fallback={null}>
            <GLBBoundary fallback={null}>
              {cfg.pose
                ? <PosedGLBBody url={resolveModelUrl(skinId)} height={cfg.height} renderWeapon={weapon} isMoving={moving} isShooting={shooting} />
                : <RigidGLBBody url={resolveModelUrl(skinId)} height={cfg.height} yaw={cfg.yaw} renderWeapon={weapon} gunX={cfg.gunX} gunY={cfg.gunY} gunZ={cfg.gunZ} gunScale={cfg.gunScale} />}
            </GLBBoundary>
          </Suspense>
          <mesh rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[2.5, 32]} /><meshStandardMaterial color="#1e293b" /></mesh>
          <OrbitControls makeDefault enablePan={false} target={[0, cfg.height * 0.5, 0]} minDistance={1} maxDistance={10} />
        </Canvas>
        <div className="absolute bottom-1 left-2 text-[9px] font-black uppercase text-white/50 pointer-events-none">
          Back = what you see in the game. The character should face away from you and hold the gun out front.
        </div>
      </div>
      <div className="grid grid-cols-3 gap-px bg-white/10">
        {(['back', 'front', 'side'] as const).map(v => <button key={v} onClick={() => setView(v)} className={`${btn} ${view === v ? 'bg-amber-600' : 'bg-zinc-900'}`}>{v}</button>)}
      </div>
    </div>
  );
};
