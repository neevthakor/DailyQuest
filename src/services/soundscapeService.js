/**
 * Web Audio API Binaural & Focus Soundscape Synthesizer.
 * Generates real focus audio (Alpha 10Hz, Gamma 40Hz, Deep Brown Noise) without external audio files.
 */

let audioCtx = null;
let activeNodes = [];
let currentTrack = null;

export const SOUNDSCAPES = [
  { id: 'alpha', name: 'Alpha 10Hz Focus', desc: 'Calm concentration & flow state', baseHz: 200, beatHz: 10, type: 'binaural' },
  { id: 'gamma', name: 'Gamma 40Hz Genius', desc: 'High-level memory & problem solving', baseHz: 220, beatHz: 40, type: 'binaural' },
  { id: 'brown', name: 'Deep Brown Noise', desc: 'Masks background distractions', type: 'noise' },
];

export function getActiveSoundscape() {
  return currentTrack;
}

export function stopSoundscape() {
  activeNodes.forEach((n) => {
    try {
      n.stop?.();
      n.disconnect?.();
    } catch {
      // ignore
    }
  });
  activeNodes = [];
  currentTrack = null;
}

export function playSoundscape(trackId) {
  stopSoundscape();
  const track = SOUNDSCAPES.find((s) => s.id === trackId);
  if (!track || typeof window === 'undefined') return null;

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.08;
  masterGain.connect(audioCtx.destination);

  if (track.type === 'binaural') {
    const merger = audioCtx.createChannelMerger(2);
    const leftOsc = audioCtx.createOscillator();
    const rightOsc = audioCtx.createOscillator();
    leftOsc.frequency.value = track.baseHz;
    rightOsc.frequency.value = track.baseHz + track.beatHz;
    leftOsc.connect(merger, 0, 0);
    rightOsc.connect(merger, 0, 1);
    merger.connect(masterGain);
    leftOsc.start();
    rightOsc.start();
    activeNodes = [leftOsc, rightOsc, merger, masterGain];
  } else {
    const bufferSize = audioCtx.sampleRate * 2;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    noise.connect(masterGain);
    noise.start();
    activeNodes = [noise, masterGain];
  }

  currentTrack = trackId;
  return trackId;
}
