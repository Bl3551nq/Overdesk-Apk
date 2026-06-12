let audioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

const BELL_URLS: Record<string, string> = {
  school_bell: 'https://raw.githubusercontent.com/Bl3551nq/bell-sound/ba2de1e7e97bdfdb2de02f12c8463f8f86d09076/school_bell.mp3',
  pokemon_colo_heal: 'https://raw.githubusercontent.com/Bl3551nq/bell-sound/ba2de1e7e97bdfdb2de02f12c8463f8f86d09076/pokemon_colo_heal.mp3',
  princess_bell: 'https://raw.githubusercontent.com/Bl3551nq/bell-sound/ba2de1e7e97bdfdb2de02f12c8463f8f86d09076/princess_bell.mp3',
};

const audioBufferCache: Record<string, AudioBuffer> = {};
const pendingRequests: Record<string, Promise<AudioBuffer | null>> = {};

async function getOrFetchAudioBuffer(key: string): Promise<AudioBuffer | null> {
  if (audioBufferCache[key]) {
    return audioBufferCache[key];
  }
  if (pendingRequests[key]) {
    return pendingRequests[key];
  }

  const url = BELL_URLS[key];
  if (!url) return null;

  const promise = (async () => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      const ctx = getAudioContext();
      let decoded: AudioBuffer;
      try {
        decoded = await ctx.decodeAudioData(arrayBuffer);
      } catch {
        decoded = await new Promise<AudioBuffer>((resolve, reject) => {
          ctx.decodeAudioData(arrayBuffer, resolve, reject);
        });
      }
      audioBufferCache[key] = decoded;
      return decoded;
    } catch (error) {
      console.warn(`Failed to fetch or decode sound from url: ${url}`, error);
      return null;
    } finally {
      delete pendingRequests[key];
    }
  })();

  pendingRequests[key] = promise;
  return promise;
}

export function preloadBells() {
  Object.keys(BELL_URLS).forEach((key) => {
    getOrFetchAudioBuffer(key).catch((err) => {
      console.warn(`Preloading bell sound ${key} failed:`, err);
    });
  });
}

function playFallbackBell(key: string, ctx: AudioContext, now: number, vol: number) {
  if (key === 'pokemon_colo_heal') {
    const notes = [587.33, 659.25, 783.99, 880.00, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.08;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.12 * vol, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  } else if (key === 'school_bell') {
    const frequencies = [440, 554, 659, 880];
    frequencies.forEach((f) => {
      const osc = ctx.createOscillator();
      const modulator = ctx.createOscillator();
      const modGain = ctx.createGain();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      modulator.type = 'sine';
      modulator.frequency.value = 120;
      modGain.gain.value = 350;
      modulator.connect(modGain);
      modGain.connect(osc.frequency);
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.15 * vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      modulator.start(now);
      osc.start(now);
      modulator.stop(now + 1.3);
      osc.stop(now + 1.3);
    });
  } else {
    // princess_bell fallback
    const frequencies = [523.25, 659.25, 783.99, 1046.50];
    frequencies.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.05;
      osc.type = 'sine';
      osc.frequency.value = f;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.12 * vol, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      osc.start(t);
      osc.stop(t + 0.9);
    });
  }
}

export function warmAudioContext() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);

    // Warm & pre-fetch bells in the background on user interaction
    preloadBells();
  } catch (e) {
    console.error('AudioContext warming failed:', e);
  }
}

// Play either cached buffer, fetch it on the fly, or fall back procedurally
export function playBellOnce(key: string, soundOn: boolean, vol = 1.0) {
  if (!soundOn || key === 'none') return;
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;

    const cached = audioBufferCache[key];
    if (cached) {
      const source = ctx.createBufferSource();
      source.buffer = cached;
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(vol * 0.8, now);
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start(now);
      return;
    }

    // Try fetching if not cached yet
    getOrFetchAudioBuffer(key).then((buf) => {
      if (buf && ctx.state !== 'closed') {
        const source = ctx.createBufferSource();
        source.buffer = buf;
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(vol * 0.8, ctx.currentTime);
        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        source.start(ctx.currentTime);
      } else {
        playFallbackBell(key, ctx, now, vol);
      }
    }).catch(() => {
      playFallbackBell(key, ctx, now, vol);
    });
  } catch (e) {
    console.error('Failed playing custom bell sound:', e);
  }
}

export function playBellTick(key: string, soundOn: boolean) {
  if (!soundOn || key === 'none') return;
  const GAP = 2.0; // 2.0 second intervals between strikes to avoid interference
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const playAtTime = (buf: AudioBuffer | null) => {
      const now = ctx.currentTime;
      if (buf) {
        for (let idx = 0; idx < 3; idx++) {
          const source = ctx.createBufferSource();
          source.buffer = buf;
          const gainNode = ctx.createGain();
          // Keep a high quality sounding progression (slightly lower volume on actual 3rd strike)
          const vol = idx === 2 ? 0.6 : 0.8;
          gainNode.gain.setValueAtTime(vol, now + idx * GAP);
          source.connect(gainNode);
          gainNode.connect(ctx.destination);
          source.start(now + idx * GAP);
        }
      } else {
        // Fallback sound generator is triggered in sequence
        playFallbackBell(key, ctx, now, 1.0);
        playFallbackBell(key, ctx, now + GAP, 1.0);
        playFallbackBell(key, ctx, now + GAP * 2, 0.7);
      }
    };

    const cached = audioBufferCache[key];
    if (cached) {
      playAtTime(cached);
      return;
    }

    getOrFetchAudioBuffer(key).then((buf) => {
      if (ctx.state !== 'closed') {
        playAtTime(buf);
      }
    }).catch(() => {
      if (ctx.state !== 'closed') {
        playAtTime(null);
      }
    });
  } catch (e) {
    console.error('Failed in playBellTick:', e);
  }
}

export function playTick(soundOn: boolean) {
  if (!soundOn) return;
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'triangle';
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 1.5;

    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.06);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.10);

    osc.start(now);
    osc.stop(now + 0.10);

    // subtle white noise burst
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      d[i] = (Math.random() * 2 - 1) * 0.04;
    }
    const src = ctx.createBufferSource();
    const ng = ctx.createGain();
    src.buffer = buf;
    src.connect(ng);
    ng.connect(ctx.destination);
    ng.gain.setValueAtTime(0.18, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    src.start(now);
  } catch (e) {
    console.error('Failed playing tick:', e);
  }
}

export function playCancel(soundOn: boolean) {
  if (!soundOn) return;
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.18);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.start(now);
    osc.stop(now + 0.22);
  } catch (e) {
    console.error('Failed playing cancel:', e);
  }
}

export function playChime(soundOn: boolean) {
  if (!soundOn) return;
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const notes = [
      { freq: 523.25, delay: 0, dur: 0.6, vol: 0.10 }, // C5
      { freq: 659.25, delay: 0.08, dur: 0.55, vol: 0.09 }, // E5
      { freq: 783.99, delay: 0.16, dur: 0.50, vol: 0.08 }, // G5
      { freq: 1046.5, delay: 0.26, dur: 0.70, vol: 0.07 }, // C6
    ];
    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = ctx.currentTime + n.delay;
      osc.type = 'sine';
      osc.frequency.value = n.freq;
      osc.connect(gain);
      gain.connect(ctx.destination);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(n.vol, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + n.dur);

      osc.start(t);
      osc.stop(t + n.dur + 0.05);

      // overtone
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.value = n.freq * 2.76;
      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      gain2.gain.setValueAtTime(0, t);
      gain2.gain.linearRampToValueAtTime(n.vol * 0.3, t + 0.01);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + n.dur * 0.5);

      osc2.start(t);
      osc2.stop(t + n.dur);
    });
  } catch (e) {
    console.error('Failed playing chime:', e);
  }
}
