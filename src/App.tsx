import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Archive,
  AudioLines,
  ArrowUpRight,
  ChevronDown,
  CloudDownload,
  Database,
  FlaskConical,
  Leaf,
  Monitor,
  Palette,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Sprout,
  Thermometer,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Motion } from '@capacitor/motion';
import { StatusBar, Style } from '@capacitor/status-bar';
import type { BiologicalState, ModuleId, PantryRecord, PantryRecordInput, RoleId, SensorStatus, ThemeId } from './types';
import { ROLE_OPTIONS } from './roles';
import { addPantryRecord, getStorageUsage, listPantryRecords, removePantryRecord } from './services/db';
const AcousticLab = lazy(() => import('./components/AcousticLab'));
const OpticalLab = lazy(() => import('./components/OpticalLab'));
const ColdChain = lazy(() => import('./components/ColdChain'));
const AdditiveAuditor = lazy(() => import('./components/AdditiveAuditor'));
const PantryVault = lazy(() => import('./components/PantryVault'));
const PermissionDrawer = lazy(() => import('./components/Modals').then((module) => ({ default: module.PermissionDrawer })));
const ApkModal = lazy(() => import('./components/Modals').then((module) => ({ default: module.ApkModal })));

interface NavItem {
  id: ModuleId;
  label: string;
  sublabel: string;
  icon: LucideIcon;
  index: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'acoustic', label: 'Acoustic Thump Lab', sublabel: 'Ripeness & firmness', icon: AudioLines, index: '01' },
  { id: 'optical', label: 'Optical Colorimeter', sublabel: 'CIE Lab & oxidation', icon: ScanLine, index: '02' },
  { id: 'cold-chain', label: 'Cold-chain Predictor', sublabel: 'Q₁₀ shelf life', icon: Thermometer, index: '03' },
  { id: 'additives', label: 'Additive Auditor', sublabel: 'NOVA & ingredients', icon: FlaskConical, index: '04' },
  { id: 'pantry', label: 'Pantry Vault', sublabel: 'Local inventory', icon: Archive, index: '05' },
];

const THEME_OPTIONS: Array<{ id: ThemeId; name: string; description: string; swatch: string }> = [
  { id: 'obsidian', name: 'Botanical Obsidian', description: 'Forest glass · balanced GPU', swatch: '#46c98e' },
  { id: 'daylight', name: 'Culinary Daylight Frost', description: 'High-key kitchen glass', swatch: '#caa875' },
  { id: 'thermal', name: 'Bio-Thermal Spectral', description: 'Oxidation contrast mode', swatch: '#e35bba' },
  { id: 'eco', name: 'Eco-Glass / Low GPU', description: 'Matte acrylic · battery saver', swatch: '#81bc9f' },
];

const getStored = <T extends string>(key: string, fallback: T, values: readonly T[]): T => {
  try {
    const value = localStorage.getItem(key);
    return values.includes(value as T) ? value as T : fallback;
  } catch {
    return fallback;
  }
};

const formatMoney = (value: number) => `$${value.toFixed(2)}`;
const storageStatusInitial: SensorStatus = 'simulator';

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>('acoustic');
  const [theme, setTheme] = useState<ThemeId>(() => getStored('fresh-spectra-theme', 'obsidian', ['obsidian', 'daylight', 'thermal', 'eco']));
  const [role, setRole] = useState<RoleId>(() => getStored('fresh-spectra-role', 'home', ['home', 'pro', 'admin']));
  const [bioState, setBioState] = useState<BiologicalState>('fresh');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>(() => (typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches) || Capacitor.isNativePlatform() ? 'mobile' : 'desktop');
  const [isMobileViewport, setIsMobileViewport] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches);
  const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [apkOpen, setApkOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [revision, setRevision] = useState(0);
  const [vaultRecords, setVaultRecords] = useState<PantryRecord[]>([]);
  const [micStatus, setMicStatus] = useState<SensorStatus>('simulator');
  const [cameraStatus, setCameraStatus] = useState<SensorStatus>('simulator');
  const [hapticsStatus, setHapticsStatus] = useState<SensorStatus>('simulator');
  const [storageStatus, setStorageStatus] = useState<SensorStatus>(storageStatusInitial);
  const toastTimer = useRef<number | null>(null);
  const isNative = Capacitor.isNativePlatform();

  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 3200);
  }, []);

  const activeNavItem = NAV_ITEMS.find((item) => item.id === activeModule) ?? NAV_ITEMS[0];
  const currentRole = ROLE_OPTIONS.find((item) => item.id === role) ?? ROLE_OPTIONS[0];
  const totalSaved = useMemo(() => vaultRecords.reduce((sum, record) => sum + record.savedEstimate, 0), [vaultRecords]);
  const nextExpiry = useMemo(() => vaultRecords.filter((record) => record.expiresAt > Date.now()).sort((a, b) => a.expiresAt - b.expiresAt)[0], [vaultRecords]);
  const phonePreview = previewMode === 'mobile' && !isMobileViewport && !isNative;
  const depthPushed = drawerOpen || apkOpen;

  const refreshVault = useCallback(async () => {
    try {
      setVaultRecords(await listPantryRecords());
    } catch (error) {
      console.warn('Local pantry could not be loaded:', error);
    }
  }, []);

  useEffect(() => {
    void refreshVault();
  }, [refreshVault, revision]);

  useEffect(() => {
    try {
      localStorage.setItem('fresh-spectra-theme', theme);
      localStorage.setItem('fresh-spectra-role', role);
    } catch {
      // Private-browsing storage can be unavailable; the current session still works.
    }
    document.documentElement.dataset.theme = theme;
  }, [theme, role]);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 760px)');
    const onChange = (event: MediaQueryListEvent) => {
      setIsMobileViewport(event.matches);
      if (event.matches) setPreviewMode('mobile');
    };
    setIsMobileViewport(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const onPointerMove = (event: PointerEvent) => {
      root.style.setProperty('--pointer-x', `${(event.clientX / window.innerWidth) * 100}%`);
      root.style.setProperty('--pointer-y', `${(event.clientY / window.innerHeight) * 100}%`);
    };
    const onOrientation = (event: DeviceOrientationEvent) => {
      if (event.gamma === null || event.beta === null) return;
      root.style.setProperty('--tilt-x', `${Math.max(-18, Math.min(18, event.gamma))}deg`);
      root.style.setProperty('--tilt-y', `${Math.max(-18, Math.min(18, event.beta))}deg`);
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('deviceorientation', onOrientation, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('deviceorientation', onOrientation);
    };
  }, []);

  useEffect(() => {
    if (!isNative) return;
    void StatusBar.setOverlaysWebView({ overlay: true }).catch(() => undefined);
    void StatusBar.setStyle({ style: theme === 'daylight' ? Style.Light : Style.Dark }).catch(() => undefined);
  }, [isNative, theme]);

  useEffect(() => {
    if (!isNative) return;
    let cancelled = false;
    let subscription: { remove: () => Promise<void> } | null = null;
    void Motion.addListener('orientation', (event) => {
      document.documentElement.style.setProperty('--tilt-x', `${Math.max(-18, Math.min(18, event.gamma * 0.35))}deg`);
      document.documentElement.style.setProperty('--tilt-y', `${Math.max(-18, Math.min(18, event.beta * 0.35))}deg`);
    }).then((handle) => {
      if (cancelled) void handle.remove();
      else subscription = handle;
    }).catch(() => undefined);
    return () => {
      cancelled = true;
      if (subscription) void subscription.remove();
    };
  }, [isNative]);

  useEffect(() => () => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
  }, []);

  const saveRecord = useCallback(async (record: PantryRecordInput) => {
    try {
      await addPantryRecord(record);
      setRevision((value) => value + 1);
      notify(`${record.name} saved to your local pantry.`);
    } catch (error) {
      console.error('Could not save the pantry record:', error);
      notify('Could not save this scan. Check browser site storage and try again.');
    }
  }, [notify]);

  const deleteRecord = useCallback(async (id: number) => {
    try {
      await removePantryRecord(id);
      setRevision((value) => value + 1);
      notify('Pantry record removed from this device.');
    } catch {
      notify('Could not remove the pantry record.');
    }
  }, [notify]);

  const requestMicrophone = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicStatus('restricted');
      notify('Microphone capture needs HTTPS and a supported browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      stream.getTracks().forEach((track) => track.stop());
      setMicStatus('active');
      notify('Microphone permission is available for a live thump capture.');
    } catch {
      setMicStatus('restricted');
      notify('Microphone permission was not granted. Synthetic thumps remain available.');
    }
  }, [notify]);

  const requestCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('restricted');
      notify('Camera capture needs HTTPS and a supported browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      stream.getTracks().forEach((track) => track.stop());
      setCameraStatus('active');
      notify('Camera permission is available for a live optical sample.');
    } catch {
      setCameraStatus('restricted');
      notify('Camera permission was not granted. Optical reference samples remain available.');
    }
  }, [notify]);

  const testHaptics = useCallback(async () => {
    try {
      if (isNative) await Haptics.impact({ style: ImpactStyle.Medium });
      else if ('vibrate' in navigator) navigator.vibrate([18, 25, 18]);
      else throw new Error('No vibration API');
      setHapticsStatus('active');
      notify('Haptic response tested.');
    } catch {
      setHapticsStatus('restricted');
      notify('Haptics are not available on this device; visual feedback remains enabled.');
    }
  }, [isNative, notify]);

  const requestPersistentStorage = useCallback(async () => {
    try {
      const result = await getStorageUsage();
      const persisted = result.persistent ?? (await navigator.storage?.persist?.()) ?? false;
      setStorageStatus(persisted ? 'active' : 'simulator');
      notify(persisted ? 'Persistent storage granted for the local pantry.' : 'Browser storage remains available; the browser may evict it under storage pressure.');
    } catch {
      setStorageStatus('restricted');
      notify('Could not request persistent storage in this browser.');
    }
  }, [notify]);

  const renderModule = () => {
    switch (activeModule) {
      case 'acoustic':
        return <AcousticLab role={role} onSave={saveRecord} onSensorState={setMicStatus} onBioState={setBioState} onNotify={notify} />;
      case 'optical':
        return <OpticalLab role={role} onSave={saveRecord} onSensorState={setCameraStatus} onBioState={setBioState} onNotify={notify} />;
      case 'cold-chain':
        return <ColdChain role={role} onSave={saveRecord} onBioState={setBioState} onNotify={notify} />;
      case 'additives':
        return <AdditiveAuditor role={role} onSave={saveRecord} onBioState={setBioState} onNotify={notify} />;
      case 'pantry':
        return <PantryVault role={role} isOnline={isOnline} refreshToken={revision} onNavigate={setActiveModule} onRemove={deleteRecord} onNotify={notify} />;
    }
  };

  const sidebarNav = (mobile = false) => NAV_ITEMS.map((item) => {
    const Icon = item.icon;
    const active = activeModule === item.id;
    return (
      <button type="button" key={item.id} className={`${mobile ? 'mobile-nav-item' : 'sidebar-nav-item'} ${active ? 'active' : ''}`} onClick={() => setActiveModule(item.id)} aria-current={active ? 'page' : undefined}>
        <span className="nav-icon"><Icon size={mobile ? 18 : 17} strokeWidth={1.8} /></span>
        {!mobile && <span className="nav-labels"><strong>{item.label}</strong><small>{item.sublabel}</small></span>}
        {!mobile && active && <motion.span className="nav-active-marker" layoutId="active-nav-marker" transition={{ type: 'spring', stiffness: 320, damping: 26, mass: 0.8 }} />}
        {mobile && <span>{item.id === 'cold-chain' ? 'Cold' : item.id === 'additives' ? 'Audit' : item.id === 'acoustic' ? 'Thump' : item.id === 'optical' ? 'Optic' : 'Pantry'}</span>}
      </button>
    );
  });

  return (
    <div className={`app-root theme-${theme} bio-${bioState} ${phonePreview ? 'phone-preview-root' : ''} ${isNative ? 'native-app' : ''}`}>
      <svg className="svg-definitions" aria-hidden="true" focusable="false"><filter id="gooey-contrast"><feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" /><feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" result="goo" /><feComposite in="SourceGraphic" in2="goo" operator="atop" /></filter></svg>
      <div className="mesh-underlay"><span /><span /><span /><span /></div>
      <div className="noise-overlay" aria-hidden="true" />

      <motion.div className={`app-frame ${phonePreview ? 'phone-preview' : ''}`} animate={depthPushed ? { scale: 0.94, filter: 'blur(2px)', borderRadius: 28 } : { scale: 1, filter: 'blur(0px)', borderRadius: phonePreview ? 44 : 0 }} transition={{ type: 'spring', stiffness: 320, damping: 26, mass: 0.8 }}>
        <aside className="sidebar">
          <button className="brand-lockup" onClick={() => setActiveModule('acoustic')} aria-label="Fresh-Spectra home">
            <span className="brand-mark"><Sprout size={21} strokeWidth={1.8} /></span>
            <span className="brand-wordmark"><strong>FRESH<span>·</span>SPECTRA</strong><small>FIELD FOOD SCIENCE</small></span>
          </button>
          <div className="workspace-switch"><span className="workspace-signal" /><span>MY FIELD LAB</span><ChevronDown size={14} /></div>
          <div className="sidebar-section-label">SCANNERS <span>05</span></div>
          <nav className="sidebar-nav" aria-label="Food science modules">{sidebarNav()}</nav>
          <div className="sidebar-spacer" />
          <div className="sidebar-vault-card">
            <div className="vault-card-heading"><span><Database size={13} /> YOUR VAULT</span><span className="vault-health"><i /> LOCAL</span></div>
            <strong>{vaultRecords.length.toString().padStart(2, '0')} <small>items saved</small></strong>
            <div className="vault-progress"><span style={{ width: `${Math.min(100, vaultRecords.length * 11)}%` }} /></div>
            <button onClick={() => setActiveModule('pantry')}>Open pantry <ArrowUpRight size={13} /></button>
          </div>
          <button className="sidebar-role-button" onClick={() => setDrawerOpen(true)}><span className="avatar-sigil">{role === 'home' ? 'H' : role === 'pro' ? 'P' : 'D'}</span><span><strong>{currentRole.shortName}</strong><small>{currentRole.badge}</small></span><ChevronDown size={14} /></button>
        </aside>

        <main className="main-column">
          <header className="topbar">
            <div className="breadcrumb"><span>FRESH-SPECTRA <b>/</b></span><strong>{activeNavItem.label.toUpperCase()}</strong><span className="breadcrumb-index">{activeNavItem.index}</span></div>
            <div className="topbar-actions">
              <div className="viewport-switch" aria-label="Choose viewport preview"><button className={previewMode === 'desktop' ? 'active' : ''} onClick={() => setPreviewMode('desktop')}><Monitor size={14} /><span>Desktop Lab</span></button><i /><button className={previewMode === 'mobile' ? 'active' : ''} onClick={() => setPreviewMode('mobile')}><Smartphone size={14} /><span>Mobile APK</span></button></div>
              <label className="theme-select"><Palette size={14} /><select aria-label="Visual theme" value={theme} onChange={(event) => setTheme(event.target.value as ThemeId)}>{THEME_OPTIONS.map((option) => <option value={option.id} key={option.id}>{option.name}</option>)}</select><ChevronDown size={13} /></label>
              <button className="topbar-icon-button permission-trigger" onClick={() => setDrawerOpen(true)} aria-label="Privileges and permissions" title="Privileges & sensors"><ShieldCheck size={17} /><span>Permissions</span><i className="permission-live-dot" /></button>
              <button className="button button-download" onClick={() => setApkOpen(true)}><CloudDownload size={16} /><span>Download Android .APK</span></button>
            </div>
          </header>

          <div className="content-scroll" key={activeModule}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div className="active-module-content" key={activeModule} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
                <Suspense fallback={<div className="module-loading glass-card"><span className="loading-pulse" /><span>Opening the field instrument…</span></div>}>
                  {renderModule()}
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </div>
          <nav className="mobile-dock" aria-label="Mobile module navigation">{sidebarNav(true)}<button type="button" className="mobile-apk-button" onClick={() => setApkOpen(true)} aria-label="Download Android APK"><CloudDownload size={17} /><span>APK</span></button></nav>
        </main>

        <aside className="insight-rail">
          <div className="rail-topline"><div><div className="eyebrow"><span className="eyebrow-dot" /> LIVE OVERVIEW</div><h2>Field pulse</h2></div><button className="rail-menu" onClick={() => setDrawerOpen(true)} aria-label="Open system settings"><Zap size={16} /></button></div>
          <section className="glass-card field-state-card">
            <div className="field-state-top"><span>SESSION STATUS</span><span className="live-label"><i />{isOnline ? 'ONLINE' : 'OFFLINE'}</span></div>
            <div className="field-state-visual"><div className="field-state-orb"><Leaf size={25} /></div><div><span>BOTANICAL</span><strong>Fresh-ready</strong></div></div>
            <div className="field-state-foot"><span><i className="status-dot" />LOCAL VAULT READY</span><span>{vaultRecords.length} scan{vaultRecords.length === 1 ? '' : 's'}</span></div>
          </section>
          <section className="rail-stat-grid"><div className="glass-card rail-stat"><span><Archive size={13} /> WASTE SAVED</span><strong>{formatMoney(totalSaved)}</strong><small>estimated value</small></div><div className="glass-card rail-stat"><span><Thermometer size={13} /> NEXT WINDOW</span><strong>{nextExpiry ? `${Math.max(0, Math.ceil((nextExpiry.expiresAt - Date.now()) / 3_600_000))}h` : '—'}</strong><small>{nextExpiry?.name ?? 'No countdowns yet'}</small></div></section>
          <section className="glass-card rail-insight-card"><div className="rail-insight-icon"><Zap size={15} /></div><div className="section-kicker">FIELD NOTE / 0{NAV_ITEMS.findIndex((item) => item.id === activeModule) + 1}</div><h3>{activeModule === 'acoustic' ? 'Tap twice, compare once.' : activeModule === 'optical' ? 'Hold the light steady.' : activeModule === 'cold-chain' ? 'Temperature writes the clock.' : activeModule === 'additives' ? 'Context before alarm.' : 'A small note saves a meal.'}</h3><p>{activeModule === 'acoustic' ? 'For a useful resonance comparison, use similar produce and a consistent tap position.' : activeModule === 'optical' ? 'Camera white balance and ambient light can shift colour coordinates between samples.' : activeModule === 'cold-chain' ? 'Q₁₀ is a rate model—not a substitute for official time and temperature rules.' : activeModule === 'additives' ? 'Ingredient flags are a prompt to read more, not a diagnosis or toxicity verdict.' : 'Your inventory is stored on this device. Remote sync is intentionally off until configured.'}</p><button className="text-button" onClick={() => notify('Field note: use screening results alongside product history and official food-safety guidance.')}>Read methodology <ArrowUpRight size={13} /></button></section>
          <section className="glass-card rail-connectivity-card"><div className="connectivity-heading"><span>{isOnline ? <Wifi size={14} /> : <WifiOff size={14} />} CONNECTION</span><span className={`connection-state ${isOnline ? 'online' : 'offline'}`}>{isOnline ? 'STABLE' : 'NO SIGNAL'}</span></div><div className="connectivity-copy"><span className="connection-bars"><i /><i /><i /><i /></span><div><strong>{isOnline ? 'Ready for field use' : 'Offline mode active'}</strong><small>Scans and references work locally</small></div></div></section>
          <div className="rail-build-info"><span className="build-seed"><Sprout size={14} /></span><span>FRESH-SPECTRA <b>·</b> v1.0.0</span><span>FIELD BUILD</span></div>
        </aside>
      </motion.div>

      <Suspense fallback={null}>
        <PermissionDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} role={role} onRoleChange={setRole} theme={theme} onThemeChange={setTheme} micStatus={micStatus} cameraStatus={cameraStatus} hapticsStatus={hapticsStatus} storageStatus={storageStatus} onEnableMic={requestMicrophone} onEnableCamera={requestCamera} onTestHaptics={testHaptics} onPersistStorage={requestPersistentStorage} />
        <ApkModal open={apkOpen} onClose={() => setApkOpen(false)} />
      </Suspense>
      <AnimatePresence>{toast && <motion.div className="toast-message" initial={{ opacity: 0, y: 15, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }} transition={{ type: 'spring', stiffness: 320, damping: 26, mass: 0.8 }}><span><CheckIcon /></span>{toast}</motion.div>}</AnimatePresence>
    </div>
  );
}

function CheckIcon() {
  return <span className="toast-check-mark">✓</span>;
}
