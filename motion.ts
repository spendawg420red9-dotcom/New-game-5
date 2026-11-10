import * as THREE from 'three';

// Part motions for guns made in the Shape Studio. A part can move when the gun fires and when it reloads
// (a magazine that drops out, a slide that kicks back, a cylinder that spins...). The motion is saved inside the .glb
// (node "extras") so it travels with the model; GunGLB plays it in the game and the Shape Studio plays it as a test.
export type MotionKind = 'none' | 'slide' | 'drop' | 'rise' | 'spin' | 'kick';
export interface Motion { kind: MotionKind; axis: 'x' | 'y' | 'z'; amount: number; dur: number; }
export interface PartMotions { fire?: Motion; reload?: Motion; }

export const MOTION_KINDS: { id: MotionKind; name: string; hint: string }[] = [
  { id: 'none', name: 'None', hint: '' },
  { id: 'slide', name: 'Slide back & return', hint: 'Moves along the axis and snaps back (slide, bolt, pump).' },
  { id: 'drop', name: 'Drop out & back in', hint: 'Moves away, waits, comes back (magazine).' },
  { id: 'rise', name: 'Lift & return', hint: 'Lifts up and comes back (cocking handle, flip-up).' },
  { id: 'spin', name: 'Spin round', hint: 'One full turn around the axis (cylinder, barrels).' },
  { id: 'kick', name: 'Tilt & return', hint: 'Turns by the amount (degrees) and back (hammer, lever, trigger).' },
];

/** 0..1 shape of an out-and-back move for the given kind at phase 0..1 */
const shape = (kind: MotionKind, p: number): number => {
  if (kind === 'drop') return p < 0.35 ? p / 0.35 : p < 0.7 ? 1 : (1 - p) / 0.3;
  return Math.sin(Math.min(1, Math.max(0, p)) * Math.PI);
};

const axisIndex = (a: 'x' | 'y' | 'z') => (a === 'x' ? 0 : a === 'y' ? 1 : 2);

/** Moves / turns a node from its resting pose for a motion that is `phase` (0..1) of the way through. phase <= 0 or >= 1 = at rest. */
export const applyMotion = (node: THREE.Object3D, base: { pos: THREE.Vector3; rot: THREE.Euler }, m: Motion, phase: number) => {
  const ai = axisIndex(m.axis);
  if (phase <= 0 || phase >= 1) { node.position.copy(base.pos); node.rotation.copy(base.rot); return; }
  node.position.copy(base.pos); node.rotation.copy(base.rot);
  if (m.kind === 'slide' || m.kind === 'drop' || m.kind === 'rise') {
    const v = shape(m.kind, phase) * m.amount;
    if (ai === 0) node.position.x += v; else if (ai === 1) node.position.y += v; else node.position.z += v;
  } else if (m.kind === 'spin') {
    const r = phase * Math.PI * 2;
    if (ai === 0) node.rotation.x += r; else if (ai === 1) node.rotation.y += r; else node.rotation.z += r;
  } else if (m.kind === 'kick') {
    const r = shape('kick', phase) * m.amount * Math.PI / 180;
    if (ai === 0) node.rotation.x += r; else if (ai === 1) node.rotation.y += r; else node.rotation.z += r;
  }
};

export const hasMotion = (pm?: PartMotions | null) => !!pm && ((pm.fire && pm.fire.kind !== 'none') || (pm.reload && pm.reload.kind !== 'none'));
