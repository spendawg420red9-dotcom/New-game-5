import React, { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stage, OrbitControls } from '@react-three/drei';
import { LocalPlayerModel } from './Scene';
import * as THREE from 'three';

export const Player3DViewer = ({ customization, profile, height = "h-[450px]" }: { customization?: any; profile?: any; height?: string }) => {
  const activeConfig = customization || profile;
  
  // Track active animation preview state
  const [selectedCategory, setSelectedCategory] = useState<'dance' | 'finisher'>('dance');
  const [activeMove, setActiveMove] = useState<string>('Standard Dance');

  // Keep activeMove in sync with configuration changes
  useEffect(() => {
    if (activeConfig) {
      if (selectedCategory === 'dance') {
        setActiveMove(activeConfig.danceMove || 'Standard Dance');
      } else {
        setActiveMove(activeConfig.finisherMove || 'Tactical Takedown');
      }
    }
  }, [activeConfig, selectedCategory]);

  const danceList = [
    { id: 'Standard Dance', name: '💃 Standard' },
    { id: 'Moonwalk', name: '🚶 Moonwalk' },
    { id: 'Floss', name: '👐 Floss' },
    { id: 'Carlton Dance', name: '🕺 Carlton' },
    { id: 'Orange Justice', name: '🔥 Orange Justice' }
  ];

  const finisherList = [
    { id: 'Tactical Takedown', name: '💥 Tactical Takedown' },
    { id: 'Roundhouse Kick', name: '🦵 Roundhouse Kick' },
    { id: 'Suplex', name: '🤼 Suplex' },
    { id: 'Zombie Finisher', name: '🧟 Zombie Finisher' },
    { id: 'Boss Execution', name: '👹 Boss Execution' }
  ];

  const currentMoves = selectedCategory === 'dance' ? danceList : finisherList;

  // Build temporary customization configuration with overridden moves for preview
  const previewCustomization = {
    ...activeConfig,
    danceMove: selectedCategory === 'dance' ? activeMove : undefined,
    finisherMove: selectedCategory === 'finisher' ? activeMove : undefined
  };

  return (
    <div className={`w-full ${height} bg-zinc-950 rounded-sm border border-white/10 relative flex flex-col justify-between overflow-hidden group`}>
      {/* Category Toggles and Action Controls Overlay on top */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-col gap-1.5 pointer-events-auto">
        <div className="flex gap-1 bg-black/60 backdrop-blur-md p-0.5 rounded border border-white/10 self-start">
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('dance');
              setActiveMove(activeConfig?.danceMove || 'Standard Dance');
            }}
            className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-sm transition-all duration-150 ${selectedCategory === 'dance' ? 'bg-pink-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
          >
            💃 Dance Moves
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('finisher');
              setActiveMove(activeConfig?.finisherMove || 'Tactical Takedown');
            }}
            className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-sm transition-all duration-150 ${selectedCategory === 'finisher' ? 'bg-yellow-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
          >
            💥 Finisher Moves
          </button>
        </div>

        {/* Moves Pill Selection */}
        <div className="flex flex-wrap gap-1 bg-black/40 backdrop-blur-sm p-1.5 rounded border border-white/5 max-h-24 overflow-y-auto no-scrollbar">
          {currentMoves.map((m) => {
            const isSelected = activeMove === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setActiveMove(m.id)}
                className={`px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide rounded-sm border transition-all duration-150 ${
                  isSelected
                    ? selectedCategory === 'dance'
                      ? 'bg-pink-700/80 border-pink-500 text-white scale-105'
                      : 'bg-yellow-700/80 border-yellow-500 text-white scale-105'
                    : 'bg-zinc-900/60 border-white/5 text-zinc-300 hover:bg-zinc-800/80 hover:border-zinc-700 hover:text-white'
                }`}
              >
                {m.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 w-full relative">
        <Canvas camera={{ position: [0, 1.0, 8], fov: 35 }}>
          <ambientLight intensity={0.9} />
          <directionalLight position={[5, 10, 5]} intensity={1.5} />
          <pointLight position={[-5, 5, -5]} intensity={0.5} />
          <Suspense fallback={null}>
            <LocalPlayerModel 
              playerPos={new THREE.Vector3(0, 1.2, 0)}
              playerRot={new THREE.Euler(0, 0, 0)}
              isDowned={false}
              weaponName="pistol"
              camo="none"
              isShooting={false}
              isJumping={false}
              customization={previewCustomization}
              variant={0}
              isVictoryPose={true}
            />
          </Suspense>
          <OrbitControls enablePan={true} enableZoom={true} minDistance={1.5} maxDistance={8} />
        </Canvas>
      </div>

      {/* Footer Info Overlay */}
      <div className="absolute bottom-3 left-3 right-3 z-20 flex justify-between items-center pointer-events-none">
        <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded border border-white/10 text-[9px] text-zinc-400 font-extrabold uppercase tracking-wider">
          💡 Active: <span className={selectedCategory === 'dance' ? 'text-pink-400 font-black' : 'text-yellow-400 font-black'}>{activeMove}</span>
        </div>
        <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded border border-white/10 text-[9px] text-zinc-500 font-extrabold uppercase tracking-widest">
          DRAG TO ROTATE
        </div>
      </div>
    </div>
  );
};


