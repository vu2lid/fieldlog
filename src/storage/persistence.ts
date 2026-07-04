export type PersistenceStatus = 'granted' | 'denied' | 'unsupported';

/**
 * Ask the browser to mark this origin's storage as persistent so the log
 * cannot be silently evicted under storage pressure. Best-effort: browsers
 * may deny (often until the app is installed or used regularly).
 */
export async function requestPersistence(): Promise<PersistenceStatus> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return 'unsupported';
  }
  try {
    if (await navigator.storage.persisted()) {
      return 'granted';
    }
    return (await navigator.storage.persist()) ? 'granted' : 'denied';
  } catch {
    return 'unsupported';
  }
}
