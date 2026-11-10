import React from 'react';
import { BodyExtra, BodyPart, ZombieBody } from '../types';

// The built-in zombie body drawn from a ZombieBody (Design Studio > Custom Zombie > Body parts).
// The default values draw the same zombie the game has always had. Used by the game and by the Design Studio preview.

const part = (shape: BodyPart['shape'], w: number, h: number, d: number, x: number, y: number, z: number, extra: Partial<BodyPart> = {}): BodyPart =>
  ({ show: true, shape, w, h, d, x, y, z, ...extra });

export const defaultZombieBody = (): ZombieBody => ({
  head: part('box', 0.4, 0.45, 0.45, 0, 1.9, 0),
  torso: part('box', 0.6, 0.9, 0.4, 0, 1.25, 0),
  armR: part('box', 0.17, 0.17, 0.95, 0.35, 1.5, 0),
  armL: part('box', 0.17, 0.17, 0.95, -0.35, 1.5, 0),
  legR: part('box', 0.22, 0.8, 0.22, 0.15, 0.8, 0),
  legL: part('box', 0.22, 0.8, 0.22, -0.15, 0.8, 0),
  eyeSize: 0.04, eyeSpread: 0.12, eyeY: 0.05, eyeZ: 0.22,
  extras: [], scale: 1, reach: 0, swing: 1,
});

/** Fill anything missing (older saves) so the body can never come out broken */
export const completeBody = (b?: Partial<ZombieBody> | null): ZombieBody => {
  const d = defaultZombieBody();
  if (!b) return d;
  return {
    ...d, ...b,
    head: { ...d.head, ...b.head }, torso: { ...d.torso, ...b.torso }, armL: { ...d.armL, ...b.armL }, armR: { ...d.armR, ...b.armR }, legL: { ...d.legL, ...b.legL }, legR: { ...d.legR, ...b.legR },
    extras: Array.isArray(b.extras) ? b.extras : [],
  };
};

const Shape: React.FC<{ p: BodyPart; color: string; hit: boolean }> = ({ p, color, hit }) => {
  const c = p.color || color;
  const mat = <meshStandardMaterial color={hit ? '#ff0000' : c} roughness={0.85} metalness={0.1} emissive={hit ? '#ff0000' : (p.glow ? c : '#000000')} emissiveIntensity={hit ? 1 : p.glow ? 2.5 : 0} />;
  return (
    <mesh scale={[Math.max(0.01, p.w), Math.max(0.01, p.h), Math.max(0.01, p.d)]}>
      {p.shape === 'sphere' ? <sphereGeometry args={[0.5, 14, 12]} /> : p.shape === 'cylinder' ? <cylinderGeometry args={[0.5, 0.5, 1, 14]} /> : p.shape === 'cone' ? <coneGeometry args={[0.5, 1, 14]} /> : <boxGeometry args={[1, 1, 1]} />}
      {mat}
    </mesh>
  );
};

const Extras: React.FC<{ list: BodyExtra[]; parent: BodyExtra['parent']; hit: boolean; color: string }> = ({ list, parent, hit, color }) => (
  <>
    {list.filter(e => e.parent === parent && e.show).map(e => (
      <group key={e.id} position={[e.x, e.y, e.z]} rotation={[e.rx * Math.PI / 180, e.ry * Math.PI / 180, e.rz * Math.PI / 180]}><Shape p={e} color={color} hit={hit} /></group>
    ))}
  </>
);

export const CustomZombieBody: React.FC<{
  body: ZombieBody; clothing: string; skin: string; eye: string; hit?: boolean;
  armL?: React.Ref<any>; armR?: React.Ref<any>; legL?: React.Ref<any>; legR?: React.Ref<any>;
}> = ({ body, clothing, skin, eye, hit = false, armL, armR, legL, legR }) => {
  const b = body;
  const dark = '#1a1a1a';
  return (
    <group scale={Math.max(0.2, b.scale)}>
      {b.torso.show && <group position={[b.torso.x, b.torso.y, b.torso.z]}><Shape p={b.torso} color={clothing} hit={hit} /></group>}
      <group position={[b.head.x, b.head.y, b.head.z]}>
        {b.head.show && <Shape p={b.head} color={skin} hit={hit} />}
        {b.head.show && [1, -1].map(s => (
          <mesh key={s} position={[s * b.eyeSpread, b.eyeY, b.eyeZ + b.head.d / 2 - 0.2]}>
            <sphereGeometry args={[Math.max(0.005, b.eyeSize), 8, 8]} />
            <meshStandardMaterial color={eye} emissive={eye} emissiveIntensity={8} />
          </mesh>
        ))}
        <Extras list={b.extras} parent="head" hit={hit} color={skin} />
      </group>
      {([['armR', armR, b.armR], ['armL', armL, b.armL]] as const).map(([k, ref, p]) => (
        <group key={k} ref={ref as any} position={[p.x, p.y, p.z]}>
          {p.show && <group position={[0, 0, p.d / 2]}><Shape p={p} color={clothing} hit={hit} /></group>}
          <Extras list={b.extras} parent={k} hit={hit} color={skin} />
        </group>
      ))}
      {([['legR', legR, b.legR], ['legL', legL, b.legL]] as const).map(([k, ref, p]) => (
        <group key={k} ref={ref as any} position={[p.x, p.y, p.z]}>
          {p.show && <group position={[0, -p.h / 2, 0]}><Shape p={p} color={dark} hit={hit} /></group>}
          <Extras list={b.extras} parent={k} hit={hit} color={dark} />
        </group>
      ))}
      <Extras list={b.extras} parent="body" hit={hit} color={clothing} />
    </group>
  );
};

/** Hats and headgear (positions match the game's default head; wrap it in a group moved with the head) */
export const ZombieHat: React.FC<{ hat?: string }> = ({ hat }) => {
  if (!hat || hat === 'none') return null;
  return (
    <>
      {hat === 'cowboy' && (
        <group position={[0, 2.15, 0]}>
          <mesh><cylinderGeometry args={[0.35, 0.35, 0.04, 16]} /><meshStandardMaterial color="#451a03" roughness={0.8} /></mesh>
          <mesh position={[0, 0.1, 0]}><cylinderGeometry args={[0.2, 0.22, 0.18, 16]} /><meshStandardMaterial color="#451a03" roughness={0.8} /></mesh>
        </group>
      )}
      {hat === 'pumpkin' && <mesh position={[0, 1.95, 0]}><sphereGeometry args={[0.28, 16, 16]} /><meshStandardMaterial color="#ea580c" roughness={0.7} /></mesh>}
      {hat === 'horns' && (
        <group position={[0, 2.1, 0]}>
          <mesh position={[0.15, 0.1, 0]} rotation={[0, 0, -0.3]}><coneGeometry args={[0.06, 0.25, 8]} /><meshStandardMaterial color="#dc2626" emissive="#7f1d1d" /></mesh>
          <mesh position={[-0.15, 0.1, 0]} rotation={[0, 0, 0.3]}><coneGeometry args={[0.06, 0.25, 8]} /><meshStandardMaterial color="#dc2626" emissive="#7f1d1d" /></mesh>
        </group>
      )}
      {hat === 'helmet' && <mesh position={[0, 1.98, 0]}><sphereGeometry args={[0.27, 16, 16]} /><meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} /></mesh>}
      {hat === 'halo' && <mesh position={[0, 2.3, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.22, 0.03, 8, 24]} /><meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={3} /></mesh>}
    </>
  );
};
