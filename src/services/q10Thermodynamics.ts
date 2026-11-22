export type PackagingMethod = 'vacuum' | 'airtight' | 'produce-drawer' | 'countertop';

export interface ShelfLifeProfile {
  id: string;
  name: string;
  category: string;
  baseHours: number;
  idealHumidity: number;
  savedEstimate: number;
  ethyleneSensitive?: boolean;
  note: string;
}

export interface ShelfLifeInput {
  profile: ShelfLifeProfile;
  temperatureC: number;
  humidity: number;
  hoursLeftOut: number;
  packaging: PackagingMethod;
}

export interface ShelfLifeEstimate {
  q10Multiplier: number;
  roomExposureFactor: number;
  effectiveExposureHours: number;
  humidityFactor: number;
  packagingFactor: number;
  remainingHours: number;
  remainingPercent: number;
  freshnessBand: 'FRESH' | 'USE SOON' | 'TIME SENSITIVE' | 'PAST MODEL WINDOW';
  ethyleneWarning: string | null;
}

export const Q10_VALUE = 2.2;
export const REFRIGERATOR_REFERENCE_C = 4;
export const ROOM_REFERENCE_C = 22;

export const SHELF_LIFE_PROFILES: ShelfLifeProfile[] = [
  { id: 'leafy-greens', name: 'Leafy greens', category: 'Produce', baseHours: 120, idealHumidity: 94, savedEstimate: 3.6, ethyleneSensitive: true, note: 'Keep dry and away from ethylene-producing fruit.' },
  { id: 'berries', name: 'Berries', category: 'Produce', baseHours: 120, idealHumidity: 90, savedEstimate: 4.1, ethyleneSensitive: true, note: 'Ventilate; wash shortly before eating.' },
  { id: 'avocado', name: 'Hass avocado', category: 'Produce', baseHours: 96, idealHumidity: 90, savedEstimate: 1.4, ethyleneSensitive: true, note: 'Counter-ripen, then refrigerate when ready.' },
  { id: 'cut-melon', name: 'Cut melon', category: 'Produce', baseHours: 72, idealHumidity: 90, savedEstimate: 2.8, note: 'Refrigerate promptly in a clean covered container.' },
  { id: 'raw-beef', name: 'Raw beef / tuna', category: 'Protein', baseHours: 48, idealHumidity: 80, savedEstimate: 7.2, note: 'Keep at or below 4°C; separate from ready-to-eat foods.' },
  { id: 'leftovers', name: 'Cooked leftovers', category: 'Prepared food', baseHours: 96, idealHumidity: 75, savedEstimate: 3.2, note: 'Shallow containers cool more quickly.' },
  { id: 'sourdough', name: 'Artisan sourdough', category: 'Bakery', baseHours: 120, idealHumidity: 65, savedEstimate: 2.6, note: 'Store cut-side down; refrigeration can stale the crumb.' },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const PACKAGING_OPTIONS: Array<{ id: PackagingMethod; label: string; note: string }> = [
  { id: 'vacuum', label: 'Vacuum sealed', note: 'Low oxygen transfer' },
  { id: 'airtight', label: 'Airtight glass', note: 'Covered, reusable' },
  { id: 'produce-drawer', label: 'Produce drawer', note: 'Ventilated / mixed ethylene' },
  { id: 'countertop', label: 'Countertop', note: 'Room-temperature exposure' },
];

export function calculateShelfLife(input: ShelfLifeInput): ShelfLifeEstimate {
  const { profile, temperatureC, humidity, hoursLeftOut, packaging } = input;
  const currentQ10 = Math.pow(Q10_VALUE, (temperatureC - REFRIGERATOR_REFERENCE_C) / 10);
  const roomExposureFactor = Math.pow(Q10_VALUE, (ROOM_REFERENCE_C - REFRIGERATOR_REFERENCE_C) / 10);
  const effectiveExposureHours = Math.max(0, hoursLeftOut) * roomExposureFactor;
  const humidityFactor = clamp(1 - Math.abs(humidity - profile.idealHumidity) * 0.0042, 0.66, 1.05);
  const packagingFactor: Record<PackagingMethod, number> = {
    vacuum: profile.category === 'Protein' ? 1.2 : 1.08,
    airtight: 1.08,
    'produce-drawer': profile.ethyleneSensitive ? 0.92 : 1,
    countertop: 0.76,
  };
  const remainingInReferenceHours = (profile.baseHours - effectiveExposureHours) * humidityFactor * packagingFactor[packaging];
  const remainingHours = Math.max(0, remainingInReferenceHours / currentQ10);
  const remainingPercent = Math.round(clamp((remainingHours / Math.max(1, profile.baseHours)) * 100, 0, 100));
  const freshnessBand = remainingHours <= 0
    ? 'PAST MODEL WINDOW'
    : remainingHours <= 24
      ? 'TIME SENSITIVE'
      : remainingHours <= 48
        ? 'USE SOON'
        : 'FRESH';
  const ethyleneWarning = profile.ethyleneSensitive && packaging === 'produce-drawer'
    ? `Keep ${profile.name.toLowerCase()} away from apples, bananas and ripe tomatoes unless faster ripening is intended.`
    : null;
  return {
    q10Multiplier: Math.round(currentQ10 * 100) / 100,
    roomExposureFactor: Math.round(roomExposureFactor * 100) / 100,
    effectiveExposureHours: Math.round(effectiveExposureHours * 10) / 10,
    humidityFactor: Math.round(humidityFactor * 100) / 100,
    packagingFactor: packagingFactor[packaging],
    remainingHours: Math.round(remainingHours * 10) / 10,
    remainingPercent,
    freshnessBand,
    ethyleneWarning,
  };
}

export function formatHours(hours: number): string {
  if (hours <= 0) return '0h';
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.floor(hours / 24);
  const remainder = Math.round(hours % 24);
  return remainder >= 20 ? `${days + 1}d` : `${days}d ${remainder}h`;
}
