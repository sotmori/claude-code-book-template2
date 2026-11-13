import { getAppContext } from './app-session';

export function storageScope(): string {
  const context = getAppContext();
  if (!context) throw new Error('An app session is required for business storage');
  return [context.tenantId, context.appId, context.principalId].map(encodeURIComponent).join(':');
}

/** Capture a scope before async work. Every later operation refuses a changed session. */
export function createScopedStorage() {
  const scope = storageScope();
  function key(name: string): string {
    if (storageScope() !== scope) throw new Error('App session changed; discard pending work');
    return `valance.data:${scope}:${encodeURIComponent(name)}`;
  }
  return {
    scope,
    assertCurrent: () => { key(''); },
    getItem: (name: string) => localStorage.getItem(key(name)),
    setItem: (name: string, value: string) => localStorage.setItem(key(name), value),
    removeItem: (name: string) => localStorage.removeItem(key(name)),
    // Use for IndexedDB database names and CacheStorage cache names as well.
    key,
  };
}

export const scopedStorage = {
  getItem: (name: string) => createScopedStorage().getItem(name),
  setItem: (name: string, value: string) => createScopedStorage().setItem(name, value),
  removeItem: (name: string) => createScopedStorage().removeItem(name),
  key: (name: string) => createScopedStorage().key(name),
  capture: createScopedStorage,
};

/**
 * Move one legacy value under `quarantine:`; it is never replayed automatically.
 * A different value found later (an old tab, a rollback and re-apply, another
 * app on a shared origin) is kept beside the earlier copy under a numbered key,
 * so startup never fails and nothing is overwritten. A value that cannot be
 * moved stays where it is: scoped code never reads unscoped keys.
 */
export function quarantineStorageItem(storage: Storage, key: string): void {
  const value = storage.getItem(key);
  if (value === null) return;
  const base = `quarantine:${encodeURIComponent(key)}`;
  try {
    let target = base;
    for (let copy = 1; storage.getItem(target) !== null; copy++) {
      if (storage.getItem(target) === value) {
        storage.removeItem(key);
        return;
      }
      target = `${base}:${copy}`;
    }
    storage.setItem(target, value);
    storage.removeItem(key);
  } catch {
    // Storage full or unavailable: retry on the next start.
  }
}

/** Inventory each app's legacy keys explicitly; never attribute them to the next tenant. */
export function quarantineLegacyStorage(keys: readonly string[], storage: Storage = localStorage): void {
  for (const key of keys) {
    if (key.startsWith('valance.') || key.startsWith('quarantine:') || ['token', 'refreshToken'].includes(key)) {
      throw new Error('Only legacy business-data keys can be quarantined');
    }
    quarantineStorageItem(storage, key);
  }
}
