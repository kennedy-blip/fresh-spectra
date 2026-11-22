import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Activity, AlertTriangle, BatteryCharging, Check, ChevronRight, CloudDownload, HardDrive, LockKeyhole, Mic, Palette, ShieldCheck, Smartphone, Sparkles, X, Zap } from 'lucide-react';
import type { RoleId, SensorStatus, ThemeId } from '../types';
import { ROLE_OPTIONS } from '../roles';

interface PermissionDrawerProps {
  open: boolean;
  onClose: () => void;
  role: RoleId;
  onRoleChange: (role: RoleId) => void;
  theme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
  micStatus: SensorStatus;
  cameraStatus: SensorStatus;
  hapticsStatus: SensorStatus;
  storageStatus: SensorStatus;
  onEnableMic: () => Promise<void>;
  onEnableCamera: () => Promise<void>;
  onTestHaptics: () => Promise<void>;
  onPersistStorage: () => Promise<void>;
}

const sensorLabel = (status: SensorStatus) => status === 'active' ? 'ACTIVE' : status === 'simulator' ? 'SIMULATOR ACTIVE' : 'RESTRICTED';

function SensorRow({ icon: Icon, title, description, status, action, actionLabel }: { icon: typeof Mic; title: string; description: string; status: SensorStatus; action: () => void; actionLabel: string }) {
  return (
    <div className="permission-row">
      <span className={`permission-icon ${status === 'active' ? 'active' : ''}`}><Icon size={17} /></span>
      <div className="permission-copy"><strong>{title}</strong><span>{description}</span><div className={`permission-state ${status}`}><i />{sensorLabel(status)}</div></div>
      <button className="button button-ghost button-small permission-action" onClick={action}>{actionLabel}</button>
    </div>
  );
}

export function PermissionDrawer(props: PermissionDrawerProps) {
  const { open, onClose, role, onRoleChange, theme, onThemeChange, micStatus, cameraStatus, hapticsStatus, storageStatus, onEnableMic, onEnableCamera, onTestHaptics, onPersistStorage } = props;
  return (
    <AnimatePresence>
      {open && <>
        <motion.button className="overlay-scrim" aria-label="Close privileges drawer" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
        <motion.aside className="permission-drawer" initial={{ x: '105%' }} animate={{ x: 0 }} exit={{ x: '105%' }} transition={{ type: 'spring', stiffness: 320, damping: 30, mass: 0.8 }} role="dialog" aria-modal="true" aria-label="Privileges and sensor permissions">
          <div className="drawer-header"><div><div className="eyebrow"><span className="eyebrow-dot" /> SYSTEM CONTROL</div><h2>Privileges & sensors</h2><p>Choose your workspace and hardware access.</p></div><button className="icon-button close-button" onClick={onClose} aria-label="Close drawer"><X size={18} /></button></div>
          <div className="drawer-scroll">
            <section className="drawer-section"><div className="drawer-section-title"><ShieldCheck size={15} /><span>ROLE ACCESS</span><span className="drawer-hint">LOCAL SESSION</span></div>
              <div className="role-options">{ROLE_OPTIONS.map((option, index) => <button type="button" key={option.id} className={`role-option ${role === option.id ? 'selected' : ''}`} onClick={() => onRoleChange(option.id)}><span className={`role-index role-index-${index}`}>0{index + 1}</span><span className="role-option-copy"><strong>{option.name}</strong><small>{option.description}</small></span>{role === option.id ? <span className="role-selected"><Check size={13} /> ACTIVE</span> : <ChevronRight size={15} />}</button>)}</div>
            </section>
            <section className="drawer-section"><div className="drawer-section-title"><Activity size={15} /><span>HARDWARE PERMISSION MATRIX</span><span className="drawer-hint">BROWSER / APK</span></div>
              <div className="permission-list">
                <SensorRow icon={Mic} title="Acoustic impulse microphone" description="Mono input · echo / noise filters disabled" status={micStatus} action={() => void onEnableMic()} actionLabel={micStatus === 'active' ? 'Check' : 'Enable'} />
                <SensorRow icon={Palette} title="Colorimetric optical camera" description="Center patch · sRGB to CIE Lab" status={cameraStatus} action={() => void onEnableCamera()} actionLabel={cameraStatus === 'active' ? 'Check' : 'Enable'} />
                <SensorRow icon={Zap} title="Tactile haptic engine" description="Native haptic or browser vibration fallback" status={hapticsStatus} action={() => void onTestHaptics()} actionLabel="Test" />
                <SensorRow icon={HardDrive} title="Persistent local pantry vault" description="IndexedDB · offline-first scan records" status={storageStatus} action={() => void onPersistStorage()} actionLabel="Request" />
              </div>
            </section>
            <section className="drawer-section"><div className="drawer-section-title"><Palette size={15} /><span>VISUAL ENVIRONMENT</span><span className="drawer-hint">LIVE THEME</span></div><div className="drawer-theme-list">
              {([
                ['obsidian', 'Botanical Obsidian', '#61d797'],
                ['daylight', 'Culinary Daylight Frost', '#c9ad82'],
                ['thermal', 'Bio-Thermal Spectral', '#e55acc'],
                ['eco', 'Eco-Glass / Low GPU', '#96c8b0'],
              ] as Array<[ThemeId, string, string]>).map(([id, label, swatch]) => <button type="button" key={id} className={`drawer-theme ${theme === id ? 'selected' : ''}`} onClick={() => onThemeChange(id)}><i style={{ background: swatch }} /><span>{label}</span>{theme === id && <Check size={14} />}</button>)}
            </div></section>
            <section className="drawer-footnote"><BatteryCharging size={17} /><p><strong>Privacy by default.</strong> Sensor data is processed in the browser. Nothing is uploaded unless a cloud endpoint is explicitly configured.</p></section>
          </div>
          <div className="drawer-footer"><span><span className="status-dot" />DEVICE HEALTH CHECK</span><strong>LOCAL SYSTEM READY</strong></div>
        </motion.aside>
      </>}
    </AnimatePresence>
  );
}

interface ApkModalProps {
  open: boolean;
  onClose: () => void;
}

export function ApkModal({ open, onClose }: ApkModalProps) {
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(false);
  const [checksum, setChecksum] = useState('Generated by the Android CI build');
  const [error, setError] = useState(false);
  const apkPath = '/releases/freshspectra-release.apk';
  const apkUrl = typeof window === 'undefined' ? apkPath : `${window.location.origin}${apkPath}`;
  const qrValue = available ? apkUrl : (typeof window === 'undefined' ? '/' : window.location.origin);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setChecking(true);
    setError(false);
    fetch(apkPath, { method: 'HEAD', cache: 'no-store', signal: controller.signal })
      .then((response) => {
        const contentType = response.headers.get('content-type') ?? '';
        const isPackage = response.ok && (contentType.includes('application/vnd.android.package-archive') || contentType.includes('application/octet-stream'));
        setAvailable(isPackage);
        if (!isPackage) return null;
        return fetch('/releases/freshspectra-release.sha256', { cache: 'no-store', signal: controller.signal });
      })
      .then(async (response) => {
        if (response?.ok) {
          const text = await response.text();
          const value = text.trim().split(/\s+/)[0];
          if (value) setChecksum(value);
        }
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setError(true);
        setAvailable(false);
      })
      .finally(() => setChecking(false));
    return () => controller.abort();
  }, [open]);

  return (
    <AnimatePresence>
      {open && <>
        <motion.button className="modal-scrim" aria-label="Close Android download center" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
        <motion.div className="apk-modal-stage" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="apk-modal glass-card" role="dialog" aria-modal="true" aria-labelledby="apk-modal-title" initial={{ opacity: 0, scale: 0.92, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 12 }} transition={{ type: 'spring', stiffness: 320, damping: 26, mass: 0.8 }}>
          <button className="icon-button close-button modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
          <div className="apk-modal-heading"><span className="apk-icon"><Smartphone size={21} /></span><div><div className="eyebrow"><span className="eyebrow-dot" /> ANDROID DISTRIBUTION</div><h2 id="apk-modal-title">Take the lab <em>offline.</em></h2><p>Fresh-Spectra is made for aisle-side decisions and kitchen-counter testing.</p></div></div>
          <div className="apk-modal-content">
            <div className="apk-download-panel">
              <div className="apk-release-row"><div><span>ANDROID PACKAGE</span><strong>v1.0.0 · ARM64</strong></div><span className={`release-status ${available ? 'ready' : 'pending'}`}><i />{checking ? 'CHECKING' : available ? 'READY' : 'CI BUILD'}</span></div>
              <div className="apk-feature-pills"><span><Check size={12} />Offline-ready shell</span><span><Check size={12} />Camera + microphone</span><span><Check size={12} />Local pantry vault</span></div>
              {available ? <a className="button button-primary apk-download-button" href={apkPath} download="FreshSpectra-FoodLab-v1.0.0.apk"><CloudDownload size={17} /> Download Android .APK</a> : <div className="apk-unavailable"><AlertTriangle size={17} /><span><strong>{error ? 'Package check failed' : 'Installable package not in this deployment'}</strong><small>{error ? 'Check your connection and retry.' : 'The workflow builds a signed debug APK as a CI artifact; it must be published into this deployment before direct download is enabled.'}</small></span></div>}
              <div className="checksum-line"><LockKeyhole size={14} /><span>SHA-256</span><code>{available ? checksum : 'available with CI release artifact'}</code></div>
              {!available && <a className="workflow-link" href="https://github.com/kennedy-blip/fresh-spectra/actions/workflows/build-and-bundle-apk.yml" target="_blank" rel="noreferrer">Open Android build workflow <ChevronRight size={14} /></a>}
            </div>
            <div className="apk-qr-panel"><div className="qr-frame"><QRCodeSVG value={qrValue} size={140} level="M" includeMargin={false} bgColor="#f7f6ee" fgColor="#10251c" /></div><span className="qr-label">{available ? 'SCAN TO DOWNLOAD APK' : 'SCAN TO OPEN FRESH-SPECTRA'}</span><small>{available ? 'Open the release link on your Android device.' : 'Installable web app is available now; APK is generated by CI.'}</small></div>
          </div>
          <div className="apk-install-guide"><div className="section-kicker">THREE STEPS TO SIDELOAD</div><div className="install-steps"><div><span>01</span><strong>Download</strong><small>Save the APK file to your device.</small></div><div><span>02</span><strong>Allow install</strong><small>Approve installs from this browser when asked.</small></div><div><span>03</span><strong>Open Fresh-Spectra</strong><small>Launch and allow camera or mic only when needed.</small></div></div></div>
          <div className="apk-modal-note"><Sparkles size={14} /><span>Until a CI APK is published, Android users can open this URL in Chrome and choose <strong>⋮ → Install app</strong> for an offline-capable home-screen experience.</span></div>
        </motion.div>
        </motion.div>
      </>}
    </AnimatePresence>
  );
}
