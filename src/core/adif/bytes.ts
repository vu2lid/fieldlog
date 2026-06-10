const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function toBytes(text: string): Uint8Array {
  return encoder.encode(text);
}

export function byteLength(text: string): number {
  return encoder.encode(text).length;
}

export function sliceByBytes(text: string, byteStart: number, byteLen: number): string {
  const bytes = encoder.encode(text);
  return decoder.decode(bytes.subarray(byteStart, byteStart + byteLen));
}

export function byteIndexToCharIndex(text: string, byteIndex: number): number {
  if (byteIndex <= 0) return 0;
  const bytes = encoder.encode(text);
  const slice = decoder.decode(bytes.subarray(0, byteIndex));
  return slice.length;
}

export function charIndexToByteIndex(text: string, charIndex: number): number {
  return encoder.encode(text.slice(0, charIndex)).length;
}

export function lineAtOffset(text: string, offset: number): number {
  const prefix = text.slice(0, Math.max(0, offset));
  return prefix.split('\n').length;
}
