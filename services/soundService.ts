
import { getCustomSound, GunSound } from '../customContent';

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterSfxGain: GainNode | null = null;
  private sfxVolume: number = 1.0;
  private musicVolume: number = 1.0;
  private currentMusicOscillators: OscillatorNode[] = [];
  private currentMusicGains: GainNode[] = [];

  setVolume(volume: number) {
    this.sfxVolume = volume;
    if (this.masterSfxGain) {
      this.masterSfxGain.gain.value = volume;
    }
  }

  setMusicVolume(volume: number) {
    this.musicVolume = volume;
    this.currentMusicGains.forEach(gain => {
      gain.gain.value = this.musicVolume * 0.1; // Base music volume
    });
  }

  private musicElements: Map<string, HTMLAudioElement> = new Map();
  private currentMusicElement: HTMLAudioElement | null = null;

  async loadMusic(url: string) {
    this.init();
    try {
      console.log(`Loading music from ${url}`);
      const audio = new Audio();
      audio.src = url;
      audio.loop = true;
      audio.crossOrigin = "anonymous";
      audio.oncanplaythrough = () => {
        console.log(`Music loaded successfully`);
        if (this.currentMusicElement === audio) {
             audio.play().catch(e => console.warn("Autoplay blocked", e));
        }
      };
      audio.onerror = (e) => console.error(`Error loading music:`, e);
      audio.load();
      this.musicElements.set('custom', audio);
    } catch (e) {
      console.error(`Failed to load music:`, e);
    }
  }

  stopMusic() {
    if (this.currentMusicElement) {
      try { 
        this.currentMusicElement.pause(); 
        this.currentMusicElement.currentTime = 0;
      } catch (e) {}
      this.currentMusicElement = null;
    }
    this.currentMusicOscillators.forEach(osc => {
      try { osc.stop(); } catch (e) {}
    });
    this.currentMusicOscillators = [];
    this.currentMusicGains = [];
  }

  playMusic(url: string) {
    this.init();
    if (!this.ctx) return;
    
    // If already playing this URL, don't restart unless it was stopped
    if (this.currentMusicElement && (this.currentMusicElement as any).src === url && !this.currentMusicElement.paused) {
      this.currentMusicElement.volume = this.musicVolume * 0.3;
      return;
    }

    this.stopMusic();
    if (this.musicVolume <= 0) return;

    let audio = this.musicElements.get('custom');
    if (!audio || audio.src !== url) {
        this.loadMusic(url);
        audio = this.musicElements.get('custom');
    }

    if (audio) {
      audio.volume = this.musicVolume * 0.3;
      audio.play().catch(e => {
        console.warn(`Autoplay blocked or load failed`, e);
      });
      this.currentMusicElement = audio;
    }
  }

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterSfxGain = this.ctx.createGain();
      this.masterSfxGain.gain.value = this.sfxVolume;
      this.masterSfxGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private createBufferSource(type: 'white' | 'pink' | 'brown' = 'white') {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    return noise;
  }

  // ---- Creator Studio gun sounds: built-in synth presets or an uploaded sound ----
  private uploadCache = new Map<string, AudioBuffer | 'loading' | 'failed'>();

  private noiseBurst(now: number, o: { type: BiquadFilterType; freq: number; dur: number; gain: number; delay?: number; q?: number }) {
    const ctx = this.ctx!; const noise = this.createBufferSource(); if (!noise) return;
    const f = ctx.createBiquadFilter(); const g = ctx.createGain();
    const t = now + (o.delay || 0);
    f.type = o.type; f.frequency.setValueAtTime(o.freq, t); if (o.q) f.Q.value = o.q;
    g.gain.setValueAtTime(o.gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + o.dur);
    noise.connect(f).connect(g).connect(this.masterSfxGain!);
    noise.start(t); noise.stop(t + o.dur + 0.05);
  }
  private tone(now: number, o: { type: OscillatorType; f0: number; f1: number; dur: number; gain: number; delay?: number }) {
    const ctx = this.ctx!; const osc = ctx.createOscillator(); const g = ctx.createGain();
    const t = now + (o.delay || 0);
    osc.type = o.type; osc.frequency.setValueAtTime(o.f0, t); osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t + o.dur);
    g.gain.setValueAtTime(o.gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + o.dur);
    osc.connect(g).connect(this.masterSfxGain!); osc.start(t); osc.stop(t + o.dur + 0.02);
  }

  private playPreset(kind: 'fire' | 'reload', preset: string, vol: number, pitch: number) {
    const now = this.ctx!.currentTime; const p = pitch; const v = vol;
    if (preset === 'none') return;
    if (kind === 'fire') {
      switch (preset) {
        case 'pistol': this.noiseBurst(now, { type: 'bandpass', freq: 1800 * p, dur: 0.09, gain: 0.35 * v }); this.tone(now, { type: 'sine', f0: 160 * p, f1: 60 * p, dur: 0.08, gain: 0.3 * v }); break;
        case 'rifle': this.noiseBurst(now, { type: 'bandpass', freq: 1100 * p, dur: 0.13, gain: 0.4 * v }); this.tone(now, { type: 'sine', f0: 120 * p, f1: 45 * p, dur: 0.12, gain: 0.35 * v }); break;
        case 'smg': this.noiseBurst(now, { type: 'highpass', freq: 2200 * p, dur: 0.05, gain: 0.3 * v }); break;
        case 'shotgun': this.noiseBurst(now, { type: 'lowpass', freq: 900 * p, dur: 0.38, gain: 0.6 * v }); this.tone(now, { type: 'sine', f0: 100 * p, f1: 35 * p, dur: 0.3, gain: 0.5 * v }); break;
        case 'sniper': this.noiseBurst(now, { type: 'highpass', freq: 2500 * p, dur: 0.06, gain: 0.5 * v }); this.noiseBurst(now, { type: 'lowpass', freq: 700 * p, dur: 0.55, gain: 0.6 * v }); this.tone(now, { type: 'sine', f0: 90 * p, f1: 30 * p, dur: 0.4, gain: 0.5 * v }); break;
        case 'laser': this.tone(now, { type: 'sawtooth', f0: 1500 * p, f1: 180 * p, dur: 0.18, gain: 0.22 * v }); break;
        case 'cannon': this.tone(now, { type: 'sine', f0: 70 * p, f1: 22 * p, dur: 0.6, gain: 0.7 * v }); this.noiseBurst(now, { type: 'lowpass', freq: 300 * p, dur: 0.6, gain: 0.5 * v }); break;
        case 'magic': this.tone(now, { type: 'sine', f0: 500 * p, f1: 1400 * p, dur: 0.3, gain: 0.25 * v }); this.tone(now, { type: 'triangle', f0: 750 * p, f1: 2100 * p, dur: 0.3, gain: 0.12 * v, delay: 0.03 }); break;
        case 'silenced': this.noiseBurst(now, { type: 'bandpass', freq: 900 * p, dur: 0.06, gain: 0.15 * v }); break;
        default: this.noiseBurst(now, { type: 'bandpass', freq: 1200 * p, dur: 0.1, gain: 0.3 * v });
      }
    } else {
      switch (preset) {
        case 'mag': this.tone(now, { type: 'square', f0: 300 * p, f1: 200 * p, dur: 0.05, gain: 0.12 * v }); this.tone(now, { type: 'square', f0: 220 * p, f1: 150 * p, dur: 0.06, gain: 0.14 * v, delay: 0.4 }); this.noiseBurst(now, { type: 'highpass', freq: 3000 * p, dur: 0.04, gain: 0.12 * v, delay: 0.4 }); break;
        case 'pump': this.noiseBurst(now, { type: 'bandpass', freq: 700 * p, dur: 0.12, gain: 0.3 * v }); this.noiseBurst(now, { type: 'bandpass', freq: 600 * p, dur: 0.14, gain: 0.3 * v, delay: 0.25 }); break;
        case 'bolt': this.tone(now, { type: 'square', f0: 180 * p, f1: 120 * p, dur: 0.07, gain: 0.15 * v }); this.tone(now, { type: 'square', f0: 260 * p, f1: 160 * p, dur: 0.08, gain: 0.15 * v, delay: 0.3 }); break;
        case 'charge': this.tone(now, { type: 'sine', f0: 200 * p, f1: 900 * p, dur: 0.6, gain: 0.2 * v }); break;
        default: this.tone(now, { type: 'square', f0: 200 * p, f1: 150 * p, dur: 0.05, gain: 0.12 * v }); // 'click'
      }
    }
  }

  private playUpload(url: string, vol: number, pitch: number) {
    const ctx = this.ctx!; const key = url.length + ':' + url.slice(-48);
    const cached = this.uploadCache.get(key);
    const go = (buf: AudioBuffer) => {
      const src = ctx.createBufferSource(); const g = ctx.createGain();
      src.buffer = buf; src.playbackRate.value = pitch; g.gain.value = vol;
      src.connect(g).connect(this.masterSfxGain!); src.start();
    };
    if (cached instanceof AudioBuffer) { go(cached); return; }
    if (cached) return; // still decoding, or it could not be decoded
    this.uploadCache.set(key, 'loading');
    fetch(url).then(r => r.arrayBuffer()).then(ab => ctx.decodeAudioData(ab)).then(buf => { this.uploadCache.set(key, buf); go(buf); })
      .catch(() => this.uploadCache.set(key, 'failed'));
  }

  /** Plays a Creator Studio gun sound. Returns false when the gun uses the normal game sound. */
  playGunSound(kind: 'fire' | 'reload', sp: GunSound | undefined): boolean {
    if (!sp || sp.preset === 'default') return false;
    this.init();
    if (!this.ctx) return true;
    const vol = Math.max(0, Math.min(2, sp.vol ?? 1)); const pitch = Math.max(0.25, Math.min(3, sp.pitch ?? 1));
    try {
      if (sp.preset === 'upload') { if (sp.url) this.playUpload(sp.url, vol, pitch); else return false; }
      else this.playPreset(kind, sp.preset, vol, pitch);
    } catch { /* a bad sound must never stop the game */ }
    return true;
  }

  playShoot(weapon: string) {
    this.init();
    if (!this.ctx) return;
    if (this.playGunSound('fire', getCustomSound(weapon, 'fire'))) return;
    const now = this.ctx.currentTime;

    if (weapon === 'RED9 BLASTER') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.15);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.connect(gain).connect(this.masterSfxGain!);
      osc.start();
      osc.stop(now + 0.15);
      return;
    }

    const noise = this.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    if (weapon === 'REMINGTON' || weapon === 'DSR-50') {
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, now);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    } else {
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, now);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    }

    noise?.connect(filter).connect(gain).connect(this.masterSfxGain!);
    noise?.start(now);
    noise?.stop(now + 0.5);
  }

  playReload(weapon?: string) {
    this.init();
    if (!this.ctx) return;
    if (weapon && this.playGunSound('reload', getCustomSound(weapon, 'reload'))) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, now);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    osc.connect(gain).connect(this.masterSfxGain!);
    osc.start();
    osc.stop(now + 0.05);
  }

  playKnife() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.connect(gain).connect(this.masterSfxGain!);
    osc.start();
    osc.stop(now + 0.2);
  }

  playKnifeHit() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const noise = this.createBufferSource();
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    noise?.connect(gain).connect(this.masterSfxGain!);
    noise?.start(now);
    noise?.stop(now + 0.1);
  }

  playThrow() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.connect(gain).connect(this.masterSfxGain!);
    osc.start();
    osc.stop(now + 0.1);
  }

  playExplosion() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const noise = this.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);
    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1);
    noise?.connect(filter).connect(gain).connect(this.masterSfxGain!);
    noise?.start(now);
    noise?.stop(now + 1);
  }

  playFlash() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2000, now);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2);
    osc.connect(gain).connect(this.masterSfxGain!);
    osc.start();
    osc.stop(now + 2);
  }

  playMonkeyMusic() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Simple circus-like melody
    const notes = [523.25, 659.25, 783.99, 1046.50, 783.99, 659.25];
    notes.forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + i * 0.2);
      gain.gain.setValueAtTime(0, now + i * 0.2);
      gain.gain.linearRampToValueAtTime(0.1, now + i * 0.2 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.2 + 0.15);
      osc.connect(gain).connect(this.masterSfxGain!);
      osc.start(now + i * 0.2);
      osc.stop(now + i * 0.2 + 0.2);
    });
  }

  playPerk() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [440, 554, 659, 880].forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.1);
      gain.gain.setValueAtTime(0, now + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.1, now + i * 0.1 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);
      osc.connect(gain).connect(this.masterSfxGain!);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.4);
    });
  }

  playPowerUpSpawn() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1600, now + 0.5);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(gain).connect(this.masterSfxGain!);
    osc.start();
    osc.stop(now + 0.5);
  }

  playPowerUpPickup() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.3);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain).connect(this.masterSfxGain!);
    osc.start();
    osc.stop(now + 0.3);
  }

  playHurt() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(60, now);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.connect(gain).connect(this.masterSfxGain!);
    osc.start();
    osc.stop(now + 0.3);
  }

  playBoxTick() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.02);
    osc.connect(gain).connect(this.masterSfxGain!);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.02);
  }

  playHitMarker() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(2000, now);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    osc.connect(gain).connect(this.masterSfxGain!);
    osc.start();
    osc.stop(now + 0.05);
  }

  playRoundStart() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(50, now);
    osc.frequency.linearRampToValueAtTime(30, now + 2);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 2);
    osc.connect(gain).connect(this.masterSfxGain!);
    osc.start();
    osc.stop(now + 2);
  }

  playHover() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
    osc.connect(gain).connect(this.masterSfxGain!);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  playGameOver() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Deep drone
    const drone = this.ctx.createOscillator();
    const droneGain = this.ctx.createGain();
    drone.type = 'sawtooth';
    drone.frequency.setValueAtTime(40, now);
    drone.frequency.exponentialRampToValueAtTime(20, now + 4);
    droneGain.gain.setValueAtTime(0.3, now);
    droneGain.gain.exponentialRampToValueAtTime(0.001, now + 4);
    drone.connect(droneGain).connect(this.masterSfxGain!);
    drone.start();
    drone.stop(now + 4);

    // High shriek
    const shriek = this.ctx.createOscillator();
    const shriekGain = this.ctx.createGain();
    shriek.type = 'sine';
    shriek.frequency.setValueAtTime(1000, now);
    shriek.frequency.exponentialRampToValueAtTime(200, now + 2);
    shriekGain.gain.setValueAtTime(0.1, now);
    shriekGain.gain.exponentialRampToValueAtTime(0.001, now + 2);
    shriek.connect(shriekGain).connect(this.masterSfxGain!);
    shriek.start();
    shriek.stop(now + 2);
  }

  playThunder() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const noise = this.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, now);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 2);
    noise?.connect(filter).connect(gain).connect(this.masterSfxGain!);
    noise?.start(now);
    noise?.stop(now + 2);
  }
}

export const soundService = new SoundManager();
