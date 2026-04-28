// Cyberpunk Auditory Feedback System
// Utilizing Web Audio API for synthesized sound loops

class SoundService {
  private audioCtx: AudioContext | null = null;

  private init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioCtx;
  }

  private playTone(freq: number, startTime: number, duration: number, volume: number = 0.05, type: OscillatorType = 'sine') {
    const ctx = this.init();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  // --- Predefined Sound Loops ---

  public playClick() {
    const ctx = this.init();
    const now = ctx.currentTime;
    this.playTone(800, now, 0.05, 0.02, 'square');
  }

  public playHover() {
    const ctx = this.init();
    const now = ctx.currentTime;
    this.playTone(400, now, 0.02, 0.01);
  }

  public playSuccess() {
    const ctx = this.init();
    const now = ctx.currentTime;
    this.playTone(1200, now, 0.08, 0.05);
    this.playTone(1800, now + 0.12, 0.04, 0.05);
  }

  public playError() {
    const ctx = this.init();
    const now = ctx.currentTime;
    this.playTone(200, now, 0.3, 0.1, 'sawtooth');
    this.playTone(150, now + 0.1, 0.2, 0.08, 'sawtooth');
  }

  public playNotification() {
    const ctx = this.init();
    const now = ctx.currentTime;
    this.playTone(900, now, 0.1, 0.05, 'triangle');
    this.playTone(1100, now + 0.1, 0.1, 0.05, 'triangle');
    this.playTone(1300, now + 0.2, 0.2, 0.03, 'triangle');
  }
  
  public playTransition() {
    const ctx = this.init();
    const now = ctx.currentTime;
    // Fast frequency slide
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
    gain.gain.setValueAtTime(0.02, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.1);
    
    osc.start();
    osc.stop(now + 0.1);
  }

  public playJarvis() {
    const ctx = this.init();
    const now = ctx.currentTime;
    // Neural Wake sequence
    this.playTone(600, now, 0.04, 0.03, 'sine');
    this.playTone(900, now + 0.04, 0.04, 0.02, 'sine');
    this.playTone(1400, now + 0.08, 0.06, 0.01, 'sine');
  }
}

export const soundService = new SoundService();
