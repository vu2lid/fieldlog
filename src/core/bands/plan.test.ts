import { describe, expect, it } from 'vitest';
import { bandToDefaultFrequency, frequencyToBand } from './plan';

describe('band plan', () => {
  it('maps frequency to band', () => {
    expect(frequencyToBand(14.2)).toBe('20m');
    expect(frequencyToBand(7.15)).toBe('40m');
    expect(frequencyToBand(146.52)).toBe('2m');
  });

  it('maps band to default frequency', () => {
    expect(bandToDefaultFrequency('20m')).toBe(14.2);
    expect(bandToDefaultFrequency('40m')).toBe(7.15);
  });

  it('derives band when frequency changes', () => {
    expect(frequencyToBand(28.5)).toBe('10m');
    expect(frequencyToBand(3.8)).toBe('80m');
  });
});