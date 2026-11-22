import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowDownRight, Check, Download, FlaskConical, Info, Search, ShieldAlert, Sparkles } from 'lucide-react';
import type { BiologicalState, PantryRecordInput, RoleId } from '../types';
import { ADDITIVE_DATABASE, classifyNova, GROCERY_PRESETS, type AdditiveEntry } from '../services/additiveDatabase';
import { downloadTextFile } from '../services/db';

interface AdditiveAuditorProps {
  role: RoleId;
  onSave: (record: PantryRecordInput) => Promise<void>;
  onBioState: (state: BiologicalState) => void;
  onNotify: (message: string) => void;
}

const spring = { type: 'spring' as const, stiffness: 320, damping: 26, mass: 0.8 };

function RiskChip({ risk }: { risk: AdditiveEntry['risk'] }) {
  const text = risk === 'elevated' ? 'ELEVATED REVIEW' : risk === 'watch' ? 'WATCH' : 'CONTEXT';
  return <span className={`risk-chip risk-${risk}`}>{text}</span>;
}

export default function AdditiveAuditor({ role, onSave, onBioState, onNotify }: AdditiveAuditorProps) {
  const [ingredients, setIngredients] = useState(GROCERY_PRESETS[0].ingredients);
  const [search, setSearch] = useState('');
  const [saved, setSaved] = useState(false);
  const audit = useMemo(() => classifyNova(ingredients), [ingredients]);
  useEffect(() => {
    onBioState(audit.novaGroup === 4 ? 'hazard' : audit.novaGroup === 3 ? 'warning' : 'fresh');
  }, [audit.novaGroup, onBioState]);
  const databaseQuery = search.trim().toLowerCase();
  const databaseItems = useMemo(() => ADDITIVE_DATABASE.filter((entry) => {
    if (!databaseQuery) return true;
    return [entry.name, entry.category, entry.flag, entry.eNumber ?? '', ...entry.aliases].some((field) => field.toLowerCase().includes(databaseQuery));
  }).slice(0, 10), [databaseQuery]);
  const elevatedCount = audit.matches.filter((item) => item.risk === 'elevated').length;
  const watchCount = audit.matches.filter((item) => item.risk === 'watch').length;

  const usePreset = (id: string) => {
    const preset = GROCERY_PRESETS.find((item) => item.id === id);
    if (!preset) return;
    setIngredients(preset.ingredients);
    setSaved(false);
    onNotify(`${preset.name} label loaded into the offline auditor.`);
  };

  const saveAudit = async () => {
    await onSave({
      name: `Ingredient audit · NOVA ${audit.novaGroup}`,
      category: 'Ingredient report',
      state: audit.novaGroup === 4 ? 'Ultra-processed cues' : `NOVA Group ${audit.novaGroup}`,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      savedEstimate: 0.75,
      source: 'Additive & NOVA Auditor',
      note: `${audit.matches.length} database matches · ${audit.ingredientCount} listed ingredients · ${ingredients.slice(0, 220)}`,
    });
    setSaved(true);
  };

  const exportReport = () => {
    downloadTextFile('fresh-spectra-ingredient-audit.json', JSON.stringify({
      auditedAt: new Date().toISOString(),
      ingredientLabel: ingredients,
      ...audit,
      disclaimer: 'Rule-based label screening only. Not a toxicology assessment or medical advice; additive permissions vary by market.',
    }, null, 2), 'application/json');
  };

  return (
    <div className="module-view additives-view">
      <div className="module-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" /> FIELD INSTRUMENT 04 <span className="eyebrow-line" /> OFFLINE LABEL FORENSICS</div>
          <h1>Additive <em>auditor</em></h1>
          <p>Read the ingredient panel with context. Match common additives locally and surface NOVA-style formulation cues.</p>
        </div>
        <div className="heading-actions"><span className="sensor-pill is-active"><span className="status-dot" />{ADDITIVE_DATABASE.length}+ LOCAL TERMS</span></div>
      </div>

      <div className="grocery-presets-row">
        <div className="preset-heading"><div className="section-kicker">INSTANT GROCERY PRESETS</div><span>Tap to test</span></div>
        <div className="grocery-presets">{GROCERY_PRESETS.map((preset, index) => (
          <motion.button type="button" key={preset.id} className={`grocery-preset ${ingredients === preset.ingredients ? 'selected' : ''}`} onClick={() => usePreset(preset.id)} whileHover={{ scale: 1.015, y: -2 }} whileTap={{ scale: 0.96 }} transition={spring}>
            <span className={`preset-glyph glyph-${index}`}><FlaskConical size={17} /></span><span><strong>{preset.name}</strong><small>{preset.tagline}</small></span>{ingredients === preset.ingredients && <Check size={15} />}
          </motion.button>
        ))}</div>
      </div>

      <div className="additive-main-grid">
        <section className="glass-card label-entry-card">
          <div className="card-heading-row"><div><div className="section-kicker">01 / INGREDIENT PANEL</div><h2>Paste the label</h2></div>{role === 'admin' && <button className="button button-ghost button-small" onClick={exportReport}><Download size={14} /> Export JSON</button>}</div>
          <label className="visually-hidden" htmlFor="ingredient-label">Ingredients label</label>
          <textarea id="ingredient-label" value={ingredients} onChange={(event) => { setIngredients(event.target.value); setSaved(false); }} placeholder="Paste ingredients separated by commas…" />
          <div className="textarea-footer"><span><Info size={13} /> Parsing runs locally in your browser.</span><span>{ingredients.trim() ? ingredients.split(/[;,\n]/).filter(Boolean).length : 0} terms in label</span></div>
          <div className="label-actions"><button className="button button-primary" onClick={() => onNotify('Offline label parsed. Ingredient names are matched against the on-device reference list.')}><Search size={16} /> Audit ingredients</button><button className="button button-outline" onClick={() => { setIngredients(''); setSaved(false); }}>Clear label</button>{saved && <span className="saved-label"><Check size={14} /> Saved locally</span>}</div>
        </section>

        <motion.section className={`glass-card nova-result-card nova-${audit.novaGroup}`} layoutId="nova-audit-result" transition={spring}>
          <div className="card-topline"><div className="section-kicker"><ShieldAlert size={14} /> FORMULATION SNAPSHOT</div><span className="offline-chip"><span className="status-dot" />OFFLINE</span></div>
          <div className="nova-score-layout">
            <div className="nova-medallion"><div className="nova-inner"><span>NOVA</span><strong>{audit.novaGroup}</strong></div></div>
            <div className="nova-score-copy"><span>PROCESSING CLASSIFICATION</span><h2>{audit.novaLabel}</h2><div className="nova-match-count"><strong>{audit.matches.length}</strong><span>database matches</span><i />{audit.ingredientCount} listed terms</div></div>
          </div>
          <div className="risk-counts"><div><span className="risk-count-icon elevated"><AlertTriangle size={14} /></span><span>Elevated review</span><strong>{elevatedCount}</strong></div><div><span className="risk-count-icon watch"><AlertTriangle size={14} /></span><span>Contextual watch</span><strong>{watchCount}</strong></div><div><span className="risk-count-icon neutral"><Sparkles size={14} /></span><span>Processing cues</span><strong>{audit.score}</strong></div></div>
          {audit.riskFlags.length > 0 && <div className="risk-flag-row"><div className="section-kicker">SIGNALS FOUND</div><div className="risk-flag-list">{audit.riskFlags.map((flag) => <span key={flag}>{flag}</span>)}</div></div>}
          <div className="swap-panel"><div className="swap-icon"><ArrowDownRight size={16} /></div><div><span>CLEANER SWAP IDEA</span><strong>{audit.cleanSwap}</strong></div></div>
          <button className="button button-primary save-scan-button" onClick={() => void saveAudit()}>{saved ? <Check size={16} /> : <FlaskConical size={16} />}{saved ? 'Audit saved to Pantry Vault' : 'Save audit locally'}</button>
        </motion.section>
      </div>

      <section className="glass-card additive-library-card">
        <div className="card-heading-row"><div><div className="section-kicker">02 / LOCAL TOXICOLOGY INDEX</div><h2>Ingredient reference</h2></div><div className="database-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, E-number, use…" aria-label="Search additive database" /><span>{databaseItems.length}/{ADDITIVE_DATABASE.length}</span></div></div>
        {audit.matches.length > 0 && <div className="matched-strip"><span className="matched-strip-label">IN THIS LABEL</span>{audit.matches.slice(0, 8).map((entry) => <button key={entry.id} onClick={() => { setSearch(entry.name); document.getElementById('additive-library')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}>{entry.name}<span>{entry.eNumber ?? 'label'}</span></button>)}</div>}
        <div id="additive-library" className="additive-list">
          {databaseItems.map((entry) => {
            const isMatched = audit.matches.some((item) => item.id === entry.id);
            return <div className={`additive-row ${isMatched ? 'is-matched' : ''}`} key={entry.id}>
              <div className="additive-mark"><span>{isMatched ? <Check size={14} /> : <FlaskConical size={14} />}</span></div>
              <div className="additive-name"><strong>{entry.name}</strong><span>{entry.category}{entry.eNumber ? ` · ${entry.eNumber}` : ''}</span></div>
              <div className="additive-flag"><strong>{entry.flag}</strong><small>{entry.note}</small></div>
              <RiskChip risk={entry.risk} />
            </div>;
          })}
          {databaseItems.length === 0 && <div className="empty-search">No local terms found for “{search}”. Try a product name, additive family or E-number.</div>}
        </div>
      </section>

      <div className="forensics-caveat"><Info size={15} /><span>Rule-based reference, not a toxicology verdict. The NOVA guide classifies processing patterns, not individual ingredients. Risk and approval can differ by dose, person and country.</span><button className="text-button" onClick={() => onNotify('Use official local labeling and regulatory sources for decisions. This tool is an offline screening aid.')}>Method note <span>↗</span></button></div>
    </div>
  );
}
