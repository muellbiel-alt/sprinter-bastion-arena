// Procedural Web Audio API synthesizer for sound effects and dynamic arpeggiated soundtrack.
// Zero external audio assets; degrades cleanly in headless environments.

const BASS_SEQUENCE = [55.0, 55.0, 65.41, 73.42, 82.41, 73.42, 65.41, 49.0];
const LEAD_SEQUENCE = [220.0, 261.63, 329.63, 293.66, 392.0, 329.63, 261.63, 246.94];

export function createSynthAudioEngine() {
  let ctx = null;
  let masterGain = null;
  let muted = false;
  let stepAccumulator = 0;
  let noteIndex = 0;

  function ensureContext() {
    if (muted) return null;
    if (!ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        try {
          ctx = new AudioCtx();
          masterGain = ctx.createGain();
          masterGain.gain.value = 0.22;
          masterGain.connect(ctx.destination);
        } catch {
          ctx = null;
        }
      }
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function playTone(freqStart, freqEnd, duration, type = 'sawtooth', volume = 0.25) {
    const audio = ensureContext();
    if (!audio || !masterGain) return;
    try {
      const now = audio.currentTime;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(24, freqStart), now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(24, freqEnd), now + duration);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + duration + 0.01);
    } catch {
      // Ignore audio scheduling errors in restricted contexts
    }
  }

  function playWeaponFireSound(weaponId = 'pulseCarbine') {
    if (weaponId === 'prismScatter') {
      playTone(620, 180, 0.09, 'sawtooth', 0.22);
      playTone(440, 140, 0.11, 'triangle', 0.16);
    } else if (weaponId === 'arcLance') {
      playTone(880, 290, 0.1, 'square', 0.2);
    } else if (weaponId === 'twinRail') {
      playTone(760, 210, 0.075, 'sawtooth', 0.2);
    } else {
      playTone(540, 190, 0.07, 'triangle', 0.18);
    }
  }

  function playParryReflectSound() {
    playTone(360, 1080, 0.14, 'sine', 0.32);
    playTone(540, 1440, 0.18, 'triangle', 0.24);
  }

  function playEnemyHitSound(isKill = false) {
    if (isKill) {
      playTone(280, 75, 0.16, 'sawtooth', 0.28);
      playTone(520, 780, 0.11, 'sine', 0.18);
    } else {
      playTone(210, 110, 0.055, 'square', 0.14);
    }
  }

  function playOverdriveNovaSound() {
    playTone(140, 880, 0.34, 'sawtooth', 0.35);
    playTone(280, 65, 0.42, 'triangle', 0.32);
  }

  function playWaveClearFanfare() {
    playTone(329.63, 440.0, 0.16, 'triangle', 0.25);
    playTone(440.0, 659.25, 0.28, 'sine', 0.28);
  }

  function stepProceduralSoundtrack(dt, isCombatActive, bossActive = false) {
    if (muted || !isCombatActive) return;
    const interval = bossActive ? 0.18 : 0.24;
    stepAccumulator += dt;
    if (stepAccumulator < interval) return;
    stepAccumulator -= interval;

    const bassFreq = BASS_SEQUENCE[noteIndex % BASS_SEQUENCE.length];
    const leadFreq = LEAD_SEQUENCE[noteIndex % LEAD_SEQUENCE.length];
    noteIndex = (noteIndex + 1) % 16;

    playTone(bassFreq, bassFreq * 0.98, interval * 0.85, 'triangle', 0.08);
    if (noteIndex % 2 === 0 || bossActive) {
      playTone(leadFreq, leadFreq * 1.01, interval * 0.55, 'sine', 0.05);
    }
  }

  function toggleAudioMute() {
    muted = !muted;
    if (masterGain && ctx) {
      masterGain.gain.setValueAtTime(muted ? 0 : 0.22, ctx.currentTime);
    }
    return muted;
  }

  return {
    isMuted: () => muted,
    playWeaponFireSound,
    playParryReflectSound,
    playEnemyHitSound,
    playOverdriveNovaSound,
    playWaveClearFanfare,
    stepProceduralSoundtrack,
    toggleAudioMute,
  };
}
