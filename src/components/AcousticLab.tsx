import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AudioLines, Check, CircleHelp, Headphones, Mic, MicOff, Play, Save, Sparkles, Volume2, Zap } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import type { BiologicalState, PantryRecordInput, RoleId, SensorStatus } from '../types';
import {
  buildAcousticReading,
  createAudioContext,
  findSpectralPeak,
  estimateDamping,
  playSyntheticThump,
  PRODUCE_OPTIONS,
  THUMP_PRESETS,
  type AcousticReading,
  type ThumpPreset,
} from '../services/acousticProduceEngine';
import { downloadTextFile } from '../services/db';

interface AcousticLabProps {
  role: RoleId;
  onSave: (record: PantryRecordInput) => Promise<void>;
  onSensorState: (state: SensorStatus) => void;
  onBioState: (state: BiologicalState) => void;
  onNotify: (message: string) => void;
}

const spring = { type: 'spring' as const, stiffness: 320, damping: 26, mass: 0.8 };
const asReading = (preset: ThumpPreset, massGrams: number): AcousticReading => ({
  ...buildAcousticReading(preset.frequencyHz, preset.damping, massGrams, preset.produce, 0.96),
  estimatedBrix: preset.brix,
  state: preset.state,
  recommendation: preset.recommendation,
});

function makeSpectrum(frequencyHz: number, damping: number): number[] {
  return Array.from({ length: 36 }, (_, index) => {
    const frequency = 48 + index * 18;
    const fundamental = Math.exp(-((frequency - frequencyHz) ** 2) / (2 * 17 ** 2));
    const second = Math.exp(-((frequency - frequencyHz * 2) ** 2) / (2 * 24 ** 2)) * 0.46;
    const third = Math.exp(-((frequency - frequencyHz * 3) ** 2) / (2 * 28 ** 2)) * 0.22;
    const noise = 0.09 + ((index * 7) % 11) / 100;
    return Math.max(0.06, Math.min(1, (fundamental + second + third + noise) * (1 - damping * 0.6)));
  });
}

export default function AcousticLab({ role, onSave, onSensorState, onBioState, onNotify }: AcousticLabProps) {
  const [selectedProduce, setSelectedProduce] = useState<string>('Watermelon');
  const [massGrams, setMassGrams] = useState(3800);
  const [massUnit, setMassUnit] = useState<'g' | 'lb'>('g');
  const [selectedPresetId, setSelectedPresetId] = useState(THUMP_PRESETS[0].id);
  const [reading, setReading] = useState<AcousticReading>(() => asReading(THUMP_PRESETS[0], 3800));
  const [spectrum, setSpectrum] = useState(() => makeSpectrum(138, 0.12));
  const [micActive, setMicActive] = useState(false);
  const [micError, setMicError] = useState('');
  const [tapCount, setTapCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastTapRef = useRef(0);

  const selectedPreset = THUMP_PRESETS.find((preset) => preset.id === selectedPresetId);
  const activePreset = selectedPreset ?? THUMP_PRESETS[0];
  const sampleTitle = selectedPreset && activePreset.produce === selectedProduce ? activePreset.name : `${selectedProduce} · live sample`;
  const sampleDescription = selectedPreset && activePreset.produce === selectedProduce ? activePreset.description : 'Live resonance estimate · tap this produce near the microphone.';
  const activeReferenceFi = selectedPreset && activePreset.produce === selectedProduce ? activePreset.referenceFi : undefined;
  const massLabel = massUnit === 'g' ? `${Math.round(massGrams).toLocaleString()} g` : `${(massGrams / 453.592).toFixed(1)} lb`;
  const cooked = reading.state === 'Baking complete';
  const stateTone = reading.state === 'Peak ripe' || cooked ? 'good' : reading.state === 'Under-ripe' ? 'cool' : reading.state === 'Over-ripe' ? 'warm' : 'neutral';

  useEffect(() => {
    const biologicalState: BiologicalState = reading.state === 'Under-ripe' ? 'under' : reading.state === 'Over-ripe' ? 'hazard' : reading.state === 'Needs another tap' ? 'warning' : 'fresh';
    onBioState(biologicalState);
  }, [reading.state, onBioState]);

  const stopMic = useCallback((announce = true) => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    if (audioRef.current && audioRef.current.state !== 'closed') void audioRef.current.close();
    audioRef.current = null;
    setMicActive(false);
    onSensorState('simulator');
    if (announce) onNotify('Microphone closed. Synthetic references are still available.');
  }, [onNotify, onSensorState]);

  useEffect(() => () => stopMic(false), [stopMic]);

  const startMic = async () => {
    setMicError('');
    setTapCount(0);
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicError('This browser does not expose microphone capture. Try a secure HTTPS page or use a simulator preset.');
      onSensorState('restricted');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      const context = createAudioContext();
      await context.resume();
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.12;
      const source = context.createMediaStreamSource(stream);
      source.connect(analyser);
      streamRef.current = stream;
      audioRef.current = context;
      analyserRef.current = analyser;
      setMicActive(true);
      onSensorState('active');
      onNotify('Mic live · tap the produce 2–3 times near the phone.');
      const frequencyData = new Float32Array(analyser.frequencyBinCount);
      const timeData = new Float32Array(analyser.fftSize);
      const loop = () => {
        const currentAnalyser = analyserRef.current;
        if (!currentAnalyser) return;
        currentAnalyser.getFloatFrequencyData(frequencyData);
        currentAnalyser.getFloatTimeDomainData(timeData);
        const peak = findSpectralPeak(frequencyData, context.sampleRate, currentAnalyser.fftSize);
        let energy = 0;
        for (let i = 0; i < timeData.length; i += 1) energy += timeData[i] * timeData[i];
        const rms = Math.sqrt(energy / timeData.length);
        const now = performance.now();
        if (rms > 0.012 && peak.peakDb > -72 && now - lastTapRef.current > 360) {
          lastTapRef.current = now;
          const damping = estimateDamping(timeData);
          const confidence = Math.max(0.35, Math.min(0.94, (peak.peakDb + 82) / 52));
          setSelectedPresetId('');
          setReading(buildAcousticReading(peak.frequencyHz, damping, massGrams, selectedProduce, confidence));
          setSpectrum(Array.from({ length: 36 }, (_, index) => {
            const bin = Math.min(frequencyData.length - 1, Math.floor((index + 1) * 5));
            return Math.max(0.06, Math.min(1, (frequencyData[bin] + 100) / 82));
          }));
          setTapCount((count) => count + 1);
          if (Capacitor.isNativePlatform()) void Haptics.impact({ style: ImpactStyle.Medium });
          else if ('vibrate' in navigator) navigator.vibrate(18);
        }
        frameRef.current = requestAnimationFrame(loop);
      };
      frameRef.current = requestAnimationFrame(loop);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Microphone permission was not granted.';
      setMicError(message.includes('Permission') || message.includes('NotAllowed')
        ? 'Microphone access was blocked. Enable it in browser permissions, or use a synthetic tap below.'
        : 'Could not start the microphone. Synthetic references are ready to use.');
      onSensorState('restricted');
    }
  };

  const runPreset = async (preset: ThumpPreset) => {
    if (micActive) stopMic(false);
    setSelectedPresetId(preset.id);
    setSelectedProduce(preset.produce);
    setReading(asReading(preset, massGrams));
    setSpectrum(makeSpectrum(preset.frequencyHz, preset.damping));
    setSaved(false);
    try {
      const context = audioRef.current ?? createAudioContext();
      if (!audioRef.current) audioRef.current = context;
      if (context.state === 'suspended') await context.resume();
      playSyntheticThump(context, preset.frequencyHz, preset.damping);
    } catch {
      // Synthetic meter updates remain useful if audio output is unavailable or muted.
    }
    if (preset.state === 'Peak ripe') {
      if (Capacitor.isNativePlatform()) void Haptics.impact({ style: ImpactStyle.Light });
      else if ('vibrate' in navigator) navigator.vibrate(12);
    }
    onSensorState('simulator');
    onNotify(`${preset.name} reference loaded · ${preset.frequencyHz} Hz`);
  };

  const updateProduce = (produce: string) => {
    setSelectedProduce(produce);
    const matching = THUMP_PRESETS.find((preset) => preset.produce === produce);
    if (matching) {
      setSelectedPresetId(matching.id);
      setReading(asReading(matching, massGrams));
      setSpectrum(makeSpectrum(matching.frequencyHz, matching.damping));
    } else {
      setSelectedPresetId('');
      setReading(buildAcousticReading(reading.frequencyHz, reading.damping, massGrams, produce, reading.confidence / 100));
      setSpectrum(makeSpectrum(reading.frequencyHz, reading.damping));
    }
  };

  const updateMass = (nextMass: number) => {
    const normalized = Math.max(80, Math.min(20000, nextMass));
    setMassGrams(normalized);
    setReading((previous) => ({ ...previous, cookeFi: previous.frequencyHz ** 2 * normalized ** (2 / 3) * 1e-4 }));
  };

  const saveReading = async () => {
    const hours = reading.state === 'Peak ripe' || reading.state === 'Over-ripe' ? 24 : reading.state === 'Under-ripe' ? 120 : 72;
    await onSave({
      name: selectedProduce,
      category: selectedProduce.toLowerCase().includes('bread') ? 'Bakery' : 'Produce',
      state: reading.state,
      expiresAt: Date.now() + hours * 60 * 60 * 1000,
      savedEstimate: 1.75,
      source: 'Acoustic Thump Lab',
      note: `${reading.frequencyHz.toFixed(1)} Hz · ζ ${reading.damping.toFixed(2)} · mass ${massLabel}`,
    });
    setSaved(true);
  };

  const exportTelemetry = () => {
    downloadTextFile('fresh-spectra-acoustic-telemetry.json', JSON.stringify({
      capturedAt: new Date().toISOString(),
      produce: selectedProduce,
      massGrams,
      reading,
      preset: selectedPresetId || null,
      spectrumPreview: spectrum,
      sampleRate: audioRef.current?.sampleRate ?? null,
      fftSize: analyserRef.current?.fftSize ?? 2048,
      note: 'Cooke FI is a field index; Brix is a model estimate, not a refractometer reading.',
    }, null, 2), 'application/json');
  };

  const referenceFi = activeReferenceFi;
  const recommendationColor = reading.state === 'Peak ripe' || cooked ? 'var(--accent-bright)' : reading.state === 'Under-ripe' ? 'var(--sky)' : 'var(--amber)';
  const spectrumBars = useMemo(() => spectrum, [spectrum]);

  return (
    <div className="module-view acoustic-view">
      <div className="module-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" /> FIELD INSTRUMENT 01 <span className="eyebrow-line" /> 60–600 HZ</div>
          <h1>Acoustic <em>Thump Lab</em></h1>
          <p>Listen for the structure inside. A fast tap can reveal a surprisingly rich resonance signature.</p>
        </div>
        <div className="heading-actions">
          {role === 'admin' && <button className="button button-ghost button-small" onClick={exportTelemetry}><Zap size={15} /> Export telemetry</button>}
          <span className={`sensor-pill ${micActive ? 'is-active' : ''}`}><span className="status-dot" />{micActive ? 'MIC LIVE' : 'SIMULATOR READY'}</span>
        </div>
      </div>

      <div className="acoustic-hero-grid">
        <motion.section className="glass-card resonance-card" layoutId="acoustic-result-card" transition={spring}>
          <div className="resonance-orbit orbit-one" />
          <div className="resonance-orbit orbit-two" />
          <div className="card-topline">
            <div className="section-kicker"><AudioLines size={14} /> RESONANCE SIGNATURE</div>
            <span className={`state-badge tone-${stateTone}`}><span className="badge-dot" />{reading.state}</span>
          </div>
          <div className="resonance-main">
            <div className="resonance-number-wrap">
              <div className="resonance-number">{reading.frequencyHz.toFixed(0)}<span>Hz</span></div>
              <div className="resonance-caption">FUNDAMENTAL · f<sub>0</sub></div>
              <div className="resonance-title">{sampleTitle}</div>
              <div className="resonance-copy">{sampleDescription}</div>
            </div>
            <div className="ring-gauge" style={{ '--gauge': `${Math.min(100, Math.max(0, reading.confidence))}%`, '--gauge-color': recommendationColor } as React.CSSProperties}>
              <div className="gauge-inner">
                <Sparkles size={17} />
                <strong>{reading.confidence}%</strong>
                <span>CONFIDENCE</span>
              </div>
            </div>
          </div>
          <div className="spectrum-wrap" aria-label="Synthetic acoustic spectrum preview">
            <div className="spectrum-meta"><span>LIVE SPECTRUM</span><span>LOW / MID BAND</span></div>
            <div className="spectrum-bars">
              {spectrumBars.map((value, index) => <span key={index} style={{ height: `${12 + value * 66}%`, opacity: 0.25 + value * 0.72 }} />)}
            </div>
            <div className="spectrum-axis"><span>60 Hz</span><span>250 Hz</span><span>600 Hz</span></div>
          </div>
          <div className="resonance-footer">
            <div><span className="micro-label">HARMONIC DECAY</span><strong>ζ {reading.damping.toFixed(2)}</strong></div>
            <div><span className="micro-label">ESTIMATED SWEETNESS</span><strong>{reading.estimatedBrix.toFixed(1)} <small>°Bx est.</small></strong></div>
            <div className="buy-stamp" style={{ color: recommendationColor, borderColor: recommendationColor }}>{reading.recommendation}</div>
          </div>
        </motion.section>

        <motion.aside className="glass-card index-card" transition={spring}>
          <div className="card-topline">
            <div className="section-kicker"><Zap size={14} /> FIELD INDEX</div>
            <button className="icon-button subtle-icon" title="Cooke's firmness index uses f squared times mass to the two-thirds power." aria-label="About Cooke's firmness index"><CircleHelp size={16} /></button>
          </div>
          <div className="index-value">{reading.cookeFi.toFixed(1)}<span>FI</span></div>
          <p className="index-equation">f<sub>0</sub><sup>2</sup> × m<sup>2/3</sup> × 10<sup>−4</sup></p>
          <div className="index-divider" />
          <div className="index-row"><span>Sample mass</span><strong>{massLabel}</strong></div>
          <div className="index-row"><span>Calculated °Bx</span><strong>{reading.estimatedBrix.toFixed(1)}°</strong></div>
          {referenceFi && <div className="reference-chip"><span className="reference-mark"><Check size={12} /></span> Simulator reference FI <strong>{referenceFi.toFixed(1)}</strong></div>}
          <p className="index-footnote">Cooke FI is a relative field index; Brix is estimated from the acoustic response and is not a refractometer reading.</p>
          <button className="button button-primary save-scan-button" onClick={() => void saveReading()}>
            {saved ? <Check size={16} /> : <Save size={16} />}{saved ? 'Added to Pantry Vault' : 'Log reading to pantry'}
          </button>
        </motion.aside>
      </div>

      <div className="acoustic-workspace-grid">
        <section className="glass-card controls-card">
          <div className="card-heading-row">
            <div><div className="section-kicker">01 / CALIBRATE</div><h2>Choose your sample</h2></div>
            <span className="mini-label">FIELD SETUP</span>
          </div>
          <div className="control-row produce-select-row">
            <label htmlFor="produce-select">Produce type</label>
            <select id="produce-select" value={selectedProduce} onChange={(event) => updateProduce(event.target.value)}>
              {PRODUCE_OPTIONS.map((produce) => <option key={produce}>{produce}</option>)}
            </select>
          </div>
            <div className="control-row mass-control">
            <div className="control-label-line"><label htmlFor="mass-range">Estimated sample mass {role === 'home' && <span className="pro-lock-tag">PRO CALIBRATION</span>}</label><div className="unit-toggle"><button className={massUnit === 'g' ? 'active' : ''} onClick={() => setMassUnit('g')} disabled={role === 'home'}>g</button><button className={massUnit === 'lb' ? 'active' : ''} onClick={() => setMassUnit('lb')} disabled={role === 'home'}>lb</button></div></div>
            <div className="mass-value-line"><strong>{massLabel}</strong><span>Fine tune the Cooke FI input</span></div>
            <input id="mass-range" type="range" min="80" max="12000" step="20" value={massGrams} disabled={role === 'home'} onChange={(event) => updateMass(Number(event.target.value))} />
            <div className="range-ends"><span>80 g</span><span>12 kg</span></div>
            {role === 'home' && <button className="pro-unlock-hint" onClick={() => onNotify('Cooke FI mass calibration is available in the Culinary & Ag Inspector Pro role.')}><Zap size={12} />Unlock mass calibration in Privileges</button>}
          </div>
          <div className="sensor-divider" />
          <div className="mic-row">
            <div className="mic-icon-wrap"><Mic size={19} /></div>
            <div className="mic-copy"><strong>Real impulse capture</strong><span>Unfiltered mono · FFT 2048 · no voice cleanup</span></div>
            {micActive
              ? <button className="button button-danger button-small" onClick={() => stopMic()}><MicOff size={15} /> Stop</button>
              : <button className="button button-outline button-small" onClick={() => void startMic()}><Mic size={15} /> Enable mic</button>}
          </div>
          {micActive && <div className="live-prompt"><span className="pulse-dot" /> Tap the produce 2–3 times near your microphone. <strong>{tapCount} {tapCount === 1 ? 'tap' : 'taps'} captured</strong></div>}
          {micError && <div className="inline-warning"><CircleHelp size={15} />{micError}</div>}
        </section>

        <section className="glass-card simulators-card">
          <div className="card-heading-row">
            <div><div className="section-kicker">02 / TEST INSTANTLY</div><h2>Thump library</h2></div>
            <span className="live-label"><span className="status-dot" />5 REFERENCES</span>
          </div>
          <p className="card-intro">No fruit nearby? Play a calibrated acoustic reference and see the model react.</p>
          <div className="preset-list">
            {THUMP_PRESETS.filter((preset) => preset.id !== 'rock-hard-avocado').map((preset, index) => {
              const isSelected = preset.id === selectedPresetId;
              return (
                <motion.button
                  type="button"
                  className={`preset-row ${isSelected ? 'selected' : ''}`}
                  key={preset.id}
                  onClick={() => void runPreset(preset)}
                  whileHover={{ scale: 1.015, y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  transition={spring}
                >
                  <span className="preset-index">0{index + 1}</span>
                  <span className="preset-wave" style={{ '--wave-color': preset.color } as React.CSSProperties}><i /><i /><i /><i /><i /></span>
                  <span className="preset-copy"><strong>{preset.name}</strong><small>{preset.frequencyHz} Hz · ζ {preset.damping.toFixed(2)}</small></span>
                  <span className="preset-action">{isSelected ? <Check size={16} /> : <Play size={15} />}</span>
                </motion.button>
              );
            })}
          </div>
          {activePreset.id === 'creamy-avocado' && selectedProduce === 'Hass avocado' && <button className="avocado-variant" onClick={() => void runPreset(THUMP_PRESETS.find((preset) => preset.id === 'rock-hard-avocado')!)}><span className="variant-frequency">240 <small>Hz</small></span><span><strong>Compare rock-hard avocado</strong><small>High, tight resonance · WAIT 4 DAYS</small></span><Play size={14} /></button>}
          <div className="simulator-note"><Volume2 size={15} /><span>Uses a damped multi-harmonic oscillator. Speaker playback is optional—the reading updates instantly.</span></div>
        </section>
      </div>

      <div className="bottom-note"><Headphones size={15} /><span>Tap near the device mic, not directly on the phone. Compare like-for-like fruit at a similar temperature for the most useful reading.</span><button className="text-button" onClick={() => onNotify('Acoustic results are screening cues only; a tap cannot confirm internal defects or food safety.')}>How to read this <span>↗</span></button></div>
    </div>
  );
}
