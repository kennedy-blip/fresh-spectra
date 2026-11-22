import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Camera, CameraOff, Check, CircleHelp, Focus, ScanLine, Save, ShieldCheck, SunMedium } from 'lucide-react';
import type { LabColor, OpticalReference, RGBColor } from '../services/cielabSpectrometer';
import { averageImagePatch, OPTICAL_REFERENCES, rgbToHex, srgbToCielab } from '../services/cielabSpectrometer';
import { downloadTextFile } from '../services/db';
import type { BiologicalState, PantryRecordInput, RoleId, SensorStatus } from '../types';

interface OpticalLabProps {
  role: RoleId;
  onSave: (record: PantryRecordInput) => Promise<void>;
  onSensorState: (state: SensorStatus) => void;
  onBioState: (state: BiologicalState) => void;
  onNotify: (message: string) => void;
}

interface SampleReading {
  rgb: RGBColor;
  lab: LabColor;
  source: string;
  group: string;
}

const spring = { type: 'spring' as const, stiffness: 320, damping: 26, mass: 0.8 };
const colorSample = (sample: OpticalReference): SampleReading => ({
  rgb: sample.color,
  lab: srgbToCielab(sample.color),
  source: sample.name,
  group: sample.group,
});

export default function OpticalLab({ role, onSave, onSensorState, onBioState, onNotify }: OpticalLabProps) {
  const [sample, setSample] = useState<SampleReading>(() => colorSample(OPTICAL_REFERENCES[0]));
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [saved, setSaved] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastUiRef = useRef(0);
  const liveSourceRef = useRef('Live camera sample');
  const hex = rgbToHex(sample.rgb);
  const freshnessLabel = sample.lab.chlorophyllRetention >= 70 ? 'BOTANICAL FRESH' : sample.lab.chlorophyllRetention >= 40 ? 'WATCH THE COLOUR' : 'OXIDATION CUE';
  const browningTone = sample.lab.browningIndex > 65 ? 'warm' : sample.lab.browningIndex > 30 ? 'amber' : 'mint';

  useEffect(() => {
    const biologicalState: BiologicalState = sample.lab.chlorophyllRetention >= 70 ? 'fresh' : sample.lab.chlorophyllRetention >= 40 ? 'warning' : 'hazard';
    onBioState(biologicalState);
  }, [sample.lab.chlorophyllRetention, onBioState]);

  const stopCamera = () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
    onSensorState('simulator');
    onNotify('Camera stopped. Select a built-in optical reference to keep testing offline.');
  };

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    onSensorState('simulator');
  }, [onSensorState]);

  const startCamera = async () => {
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera capture is unavailable here. Open this page over HTTPS or test with a reference sample.');
      onSensorState('restricted');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 60, max: 60 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      onSensorState('active');
      onNotify('Colorimetric camera live · hold the sample inside the reticle.');
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d', { willReadFrequently: true });
      const tick = (timestamp: number) => {
        if (!video || !canvas || !context || !streamRef.current) return;
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
          canvas.width = 320;
          canvas.height = 180;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const patch = context.getImageData(128, 62, 64, 56);
          const rgb = averageImagePatch(patch);
          // Sampling runs at the camera frame cadence; React paint is intentionally throttled for mobile thermals.
          if (timestamp - lastUiRef.current > 110) {
            lastUiRef.current = timestamp;
            setSample({ rgb, lab: srgbToCielab(rgb), source: liveSourceRef.current, group: 'LIVE · D65 APPROX.' });
          }
        }
        frameRef.current = requestAnimationFrame(tick);
      };
      frameRef.current = requestAnimationFrame(tick);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      setCameraError(message.includes('NotAllowed') || message.includes('Permission')
        ? 'Camera permission was blocked. Allow camera access in your browser settings or use a reference sample.'
        : 'Camera could not be started. The color references work without camera access.');
      onSensorState('restricted');
    }
  };

  const selectReference = (reference: OpticalReference) => {
    setSample(colorSample(reference));
    setSaved(false);
    onSensorState(cameraActive ? 'active' : 'simulator');
    onNotify(`${reference.name} optical reference loaded.`);
  };

  const exportTelemetry = () => {
    downloadTextFile('fresh-spectra-optical-telemetry.json', JSON.stringify({
      sampledAt: new Date().toISOString(),
      source: sample.source,
      rgbSrgb: sample.rgb,
      cieLab: { L: sample.lab.L, a: sample.lab.a, b: sample.lab.b },
      chromaticity: { x: sample.lab.xChromaticity, y: sample.lab.yChromaticity },
      browningIndex: sample.lab.browningIndex,
      chlorophyllRetentionProxy: sample.lab.chlorophyllRetention,
      transform: 'sRGB IEC 61966-2-1 → CIE XYZ D65 → CIE L*a*b*',
      note: 'Surface color is a screening cue only; camera white balance and illumination affect results.',
    }, null, 2), 'application/json');
  };

  const saveReading = async () => {
    const isProtein = sample.source.toLowerCase().includes('beef') || sample.source.toLowerCase().includes('protein');
    const state = sample.lab.chlorophyllRetention >= 70 ? 'Fresh colour proxy' : sample.lab.chlorophyllRetention >= 40 ? 'Consume soon' : 'Oxidation colour cue';
    await onSave({
      name: sample.source,
      category: isProtein ? 'Protein' : 'Produce',
      state,
      expiresAt: Date.now() + (sample.lab.chlorophyllRetention >= 70 ? 72 : 24) * 60 * 60 * 1000,
      savedEstimate: 2.25,
      source: 'CIELAB Optical Lab',
      note: `L* ${sample.lab.L.toFixed(1)} · a* ${sample.lab.a.toFixed(1)} · b* ${sample.lab.b.toFixed(1)} · BI ${sample.lab.browningIndex.toFixed(1)}`,
    });
    setSaved(true);
  };

  return (
    <div className="module-view optical-view">
      <div className="module-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" /> FIELD INSTRUMENT 02 <span className="eyebrow-line" /> SRGB → CIE XYZ → LAB</div>
          <h1>Optical <em>Colorimeter</em></h1>
          <p>Sample surface colour as numbers. Compare browning and green-axis change across the same lighting setup.</p>
        </div>
        <div className="heading-actions">{role === 'admin' && <button className="button button-ghost button-small" onClick={exportTelemetry}><Save size={14} /> Export raw</button>}<span className={`sensor-pill ${cameraActive ? 'is-active' : ''}`}><span className="status-dot" />{cameraActive ? 'CAMERA LIVE' : 'REFERENCE ACTIVE'}</span></div>
      </div>

      <div className="optical-grid">
        <section className="glass-card camera-card">
          <div className="card-topline"><div className="section-kicker"><Focus size={14} /> CENTER-PATCH SAMPLER</div><span className="mini-label"><SunMedium size={13} /> D65 APPROXIMATION</span></div>
          <div className={`camera-stage ${cameraActive ? 'is-live' : ''}`}>
            <video ref={videoRef} className="camera-video" muted playsInline aria-label="Live optical camera feed" />
            {!cameraActive && <div className="camera-placeholder" style={{ '--sample-color': hex } as React.CSSProperties}>
              <div className="sample-light" />
              <div className="sample-orb"><div className="sample-orb-shine" /><span className="sample-orb-label">{sample.group}</span></div>
              <div className="placeholder-grid" />
              <div className="placeholder-copy"><strong>Optical reference loaded</strong><span>Enable camera or choose a sample below</span></div>
            </div>}
            <div className="reticle reticle-corners"><i /><i /><i /><i /><span className="reticle-center" /></div>
            <div className="reticle-label"><span className="pulse-dot" />{cameraActive ? 'LIVE SAMPLE · PATCH AVERAGE' : '30 × 30 CENTER RETICLE'}</div>
            <div className="camera-color-tag"><span style={{ background: hex }} />{hex.toUpperCase()}</div>
          </div>
          <canvas ref={canvasRef} className="visually-hidden-canvas" aria-hidden="true" />
          <div className="camera-actions">
            {cameraActive
              ? <button className="button button-danger" onClick={stopCamera}><CameraOff size={16} /> Stop camera</button>
              : <button className="button button-primary" onClick={() => void startCamera()}><Camera size={16} /> Start live camera</button>}
            <button className="button button-outline" onClick={() => void saveReading()}>{saved ? <Check size={16} /> : <Save size={16} />}{saved ? 'Saved to pantry' : 'Log this sample'}</button>
          </div>
          {cameraError && <div className="inline-warning"><CircleHelp size={15} />{cameraError}</div>}
        </section>

        <motion.section className="glass-card lab-results-card" layoutId="optical-result-card" transition={spring}>
          <div className="card-topline"><div className="section-kicker"><ScanLine size={14} /> COLORIMETRIC READOUT</div><span className="source-label">{sample.group}</span></div>
          <div className="lab-color-summary">
            <div className="lab-swatch" style={{ background: hex }}><span /></div>
            <div><strong>{sample.source}</strong><span>{freshnessLabel}</span></div>
            <div className="lab-retention"><span>GREEN AXIS</span><strong>{sample.lab.chlorophyllRetention}<small>%</small></strong></div>
          </div>
          <div className="lab-values-grid">
            <div className="lab-value"><span>L*</span><strong>{sample.lab.L.toFixed(1)}</strong><small>Lightness</small></div>
            <div className="lab-value"><span>a*</span><strong className={sample.lab.a < 0 ? 'green-value' : 'red-value'}>{sample.lab.a > 0 ? '+' : ''}{sample.lab.a.toFixed(1)}</strong><small>Green ← → red</small></div>
            <div className="lab-value"><span>b*</span><strong className={sample.lab.b > 0 ? 'amber-value' : ''}>{sample.lab.b > 0 ? '+' : ''}{sample.lab.b.toFixed(1)}</strong><small>Blue ← → yellow</small></div>
          </div>
          <div className="optical-meter">
            <div className="meter-label-row"><span>CHLOROPHYLL / FRESHNESS RETENTION PROXY</span><strong>{sample.lab.chlorophyllRetention}%</strong></div>
            <div className="meter-track"><span style={{ width: `${sample.lab.chlorophyllRetention}%` }} /></div>
            <div className="meter-axis"><span>LOW GREEN SIGNAL</span><span>HIGH GREEN SIGNAL</span></div>
          </div>
          <div className="browning-panel">
            <div className="browning-icon"><AlertTriangle size={16} /></div>
            <div className="browning-copy"><span>ENZYMATIC BROWNING INDEX</span><strong>{sample.lab.browningIndex.toFixed(1)} <small>BI</small></strong></div>
            <div className="browning-track"><span className={`tone-${browningTone}`} style={{ width: `${Math.max(0, Math.min(100, sample.lab.browningIndex))}%` }} /></div>
          </div>
          {role !== 'home' && <div className="oscilloscope-panel">
            <div className="scope-heading"><span>RAW LAB OSCILLOSCOPE</span><span>PRO INSTRUMENT</span></div>
            <div className="scope-wave"><svg viewBox="0 0 480 62" preserveAspectRatio="none" aria-label="Color sample trend"><path d="M0 38 C22 37 20 20 40 24 S61 44 80 39 98 20 116 26 133 45 153 38 172 17 189 25 210 48 230 40 248 16 268 24 286 44 305 37 323 20 342 26 361 43 380 36 399 16 420 25 440 45 460 36 470 30 480 34" /></svg></div>
            <div className="scope-values"><span>R {sample.rgb.r}</span><span>G {sample.rgb.g}</span><span>B {sample.rgb.b}</span><span>x {sample.lab.xChromaticity.toFixed(3)}</span><span>y {sample.lab.yChromaticity.toFixed(3)}</span></div>
          </div>}
          <div className="lab-caveat"><ShieldCheck size={14} /><span>Color is a screening cue, not a food-safety test. Lighting, variety and camera white balance affect the reading.</span></div>
        </motion.section>
      </div>

      <section className="glass-card reference-card">
        <div className="card-heading-row"><div><div className="section-kicker">03 / BUILT-IN STANDARDS</div><h2>Optical reference library</h2></div><span className="mini-label">5 COLOR SAMPLES</span></div>
        <div className="reference-grid">
          {OPTICAL_REFERENCES.map((reference, index) => (
            <motion.button type="button" key={reference.id} className={`reference-tile ${sample.source === reference.name ? 'selected' : ''}`} onClick={() => selectReference(reference)} whileHover={{ scale: 1.015, y: -2 }} whileTap={{ scale: 0.96 }} transition={spring}>
              <span className="reference-swatch" style={{ background: rgbToHex(reference.color) }}><span>{String(index + 1).padStart(2, '0')}</span></span>
              <span className="reference-info"><strong>{reference.name}</strong><small>{reference.group}</small><em>{reference.note}</em></span>
              {sample.source === reference.name && <Check size={16} className="reference-check" />}
            </motion.button>
          ))}
        </div>
      </section>

      <div className="bottom-note"><SunMedium size={15} /><span>Keep the phone and sample in the same light. A white reference card helps control exposure when comparing different shopping trips.</span><span className="note-suffix">RGB average → D65 Lab transform</span></div>
    </div>
  );
}
