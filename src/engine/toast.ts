/* ══════════ toasts — store puro + publicação (DOM é do componente React) ══════════ */

export interface ToastItem {
    id: number;
    msg: string;
    type: string;
    show: boolean;
}

type Listener = (items: ToastItem[]) => void;

const items: ToastItem[] = [];
const listeners = new Set<Listener>();
let seq = 0;

function emit() {
    for (const l of listeners) l([...items]);
}

export function subscribeToasts(l: Listener): () => void {
    listeners.add(l);
    l([...items]);
    return () => { listeners.delete(l); };
}

/** Publica um toast; ciclo de vida igual ao legado (show → 2,4s → remove). */
export function toast(msg: string, type = ''): void {
    const item: ToastItem = { id: ++seq, msg, type, show: false };
    items.push(item);
    emit();
    requestAnimationFrame(() => {
        item.show = true;
        emit();
        setTimeout(() => {
            item.show = false;
            emit();
            setTimeout(() => {
                const i = items.indexOf(item);
                if (i >= 0) { items.splice(i, 1); emit(); }
            }, 300);
        }, 2400);
    });
}
