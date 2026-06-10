import type { Qso } from '../core/model';
import type { SessionContext } from '../core/model/session';

export interface StorageState {
  qsos: Qso[];
  session: SessionContext;
}

export class StorageError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'StorageError';
    this.cause = cause;
  }
}