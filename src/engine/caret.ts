/* ══════════ entidade sob o cursor do editor — PURA ══════════ */

/** Descobre qual entidade do diagrama está associada à posição do caret:
    1) nome de entidade na própria linha (o mais próximo do cursor);
    2) dentro de um bloco `ENT { … }` que contém a linha. */
export function entityAtCaret(text: string, pos: number, known: Set<string>): string | null {
    const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
    let lineEnd = text.indexOf('\n', lineStart);
    if (lineEnd === -1) lineEnd = text.length;
    const line = text.slice(lineStart, lineEnd);
    /* 1) nome de entidade na própria linha */
    const col = pos - lineStart;
    const cands = [...line.matchAll(/[A-Za-z_][\w.\-]*/g)]
        .filter(m => known.has(m[0]))
        .sort((a, b) => Math.abs(a.index! - col) - Math.abs(b.index! - col));
    if (cands.length) return cands[0][0];
    /* 2) dentro de um bloco ENT { ... } */
    let cur: string | null = null;
    for (const l of text.slice(0, lineStart).split('\n')) {
        const t = l.trim();
        const o = t.match(/^([A-Za-z_][\w.\-]*)\s*\{$/);
        if (o) cur = o[1];
        else if (/^\}+\s*$/.test(t)) cur = null;
    }
    return cur && known.has(cur) ? cur : null;
}
