/**
 * Circuitizer Procedural Audio Engine
 * High-fidelity, zero-latency physical hardware audio synthesized via Web Audio API.
 * Requires zero external MP3/WAV downloads; works completely offline.
 */

export class AudioEngine {
  private static ctx: AudioContext | null = null;
  private static isMuted: boolean = false;
  private static masterVolume: number = 0.35;
  private static lastBuzzerTime: number = 0;

  /**
   * Lazily initialize or resume AudioContext upon first user interaction
   */
  private static getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  public static setMuted(muted: boolean) {
    this.isMuted = muted;
    try {
      localStorage.setItem('circuitizer_audio_muted', muted ? 'true' : 'false');
    } catch {
      // ignore storage access issues
    }
  }

  public static getMuted(): boolean {
    if (typeof window !== 'undefined' && this.isMuted === false) {
      const stored = localStorage.getItem('circuitizer_audio_muted');
      if (stored === 'true') {
        this.isMuted = true;
      }
    }
    return this.isMuted;
  }

  public static toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public static setVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
  }

  /**
   * 1. Mechanical DIP / Toggle Switch Click
   * Simulates the dual-stage physical contact and spring snap of an SPST switch
   */
  public static playSwitchClick(isOn: boolean) {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const baseFreq = isOn ? 1600 : 1100;

    // Contact bounce noise burst
    const bufferSize = ctx.sampleRate * 0.008; // 8ms noise
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(baseFreq * 1.5, t);
    noiseFilter.Q.setValueAtTime(3.0, t);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(this.masterVolume * 0.45, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.012);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(t);

    // Resonant mechanical ping
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, t + 0.035);

    gain.gain.setValueAtTime(this.masterVolume * 0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.04);
  }

  /**
   * 2. Logic Pulse Tone
   * Pure synthetic sine tone for logic HIGH (+5V) or LOW (0V) signal transitions
   */
  public static playLogicPulse(isHigh: boolean) {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const freq = isHigh ? 880 : 440; // A5 or A4
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(this.masterVolume * 0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.085);
  }

  /**
   * 3. Truth Table Row Select / Logic Harmonizer
   * Two-note harmonic sweep when evaluating an input row
   */
  public static playRowSelect(isOutputHigh: boolean) {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';

    if (isOutputHigh) {
      // Ascending major fifth chime (587Hz -> 880Hz)
      osc1.frequency.setValueAtTime(587.33, t); // D5
      osc2.frequency.setValueAtTime(880.0, t + 0.03); // A5
    } else {
      // Subdued descending minor (523Hz -> 392Hz)
      osc1.frequency.setValueAtTime(523.25, t); // C5
      osc2.frequency.setValueAtTime(392.0, t + 0.03); // G4
    }

    gain.gain.setValueAtTime(this.masterVolume * 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(t);
    osc1.stop(t + 0.08);
    osc2.start(t + 0.03);
    osc2.stop(t + 0.15);
  }

  /**
   * 4. Laboratory Short-Circuit Buzzer Alarm
   * Harsh dual-sawtooth dissonance with 15Hz vibrato buzz.
   * Simulates an authentic benchtop power supply buzzer when VCC shorts to GND.
   * Rate-limited so it doesn't repeatedly screech if sim loops.
   */
  public static playBuzzerAlert() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    // Throttle buzzer to at most once per 600ms
    if (t - this.lastBuzzerTime < 0.6) return;
    this.lastBuzzerTime = t;

    // Dual sawtooth oscillators for sharp electrical dissonance (140Hz & 210Hz)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const oscLFO = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const masterGain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(140, t);
    osc2.frequency.setValueAtTime(215, t);

    // 18Hz AM buzz modulation
    oscLFO.type = 'square';
    oscLFO.frequency.setValueAtTime(18, t);
    lfoGain.gain.setValueAtTime(0.3, t);

    // Highpass filter to eliminate mud and sharpen buzzer cut
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(120, t);

    masterGain.gain.setValueAtTime(this.masterVolume * 0.7, t);
    masterGain.gain.setValueAtTime(this.masterVolume * 0.7, t + 0.28);
    masterGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    oscLFO.connect(lfoGain.gain);
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(ctx.destination);

    osc1.start(t);
    osc2.start(t);
    oscLFO.start(t);

    osc1.stop(t + 0.36);
    osc2.stop(t + 0.36);
    oscLFO.stop(t + 0.36);
  }

  /**
   * 5. Wire / Component Insertion "Snap"
   * Tactile hole insertion click when placing jumper wires or ICs
   */
  public static playWireInsert() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(2400, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.025);

    gain.gain.setValueAtTime(this.masterVolume * 0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.03);
  }

  /**
   * 6. Step Navigation Pop
   */
  public static playStepChange(isForward: boolean) {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const startFreq = isForward ? 600 : 800;
    const endFreq = isForward ? 950 : 500;

    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.035);

    gain.gain.setValueAtTime(this.masterVolume * 0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.045);
  }
}
