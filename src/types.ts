export type ModuleId = 'acoustic' | 'optical' | 'cold-chain' | 'additives' | 'pantry';
export type BiologicalState = 'fresh' | 'under' | 'warning' | 'hazard';
export type ThemeId = 'obsidian' | 'daylight' | 'thermal' | 'eco';
export type RoleId = 'home' | 'pro' | 'admin';
export type SensorStatus = 'active' | 'simulator' | 'restricted';

export interface PantryRecord {
  id?: number;
  name: string;
  category: string;
  state: string;
  addedAt: number;
  expiresAt: number;
  savedEstimate: number;
  source: string;
  note?: string;
  syncStatus: 'queued' | 'synced';
}

export interface PantryRecordInput extends Omit<PantryRecord, 'id' | 'addedAt' | 'syncStatus'> {
  addedAt?: number;
}

export interface ThemeOption {
  id: ThemeId;
  name: string;
  description: string;
  swatch: string;
}

export interface RoleOption {
  id: RoleId;
  name: string;
  shortName: string;
  description: string;
  badge: string;
}
