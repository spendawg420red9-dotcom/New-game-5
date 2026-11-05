
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

  playShoot(weapon: string) {
    this.init();
    if (!this.ctx) return;
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

  playReload() {
    this.init();
    if (!this.ctx) return;
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
