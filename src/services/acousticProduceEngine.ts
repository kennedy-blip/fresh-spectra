export type RipenessState = 'Peak ripe' | 'Under-ripe' | 'Over-ripe' | 'Baking complete' | 'Needs another tap';

export interface ThumpPreset {
  id: string;
  name: string;
  produce: string;
  frequencyHz: number;
  damping: number;
  brix: number;
  state: RipenessState;
  recommendation: string;
  description: string;
  color: string;
  referenceFi?: number;
}

export interface AcousticReading {
  frequencyHz: number;
  damping: number;
  cookeFi: number;
  estimatedBrix: number;
  confidence: number;
  state: RipenessState;
  recommendation: string;
}

export const PRODUCE_OPTIONS = [
  'Watermelon',
  'Cantaloupe / honeydew',
  'Pineapple',
  'Coconut',
  'Hass avocado',
  'Honeycrisp apple',
  'Artisan sourdough loaf',
] as const;

export const THUMP_PRESETS: ThumpPreset[] = [
  {
    id: 'sweet-watermelon',
    name: 'Peak-ripe sweet melon',
    produce: 'Watermelon',
    frequencyHz: 138,
    damping: 0.12,
    brix: 11.8,
    state: 'Peak ripe',
    recommendation: 'BUY NOW',
    description: 'A low, rounded ring with a clean second harmonic.',
    color: '#b5f673',
    referenceFi: 48.2,
  },
  {
    id: 'pale-watermelon',
    name: 'Pale / under-ripe melon',
    produce: 'Watermelon',
    frequencyHz: 194,
    damping: 0.22,
    brix: 7.1,
    state: 'Under-ripe',
    recommendation: 'WAIT 5 DAYS',
    description: 'Higher pitch and a tight, starch-forward response.',
    color: '#7dd3fc',
    referenceFi: 91.5,
  },
  {
    id: 'hollow-melon',
    name: 'Mealy / hollow-heart melon',
    produce: 'Watermelon',
    frequencyHz: 88,
    damping: 0.48,
    brix: 6.3,
    state: 'Over-ripe',
    recommendation: 'DO NOT BUY',
    description: 'A short, low thud with fast energy loss.',
    color: '#ff9d72',
    referenceFi: 19.4,
  },
  {
    id: 'creamy-avocado',
    name: 'Creamy Hass avocado',
    produce: 'Hass avocado',
    frequencyHz: 145,
    damping: 0.17,
    brix: 4.2,
    state: 'Peak ripe',
    recommendation: 'READY TO EAT',
    description: 'Soft resonance; gentle give is the companion cue.',
    color: '#a3e635',
  },
  {
    id: 'rock-hard-avocado',
    name: 'Rock-hard Hass avocado',
    produce: 'Hass avocado',
    frequencyHz: 240,
    damping: 0.08,
    brix: 2.5,
    state: 'Under-ripe',
    recommendation: 'WAIT 4 DAYS',
    description: 'A high, tight shell resonance from firm, unyielding flesh.',
    color: '#7dd3fc',
  },
  {
    id: 'sourdough',
    name: 'Baked sourdough loaf',
    produce: 'Artisan sourdough loaf',
    frequencyHz: 205,
    damping: 0.1,
    brix: 1.2,
    state: 'Baking complete',
    recommendation: 'CRUMB SET',
    description: 'A bright, hollow crust drum with a long ring.',
    color: '#f9c978',
  },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Cooke's field firmness index, with mass expressed in grams as in the field sheet. */
export function computeCookeFirmnessIndex(frequencyHz: number, massGrams: number): number {
  if (!Number.isFinite(frequencyHz) || !Number.isFinite(massGrams) || frequencyHz <= 0 || massGrams <= 0) return 0;
  return frequencyHz ** 2 * massGrams ** (2 / 3) * 1e-4;
}

export function estimateBrix(frequencyHz: number, damping: number, produce: string): number {
  if (produce.toLowerCase().includes('bread')) return 1.2;
  const produceOffset = produce.toLowerCase().includes('watermelon') ? 1.6 : produce.toLowerCase().includes('apple') ? 2.2 : 0.8;
  const frequencyContribution = clamp((220 - frequencyHz) / 16, -3.5, 4.5);
  const dampingPenalty = clamp(damping, 0, 0.6) * 3.2;
  return Math.round(clamp(7.2 + produceOffset + frequencyContribution - dampingPenalty, 2, 18) * 10) / 10;
}

export function classifyResonance(frequencyHz: number, damping: number, produce: string): Pick<AcousticReading, 'state' | 'recommendation'> {
  if (!Number.isFinite(frequencyHz) || frequencyHz < 45 || frequencyHz > 900) {
    return { state: 'Needs another tap', recommendation: 'TAP AGAIN' };
  }
  if (produce.toLowerCase().includes('bread')) {
    return frequencyHz >= 170 && damping < 0.28
      ? { state: 'Baking complete', recommendation: 'CRUMB SET' }
      : { state: 'Needs another tap', recommendation: 'CHECK CRUST AGAIN' };
  }
  if (damping > 0.39 || frequencyHz < 105) return { state: 'Over-ripe', recommendation: 'USE TODAY' };
  if (frequencyHz > 180 || damping > 0.29) return { state: 'Under-ripe', recommendation: 'LET IT REST' };
  return { state: 'Peak ripe', recommendation: 'READY TO ENJOY' };
}

/** Finds the strongest 60–600 Hz peak and refines its bin with parabolic interpolation. */
export function findSpectralPeak(
  frequencyData: Float32Array,
  sampleRate: number,
  fftSize: number,
  minHz = 60,
  maxHz = 600,
): { frequencyHz: number; peakDb: number } {
  const binHz = sampleRate / fftSize;
  const startBin = Math.max(1, Math.ceil(minHz / binHz));
  const endBin = Math.min(frequencyData.length - 2, Math.floor(maxHz / binHz));
  let peakBin = startBin;
  for (let i = startBin + 1; i <= endBin; i += 1) {
    if (frequencyData[i] > frequencyData[peakBin]) peakBin = i;
  }
  if (peakBin <= startBin || peakBin >= endBin) return { frequencyHz: peakBin * binHz, peakDb: frequencyData[peakBin] ?? -100 };
  const left = frequencyData[peakBin - 1];
  const center = frequencyData[peakBin];
  const right = frequencyData[peakBin + 1];
  const denominator = left - 2 * center + right;
  const offset = denominator === 0 ? 0 : clamp(0.5 * (left - right) / denominator, -0.5, 0.5);
  return { frequencyHz: (peakBin + offset) * binHz, peakDb: center };
}

/** Estimates ring-down from the change in RMS energy across the captured transient window. */
export function estimateDamping(timeData: Float32Array): number {
  if (timeData.length < 16) return 0.18;
  const quarter = Math.floor(timeData.length / 4);
  const rms = (from: number, to: number) => {
    let total = 0;
    for (let i = from; i < to; i += 1) total += timeData[i] ** 2;
    return Math.sqrt(total / Math.max(1, to - from));
  };
  const early = rms(0, quarter * 2);
  const late = rms(quarter * 2, timeData.length);
  if (early < 0.0001) return 0.18;
  return Math.round(clamp((1 - late / early) * 0.62, 0.03, 0.58) * 100) / 100;
}

export function buildAcousticReading(
  frequencyHz: number,
  damping: number,
  massGrams: number,
  produce: string,
  confidence = 0.84,
): AcousticReading {
  const { state, recommendation } = classifyResonance(frequencyHz, damping, produce);
  return {
    frequencyHz: Math.round(frequencyHz * 10) / 10,
    damping: Math.round(damping * 100) / 100,
    cookeFi: computeCookeFirmnessIndex(frequencyHz, massGrams),
    estimatedBrix: estimateBrix(frequencyHz, damping, produce),
    confidence: Math.round(clamp(confidence, 0.1, 0.99) * 100),
    state,
    recommendation,
  };
}

/** Plays a short, synthetic damped resonance through the browser's audio output. */
export function playSyntheticThump(
  context: AudioContext,
  frequencyHz: number,
  damping: number,
  destination: AudioNode = context.destination,
): void {
  const now = context.currentTime;
  const decaySeconds = clamp(0.54 * (1 - damping), 0.11, 0.48);
  const partials = [
    { ratio: 1, gain: 0.24, type: 'sine' as OscillatorType },
    { ratio: 2.02, gain: 0.075, type: 'triangle' as OscillatorType },
    { ratio: 3.01, gain: 0.026, type: 'sine' as OscillatorType },
  ];
  partials.forEach(({ ratio, gain, type }) => {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequencyHz * ratio, now);
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(gain, now + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + decaySeconds);
    oscillator.connect(envelope);
    envelope.connect(destination);
    oscillator.start(now);
    oscillator.stop(now + decaySeconds + 0.015);
  });
}

export function createAudioContext(): AudioContext {
  const AudioContextConstructor = window.AudioContext;
  return new AudioContextConstructor();
}
