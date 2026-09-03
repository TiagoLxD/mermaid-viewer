/* ══════════ persistência local (localStorage) — isolada p/ teste ══════════ */

const PREFIX = 'meridian:';

export interface Store {
    get(key: string): string | null;
    set(key: string, value: string): void;
}

export function createStore(storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage): Store {
    return {
        get(key) {
            try { return storage.getItem(PREFIX + key); } catch { return null; }
        },
        set(key, value) {
            try { storage.setItem(PREFIX + key, value); } catch { /* quota/privado: ignora */ }
        },
    };
}

export const store = createStore();
