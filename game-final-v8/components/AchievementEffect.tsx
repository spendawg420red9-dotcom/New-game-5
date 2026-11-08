import React, { useMemo } from 'react';

export interface AchievementFx { style: 'none' | 'confetti' | 'fireworks' | 'glow' | 'rain'; color: string; color2: string; banner: 'slide' | 'pop' | 'spin'; seconds: number; }
const KEY = 'ztown_achievement_fx_v1';
export const DEFAULT_FX: AchievementFx = { style: 'confetti', color: '#a855f7', color2: '#facc15', banner: 'pop', seconds: 5 };
export const loadAchievementFx = (): AchievementFx => {
  try { return { ...DEFAULT_FX, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return DEFAULT_FX; }
};
export const saveAchievementFx = (fx: AchievementFx) => { try { localStorage.setItem(KEY, JSON.stringify(fx)); } catch { /* ignore */ } };

const CSS = `
@keyframes axFall{0%{transform:translate(0,-10vh) rotate(0);opacity:1}100%{transform:translate(var(--dx),105vh) rotate(720deg);opacity:.9}}
@keyframes axBurst{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(var(--dx),var(--dy)) scale(.2);opacity:0}}
@keyframes axPop{0%{transform:scale(.3);opacity:0}60%{transform:scale(1.15);opacity:1}100%{transform:scale(1)}}
@keyframes axSlide{0%{transform:translateY(-120px);opacity:0}100%{transform:translateY(0);opacity:1}}
@keyframes axSpin{0%{transform:rotateY(180deg) scale(.4);opacity:0}100%{transform:rotateY(0) scale(1);opacity:1}}
@keyframes axGlow{0%,100%{box-shadow:0 0 10px var(--c)}50%{box-shadow:0 0 45px var(--c)}}
`;

/** Pop-up shown whenever an achievement unlocks, in the menu or in a match. */
export const AchievementEffect: React.FC<{ show: boolean; name: string; icon: string; fx: AchievementFx; preview?: boolean }> = ({ show, name, icon, fx, preview }) => {
  const bits = useMemo(() => Array.from({ length: 36 }, (_, i) => ({
    left: Math.random() * 100, dx: (Math.random() - 0.5) * 300, delay: Math.random() * 0.8, size: 6 + Math.random() * 8,
    ang: (i / 36) * Math.PI * 2, dist: 90 + Math.random() * 140, c: i % 2 ? fx.color : fx.color2,
  })), [show, fx.color, fx.color2]);
  if (!show) return null;
  const pos = preview ? 'absolute' : 'fixed';
  return (
    <div className={`${pos} inset-0 z-[300] pointer-events-none overflow-hidden`}>
      <style>{CSS}</style>
      {(fx.style === 'confetti' || fx.style === 'rain') && bits.map((b, i) => (
        <span key={i} style={{ position: 'absolute', top: 0, left: `${b.left}%`, width: b.size, height: fx.style === 'rain' ? b.size * 3 : b.size * 0.6,
          background: b.c, ['--dx' as any]: `${b.dx}px`, animation: `axFall ${2 + b.delay * 2}s ${b.delay}s ease-in forwards` }} />
      ))}
      {fx.style === 'fireworks' && bits.map((b, i) => (
        <span key={i} style={{ position: 'absolute', top: '20%', left: i % 2 ? '30%' : '70%', width: 6, height: 6, borderRadius: '50%', background: b.c,
          ['--dx' as any]: `${Math.cos(b.ang) * b.dist}px`, ['--dy' as any]: `${Math.sin(b.ang) * b.dist}px`, animation: `axBurst 1.2s ${(i % 2) * 0.5}s ease-out forwards` }} />
      ))}
      <div className="absolute top-12 left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-4 bg-black/85 border-2 p-4 rounded-sm" style={{ borderColor: fx.color, ['--c' as any]: fx.color,
          animation: `${fx.banner === 'slide' ? 'axSlide' : fx.banner === 'spin' ? 'axSpin' : 'axPop'} .6s ease-out both${fx.style === 'glow' ? ', axGlow 1.2s infinite' : ''}` }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0" style={{ background: fx.color + '33' }}>{icon}</div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: fx.color }}>Achievement Unlocked</span>
            <span className="text-white font-black italic text-lg uppercase">{name}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
