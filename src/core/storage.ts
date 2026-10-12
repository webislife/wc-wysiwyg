/** Safe `localStorage` access — never throws (private mode / quota). */

export function safeStorageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeStorageSet(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    // QuotaExceededError / SecurityError (private mode): editing must not crash.
    return false;
  }
}

export function safeStorageRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** `JSON.parse` that never throws — returns `fallback` on empty/invalid input. */
export function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (raw === null || raw.trim() === '') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
