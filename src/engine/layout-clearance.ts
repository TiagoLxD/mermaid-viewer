import { resolveOverlaps } from './drag-geom';
import type { Box } from './drag-geom';

/* ══════════ folga para arestas — funções PURAS (sem DOM) ══════════ */

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Empurra tabelas para fora do caminho reto das ligações, para as linhas
    não passarem por cima de entidades alheias. Mutante, como no legado. */
export function edgeClearance(nodes: Box[], links: [number, number][], passes: number): void {
    for (let p = 0; p < passes; p++) {
        let moved = false;
        for (const [i, j] of links) {
            const a = nodes[i], b = nodes[j];
            const ax = a.x + a.w / 2, ay = a.y + a.h / 2, bx = b.x + b.w / 2, by = b.y + b.h / 2;
            const ex = bx - ax, ey = by - ay, len2 = ex * ex + ey * ey || 1;
            for (let k = 0; k < nodes.length; k++) {
                if (k === i || k === j) continue;
                const c = nodes[k];
                const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
                const t = clamp(((cx - ax) * ex + (cy - ay) * ey) / len2, 0, 1);
                const px = ax + ex * t, py = ay + ey * t;
                let dx = cx - px, dy = cy - py, d = Math.hypot(dx, dy);
                const need = Math.min(c.w, c.h) / 2 + 40;
                if (d < need) {
                    if (d < 0.01) { const ang = (k * 2.399) % 6.283; dx = Math.cos(ang); dy = Math.sin(ang); d = 1; }
                    c.x += dx / d * (need - d); c.y += dy / d * (need - d); moved = true;
                }
            }
        }
        if (!moved) break;
        resolveOverlaps(nodes, 60);
    }
}
