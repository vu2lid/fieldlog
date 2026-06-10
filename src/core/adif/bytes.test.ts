import { describe, expect, it } from 'vitest';
import {
  byteIndexToCharIndex,
  byteLength,
  charIndexToByteIndex,
  lineAtOffset,
  sliceByBytes,
} from './bytes';

describe('bytes helpers', () => {
  it('slices by byte length accurately', () => {
    expect(byteLength('TEST<>1')).toBe(7);
    expect(sliceByBytes('TEST<>1REST', 0, 7)).toBe('TEST<>1');
  });

  it('maps byte and char indices', () => {
    const text = 'Hello';
    expect(byteIndexToCharIndex(text, 0)).toBe(0);
    expect(charIndexToByteIndex(text, 5)).toBe(5);
  });

  it('computes line numbers', () => {
    expect(lineAtOffset('a\nb\nc', 3)).toBe(2);
  });
});
