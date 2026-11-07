import React, { useEffect, useMemo, useState } from 'react';
import { buildHudSkinCss, hudImageUrl, initHudImages, loadHudSkin, subscribeHudImages, subscribeHudSkin } from '../hudSkin';

// Puts the saved HUD skin (themes, neon, pictures, fonts) onto the real on-screen buttons.
export const HudSkinStyle: React.FC = () => {
  const [skin, setSkin] = useState(() => loadHudSkin());
  const [imgTick, setImgTick] = useState(0);
  useEffect(() => {
    initHudImages();
    const a = subscribeHudSkin(() => setSkin({ ...loadHudSkin() }));
    const b = subscribeHudImages(() => setImgTick(t => t + 1));
    return () => { a(); b(); };
  }, []);
  const css = useMemo(() => buildHudSkinCss(skin, hudImageUrl), [skin, imgTick]);
  return <style data-hud-skin="">{css}</style>;
};
