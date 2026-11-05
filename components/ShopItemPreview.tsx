import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stage, Text, Box, Sphere, Cone } from '@react-three/drei';
import * as THREE from 'three';
import { WeaponModel, CharacterBody } from './Scene';

const RotatingGroup = ({ children }: { children: React.ReactNode }) => {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.01;
    }
  });
  return <group ref={groupRef}>{children}</group>;
};

const ShopItemPreview = ({ item, shopTab }: { item: any, shopTab: string }) => {
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const weaponGroupRef = useRef<THREE.Group>(null);

  const isCharacterItem = ['clothes', 'hats', 'glasses', 'masks', 'helmets', 'chest', 'boots', 'gloves'].includes(shopTab);

  const previewCustomization = {
    clothes: shopTab === 'clothes' ? [item.id] : ['none'],
    hats: shopTab === 'hats' ? [item.id] : ['none'],
    glasses: shopTab === 'glasses' ? [item.id] : ['none'],
    masks: shopTab === 'masks' ? [item.id] : ['none'],
    helmets: shopTab === 'helmets' ? [item.id] : ['none'],
    chest: shopTab === 'chest' ? [item.id] : ['none'],
    boots: shopTab === 'boots' ? [item.id] : ['none'],
    gloves: shopTab === 'gloves' ? [item.id] : ['none'],
  };

  return (
    <div className="w-full h-64 bg-black/50 rounded-xl border border-white/10 overflow-hidden relative">
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <Stage environment="city" intensity={0.5}>
          <RotatingGroup>
            {shopTab === 'callingCards' && (
              <group>
                <mesh>
                  <planeGeometry args={[3, 1.5]} />
                  <meshStandardMaterial color="#222" side={THREE.DoubleSide} />
                </mesh>
                <Text position={[0, 0, 0.05]} fontSize={0.2} color="#fff" anchorX="center" anchorY="middle">
                  {item.name}
                </Text>
              </group>
            )}
            {shopTab === 'camos' && (
              <group scale={[1.5, 1.5, 1.5]} rotation={[0, Math.PI / 2, 0]}>
                <WeaponModel weaponName="M1911" camo={item.id} />
              </group>
            )}
            {shopTab === 'finisherMoves' && (
              <group position={[0, -0.5, 0]}>
                <CharacterBody 
                  isDowned={false}
                  clothingColor="#333"
                  vestColor="#444"
                  skinColor="#ffccaa"
                  hairColor="#333"
                  helmetType={0}
                  sleeveType={0}
                  backpackType={0}
                  hairType={0}
                  customization={{ finisherMove: item.id }}
                  leftLegRef={leftLegRef}
                  rightLegRef={rightLegRef}
                  leftArmRef={leftArmRef}
                  rightArmRef={rightArmRef}
                  weaponGroupRef={weaponGroupRef}
                />
              </group>
            )}
            {shopTab === 'danceMoves' && (
              <group position={[0, -0.5, 0]}>
                <CharacterBody 
                  isDowned={false}
                  clothingColor="#333"
                  vestColor="#444"
                  skinColor="#ffccaa"
                  hairColor="#333"
                  helmetType={0}
                  sleeveType={0}
                  backpackType={0}
                  hairType={0}
                  customization={{ danceMove: item.id }}
                  leftLegRef={leftLegRef}
                  rightLegRef={rightLegRef}
                  leftArmRef={leftArmRef}
                  rightArmRef={rightArmRef}
                  weaponGroupRef={weaponGroupRef}
                />
              </group>
            )}
            {isCharacterItem && (
              <group position={[0, -1, 0]}>
                <CharacterBody
                  isDowned={false}
                  clothingColor={item.id === 'tactical_gear' ? '#222' : item.id === 'hazmat_suit' ? '#ffaa00' : item.id === 'ghillie_suit' ? '#2d4a22' : item.id === 'cyber_ninja' ? '#111' : '#333'}
                  vestColor="#444"
                  skinColor="#ffccaa"
                  hairColor="#333"
                  helmetType={0}
                  sleeveType={0}
                  backpackType={0}
                  hairType={0}
                  customization={previewCustomization}
                  leftLegRef={leftLegRef}
                  rightLegRef={rightLegRef}
                  leftArmRef={leftArmRef}
                  rightArmRef={rightArmRef}
                  weaponGroupRef={weaponGroupRef}
                />
              </group>
            )}
            {!['callingCards', 'camos', 'clothes', 'finisherMoves', 'hats', 'glasses', 'masks', 'helmets', 'chest', 'boots', 'gloves', 'danceMoves'].includes(shopTab) && (
              <mesh>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="white" />
              </mesh>
            )}
          </RotatingGroup>
        </Stage>
        <OrbitControls enablePan={false} />
      </Canvas>
      <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none">
        <span className="text-white/50 text-xs uppercase tracking-widest font-bold">Drag to rotate • Scroll to zoom</span>
      </div>
    </div>
  );
};

export default ShopItemPreview;
