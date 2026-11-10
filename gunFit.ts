// Works out how an uploaded gun .glb should be turned so it looks like a normal held gun.
// Pure maths (no three.js) so it is easy to test.
//
// Built-in guns point their barrel down -Z, sit upright (Y up) and are roughly 0.3 (pistol) to 1.1 (sniper) long.
// A .glb from Meshy / Blender / a website can be any size and face any way, so:
//   1. the longest side of the model is treated as the barrel line and turned onto the Z axis
//   2. the heavy / detailed end (stock, grip, magazine) goes to the back, the thin end (barrel) to the front
//   3. it is scaled UNIFORMLY (never stretched) to the length a gun of that type should have
// The Creator Studio then lets you fix anything the guess got wrong (turn, tip, roll, flip, size, nudge).

export type Axis = 'x' | 'y' | 'z';
export interface Vec3 { x: number; y: number; z: number }

/** d = (average position of the model's points) - (centre of its bounding box). */
export const pickGunOrientation = (size: Vec3, d: Vec3, auto: boolean): { axis: Axis; flip: boolean } => {
  if (!auto) return { axis: 'z', flip: false };
  const longest = Math.max(size.x, size.y, size.z);
  // prefer Z when it is (nearly) the longest so models that are already fine are left alone
  const axis: Axis = size.z >= longest * 0.95 ? 'z' : size.x >= size.y ? 'x' : 'y';
  // after the axis is turned onto Z, which way does the model's heavy end point?
  const heavy = axis === 'z' ? d.z : axis === 'x' ? -d.x : -d.y;
  // heavy end must end up at +Z (behind the gun); otherwise swap ends
  return { axis, flip: heavy < 0 };
};

/** How long a gun of this type should be in the game's units (matches the built-in models). */
export const gunTargetLength = (barrelLen: number, twoHanded: boolean): number => {
  const len = twoHanded ? 0.45 + barrelLen * 0.75 : 0.18 + barrelLen * 0.5;
  return Math.min(1.4, Math.max(0.25, len));
};


/**
 * Sideways spot of the held gun, in metres to the right of the camera at 0.5 m in front of it.
 * On a wide screen that is 0.25. On a tall phone screen the same spot is past the edge of the picture, so the gun is cut off and
 * looks stretched and turned; there it is moved in so the gun sits at about the same place on the screen.
 */
export const viewmodelX = (fovDeg: number, aspect: number): number => {
  const halfWidth = Math.tan((fovDeg * Math.PI) / 360) * Math.max(0.2, aspect) * 0.5;
  return Math.max(0.04, Math.min(0.25, halfWidth * 0.55));
};
