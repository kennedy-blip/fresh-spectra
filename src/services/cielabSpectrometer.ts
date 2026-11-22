export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface LabColor {
  L: number;
  a: number;
  b: number;
  xChromaticity: number;
  yChromaticity: number;
  browningIndex: number;
  chlorophyllRetention: number;
}

export interface OpticalReference {
  id: string;
  name: string;
  group: string;
  color: RGBColor;
  note: string;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const OPTICAL_REFERENCES: OpticalReference[] = [
  {
    id: 'crisp-spinach',
    name: 'Crisp organic spinach',
    group: 'HIGH CHLOROPHYLL',
    color: { r: 50, g: 102, b: 52 },
    note: 'Deep green reference · freshly hydrated leaves',
  },
  {
    id: 'wilted-greens',
    name: 'Wilting oxidized greens',
    group: 'CHLOROPHYLL LOSS',
    color: { r: 132, g: 124, b: 76 },
    note: 'Muted olive reference · yellowing and dehydration cues',
  },
  {
    id: 'spotted-banana',
    name: 'Peak spotted banana',
    group: 'SUGAR / RIPENING',
    color: { r: 219, g: 179, b: 68 },
    note: 'Golden-yellow reference · skin color is not a safety test',
  },
  {
    id: 'fresh-beef',
    name: 'Fresh bright-red beef / tuna',
    group: 'OXYMYOGLOBIN',
    color: { r: 167, g: 57, b: 54 },
    note: 'Bright red reference · color alone cannot establish safety',
  },
  {
    id: 'oxidized-protein',
    name: 'Oxidized gray-brown protein',
    group: 'METMYOGLOBIN CUE',
    color: { r: 112, g: 88, b: 76 },
    note: 'Gray-brown reference · check temperature and date as well',
  },
];

function srgbToLinear(channel: number): number {
  const normalized = clamp(channel, 0, 255) / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function labPivot(value: number): number {
  const delta = 6 / 29;
  return value > delta ** 3 ? Math.cbrt(value) : value / (3 * delta ** 2) + 4 / 29;
}

/** Converts an sRGB triplet to CIE XYZ (D65), then to CIE L*a*b*. */
export function srgbToCielab(rgb: RGBColor): LabColor {
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);
  const X = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) * 100;
  const Y = (0.2126729 * r + 0.7151522 * g + 0.072175 * b) * 100;
  const Z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) * 100;
  const sum = X + Y + Z || 1;
  const xChromaticity = X / sum;
  const yChromaticity = Y / sum;
  const fx = labPivot(X / 95.047);
  const fy = labPivot(Y / 100);
  const fz = labPivot(Z / 108.883);
  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const labB = 200 * (fy - fz);
  const browningIndex = (100 * (xChromaticity - 0.31)) / 0.17;
  const chlorophyllRetention = estimateChlorophyllRetention(a, labB, L);
  return {
    L: Math.round(L * 10) / 10,
    a: Math.round(a * 10) / 10,
    b: Math.round(labB * 10) / 10,
    xChromaticity: Math.round(xChromaticity * 1000) / 1000,
    yChromaticity: Math.round(yChromaticity * 1000) / 1000,
    browningIndex: Math.round(browningIndex * 10) / 10,
    chlorophyllRetention,
  };
}

/** Heuristic green-axis proxy, not a direct chlorophyll assay or safety determination. */
export function estimateChlorophyllRetention(a: number, b: number, lightness: number): number {
  const greenSignal = clamp((-a + 8) / 42, 0, 1);
  const yellowPenalty = clamp((b - 20) / 90, 0, 0.45);
  const lightPenalty = clamp((lightness - 78) / 100, 0, 0.18);
  return Math.round(clamp((greenSignal - yellowPenalty - lightPenalty) * 100, 0, 100));
}

export function averageImagePatch(imageData: ImageData): RGBColor {
  const { data, width, height } = imageData;
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  // Sampling every other pixel reduces work on high-resolution video frames while retaining a broad patch.
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const index = (y * width + x) * 4;
      r += data[index];
      g += data[index + 1];
      b += data[index + 2];
      count += 1;
    }
  }
  return count ? { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) } : { r: 0, g: 0, b: 0 };
}

export function rgbToHex({ r, g, b }: RGBColor): string {
  return `#${[r, g, b].map((channel) => Math.round(clamp(channel, 0, 255)).toString(16).padStart(2, '0')).join('')}`;
}
