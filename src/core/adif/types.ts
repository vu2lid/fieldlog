import { APP_VERSION } from '../version';

export interface AdifField {
  name: string;
  value: string;
}

export interface AdifRecord {
  fields: Map<string, string>;
}

export interface AdifHeader {
  fields: Map<string, string>;
  preamble?: string;
}

export interface ParseError {
  message: string;
  offset: number;
  line: number;
}

export interface ParseResult {
  header: AdifHeader;
  records: AdifRecord[];
  errors: ParseError[];
}

export const ADIF_VERSION = '3.1.7';
export const PROGRAM_ID = 'FieldLog';
export const PROGRAM_VERSION = APP_VERSION;
