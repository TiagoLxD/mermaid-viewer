export interface Box {
    name: string;
    x: number;
    y: number;
    w: number;
    h: number;
}

/* ══════════ geometria do arrastar — funções PURAS (sem DOM) ══════════ */

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export interface Snap {
    nx: number;
    ny: number;
    /** guia vertical (borda/centro alinhado em x) */
    gx: { x: number; y1: number; y2: number } | null;
    /** guia horizontal (borda/centro alinhado em y) */
    gy: { y: number; x1: number; x2: number } | null;
}

/** Alinhamento magnético: encaixa a entidade em bordas/centros de vizinhas.
    Encaixa em UM eixo por vez (o mais próximo) — nunca na diagonal. */
export function snapMove(
    others: Box[],
    ent: Box,
    nx0: number,
    ny0: number,
    thr: number,
): Snap {
    let bx: { d: number; x: number } | null = null;
    let by: { d: number; y: number } | null = null;
    const A = { l: nx0, r: nx0 + ent.w, cx: nx0 + ent.w / 2, t: ny0, b: ny0 + ent.h, cy: ny0 + ent.h / 2 };
    for (const o of others) {
        if (o === ent) continue;
        const B = { l: o.x, r: o.x + o.w, cx: o.x + o.w / 2, t: o.y, b: o.y + o.h, cy: o.y + o.h / 2 };
        for (const [ka, kb] of [['cx', 'cx'], ['l', 'l'], ['r', 'r'], ['l', 'r'], ['r', 'l']] as const) {
            const d = B[kb] - A[ka];
            if (Math.abs(d) < thr && (!bx || Math.abs(d) < Math.abs(bx.d))) bx = { d, x: B[kb] };
        }
        for (const [ka, kb] of [['cy', 'cy'], ['t', 't'], ['b', 'b'], ['t', 'b'], ['b', 't']] as const) {
            const d = B[kb] - A[ka];
            if (Math.abs(d) < thr && (!by || Math.abs(d) < Math.abs(by.d))) by = { d, y: B[kb] };
        }
    }
    if (bx && by) {
        if (Math.abs(bx.d) <= Math.abs(by.d)) by = null; else bx = null;
    }
    let nx = nx0, ny = ny0;
    if (bx) nx += bx.d;
    if (by) ny += by.d;
    const out: Snap = { nx, ny, gx: null, gy: null };
    if (bx) {
        const o = others.find(o => Math.abs(o.x + o.w / 2 - bx!.x) < 1e-9
            || Math.abs(o.x - bx!.x) < 1e-9 || Math.abs(o.x + o.w - bx!.x) < 1e-9)!;
        out.gx = { x: bx.x, y1: Math.min(ny, o.y) - 26, y2: Math.max(ny + ent.h, o.y + o.h) + 26 };
    }
    if (by) {
        const o = others.find(o => Math.abs(o.y + o.h / 2 - by!.y) < 1e-9
            || Math.abs(o.y - by!.y) < 1e-9 || Math.abs(o.y + o.h - by!.y) < 1e-9)!;
        out.gy = { y: by.y, x1: Math.min(nx, o.x) - 26, x2: Math.max(nx + ent.w, o.x + o.w) + 26 };
    }
    return out;
}

/** Empurra a entidade arrastada para fora de qualquer sobreposição
    (nunca termina o drag em cima de outra tabela). Mutante, como no legado. */
export function pushOut(entities: Box[], ent: Box, gapX: number, gapY: number, maxIter = 60): void {
    for (let rep = 0; rep < maxIter; rep++) {
        let overlapped = false;
        for (const o of entities) {
            if (o === ent) continue;
            const dx = (ent.x + ent.w / 2) - (o.x + o.w / 2), dy = (ent.y + ent.h / 2) - (o.y + o.h / 2);
            const px = (ent.w + o.w) / 2 + gapX - Math.abs(dx), py = (ent.h + o.h) / 2 + gapY - Math.abs(dy);
            if (px > 0 && py > 0) {
                overlapped = true;
                if (px / (ent.w + o.w) < py / (ent.h + o.h)) ent.x += (dx >= 0 ? 1 : -1) * px;
                else ent.y += (dy >= 0 ? 1 : -1) * py;
            }
        }
        if (!overlapped) break;
    }
}

/** Separação par a par de todas as entidades (usado pelo layout e placeNear). */
export function resolveOverlaps(nodes: Box[], iters: number, gx = 156, gy = 145): void {
    for (let it = 0; it < iters; it++) {
        let any = false;
        for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i], b = nodes[j];
            const dx = (a.x + a.w / 2) - (b.x + b.w / 2), dy = (a.y + a.h / 2) - (b.y + b.h / 2);
            const px = (a.w + b.w) / 2 + gx - Math.abs(dx), py = (a.h + b.h) / 2 + gy - Math.abs(dy);
            if (px > 0 && py > 0) {
                any = true;
                if (px / (a.w + b.w) < py / (a.h + b.h)) { const s = (dx >= 0 ? 1 : -1) * px / 2; a.x += s; b.x -= s; }
                else { const s = (dy >= 0 ? 1 : -1) * py / 2; a.y += s; b.y -= s; }
            }
        }
        if (!any) break;
    }
}

export { clamp };
