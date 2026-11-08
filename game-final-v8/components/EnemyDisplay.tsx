import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stage, OrbitControls } from '@react-three/drei';
import { useEnemyGlbUrl, EnemyGLB } from './EnemyModelViewer';
import { GLBBoundary } from './GLBProp';
import { Zombie3D, Dragon3D, Elephant3D, Ogre3D, Worm3D, MushroomKeeper3D } from './Enemy3DModels';

export const EnemyDisplay = ({ variant, type }: { variant?: 'normal' | 'runner' | 'tank' | 'inferno' | 'parasite' | 'crawler' | 'brute', type?: 'zombie' | 'dragon' | 'elephant' | 'ogre' | 'worm' | 'mushroom_keeper' }) => {
  const Model = type === 'dragon' ? Dragon3D : type === 'elephant' ? Elephant3D : type === 'ogre' ? Ogre3D : type === 'worm' ? Worm3D : type === 'mushroom_keeper' ? MushroomKeeper3D : () => <Zombie3D variant={variant || 'normal'} />;
  
  const glbUrl = useEnemyGlbUrl(type && type !== 'zombie' ? type : (variant || 'normal'));
  const builtIn = <Model />;
  return (
    <div className="w-full h-48 bg-black/40 rounded-sm border border-white/10 relative overflow-hidden">
        <Canvas frameloop="always" camera={{ position: glbUrl ? [0, 0, 11] : [0, 1.0, 3], fov: 35 }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
            <Suspense fallback={null}>
              {glbUrl ? <GLBBoundary fallback={builtIn}><EnemyGLB url={glbUrl} /></GLBBoundary> : builtIn}
            </Suspense>
        <OrbitControls enablePan={true} enableZoom={true} minDistance={1.5} maxDistance={glbUrl ? 16 : 5} autoRotate />
        </Canvas>
    </div>
  );
};
