export type ModeCategory = 'phone' | 'cw' | 'digital' | 'other';

export interface ModeDefinition {
  mode: string;
  category: ModeCategory;
  defaultRstSent: string;
  defaultRstRcvd: string;
}

export const MODES: ModeDefinition[] = [
  { mode: 'SSB', category: 'phone', defaultRstSent: '59', defaultRstRcvd: '59' },
  { mode: 'FM', category: 'phone', defaultRstSent: '59', defaultRstRcvd: '59' },
  { mode: 'AM', category: 'phone', defaultRstSent: '59', defaultRstRcvd: '59' },
  { mode: 'CW', category: 'cw', defaultRstSent: '599', defaultRstRcvd: '599' },
  { mode: 'FT8', category: 'digital', defaultRstSent: '-10', defaultRstRcvd: '-10' },
  { mode: 'FT4', category: 'digital', defaultRstSent: '-10', defaultRstRcvd: '-10' },
  { mode: 'RTTY', category: 'digital', defaultRstSent: '599', defaultRstRcvd: '599' },
  { mode: 'PSK31', category: 'digital', defaultRstSent: '599', defaultRstRcvd: '599' },
  { mode: 'DIGITALVOICE', category: 'digital', defaultRstSent: '59', defaultRstRcvd: '59' },
];

export function getModeDefinition(mode: string): ModeDefinition {
  const upper = mode.toUpperCase();
  return (
    MODES.find((m) => m.mode === upper) ?? {
      mode: upper,
      category: 'other',
      defaultRstSent: '59',
      defaultRstRcvd: '59',
    }
  );
}

export function defaultRstForMode(mode: string): { sent: string; rcvd: string } {
  const def = getModeDefinition(mode);
  return { sent: def.defaultRstSent, rcvd: def.defaultRstRcvd };
}