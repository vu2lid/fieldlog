import { byteIndexToCharIndex, lineAtOffset, toBytes } from './bytes';
import type { AdifField, AdifHeader, AdifRecord, ParseError, ParseResult } from './types';

const WHITESPACE = new Set([0x20, 0x09, 0x0a, 0x0d]);
const decoder = new TextDecoder();

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
  // A field name ends at ':'; it can never contain '<', '>', or whitespace,
  // so hitting any of those means the specifier is malformed.
  while (pos < bytes.length && bytes[pos] !== 0x3a) {
    if (bytes[pos] === 0x3c || bytes[pos] === 0x3e || WHITESPACE.has(bytes[pos]!)) {
      return null;
    }
    pos++;
  }
  if (pos === nameStart || bytes[pos] !== 0x3a) {
    return null;
  }
  const name = decoder.decode(bytes.subarray(nameStart, pos)).toUpperCase();
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

  const marker = decoder.decode(bytes.subarray(pos, Math.min(pos + 4, bytes.length))).toUpperCase();
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

  const value = decoder.decode(bytes.subarray(pos, dataEnd));
  pos = dataEnd;

  return { field: { name: nameResult.name, value }, end: pos, terminal: null };
}

export function parseAdi(content: string): ParseResult {
  const errors: ParseError[] = [];
  const bytes = toBytes(content);

  // Free text before the first '<' is the header preamble. Everything is
  // parsed in a single byte-aware pass: fields seen before the first <EOH>
  // terminal belong to the header, but a first terminal of <EOR> means the
  // file has no header. Because field data is consumed by byte length, a
  // literal '<EOH>' or '<EOR>' inside data is never mistaken for a terminal.
  let firstTag = skipWhitespaceBytes(bytes, 0);
  while (firstTag < bytes.length && bytes[firstTag] !== 0x3c) {
    firstTag++;
  }
  const preamble = decoder.decode(bytes.subarray(0, firstTag)).trim() || undefined;

  const header: AdifHeader = preamble ? { fields: new Map(), preamble } : { fields: new Map() };
  const records: AdifRecord[] = [];
  let currentFields = new Map<string, string>();
  let inHeader = true;
  let pos = firstTag;

  while (pos < bytes.length) {
    const result = parseField(content, bytes, pos, errors);
    pos = result.end;

    if (result.terminal === 'eoh') {
      if (inHeader) {
        header.fields = currentFields;
        currentFields = new Map();
        inHeader = false;
      } else {
        const charOffset = byteIndexToCharIndex(content, pos);
        errors.push({
          message: 'Unexpected <EOH> after header',
          offset: charOffset,
          line: lineAtOffset(content, charOffset),
        });
      }
      continue;
    }

    if (result.terminal === 'eor') {
      inHeader = false;
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
