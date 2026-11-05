import React, { useRef, useMemo } from 'react';
import { Box, Sphere, Cylinder, Cone, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const Zombie3D = React.memo(({ variant }: { variant: 'normal' | 'runner' | 'tank' | 'inferno' | 'parasite' | 'crawler' | 'brute' }) => {
  const mesh = useRef<THREE.Group>(null);
  
  const clothingColor = useMemo(() => {
    if (variant === 'inferno') return '#ff4500'; 
    if (variant === 'parasite') return '#800080'; 
    if (variant === 'crawler') return '#556b2f'; 
    if (variant === 'brute') return '#000000'; 
    if (variant === 'runner') return '#8b0000'; 
    if (variant === 'tank') return '#2f4f4f'; 
    return '#2e3b23'; 
  }, [variant]);

  const skinColor = useMemo(() => {
    if (variant === 'inferno') return '#330000'; 
    if (variant === 'parasite') return '#9370db'; 
    if (variant === 'crawler') return '#6b8e23'; 
    if (variant === 'brute') return '#444444'; 
    if (variant === 'tank') return '#556b2f'; 
    return '#b8b09b'; 
  }, [variant]);

  const scale = useMemo(() => {
    if (variant === 'brute') return 1.5;
    if (variant === 'tank') return 1.3;
    if (variant === 'runner') return 0.9;
    if (variant === 'parasite') return 0.6;
    if (variant === 'crawler') return 0.7;
    return 1.0;
  }, [variant]);

  useFrame((state) => {
    if (mesh.current) {
      if (variant === 'parasite') {
        mesh.current.position.y = 1.0 + Math.sin(state.clock.elapsedTime * 2) * 0.5;
      } else if (variant === 'crawler') {
        mesh.current.position.y = -0.5;
      } else {
        mesh.current.position.y = -1;
      }
    }
  });

  return (
    <group ref={mesh} scale={[scale, scale, scale]} position={[0, -1, 0]}>
      {/* Torso/Clothing */}
      <Box args={[0.6, 0.9, 0.4]} position={[0, 1.25, 0]}>
        <meshStandardMaterial color={clothingColor} roughness={0.9} metalness={0.1} />
      </Box>
      <Box args={[0.62, 0.3, 0.42]} position={[0, 1.4, 0]} rotation={[0.1, 0, 0]}>
        <meshStandardMaterial color={variant === 'tank' ? '#111' : '#222'} roughness={0.9} />
      </Box>
      <Box args={[0.65, 0.2, 0.45]} position={[0, 1.0, 0]} rotation={[-0.1, 0.1, 0]}>
        <meshStandardMaterial color={variant === 'tank' ? '#222' : '#333'} roughness={0.9} />
      </Box>

      {/* Exposed Ribs */}
      {(variant === 'brute' || variant === 'parasite') && (
        <group position={[0, 1.25, 0.21]}>
          <Box args={[0.4, 0.05, 0.02]} position={[0, 0.1, 0]}><meshStandardMaterial color="#eee" roughness={1} /></Box>
          <Box args={[0.4, 0.05, 0.02]} position={[0, 0, 0]}><meshStandardMaterial color="#eee" roughness={1} /></Box>
          <Box args={[0.4, 0.05, 0.02]} position={[0, -0.1, 0]}><meshStandardMaterial color="#eee" roughness={1} /></Box>
        </group>
      )}

      {/* Legs (Tattered pants) */}
      <Box args={[0.2, 0.8, 0.2]} position={[0.15, 0.4, 0]}>
        <meshStandardMaterial color={variant === 'tank' ? '#111' : '#1a1a1a'} roughness={0.9} />
      </Box>
      <Box args={[0.2, 0.8, 0.2]} position={[-0.15, 0.4, 0]}>
        <meshStandardMaterial color={variant === 'tank' ? '#111' : '#1a1a1a'} roughness={0.9} />
      </Box>

      {/* Arms (Outstretched) */}
      <Box args={[0.15, 0.6, 0.15]} position={[0.4, 1.3, 0.25]} rotation={[-Math.PI / 2.5, 0, 0]}>
        <meshStandardMaterial color={skinColor} roughness={0.8} />
      </Box>
      <Box args={[0.15, 0.6, 0.15]} position={[-0.4, 1.3, 0.25]} rotation={[-Math.PI / 2.5, 0, 0]}>
        <meshStandardMaterial color={skinColor} roughness={0.8} />
      </Box>

      {/* Head */}
      <Box args={[0.35, 0.4, 0.35]} position={[0, 1.9, 0]}>
        <meshStandardMaterial color={skinColor} roughness={0.8} />
      </Box>
      {/* Gore detail on head */}
      <Box args={[0.15, 0.1, 0.1]} position={[0.1, 2.05, 0.1]}>
        <meshStandardMaterial color="#3a1f1f" roughness={0.9} />
      </Box>

      {/* Glowing Eyes */}
      <Sphere args={[0.04, 8, 8]} position={[0.12, 1.95, 0.22]}>
        <meshStandardMaterial color={variant === 'runner' ? '#ffaa00' : (variant === 'inferno' ? '#ff4400' : '#ff0000')} emissive={variant === 'runner' ? '#ffaa00' : (variant === 'inferno' ? '#ff4400' : '#ff0000')} emissiveIntensity={8} />
      </Sphere>
      <Sphere args={[0.04, 8, 8]} position={[-0.12, 1.95, 0.22]}>
        <meshStandardMaterial color={variant === 'runner' ? '#ffaa00' : (variant === 'inferno' ? '#ff4400' : '#ff0000')} emissive={variant === 'runner' ? '#ffaa00' : (variant === 'inferno' ? '#ff4400' : '#ff0000')} emissiveIntensity={8} />
      </Sphere>

      {/* Inferno Flames */}
      {variant === 'inferno' && (
        <group position={[0, 1.5, 0]}>
          <Sphere args={[0.3, 8, 8]} position={[0, 0.5, 0]}>
            <meshStandardMaterial color="#ff4400" transparent opacity={0.4} emissive="#ff4400" emissiveIntensity={2} />
          </Sphere>
        </group>
      )}
    </group>
  );
});

export const Dragon3D = () => {
    return (
        <group scale={[0.15, 0.15, 0.15]} position={[0, -0.5, 0]} rotation={[0, Math.PI / 4, 0]}>
          {/* Dragon Body (Rotting) */}
          <Box args={[4, 4, 10]} position={[0, 0, 0]}>
            <meshStandardMaterial color="#2a3b2a" roughness={0.9} metalness={0.1} />
          </Box>
          {/* Exposed Ribs */}
          {Array.from({ length: 5 }).map((_, i) => (
            <Box key={`rib-${i}`} args={[4.4, 3.5, 0.5]} position={[0, 0, 3 - i * 1.5]}>
              <meshStandardMaterial color="#d1d5db" roughness={1} />
            </Box>
          ))}
          
          {/* Glowing Core */}
          <Sphere args={[1.5, 16, 16]} position={[0, -0.5, 2]}>
            <meshStandardMaterial color="#ff4400" emissive="#ff4400" emissiveIntensity={5} transparent opacity={0.6} />
          </Sphere>

          {/* Dragon Neck */}
          <Box args={[2, 2, 5]} position={[0, 1.5, 6]} rotation={[-0.3, 0, 0]}>
            <meshStandardMaterial color="#2a3b2a" roughness={0.9} />
          </Box>

          {/* Dragon Head */}
          <group position={[0, 2.5, 10]}>
            {/* Upper Skull */}
            <Box args={[3, 2, 4]} position={[0, 0.5, 0]}>
              <meshStandardMaterial color="#1a2b1a" roughness={0.9} />
            </Box>
            {/* Horns */}
            <Box args={[0.4, 0.4, 3]} position={[1, 1.5, -1]} rotation={[-0.5, 0.2, 0]}><meshStandardMaterial color="#111" /></Box>
            <Box args={[0.4, 0.4, 3]} position={[-1, 1.5, -1]} rotation={[-0.5, -0.2, 0]}><meshStandardMaterial color="#111" /></Box>
            
            {/* Lower Jaw (Hanging) */}
            <Box args={[2.5, 1, 4]} position={[0, -1, 0]} rotation={[0.3, 0, 0]}>
              <meshStandardMaterial color="#1a2b1a" roughness={0.9} />
            </Box>
            {/* Teeth */}
            {Array.from({ length: 6 }).map((_, i) => (
              <Box key={`tooth-${i}`} args={[0.1, 0.4, 0.1]} position={[1.1 * (i % 2 === 0 ? 1 : -1), -0.6, 1.5 - Math.floor(i/2) * 1]}>
                <meshStandardMaterial color="#eee" />
              </Box>
            ))}
            
            {/* Glowing Eyes */}
            <Sphere args={[0.5, 16, 16]} position={[1, 0.8, 1.5]}>
              <meshStandardMaterial color="#ffaa00" emissive="#ffaa00" emissiveIntensity={10} />
            </Sphere>
            <Sphere args={[0.5, 16, 16]} position={[-1, 0.8, 1.5]}>
              <meshStandardMaterial color="#ffaa00" emissive="#ffaa00" emissiveIntensity={10} />
            </Sphere>
          </group>

          {/* Dragon Wings (Torn) */}
          <group position={[0, 1, 0]}>
            {/* Right Wing */}
            <group position={[2, 0, 0]} rotation={[0, 0, 0.2]}>
              <Box args={[12, 0.5, 5]} position={[6, 0, 0]} rotation={[0, 0, 0.2]}>
                <meshStandardMaterial color="#111" roughness={0.8} />
              </Box>
              {/* Wing Spikes */}
              <Box args={[0.3, 2, 0.3]} position={[10, 1, 2]} rotation={[0.5, 0, 0.5]}><meshStandardMaterial color="#333" /></Box>
              <Box args={[0.3, 2, 0.3]} position={[10, 1, -2]} rotation={[-0.5, 0, 0.5]}><meshStandardMaterial color="#333" /></Box>
            </group>
            {/* Left Wing */}
            <group position={[-2, 0, 0]} rotation={[0, 0, -0.2]}>
              <Box args={[12, 0.5, 5]} position={[-6, 0, 0]} rotation={[0, 0, -0.2]}>
                <meshStandardMaterial color="#111" roughness={0.8} />
              </Box>
              {/* Wing Spikes */}
              <Box args={[0.3, 2, 0.3]} position={[-10, 1, 2]} rotation={[0.5, 0, -0.5]}><meshStandardMaterial color="#333" /></Box>
              <Box args={[0.3, 2, 0.3]} position={[-10, 1, -2]} rotation={[-0.5, 0, -0.5]}><meshStandardMaterial color="#333" /></Box>
            </group>
          </group>

          {/* Tail with Spikes */}
          <group position={[0, 0, -5]}>
            <Box args={[2, 2, 6]} position={[0, 0, -3]}>
              <meshStandardMaterial color="#2a3b2a" roughness={0.9} />
            </Box>
            {Array.from({ length: 4 }).map((_, i) => (
              <Box key={`tail-spike-${i}`} args={[0.4, 1.5, 0.4]} position={[0, 1.2, -1 - i * 1.5]} rotation={[0.5, 0, 0]}>
                <meshStandardMaterial color="#111" />
              </Box>
            ))}
          </group>
        </group>
    );
};

export const Elephant3D = () => {
    return (
        <group scale={[0.15, 0.15, 0.15]} position={[0, -0.5, 0]} rotation={[0, Math.PI / 4, 0]}>
          {/* Elephant Body */}
          <Box args={[6, 5, 8]} position={[0, 2.5, 0]}>
            <meshStandardMaterial color="#555" roughness={0.9} metalness={0.2} />
          </Box>
          {/* Head */}
          <Box args={[4, 4, 4]} position={[0, 3, 5]}>
            <meshStandardMaterial color="#555" roughness={0.9} />
          </Box>
          {/* Trunk */}
          <group position={[0, 1.5, 7]} rotation={[0.2, 0, 0]}>
            <Box args={[1, 1, 1]} position={[0, 0, 0]}><meshStandardMaterial color="#555" /></Box>
            <Box args={[0.9, 1, 1]} position={[0, -0.8, 0.2]} rotation={[0.2, 0, 0]}><meshStandardMaterial color="#555" /></Box>
            <Box args={[0.8, 1, 1]} position={[0, -1.6, 0.6]} rotation={[0.4, 0, 0]}><meshStandardMaterial color="#555" /></Box>
          </group>
          
          {/* Tusks (Curved) */}
          <group position={[1.5, 2, 7]} rotation={[0, 0.2, 0]}>
            <Box args={[0.5, 0.5, 2]} position={[0, 0, 1]}><meshStandardMaterial color="#eee" /></Box>
            <Box args={[0.4, 0.4, 2]} position={[0, 0.5, 2.5]} rotation={[-0.4, 0, 0]}><meshStandardMaterial color="#eee" /></Box>
          </group>
          <group position={[-1.5, 2, 7]} rotation={[0, -0.2, 0]}>
            <Box args={[0.5, 0.5, 2]} position={[0, 0, 1]}><meshStandardMaterial color="#eee" /></Box>
            <Box args={[0.4, 0.4, 2]} position={[0, 0.5, 2.5]} rotation={[-0.4, 0, 0]}><meshStandardMaterial color="#eee" /></Box>
          </group>

          {/* Armor Plates */}
          <Box args={[6.4, 3, 5]} position={[0, 3.5, 0]}><meshStandardMaterial color="#222" metalness={0.9} roughness={0.1} /></Box>
          <Box args={[3.5, 1.5, 3.5]} position={[0, 5.2, 5]}><meshStandardMaterial color="#222" metalness={0.9} roughness={0.1} /></Box>
          {/* Spikes on armor */}
          <Box args={[0.3, 1.5, 0.3]} position={[2, 5, 0]} rotation={[0.2, 0, 0.2]}><meshStandardMaterial color="#111" /></Box>
          <Box args={[0.3, 1.5, 0.3]} position={[-2, 5, 0]} rotation={[0.2, 0, -0.2]}><meshStandardMaterial color="#111" /></Box>
          
          {/* Legs */}
          <Box args={[1.8, 3, 1.8]} position={[2.5, -1.5, 3]}><meshStandardMaterial color="#333" /></Box>
          <Box args={[1.8, 3, 1.8]} position={[-2.5, -1.5, 3]}><meshStandardMaterial color="#333" /></Box>
          <Box args={[1.8, 3, 1.8]} position={[2.5, -1.5, -3]}><meshStandardMaterial color="#333" /></Box>
          <Box args={[1.8, 3, 1.8]} position={[-2.5, -1.5, -3]}><meshStandardMaterial color="#333" /></Box>
        </group>
    );
};

export const Ogre3D = () => {
    return (
        <group scale={[0.18, 0.18, 0.18]} position={[0, -1, 0]} rotation={[0, Math.PI / 4, 0]}>
          {/* Ogre Body (Fat) */}
          <Box args={[5, 6, 4]} position={[0, 3, 0]}>
            <meshStandardMaterial color="#2d4a22" roughness={0.8} metalness={0.1} />
          </Box>
          {/* Exposed Stomach/Wound */}
          <Box args={[3, 2, 0.1]} position={[0, 2.5, 2.01]}>
            <meshStandardMaterial color="#500" roughness={1} />
          </Box>
          
          {/* Head */}
          <group position={[0, 7, 0]}>
            <Box args={[2, 2.5, 2]}>
              <meshStandardMaterial color="#2d4a22" roughness={0.8} />
            </Box>
            {/* Single Glowing Eye */}
            <Sphere args={[0.4, 16, 16]} position={[0, 0.2, 1.01]}>
              <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={10} />
            </Sphere>
            {/* Horns */}
            <Box args={[0.3, 0.3, 1]} position={[0.8, 1, 0]} rotation={[-0.5, 0.5, 0]}><meshStandardMaterial color="#111" /></Box>
            <Box args={[0.3, 0.3, 1]} position={[-0.8, 1, 0]} rotation={[-0.5, -0.5, 0]}><meshStandardMaterial color="#111" /></Box>
          </group>

          {/* Spikes on back */}
          {Array.from({ length: 6 }).map((_, i) => (
            <Box key={`spike-${i}`} args={[0.4, 1.2, 0.4]} position={[(i % 2 === 0 ? 1 : -1) * 1.5, 5 - Math.floor(i/2) * 1.5, -2]} rotation={[0.5, 0, 0]}>
              <meshStandardMaterial color="#111" />
            </Box>
          ))}
          
          {/* Arms */}
          <Box args={[1.8, 5, 1.8]} position={[3.5, 3, 0]} rotation={[0, 0, 0.2]}>
            <meshStandardMaterial color="#2d4a22" roughness={0.8} />
          </Box>
          <Box args={[1.8, 5, 1.8]} position={[-3.5, 3, 0]} rotation={[0, 0, -0.2]}>
            <meshStandardMaterial color="#2d4a22" roughness={0.8} />
          </Box>
          {/* Massive Spiked Club */}
          <group position={[4.5, 3, 2]} rotation={[Math.PI / 4, 0, 0]}>
            <Box args={[1.2, 10, 1.2]}>
              <meshStandardMaterial color="#4a3018" roughness={0.9} />
            </Box>
            {/* Club Spikes */}
            {Array.from({ length: 8 }).map((_, i) => (
              <Box key={`club-spike-${i}`} args={[0.3, 0.3, 1]} position={[0, 4 - i * 1, 0]} rotation={[0, i * Math.PI / 4, 0]}>
                <meshStandardMaterial color="#222" metalness={0.8} />
              </Box>
            ))}
          </group>
          {/* Legs */}
          <Box args={[2, 3, 2]} position={[1.5, -1.5, 0]}><meshStandardMaterial color="#1a2b14" /></Box>
          <Box args={[2, 3, 2]} position={[-1.5, -1.5, 0]}><meshStandardMaterial color="#1a2b14" /></Box>
        </group>
    );
};

export const MushroomKeeper3D = () => {
    return (
        <group scale={[0.13, 0.13, 0.13]} position={[0, -1, 0]} rotation={[0, Math.PI / 4, 0]}>
          {/* Core Body - Torso */}
          <Box args={[5.5, 7, 4.5]} position={[0, 4, 0]}>
             <meshStandardMaterial color="#2d1c15" roughness={0.9} />
          </Box>
          {/* Chest */}
          <Box args={[6.5, 4, 5.5]} position={[0, 5, 0.5]}>
             <meshStandardMaterial color="#35241b" roughness={0.9} />
          </Box>
          
          {/* Head */}
          <group position={[0, 9.5, 1.5]}>
             <Box args={[4, 4.5, 4.5]}>
               <meshStandardMaterial color="#2d1c15" roughness={0.9} />
             </Box>
             {/* Snout/Jaw */}
             <Box args={[3, 2, 2.5]} position={[0, -1, 1.5]}>
               <meshStandardMaterial color="#1a110d" roughness={0.8} />
             </Box>
             {/* Brow */}
             <Box args={[4.5, 1, 2]} position={[0, 1, 1.5]}>
               <meshStandardMaterial color="#1a110d" roughness={0.9} />
             </Box>
             {/* Glowing Eyes */}
             <Sphere args={[0.3]} position={[-1, 0.2, 2.3]}>
               <meshStandardMaterial color="#9333ea" emissive="#d946ef" emissiveIntensity={3} />
             </Sphere>
             <Sphere args={[0.3]} position={[1, 0.2, 2.3]}>
               <meshStandardMaterial color="#9333ea" emissive="#d946ef" emissiveIntensity={3} />
             </Sphere>
             {/* Teeth */}
             <Cone args={[0.2, 0.6, 8]} position={[-0.8, -2, 2.6]} rotation={[Math.PI, 0, 0]}>
                <meshStandardMaterial color="#e5e5e5" />
             </Cone>
             <Cone args={[0.2, 0.6, 8]} position={[0.8, -2, 2.6]} rotation={[Math.PI, 0, 0]}>
                <meshStandardMaterial color="#e5e5e5" />
             </Cone>
          </group>

          {/* Left Arm */}
          <group position={[-4.5, 6.5, 0]} rotation={[0, 0, 0.3]}>
             <Sphere args={[2]} position={[0, 0, 0]}>
               <meshStandardMaterial color="#2d1c15" roughness={0.9} />
             </Sphere>
             <Box args={[3, 6, 3]} position={[-0.5, -2, 0]}>
               <meshStandardMaterial color="#2d1c15" roughness={0.9} />
             </Box>
             <Box args={[3.2, 5, 3.2]} position={[-0.5, -7, 0]} rotation={[0.2, 0, 0]}>
               <meshStandardMaterial color="#2d1c15" roughness={0.9} />
             </Box>
             <group position={[-0.5, -10, 0]}>
                <Cone args={[0.3, 1.5, 8]} position={[-1, 0, 1]} rotation={[Math.PI, 0, 0]}><meshStandardMaterial color="#111" /></Cone>
                <Cone args={[0.3, 1.5, 8]} position={[0, 0, 1.5]} rotation={[Math.PI, 0, 0]}><meshStandardMaterial color="#111" /></Cone>
                <Cone args={[0.3, 1.5, 8]} position={[1, 0, 1]} rotation={[Math.PI, 0, 0]}><meshStandardMaterial color="#111" /></Cone>
             </group>
          </group>
          
          {/* Right Arm */}
          <group position={[4.5, 6.5, 0]} rotation={[-0.4, 0, -0.3]}>
             <Sphere args={[2]} position={[0, 0, 0]}>
               <meshStandardMaterial color="#2d1c15" roughness={0.9} />
             </Sphere>
             <Box args={[3, 6, 3]} position={[0.5, -2, 0]}>
               <meshStandardMaterial color="#2d1c15" roughness={0.9} />
             </Box>
             <Box args={[3.2, 5, 3.2]} position={[0.5, -7, 0.5]} rotation={[-0.3, 0, 0]}>
               <meshStandardMaterial color="#2d1c15" roughness={0.9} />
             </Box>
             <group position={[0.5, -10, 0]}>
                <Cone args={[0.3, 1.5, 8]} position={[-1, 0, 1]} rotation={[Math.PI, 0, 0]}><meshStandardMaterial color="#111" /></Cone>
                <Cone args={[0.3, 1.5, 8]} position={[0, 0, 1.5]} rotation={[Math.PI, 0, 0]}><meshStandardMaterial color="#111" /></Cone>
                <Cone args={[0.3, 1.5, 8]} position={[1, 0, 1]} rotation={[Math.PI, 0, 0]}><meshStandardMaterial color="#111" /></Cone>
             </group>
          </group>

          {/* Left Leg */}
          <group position={[-2, -0.5, 0.5]}>
            <Box args={[3.5, 5, 3.5]} position={[0, 2, 0]}>
               <meshStandardMaterial color="#2d1c15" roughness={0.9} />
            </Box>
            <Box args={[3, 4, 3]} position={[0, -2, 0]}>
               <meshStandardMaterial color="#2d1c15" roughness={0.9} />
            </Box>
            <Box args={[3.5, 1.5, 4.5]} position={[0, -4.5, 1]}>
               <meshStandardMaterial color="#1a110d" roughness={0.9} />
            </Box>
          </group>
          {/* Right Leg */}
          <group position={[2, -0.5, 0.5]}>
            <Box args={[3.5, 5, 3.5]} position={[0, 2, 0]}>
               <meshStandardMaterial color="#2d1c15" roughness={0.9} />
            </Box>
            <Box args={[3, 4, 3]} position={[0, -2, 0]}>
               <meshStandardMaterial color="#2d1c15" roughness={0.9} />
            </Box>
            <Box args={[3.5, 1.5, 4.5]} position={[0, -4.5, 1]}>
               <meshStandardMaterial color="#1a110d" roughness={0.9} />
            </Box>
          </group>

          {/* Huge mushrooms on back */}
          <group position={[0, 6, -2]} rotation={[-0.5, 0, 0]}>
             <Cylinder args={[0.4, 0.6, 4]} position={[0, 2, 0]}>
                <meshStandardMaterial color="#e2e8f0" />
             </Cylinder>
             <Sphere args={[2.5, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} position={[0, 4, 0]}>
                <meshStandardMaterial color="#ec4899" side={THREE.DoubleSide} emissive="#ec4899" emissiveIntensity={0.5} roughness={0.4} />
             </Sphere>
             <Sphere args={[2.3, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} position={[0, 3.9, 0]}>
                <meshStandardMaterial color="#fce7f3" side={THREE.DoubleSide} />
             </Sphere>
             <Sphere args={[0.4]} position={[1, 4.5, 1]}><meshStandardMaterial color="#fff" /></Sphere>
             <Sphere args={[0.5]} position={[-1.2, 4.3, 0.5]}><meshStandardMaterial color="#fff" /></Sphere>
             <Sphere args={[0.3]} position={[0, 4.8, -1]}><meshStandardMaterial color="#fff" /></Sphere>
          </group>

          {/* Shoulder mushroom */}
          <group position={[-2.5, 7.5, 0.5]} rotation={[0.2, 0, -0.4]}>
             <Cylinder args={[0.2, 0.3, 2]} position={[0, 1, 0]}>
                <meshStandardMaterial color="#cbd5e1" />
             </Cylinder>
             <Sphere args={[1.2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} position={[0, 2, 0]}>
                <meshStandardMaterial color="#8b5cf6" side={THREE.DoubleSide} emissive="#8b5cf6" emissiveIntensity={0.8} />
             </Sphere>
          </group>
          
          {/* Lower back mushroom */}
          <group position={[2.5, 3, -1.5]} rotation={[-0.8, 0, 0.6]}>
             <Cylinder args={[0.3, 0.4, 2.5]} position={[0, 1.25, 0]}>
                <meshStandardMaterial color="#cbd5e1" />
             </Cylinder>
             <Sphere args={[1.5, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} position={[0, 2.5, 0]}>
                <meshStandardMaterial color="#10b981" side={THREE.DoubleSide} emissive="#10b981" emissiveIntensity={0.6} />
             </Sphere>
             <Sphere args={[0.2]} position={[0.5, 2.8, 0.5]}><meshStandardMaterial color="#fff" /></Sphere>
          </group>

          {/* Scattered mushrooms */}
          {Array.from({ length: 8 }).map((_, i) => (
            <group key={`sc-${i}`} position={[(Math.random()-0.5)*7, 1 + Math.random()*9, (Math.random()-0.5)*6]} rotation={[Math.random(), Math.random(), Math.random()]}>
              <Cylinder args={[0.15, 0.2, 1, 8]} position={[0, 0.5, 0]}>
                  <meshStandardMaterial color="#f1f5f9" />
              </Cylinder>
              <Sphere args={[0.6, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} position={[0, 1, 0]}>
                  <meshStandardMaterial color={['#ef4444', '#3b82f6', '#f59e0b', '#d946ef'][i % 4]} side={THREE.DoubleSide} emissive={['#ef4444', '#3b82f6', '#f59e0b', '#d946ef'][i % 4]} emissiveIntensity={0.3} />
              </Sphere>
            </group>
          ))}
          
          {/* Roots and Vines */}
          <Cylinder args={[0.1, 0.05, 3]} position={[-4, 3, 1]} rotation={[0.1, 0, 0.1]}><meshStandardMaterial color="#4d7c0f" /></Cylinder>
          <Cylinder args={[0.08, 0.02, 4]} position={[-4.5, 2, 1.2]} rotation={[-0.1, 0, 0.2]}><meshStandardMaterial color="#65a30d" /></Cylinder>
          <Cylinder args={[0.1, 0.05, 4]} position={[4, 4, 1.5]} rotation={[0.2, 0, -0.1]}><meshStandardMaterial color="#4d7c0f" /></Cylinder>
          <Cylinder args={[0.05, 0.02, 3]} position={[3.5, 2, 1]} rotation={[0.1, 0, -0.2]}><meshStandardMaterial color="#65a30d" /></Cylinder>
        </group>
    );
};

export const Worm3D = () => {
    return (
        <group scale={[0.2, 0.2, 0.2]} position={[0, 1.5, 0]} rotation={[1.2, Math.PI / 4, 0]}>
          {/* Worm Segments */}
          {Array.from({ length: 10 }).map((_, i) => (
            <Sphere key={i} args={[3.5 - i * 0.3, 16, 16]} position={[0, -i * 2.5, 0]}>
              <meshStandardMaterial color="#5a3a22" roughness={0.9} metalness={0.1} />
            </Sphere>
          ))}
          {/* Spikes on segments */}
          {Array.from({ length: 12 }).map((_, i) => (
            <Box key={`spike-${i}`} args={[0.4, 1.5, 0.4]} position={[Math.cos(i * Math.PI / 3) * 3, -Math.floor(i/3) * 2.5, Math.sin(i * Math.PI / 3) * 3]} rotation={[0, i * Math.PI / 3, 0.5]}>
              <meshStandardMaterial color="#111" />
            </Box>
          ))}
          
          {/* Mouth (Open when attacking) */}
          <group position={[0, 2.5, 0]}>
            {/* Multiple layers of jaws */}
            <Box args={[5, 1, 5]} position={[0, 1.5, 0]} rotation={[0.6, 0, 0]}>
              <meshStandardMaterial color="#5a3a22" />
            </Box>
            <Box args={[5, 1, 5]} position={[0, -1.5, 0]} rotation={[-0.6, 0, 0]}>
              <meshStandardMaterial color="#5a3a22" />
            </Box>
            {/* Inner Mouth Glow */}
            <Sphere args={[2, 16, 16]} position={[0, 0, -1]}>
              <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={5} />
            </Sphere>
            {/* Many Teeth */}
            {Array.from({ length: 12 }).map((_, i) => (
              <Box key={`tooth-${i}`} args={[0.2, 1.2, 0.2]} position={[Math.cos(i * Math.PI / 6) * 2, (i % 2 === 0 ? 1.5 : -1.5), Math.sin(i * Math.PI / 6) * 2]} rotation={[i % 2 === 0 ? 0.5 : -0.5, 0, 0]}>
                <meshStandardMaterial color="#eee" />
              </Box>
            ))}
          </group>
        </group>
    );
};

export const ZombiePickle3D = () => {
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime * 6;
    if (leftLeg.current) leftLeg.current.rotation.x = Math.sin(t) * 0.55;
    if (rightLeg.current) rightLeg.current.rotation.x = -Math.sin(t) * 0.55;
    
    // Classic Outstretched Zombie Arms reaching & clawing forward
    if (leftArm.current) {
      leftArm.current.rotation.x = -Math.PI / 2.2 + Math.sin(t) * 0.12;
      leftArm.current.rotation.z = 0.15 + Math.cos(t * 0.8) * 0.06;
    }
    if (rightArm.current) {
      rightArm.current.rotation.x = -Math.PI / 2.2 - Math.sin(t) * 0.12;
      rightArm.current.rotation.z = -0.15 - Math.cos(t * 0.8) * 0.06;
    }

    // Pickle Zombie Waddle & Vertical Bounce
    if (torso.current) {
      torso.current.position.y = Math.abs(Math.sin(t * 1.8)) * 0.08;
      torso.current.rotation.z = Math.sin(t) * 0.08;
      torso.current.rotation.x = 0.12 + Math.sin(t * 2) * 0.04;
    }

    if (head.current) {
      head.current.rotation.y = Math.sin(t * 0.6) * 0.15;
      head.current.rotation.z = Math.sin(t) * 0.05;
    }
  });

  return (
    <group position={[0, -1, 0]}>
      <group ref={torso}>
        {/* Seamless 100% Solid Organic Pickle Body */}
        <Cylinder args={[0.32, 0.28, 1.2, 16]} position={[0, 1.1, 0]}>
          <meshStandardMaterial color="#4d7c0f" roughness={0.75} metalness={0.15} />
        </Cylinder>
        {/* Pickle Bumps */}
        {Array.from({ length: 8 }).map((_, i) => (
          <Sphere key={`bump-${i}`} args={[0.07, 8, 8]} position={[Math.sin(i * 1.2) * 0.28, 0.7 + (i * 0.12), Math.cos(i * 1.2) * 0.28]}>
            <meshStandardMaterial color="#3f6212" roughness={0.9} />
          </Sphere>
        ))}

        {/* Head & Camo Bucket Hat */}
        <group ref={head} position={[0, 1.7, 0]}>
          <Cylinder args={[0.3, 0.32, 0.4, 16]} position={[0, 0, 0]}>
            <meshStandardMaterial color="#3f6212" roughness={0.7} />
          </Cylinder>
          {/* Glowing Eyes */}
          <Sphere args={[0.045, 12, 12]} position={[0.1, 0.05, 0.28]}>
            <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={6} />
          </Sphere>
          <Sphere args={[0.045, 12, 12]} position={[-0.1, 0.05, 0.28]}>
            <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={6} />
          </Sphere>
          {/* Teeth */}
          <Box args={[0.22, 0.06, 0.04]} position={[0, -0.08, 0.28]}>
            <meshStandardMaterial color="#fef08a" />
          </Box>

          {/* Camo Bucket Hat */}
          <group position={[0, 0.22, 0]}>
            <Cylinder args={[0.36, 0.34, 0.22, 16]}>
              <meshStandardMaterial color="#2d3748" roughness={0.8} />
            </Cylinder>
            {/* Brim */}
            <Cylinder args={[0.55, 0.52, 0.04, 16]} position={[0, -0.1, 0]} rotation={[0.1, 0, 0]}>
              <meshStandardMaterial color="#1a202c" roughness={0.8} />
            </Cylinder>

            {/* Original Hat R9S Insignia */}
            <group position={[0, 0.04, 0.34]}>
              <Text
                position={[0, 0, 0]}
                fontSize={0.13}
                color="#e2e8f0"
                outlineWidth={0.02}
                outlineColor="#1e293b"
                fontWeight="black"
              >
                R9S
              </Text>
            </group>
          </group>
        </group>

        {/* Left Arm Joint - Outstretched Zombie Arm */}
        <group ref={leftArm} position={[-0.35, 1.4, 0]}>
          <Sphere args={[0.12, 12, 12]} position={[0, 0, 0]}><meshStandardMaterial color="#3f6212" /></Sphere>
          <Box args={[0.14, 0.65, 0.14]} position={[0, -0.3, 0]}>
            <meshStandardMaterial color="#4d7c0f" roughness={0.8} />
          </Box>
          <Sphere args={[0.08, 8, 8]} position={[0, -0.65, 0]}><meshStandardMaterial color="#3f6212" /></Sphere>
        </group>

        {/* Right Arm Joint - Outstretched Zombie Arm */}
        <group ref={rightArm} position={[0.35, 1.4, 0]}>
          <Sphere args={[0.12, 12, 12]} position={[0, 0, 0]}><meshStandardMaterial color="#3f6212" /></Sphere>
          <Box args={[0.14, 0.65, 0.14]} position={[0, -0.3, 0]}>
            <meshStandardMaterial color="#4d7c0f" roughness={0.8} />
          </Box>
          <Sphere args={[0.08, 8, 8]} position={[0, -0.65, 0]}><meshStandardMaterial color="#3f6212" /></Sphere>
        </group>

        {/* Left Leg Joint */}
        <group ref={leftLeg} position={[-0.15, 0.5, 0]}>
          <Sphere args={[0.12, 12, 12]} position={[0, 0, 0]}><meshStandardMaterial color="#1f2937" /></Sphere>
          <Box args={[0.16, 0.5, 0.16]} position={[0, -0.25, 0]}>
            <meshStandardMaterial color="#1f2937" roughness={0.9} />
          </Box>
          <Box args={[0.2, 0.18, 0.3]} position={[0, -0.5, 0.05]}>
            <meshStandardMaterial color="#111" roughness={0.9} />
          </Box>
        </group>

        {/* Right Leg Joint */}
        <group ref={rightLeg} position={[0.15, 0.5, 0]}>
          <Sphere args={[0.12, 12, 12]} position={[0, 0, 0]}><meshStandardMaterial color="#1f2937" /></Sphere>
          <Box args={[0.16, 0.5, 0.16]} position={[0, -0.25, 0]}>
            <meshStandardMaterial color="#1f2937" roughness={0.9} />
          </Box>
          <Box args={[0.2, 0.18, 0.3]} position={[0, -0.5, 0.05]}>
            <meshStandardMaterial color="#111" roughness={0.9} />
          </Box>
        </group>
      </group>
    </group>
  );
};
