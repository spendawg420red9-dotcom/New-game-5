# v12 changes (built on v11)

- Fix: Vercel build failed because index.tsx imports installProceduralTextures, which proceduralTextures.ts did not export. Added it (no-op; textures are built lazily). Nothing else changed.
- Build-tested: vite build passes.
