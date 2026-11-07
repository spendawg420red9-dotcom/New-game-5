// Per-model fixes measured from the actual GLB meshes.
// colliders: [centerX, centerZ, sizeX, sizeZ] as fractions of the object's width/depth.
// cutouts:   [cx, cy, cz, sx, sy, sz] boxes (fractions of width/height/depth, centred) that are
//            visually cut out of the model, e.g. a doorway through a solid wall.
export type Collider = [number, number, number, number];
export type Cutout = [number, number, number, number, number, number];

export interface ModelDefaults {
  colliders?: Collider[];
  cutouts?: Cutout[];
}

export const MODEL_DEFAULTS: Record<string, ModelDefaults> = {
  '/assets/r9s/warehouse_shell.glb': {
    // Walls measured from the mesh: back wall z -0.40..-0.36, front wall z 0.40..0.49, side walls x +-0.47.
    // The front wall is solid in the mesh, so a 6m doorway is cut through it (visual + collision gap).
    colliders: [
      [0, -0.38, 1.0, 0.07],
      [-0.474, 0.043, 0.045, 0.92],
      // Right side (+x): the big hole in the wall spans z -0.31..+0.40 of the depth, so only the two end posts are solid
      [0.474, -0.36, 0.045, 0.12],
      [0.474, 0.45, 0.045, 0.10],
      [-0.295, 0.446, 0.39, 0.09],
      [0.295, 0.446, 0.39, 0.09],
    ],
    cutouts: [[0, -0.255, 0.45, 0.2, 0.44, 0.17]],
  },
};
