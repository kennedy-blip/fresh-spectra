import type { RoleId } from './types';

export const ROLE_OPTIONS: Array<{ id: RoleId; name: string; shortName: string; description: string; badge: string }> = [
  { id: 'home', name: 'HOME CHEF & SHOPPER', shortName: 'Home', description: 'Scan produce, track pantry windows and decode ingredient labels.', badge: 'STANDARD TIER' },
  { id: 'pro', name: 'CULINARY & AG INSPECTOR PRO', shortName: 'Inspector Pro', description: 'Unlock raw CIELAB readouts, calibrated mass inputs and field forensics.', badge: 'PRO TIER' },
  { id: 'admin', name: 'COLD-CHAIN & LAB DIRECTOR', shortName: 'Lab Director', description: 'HACCP snapshots, local vault inspector and telemetry export controls.', badge: 'DIRECTOR TIER' },
];
