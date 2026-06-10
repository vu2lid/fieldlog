import {
  byteIndexToCharIndex,
  charIndexToByteIndex,
  lineAtOffset,
  sliceByBytes,
  toBytes,
} from './bytes';
import type { AdifField, AdifHeader, AdifRecord, ParseError, ParseResult } from './types';

const WHITESPACE = new Set([0x20, 0x09, 0x0a, 0x0d]);

function skipWhitespaceBytes(bytes: Uint8Array, start: number): number {
  let pos = start;
  while (pos < bytes.length && WHITESPACE.has(bytes[pos]!)) {
    pos++;
  }
  return pos;
}

function readDigits(bytes: Uint8Array, start: number): { value: number; end: number } | null {
  let pos = start;
  if (pos >= bytes.length || bytes[pos]! < 0x30 || bytes[pos]! > 0x39) {
    return null;
  }
  let value = 0;
  while (pos < bytes.length && bytes[pos]! >= 0x30 && bytes[pos]! <= 0x39) {
    value = value * 10 + (bytes[pos]! - 0x30);
    pos++;
  }
  return { value, end: pos };
}

function readFieldName(bytes: Uint8Array, start: number): { name: string; end: number } | null {
  let pos = start;
  const nameStart = pos;
  while (pos < bytes.length && bytes[pos] !== 0x3a) {
    pos++;
  }
  if (pos === nameStart || bytes[pos] !== 0x3a) {
    return null;
  }
  const name = new TextDecoder().decode(bytes.subarray(nameStart, pos)).toUpperCase();
  return { name, end: pos + 1 };
}

function parseField(
  text: string,
  bytes: Uint8Array,
  start: number,
  errors: ParseError[],
): { field: AdifField | null; end: number; terminal: 'eor' | 'eoh' | null } {
  let pos = skipWhitespaceBytes(bytes, start);
  if (pos >= bytes.length) {
    return { field: null, end: pos, terminal: null };
  }

  if (bytes[pos] !== 0x3c) {
    const charOffset = byteIndexToCharIndex(text, pos);
    errors.push({
      message: `Expected '<' at field start, found '${text[charOffset] ?? 'EOF'}'`,
      offset: charOffset,
      line: lineAtOffset(text, charOffset),
    });
    return { field: null, end: pos + 1, terminal: null };
  }
  pos++;

  const marker = new TextDecoder()
    .decode(bytes.subarray(pos, Math.min(pos + 4, bytes.length)))
    .toUpperCase();
  if (marker.startsWith('EOR>')) {
    return { field: null, end: pos + 4, terminal: 'eor' };
  }
  if (marker.startsWith('EOH>')) {
    return { field: null, end: pos + 4, terminal: 'eoh' };
  }

  const nameResult = readFieldName(bytes, pos);
  if (!nameResult) {
    const charOffset = byteIndexToCharIndex(text, pos);
    errors.push({
      message: 'Malformed field: missing field name or length',
      offset: charOffset,
      line: lineAtOffset(text, charOffset),
    });
    return { field: null, end: pos + 1, terminal: null };
  }
  pos = nameResult.end;

  const lengthResult = readDigits(bytes, pos);
  if (!lengthResult) {
    const charOffset = byteIndexToCharIndex(text, pos);
    errors.push({
      message: `Malformed field ${nameResult.name}: invalid length`,
      offset: charOffset,
      line: lineAtOffset(text, charOffset),
    });
    return { field: null, end: pos + 1, terminal: null };
  }
  pos = lengthResult.end;

  if (pos < bytes.length && bytes[pos] === 0x3a) {
    pos++;
    if (pos < bytes.length) pos++;
  }

  if (pos >= bytes.length || bytes[pos] !== 0x3e) {
    const charOffset = byteIndexToCharIndex(text, pos);
    errors.push({
      message: `Malformed field ${nameResult.name}: expected '>' after specifier`,
      offset: charOffset,
      line: lineAtOffset(text, charOffset),
    });
    return { field: null, end: pos + 1, terminal: null };
  }
  pos++;

  const dataEnd = pos + lengthResult.value;
  if (dataEnd > bytes.length) {
    const charOffset = byteIndexToCharIndex(text, pos);
    errors.push({
      message: `Field ${nameResult.name}: data truncated (expected ${lengthResult.value} bytes)`,
      offset: charOffset,
      line: lineAtOffset(text, charOffset),
    });
    return { field: null, end: bytes.length, terminal: null };
  }

  const value = sliceByBytes(text, pos, lengthResult.value);
  pos = dataEnd;

  return { field: { name: nameResult.name, value }, end: pos, terminal: null };
}

function parseHeader(text: string): { header: AdifHeader; bodyStart: number } {
  const eohMatch = /<EOH>/i.exec(text);
  if (!eohMatch || eohMatch.index === undefined) {
    const trimmed = text.trimStart();
    if (!trimmed.startsWith('<')) {
      return { header: { fields: new Map(), preamble: text.trim() }, bodyStart: 0 };
    }
    return { header: { fields: new Map() }, bodyStart: 0 };
  }

  const firstTag = text.search(/</);
  const preamble = firstTag > 0 ? text.slice(0, firstTag).trim() || undefined : undefined;
  const headerText = text.slice(0, eohMatch.index + eohMatch[0].length);
  const headerBytes = toBytes(headerText);
  const errors: ParseError[] = [];
  const fields = new Map<string, string>();
  let pos = firstTag > 0 ? charIndexToByteIndex(text, firstTag) : 0;

  while (pos < headerBytes.length) {
    const result = parseField(headerText, headerBytes, pos, errors);
    pos = result.end;
    if (result.terminal === 'eoh') break;
    if (result.field) {
      fields.set(result.field.name, result.field.value);
    }
    if (!result.field && !result.terminal && pos >= headerBytes.length) break;
  }

  const bodyStart = charIndexToByteIndex(text, eohMatch.index + eohMatch[0].length);
  return { header: { fields, preamble }, bodyStart };
}

export function parseAdi(content: string): ParseResult {
  const errors: ParseError[] = [];
  const bytes = toBytes(content);
  const { header, bodyStart } = parseHeader(content);

  const records: AdifRecord[] = [];
  let pos = bodyStart;
  let currentFields = new Map<string, string>();

  while (pos < bytes.length) {
    const result = parseField(content, bytes, pos, errors);
    pos = result.end;

    if (result.terminal === 'eor') {
      if (currentFields.size > 0) {
        records.push({ fields: new Map(currentFields) });
      }
      currentFields = new Map();
      continue;
    }

    if (result.field) {
      currentFields.set(result.field.name, result.field.value);
      continue;
    }

    if (pos >= bytes.length) break;
  }

  if (currentFields.size > 0) {
    records.push({ fields: new Map(currentFields) });
  }

  return { header, records, errors };
}
