/* ══════════ histórico undo/redo do editor — PURA ══════════ */

export interface Snap {
    value: string;
    s: number;
    e: number;
}

export interface History {
    /** passo explícito (formatar, aplicar, colar grande): limpa o redo */
    push(s: Snap): void;
    /** digitação: agrupa rajadas de até `burstMs` num único passo */
    noteBurst(before: Snap | null, now?: number): void;
    /** retorna o estado anterior ou null; empilha o estado atual no redo */
    undo(current: Snap): Snap | null;
    /** retorna o estado seguinte ou null; empilha o estado atual no undo */
    redo(current: Snap): Snap | null;
    readonly lastPushAt: number;
}

export function createHistory(limit = 150, burstMs = 500): History {
    const undoStack: Snap[] = [];
    const redoStack: Snap[] = [];
    let lastPushAt = 0;
    const cap = () => { if (undoStack.length > limit) undoStack.shift(); };
    return {
        push(s) {
            undoStack.push(s);
            cap();
            redoStack.length = 0;
            lastPushAt = Date.now();
        },
        noteBurst(before, now = Date.now()) {
            if (before && now - lastPushAt > burstMs) {
                undoStack.push(before);
                cap();
                redoStack.length = 0;
            }
            lastPushAt = now;
        },
        undo(current) {
            if (!undoStack.length) return null;
            redoStack.push(current);
            return undoStack.pop()!;
        },
        redo(current) {
            if (!redoStack.length) return null;
            undoStack.push(current);
            return redoStack.pop()!;
        },
        get lastPushAt() { return lastPushAt; },
    };
}
