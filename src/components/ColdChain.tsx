import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Archive, Check, ChevronDown, Clock3, ShieldCheck, Snowflake, Thermometer, Timer, TrendingUp, TriangleAlert } from 'lucide-react';
import type { BiologicalState, PantryRecordInput, RoleId } from '../types';
import { calculateShelfLife, formatHours, PACKAGING_OPTIONS, SHELF_LIFE_PROFILES, type PackagingMethod } from '../services/q10Thermodynamics';

interface ColdChainProps {
  role: RoleId;
  onSave: (record: PantryRecordInput) => Promise<void>;
  onBioState: (state: BiologicalState) => void;
  onNotify: (message: string) => void;
}

const spring = { type: 'spring' as const, stiffness: 320, damping: 26, mass: 0.8 };

export default function ColdChain({ role, onSave, onBioState, onNotify }: ColdChainProps) {
  const [profileId, setProfileId] = useState('leafy-greens');
  const [temperatureC, setTemperatureC] = useState(4);
  const [temperatureUnit, setTemperatureUnit] = useState<'C' | 'F'>('C');
  const [humidity, setHumidity] = useState(92);
  const [hoursLeftOut, setHoursLeftOut] = useState(0.5);
  const [packaging, setPackaging] = useState<PackagingMethod>('produce-drawer');
  const [saved, setSaved] = useState(false);
  const profile = SHELF_LIFE_PROFILES.find((item) => item.id === profileId) ?? SHELF_LIFE_PROFILES[0];
  const estimate = useMemo(() => calculateShelfLife({ profile, temperatureC, humidity, hoursLeftOut, packaging }), [profile, temperatureC, humidity, hoursLeftOut, packaging]);
  useEffect(() => {
    onBioState(estimate.freshnessBand === 'FRESH' ? 'fresh' : estimate.freshnessBand === 'PAST MODEL WINDOW' ? 'hazard' : 'warning');
  }, [estimate.freshnessBand, onBioState]);
  const isCritical = estimate.freshnessBand === 'PAST MODEL WINDOW' || estimate.freshnessBand === 'TIME SENSITIVE';
  const displayTemperature = temperatureUnit === 'C' ? `${temperatureC.toFixed(1)}°C` : `${(temperatureC * 9 / 5 + 32).toFixed(1)}°F`;
  const tempPercentage = Math.max(0, Math.min(100, ((temperatureC + 2) / 32) * 100));

  const setTemperature = (value: number) => setTemperatureC(Math.max(-2, Math.min(30, value)));
  const saveEstimate = async () => {
    await onSave({
      name: profile.name,
      category: profile.category,
      state: estimate.freshnessBand,
      expiresAt: Date.now() + estimate.remainingHours * 60 * 60 * 1000,
      savedEstimate: profile.savedEstimate,
      source: 'Cold-Chain Predictor',
      note: `Q₁₀ ${estimate.q10Multiplier.toFixed(2)}× · ${displayTemperature} · ${Math.round(humidity)}% RH · ${formatHours(hoursLeftOut)} out`,
    });
    setSaved(true);
  };

  return (
    <div className="module-view cold-chain-view">
      <div className="module-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" /> FIELD INSTRUMENT 03 <span className="eyebrow-line" /> THERMODYNAMIC KINETICS</div>
          <h1>Cold-chain <em>predictor</em></h1>
          <p>Translate temperature history into a relative freshness window and keep a useful pantry countdown.</p>
        </div>
        <div className="heading-actions"><span className="sensor-pill is-active"><span className="status-dot" />Q₁₀ MODEL READY</span></div>
      </div>

      <div className="coldchain-hero-grid">
        <section className="glass-card coldchain-controls">
          <div className="card-heading-row"><div><div className="section-kicker">01 / STORAGE PROFILE</div><h2>Set the conditions</h2></div><span className="mini-label">LIVE SIMULATOR</span></div>
          <div className="control-row produce-select-row">
            <label htmlFor="shelf-profile">Food group</label>
            <div className="select-with-icon"><select id="shelf-profile" value={profileId} onChange={(event) => { setProfileId(event.target.value); setSaved(false); }}>{SHELF_LIFE_PROFILES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown size={15} /></div>
          </div>
          <div className="temperature-input-block">
            <div className="control-label-line"><label htmlFor="temperature-slider"><Thermometer size={15} /> Storage temperature</label><div className="unit-toggle"><button className={temperatureUnit === 'C' ? 'active' : ''} onClick={() => setTemperatureUnit('C')}>°C</button><button className={temperatureUnit === 'F' ? 'active' : ''} onClick={() => setTemperatureUnit('F')}>°F</button></div></div>
            <div className="temp-value-line"><strong>{displayTemperature}</strong><span className={temperatureC <= 4 ? 'temp-good' : temperatureC <= 8 ? 'temp-watch' : 'temp-bad'}>{temperatureC <= 4 ? 'COLD HOLD' : temperatureC <= 8 ? 'WARMING' : 'TEMPERATURE RISK'}</span></div>
            <div className="temperature-track-wrap"><div className="temperature-track"><span style={{ width: `${tempPercentage}%` }} /><i style={{ left: `${tempPercentage}%` }} /></div><div className="range-ends"><span>−2°C</span><span>30°C</span></div></div>
            <input id="temperature-slider" className="invisible-range" type="range" min="-2" max="30" step="0.5" value={temperatureC} onChange={(event) => setTemperature(Number(event.target.value))} aria-label="Storage temperature" />
            <div className="quick-temperature"><button onClick={() => setTemperature(4)}>FRIDGE · 4°</button><button onClick={() => setTemperature(22)}>ROOM · 22°</button><button onClick={() => setTemperature(30)}>CAR · 30°</button></div>
          </div>
          <div className="dual-slider-row">
            <div className="compact-slider"><div className="control-label-line"><label htmlFor="humidity-slider">Humidity</label><strong>{Math.round(humidity)}% RH</strong></div><input id="humidity-slider" type="range" min="35" max="100" value={humidity} onChange={(event) => setHumidity(Number(event.target.value))} /><div className="range-ends"><span>DRY</span><span>HUMID</span></div></div>
            <div className="compact-slider"><div className="control-label-line"><label htmlFor="left-out-slider">Time left out</label><strong>{hoursLeftOut.toFixed(1)}h</strong></div><input id="left-out-slider" type="range" min="0" max="12" step="0.5" value={hoursLeftOut} onChange={(event) => setHoursLeftOut(Number(event.target.value))} /><div className="range-ends"><span>0H</span><span>12H</span></div></div>
          </div>
          <div className="packaging-block"><div className="control-label-line"><label>Packaging method</label><span className="mini-label">AFFECTS TRANSFER</span></div><div className="packaging-grid">{PACKAGING_OPTIONS.map((option) => <button type="button" key={option.id} className={`packaging-option ${packaging === option.id ? 'selected' : ''}`} onClick={() => { setPackaging(option.id); setSaved(false); }}><span className="packaging-radio" /><strong>{option.label}</strong><small>{option.note}</small></button>)}</div></div>
        </section>

        <motion.aside className={`glass-card shelf-result-card ${isCritical ? 'critical' : ''}`} layoutId="cold-chain-result" transition={spring}>
          <div className="card-topline"><div className="section-kicker"><Clock3 size={14} /> ESTIMATED SAFE WINDOW</div><span className={`state-badge tone-${isCritical ? 'warm' : 'good'}`}><span className="badge-dot" />{estimate.freshnessBand}</span></div>
          <div className="shelf-countdown"><strong>{formatHours(estimate.remainingHours)}</strong><span>remaining model window</span></div>
          <div className="shelf-progress"><span style={{ width: `${estimate.remainingPercent}%` }} /></div>
          <div className="shelf-progress-caption"><span>USED / AT RISK</span><strong>{100 - estimate.remainingPercent}%</strong></div>
          <div className="q10-display"><div className="q10-icon"><TrendingUp size={19} /></div><div><span>MICROBIAL RATE ACCELERATION</span><strong>Q₁₀ × {estimate.q10Multiplier.toFixed(2)}</strong></div><span className="q10-reference">vs 4°C base</span></div>
          <div className="exposure-rows"><div><span>Time left out (effective)</span><strong>{estimate.effectiveExposureHours.toFixed(1)}h</strong></div><div><span>Humidity correction</span><strong>×{estimate.humidityFactor.toFixed(2)}</strong></div><div><span>Packaging factor</span><strong>×{estimate.packagingFactor.toFixed(2)}</strong></div></div>
          {estimate.ethyleneWarning && <div className="ethylene-warning"><AlertTriangle size={16} /><span><strong>Ethylene conflict</strong>{estimate.ethyleneWarning}</span></div>}
          {estimate.freshnessBand === 'PAST MODEL WINDOW' && <div className="ethylene-warning hazard"><TriangleAlert size={16} /><span><strong>Model window exceeded</strong>Discard decisions should follow local food-safety guidance. Do not taste-test food to judge safety.</span></div>}
          <button className="button button-primary save-scan-button" onClick={() => void saveEstimate()}>{saved ? <Check size={16} /> : <Archive size={16} />}{saved ? 'Countdown added to pantry' : 'Add countdown to pantry'}</button>
          <p className="model-caveat">Screening estimate only—not a pathogen test. Use official food-safety time and temperature limits, especially for meat and prepared food.</p>
        </motion.aside>
      </div>

      <section className="glass-card profile-insight-card">
        <div className="profile-icon"><Snowflake size={21} /></div>
        <div className="profile-copy"><div className="section-kicker">PROFILE NOTE · {profile.category.toUpperCase()}</div><h2>{profile.name} storage context</h2><p>{profile.note}</p></div>
        <div className="profile-stat"><span>BASE WINDOW</span><strong>{formatHours(profile.baseHours)}</strong><small>reference at 4°C</small></div>
        <div className="profile-stat"><span>IDEAL HUMIDITY</span><strong>{profile.idealHumidity}%</strong><small>profile target</small></div>
      </section>

      {role === 'admin' ? <section className="glass-card haccp-card">
        <div className="haccp-icon"><ShieldCheck size={18} /></div><div className="haccp-copy"><div className="section-kicker">DIRECTOR TOOL · HACCP CHECK</div><strong>Commercial fridge compliance snapshot</strong><span>Current reading {displayTemperature} · {temperatureC <= 5 ? 'within the 5°C cold-hold target' : 'above the 5°C cold-hold target'}. Log an independent calibrated thermometer for a verified audit.</span></div><div className={`haccp-status ${temperatureC <= 5 ? 'pass' : 'fail'}`}>{temperatureC <= 5 ? 'WITHIN TARGET' : 'REVIEW REQUIRED'}</div>
      </section> : <button className="glass-card locked-director-card" onClick={() => onNotify('HACCP commercial audit is in the Cold-Chain & Lab Director privilege tier.')}><span className="locked-icon"><Timer size={18} /></span><span><strong>HACCP compliance audit</strong><small>Director tier · open Privileges to switch role</small></span><span className="lock-label">LOCKED</span></button>}

      <div className="bottom-note"><Thermometer size={15} /><span>Model uses Q₁₀ = 2.2 and profile-based shelf-life anchors. Real product life depends on initial quality, packaging integrity and handling.</span><span className="note-suffix">Q₁₀ model · heuristic</span></div>
    </div>
  );
}
