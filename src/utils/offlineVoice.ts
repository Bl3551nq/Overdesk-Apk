/**
 * Offline Voice Assembly Engine
 * A 100% local, zero-network, high-performance acoustic feature pattern matcher
 * designed specifically for offline voice commands in desktop apps.
 */

export class OfflineVoiceEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private isRunning = false;
  private animationFrameId: number | null = null;

  // Configuration
  private silenceThreshold = 18; // Average byte frequency value to trigger speech gate
  private minSpeechFrames = 4;   // ~120ms minimum speech length
  private maxSpeechFrames = 35;  // ~1050ms maximum speech length
  private speechBuffer: Array<{ low: number; mid: number; high: number; rms: number }> = [];
  private silenceCounter = 0;
  private speechDetected = false;

  // Callbacks
  public onCommand: (cmd: string) => void = () => {};
  public onState: (statusMessage: string) => void = () => {};

  constructor() {}

  async start() {
    if (this.isRunning) return;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      const source = this.audioContext.createMediaStreamSource(this.stream);
      
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256; // 128 frequency bands
      this.analyser.smoothingTimeConstant = 0.4;
      
      source.connect(this.analyser);
      this.isRunning = true;
      this.speechBuffer = [];
      this.silenceCounter = 0;
      this.speechDetected = false;

      this.onState("Offline Assembly active 🎙️");
      this.tick();
    } catch (err) {
      console.error("Offline speech microphone init failed:", err);
      this.onState("Microphone access denied.");
      throw err;
    }
  }

  private tick = () => {
    if (!this.isRunning || !this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    // Compute spectral sums for low, mid, high bands
    // Index 0-6: low frequencies (0 - 1000Hz) -> vowels, bass resonance
    // Index 7-23: mid frequencies (1000 - 4000Hz) -> vocal formants
    // Index 24-127: high frequencies (4000 - 22000Hz) -> sibilants ("s", "x")
    let lowSum = 0;
    let midSum = 0;
    let highSum = 0;

    for (let i = 0; i < dataArray.length; i++) {
      const val = dataArray[i];
      if (i <= 6) lowSum += val;
      else if (i <= 23) midSum += val;
      else highSum += val;
    }

    const totalSum = lowSum + midSum + highSum;
    const avgSum = totalSum / dataArray.length;

    // Speech Activity Detection Gate
    if (avgSum > this.silenceThreshold) {
      if (!this.speechDetected) {
        this.speechDetected = true;
        this.speechBuffer = [];
        this.silenceCounter = 0;
      }
      
      if (this.speechBuffer.length < this.maxSpeechFrames) {
        this.speechBuffer.push({
          low: lowSum,
          mid: midSum,
          high: highSum,
          rms: avgSum
        });
      }
    } else {
      if (this.speechDetected) {
        this.silenceCounter++;
        // If silence persists for ~180ms, process word footprint
        if (this.silenceCounter >= 6) {
          this.processSpeechFootprint();
          this.speechDetected = false;
          this.speechBuffer = [];
        }
      }
    }

    if (this.isRunning) {
      this.animationFrameId = requestAnimationFrame(this.tick);
    }
  };

  private processSpeechFootprint() {
    const len = this.speechBuffer.length;
    if (len < this.minSpeechFrames || len > this.maxSpeechFrames) {
      return; 
    }

    let totalLow = 0;
    let totalMid = 0;
    let totalHigh = 0;
    const sibilanceOverTime = this.speechBuffer.map(f => {
      const t = f.low + f.mid + f.high || 1;
      totalLow += f.low;
      totalMid += f.mid;
      totalHigh += f.high;
      return f.high / t;
    });

    const averageSibilance = totalHigh / (totalLow + totalMid + totalHigh || 1);

    const startIdx = Math.floor(len * 0.3);
    const endIdx = Math.floor(len * 0.7);

    let startSibilance = 0;
    let endSibilance = 0;
    let midSibilance = 0;

    for (let i = 0; i < len; i++) {
      const sib = sibilanceOverTime[i];
      if (i < startIdx) startSibilance += sib;
      else if (i < endIdx) midSibilance += sib;
      else endSibilance += sib;
    }

    startSibilance = startSibilance / (startIdx || 1);
    midSibilance = midSibilance / ((endIdx - startIdx) || 1);
    endSibilance = endSibilance / ((len - endIdx) || 1);

    console.log("Offline voice analysis profile:", { len, averageSibilance, startSibilance, endSibilance });

    // Precise rule classification with only 2 commands (Next / Back)
    if (endSibilance > 0.30 && startSibilance < 0.25) {
      this.onCommand("Next");
    } else if (averageSibilance < 0.25) {
      this.onCommand("Back");
    }
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
    }
    this.audioContext = null;
    this.analyser = null;
    this.stream = null;
    this.onState("Offline voice service stopped.");
  }
}
