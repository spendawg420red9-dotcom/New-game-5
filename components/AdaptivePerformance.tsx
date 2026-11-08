import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

// Keeps the game smooth on every device by trading a little sharpness for speed ONLY while it is actually struggling.
//  - Looks at the real frame rate every 1.5 seconds.
//  - If it stays low, the picture is drawn at a slightly smaller size and stretched (steps of 0.25, never below `min`).
//  - If it has been fast for a while it climbs back up. If climbing back makes it slow again, it waits longer next time,
//    so the picture never flickers between sharp and soft.
//  - On a device that already runs at full speed nothing changes at all.
export const AdaptivePerformance: React.FC<{ max: number; min?: number; enabled?: boolean }> = ({ max, min = 0.75, enabled = true }) => {
  const setDpr = useThree(s => s.setDpr);
  const st = useRef({ acc: 0, frames: 0, dpr: max, low: 0, high: 0, cool: 6, needHigh: 8, lastDrop: 0, clock: 0 });
  useFrame((_, dt) => {
    if (!enabled) return;
    const s = st.current;
    if (dt > 0.5 || document.hidden) { s.acc = 0; s.frames = 0; return; } // tab switch / loading hitch: ignore
    s.clock += dt; s.acc += dt; s.frames++;
    if (s.acc < 1.5) return;
    const fps = s.frames / s.acc; s.acc = 0; s.frames = 0;
    if (s.cool > 0) { s.cool -= 1.5; return; }
    if (fps < 42 && s.dpr > min) {
      s.high = 0;
      if (++s.low >= 2) {
        s.low = 0; s.dpr = Math.max(min, +(s.dpr - 0.25).toFixed(2)); setDpr(s.dpr); s.cool = 4.5;
        if (s.clock - s.lastDrop < 20) s.needHigh = Math.min(80, s.needHigh * 2); // dropped soon after climbing: be patient next time
        s.lastDrop = s.clock;
      }
    } else {
      s.low = 0;
      if (fps >= 57 && s.dpr < max) {
        if (++s.high >= s.needHigh) { s.high = 0; s.dpr = Math.min(max, +(s.dpr + 0.25).toFixed(2)); setDpr(s.dpr); s.cool = 4.5; }
      } else s.high = 0;
    }
  });
  return null;
};
