import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Archive, ArrowDownToLine, Check, Cloud, CloudOff, Database, Leaf, MoreHorizontal, RefreshCw, Search, ShieldCheck, Trash2, Wifi, WifiOff } from 'lucide-react';
import type { PantryRecord, RoleId } from '../types';
import { downloadTextFile, getStorageUsage, getSyncQueueCount, listPantryRecords, pantryRecordsToCsv } from '../services/db';

interface PantryVaultProps {
  role: RoleId;
  isOnline: boolean;
  refreshToken: number;
  onNavigate: (module: 'acoustic' | 'optical' | 'cold-chain' | 'additives' | 'pantry') => void;
  onRemove: (id: number) => Promise<void>;
  onNotify: (message: string) => void;
}

const spring = { type: 'spring' as const, stiffness: 320, damping: 26, mass: 0.8 };
const formatMoney = (amount: number) => `$${amount.toFixed(2)}`;
const formatRelative = (timestamp: number) => {
  const hours = Math.max(0, Math.round((Date.now() - timestamp) / 3_600_000));
  if (hours < 1) return 'Just added';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};
const formatRemaining = (timestamp: number) => {
  const hours = Math.ceil((timestamp - Date.now()) / 3_600_000);
  if (hours <= 0) return 'Window passed';
  if (hours < 24) return `${hours}h left`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h left`;
};
const formatBytes = (bytes: number) => bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export default function PantryVault({ role, isOnline, refreshToken, onNavigate, onRemove, onNotify }: PantryVaultProps) {
  const [records, setRecords] = useState<PantryRecord[]>([]);
  const [queueCount, setQueueCount] = useState(0);
  const [storage, setStorage] = useState<{ usage: number; quota: number; persistent: boolean | null }>({ usage: 0, quota: 0, persistent: null });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'expiring' | 'queued'>('all');
  const [removeId, setRemoveId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [items, count, usage] = await Promise.all([listPantryRecords(), getSyncQueueCount(), getStorageUsage()]);
        if (!active) return;
        setRecords(items);
        setQueueCount(count);
        setStorage(usage);
      } catch (error) {
        console.warn('Could not read the local pantry vault:', error);
        if (active) onNotify('Local pantry could not be opened. Check this browser’s site storage settings.');
      }
    };
    void load();
    return () => { active = false; };
  }, [refreshToken, onNotify]);

  const now = Date.now();
  const savedTotal = records.reduce((total, record) => total + record.savedEstimate, 0);
  const expiringCount = records.filter((record) => record.expiresAt - now <= 48 * 3_600_000 && record.expiresAt > now).length;
  const visibleRecords = useMemo(() => records.filter((record) => {
    const matchesQuery = !search || `${record.name} ${record.category} ${record.state} ${record.source}`.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || (filter === 'expiring' && record.expiresAt - Date.now() <= 48 * 3_600_000) || (filter === 'queued' && record.syncStatus === 'queued');
    return matchesQuery && matchesFilter;
  }), [records, search, filter]);

  const exportCsv = () => {
    downloadTextFile('fresh-spectra-pantry.csv', pantryRecordsToCsv(records), 'text/csv');
    onNotify('Pantry ledger exported as CSV.');
  };

  const remove = async (record: PantryRecord) => {
    if (record.id === undefined) return;
    setRemoveId(record.id);
    await onRemove(record.id);
    setRecords((items) => items.filter((item) => item.id !== record.id));
    setRemoveId(null);
  };

  return (
    <div className="module-view pantry-view">
      <div className="module-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" /> LOCAL VAULT 05 <span className="eyebrow-line" /> INDEXEDDB · OFFLINE-FIRST</div>
          <h1>Pantry <em>vault</em></h1>
          <p>Your scans and expiry windows live on this device. Keep grocery notes handy—even without a signal.</p>
        </div>
        <div className="heading-actions">{role === 'admin' && <button className="button button-outline" onClick={exportCsv}><ArrowDownToLine size={15} /> Export CSV</button>}<span className={`sensor-pill ${isOnline ? 'is-active' : 'is-offline'}`}><span className="status-dot" />{isOnline ? 'ONLINE · LOCAL FIRST' : 'OFFLINE · QUEUED'}</span></div>
      </div>

      <div className="pantry-stat-grid">
        <motion.div className="glass-card pantry-stat-card" whileHover={{ y: -2 }} transition={spring}><div className="stat-icon mint"><Leaf size={17} /></div><div><span>TRACKED ITEMS</span><strong>{records.length.toString().padStart(2, '0')}</strong><small>in this device vault</small></div><span className="stat-trend">LOCAL</span></motion.div>
        <motion.div className="glass-card pantry-stat-card" whileHover={{ y: -2 }} transition={spring}><div className="stat-icon amber"><Archive size={17} /></div><div><span>WASTE AVOIDED</span><strong>{formatMoney(savedTotal)}</strong><small>estimated grocery value</small></div><span className="stat-trend positive">+ TODAY</span></motion.div>
        <motion.div className="glass-card pantry-stat-card" whileHover={{ y: -2 }} transition={spring}><div className="stat-icon sky"><Cloud size={17} /></div><div><span>SYNC QUEUE</span><strong>{queueCount.toString().padStart(2, '0')}</strong><small>waiting for a destination</small></div><span className="stat-trend">{isOnline ? 'READY' : 'OFFLINE'}</span></motion.div>
        <motion.div className="glass-card pantry-stat-card" whileHover={{ y: -2 }} transition={spring}><div className="stat-icon rose"><RefreshCw size={17} /></div><div><span>USE WITHIN 48H</span><strong>{expiringCount.toString().padStart(2, '0')}</strong><small>timely pantry reminders</small></div><span className="stat-trend">WATCH</span></motion.div>
      </div>

      <div className="pantry-content-grid">
        <section className="glass-card pantry-ledger-card">
          <div className="card-heading-row"><div><div className="section-kicker">01 / SMART PANTRY LEDGER</div><h2>Recent field notes</h2></div><span className="record-count">{records.length} RECORDS</span></div>
          <div className="pantry-tools"><div className="database-search pantry-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search pantry…" aria-label="Search pantry items" /><button className="icon-button" title="Search options" aria-label="Search options"><MoreHorizontal size={16} /></button></div><div className="filter-tabs"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All <span>{records.length}</span></button><button className={filter === 'expiring' ? 'active' : ''} onClick={() => setFilter('expiring')}>Expiring <span>{expiringCount}</span></button><button className={filter === 'queued' ? 'active' : ''} onClick={() => setFilter('queued')}>Queued <span>{queueCount}</span></button></div></div>
          {visibleRecords.length === 0 ? <div className="pantry-empty"><div className="empty-orbit"><Archive size={24} /></div><h3>{records.length === 0 ? 'Your vault is ready' : 'No matching notes'}</h3><p>{records.length === 0 ? 'Save an acoustic, optical, cold-chain or ingredient scan to start your local ledger.' : 'Try a different search or clear the active filter.'}</p>{records.length === 0 && <div className="empty-actions"><button className="button button-outline button-small" onClick={() => onNavigate('acoustic')}>Open thump lab</button><button className="button button-ghost button-small" onClick={() => onNavigate('cold-chain')}>Add a countdown</button></div>}</div> : <div className="pantry-record-list">
            {visibleRecords.map((record) => {
              const remaining = record.expiresAt - Date.now();
              const urgency = remaining <= 0 ? 'expired' : remaining <= 24 * 3_600_000 ? 'urgent' : remaining <= 48 * 3_600_000 ? 'soon' : 'fresh';
              return <motion.article className="pantry-record" key={record.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
                <div className={`record-mark mark-${urgency}`}><span /></div>
                <div className="record-main"><div className="record-title-row"><strong>{record.name}</strong><span className={`record-state state-${urgency}`}>{record.state}</span></div><div className="record-meta"><span>{record.category}</span><i /> <span>{record.source}</span><i /> <span>{formatRelative(record.addedAt)}</span></div>{record.note && <p>{record.note}</p>}</div>
                <div className={`record-expiry ${urgency}`}><span>EST. WINDOW</span><strong>{formatRemaining(record.expiresAt)}</strong><small>{formatMoney(record.savedEstimate)} saved</small></div>
                <button className="icon-button remove-record" onClick={() => void remove(record)} disabled={removeId === record.id} title="Remove from pantry" aria-label={`Remove ${record.name}`}><Trash2 size={15} /></button>
              </motion.article>;
            })}
          </div>}
          <div className="ledger-footer"><span><Database size={14} /> IndexedDB · {records.length} local record{records.length === 1 ? '' : 's'}</span><span><span className="footer-dot" />No scan data leaves this device by default</span></div>
        </section>

        <aside className="pantry-side-column">
          <section className="glass-card sync-card">
            <div className="card-topline"><div className="section-kicker"><RefreshCw size={14} /> OFFLINE-TO-ONLINE QUEUE</div>{isOnline ? <Wifi size={15} className="connectivity-icon connected" /> : <WifiOff size={15} className="connectivity-icon" />}</div>
            <div className="sync-illustration"><div className="sync-node node-local"><Database size={16} /><span>THIS DEVICE</span></div><div className={`sync-path ${isOnline ? 'online' : ''}`}><i /><i /><i /></div><div className="sync-node node-cloud"><Cloud size={16} /><span>CLOUD ENDPOINT</span></div></div>
            <div className="sync-state-line"><span className={`sync-state-dot ${isOnline ? 'online' : ''}`} /><strong>{isOnline ? 'Connection available' : 'You are offline'}</strong><span>{queueCount} queued</span></div>
            <p className="sync-explainer">Scans are committed to IndexedDB first. A remote destination is not configured in this build, so records stay safely on this device instead of being sent to an unknown service.</p>
            <div className="sync-config-status"><CloudOff size={15} /><div><strong>Cloud sync · not configured</strong><span>Admin controller is ready for a project endpoint.</span></div><span className="local-only-pill">LOCAL ONLY</span></div>
            {role === 'admin' && <button className="button button-outline button-full" onClick={() => onNotify('Cloud sync controller: configure a trusted Supabase endpoint and row-level-security policy before enabling remote sync.')}><ShieldCheck size={15} /> Open sync controller</button>}
          </section>

          <section className="glass-card storage-health-card">
            <div className="card-topline"><div className="section-kicker"><Database size={14} /> DEVICE STORAGE</div><span className="health-status"><span className="status-dot" />HEALTHY</span></div>
            <div className="storage-health-main"><div className="storage-ring"><div><strong>{storage.quota ? Math.max(1, Math.round((storage.usage / storage.quota) * 100)) : 1}<small>%</small></strong><span>USED</span></div></div><div className="storage-details"><strong>{storage.usage ? formatBytes(storage.usage) : 'Ready'}</strong><span>origin storage used</span><small>{storage.quota ? `${formatBytes(storage.quota)} estimated quota` : 'Quota will appear when browser reports it'}</small></div></div>
            <div className="storage-health-footer"><span>Persistence</span><strong>{storage.persistent === true ? 'Granted' : storage.persistent === false ? 'Available' : 'Browser managed'}</strong><Check size={14} /></div>
          </section>

          {role === 'admin' && <section className="glass-card inspector-card"><div className="section-kicker"><ShieldCheck size={14} /> DIRECTOR STORAGE INSPECTOR</div><div className="inspector-row"><span>IndexedDB database</span><strong>fresh-spectra-local-vault</strong></div><div className="inspector-row"><span>Pantry object store</span><strong>{records.length} records</strong></div><div className="inspector-row"><span>Sync queue</span><strong>{queueCount} entries</strong></div><button className="text-button" onClick={() => downloadTextFile('fresh-spectra-vault-inspector.json', JSON.stringify({ generatedAt: new Date().toISOString(), database: 'fresh-spectra-local-vault', records, queueCount, storage }, null, 2), 'application/json')}>Export vault snapshot <span>↗</span></button></section>}
        </aside>
      </div>

      <div className="bottom-note"><Archive size={15} /><span>Pantry timers are estimates calculated from the scan time. Adjust if the item is moved, opened or stored under different conditions.</span><span className="note-suffix">IndexedDB · local-first</span></div>
    </div>
  );
}
