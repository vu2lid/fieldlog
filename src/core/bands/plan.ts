export interface BandDefinition {
  name: string;
  minMHz: number;
  maxMHz: number;
  defaultMHz: number;
}

export const BAND_PLAN: BandDefinition[] = [
  { name: '2190m', minMHz: 0.135, maxMHz: 0.138, defaultMHz: 0.137 },
  { name: '630m', minMHz: 0.472, maxMHz: 0.479, defaultMHz: 0.475 },
  { name: '160m', minMHz: 1.8, maxMHz: 2.0, defaultMHz: 1.9 },
  { name: '80m', minMHz: 3.5, maxMHz: 4.0, defaultMHz: 3.8 },
  { name: '60m', minMHz: 5.3, maxMHz: 5.5, defaultMHz: 5.357 },
  { name: '40m', minMHz: 7.0, maxMHz: 7.3, defaultMHz: 7.15 },
  { name: '30m', minMHz: 10.1, maxMHz: 10.15, defaultMHz: 10.12 },
  { name: '20m', minMHz: 14.0, maxMHz: 14.35, defaultMHz: 14.2 },
  { name: '17m', minMHz: 18.068, maxMHz: 18.168, defaultMHz: 18.1 },
  { name: '15m', minMHz: 21.0, maxMHz: 21.45, defaultMHz: 21.25 },
  { name: '12m', minMHz: 24.89, maxMHz: 24.99, defaultMHz: 24.94 },
  { name: '10m', minMHz: 28.0, maxMHz: 29.7, defaultMHz: 28.5 },
  { name: '6m', minMHz: 50.0, maxMHz: 54.0, defaultMHz: 52.525 },
  { name: '4m', minMHz: 70.0, maxMHz: 70.5, defaultMHz: 70.2 },
  { name: '2m', minMHz: 144.0, maxMHz: 148.0, defaultMHz: 146.52 },
  { name: '1.25m', minMHz: 222.0, maxMHz: 225.0, defaultMHz: 223.5 },
  { name: '70cm', minMHz: 420.0, maxMHz: 450.0, defaultMHz: 446.0 },
  { name: '33cm', minMHz: 902.0, maxMHz: 928.0, defaultMHz: 915.0 },
  { name: '23cm', minMHz: 1240.0, maxMHz: 1300.0, defaultMHz: 1296.0 },
];

export function frequencyToBand(freqMHz: number): string | null {
  for (const band of BAND_PLAN) {
    if (freqMHz >= band.minMHz && freqMHz <= band.maxMHz) {
      return band.name;
    }
  }
  return null;
}

export function bandToDefaultFrequency(band: string): number | null {
  const normalized = band.toLowerCase();
  const match = BAND_PLAN.find((b) => b.name.toLowerCase() === normalized);
  return match?.defaultMHz ?? null;
}

export function normalizeBandName(band: string): string {
  const normalized = band.toLowerCase();
  const match = BAND_PLAN.find((b) => b.name.toLowerCase() === normalized);
  return match?.name ?? band;
}
