import { F, tw } from './measure';
import { CARD_PHRASE, CARD_TEXT, type Entity, type Relation } from './types';

/* ══════════ geometria das arestas — funções PURAS (sem DOM) ══════════
   Tradução fiel do roteamento legado: âncoras nas faces, espalhamento,
   roteamento ortogonal H-V-H / V-H-V com canal escolhido por pontuação
   de colisão, contornos, laços (self), curvas de mindmap e sequência. */

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export interface EdgeGeom {
    key: string;
    /* 'life' = linha de vida (sequência); 'line' = aresta normal */
    kind: 'line' | 'life';
    rel?: Relation;
    aName?: string;
    bName?: string;
    entName?: string;
    dash?: boolean;
    /* path da linha */
    d: string;
    /* cabeça de seta da sequência (opcional) */
    arrow?: { d: string; x: number; y: number; rot: number };
    /* âncoras dos marcadores (pés de galinha / setas de classe) */
    ax: number; ay: number; aRot: number;
    bx: number; by: number; bRot: number;
    /* selos de cardinalidade (ER) — texto + posição */
    badgeA?: { x: number; y: number; text: string; tip: string };
    badgeB?: { x: number; y: number; text: string; tip: string };
    /* rótulo */
    label: string;
    lw: number;
    lx: number;
    ly: number;
}

interface Anchor { x: number; y: number; dx: number; dy: number }

export interface EdgeGeomInput {
    type: string;
    entities: Entity[];
    relations: Relation[];
    seqTop: number;
    seqStep: number;
    seqBottom?: number;
    /** compensação de zoom (símbolos não encolhem demais) */
    ms: number;
}

/* ── âncora no centro da face voltada para a outra entidade ── */
function anchor(a: Entity, b: Entity): Anchor {
    const dx = (b.x! + b.w! / 2) - (a.x! + a.w! / 2), dy = (b.y! + b.h! / 2) - (a.y! + a.h! / 2);
    if (Math.abs(dx) >= Math.abs(dy))
        return dx > 0 ? { x: a.x! + a.w!, y: a.y! + a.h! / 2, dx: 1, dy: 0 } : { x: a.x!, y: a.y! + a.h! / 2, dx: -1, dy: 0 };
    return dy > 0 ? { x: a.x! + a.w! / 2, y: a.y! + a.h!, dx: 0, dy: 1 } : { x: a.x! + a.w! / 2, y: a.y!, dx: 0, dy: -1 };
}

export function computeEdges(input: EdgeGeomInput): EdgeGeom[] {
    const { type, entities, relations, seqTop, seqStep, seqBottom, ms } = input;
    const byName = new Map(entities.map(e => [e.name, e]));
    const out: EdgeGeom[] = [];

    /* ══════ sequência: linhas de vida + mensagens horizontais ══════ */
    if (type === 'seq') {
        entities.forEach((e, i) => {
            out.push({
                key: 'life:' + e.name, kind: 'life', entName: e.name,
                d: `M${e.x! + e.w! / 2} ${e.h! + 6} L${e.x! + e.w! / 2} ${seqBottom || 600}`,
                label: '', lw: 0, lx: 0, ly: 0, ax: 0, ay: 0, aRot: 0, bx: 0, by: 0, bRot: 0,
            });
            void i;
        });
        for (const rel of relations) {
            const a = byName.get(rel.a)!, b = byName.get(rel.b)!;
            const y = seqTop + rel.idx! * seqStep;
            let d: string, arrow: EdgeGeom['arrow'], lx: number, ly: number;
            if (a === b) {
                const x = a.x! + a.w! / 2;
                d = `M${x} ${y} h60 a12 12 0 0 1 12 12 v6 a12 12 0 0 1 -12 12 h-60`;
                arrow = { d: 'M0 0 L-11 -5 L-9 0 L-11 5 Z', x: x + 2, y: y + 30, rot: 180 };
                lx = x + 45; ly = y - 6;
            } else {
                const ax = a.x! + a.w! / 2, bx = b.x! + b.w! / 2, dir = bx >= ax ? 1 : -1;
                d = `M${ax + dir * 2} ${y} L${bx - dir * 10} ${y}`;
                arrow = { d: 'M0 0 L-11 -5 L-9 0 L-11 5 Z', x: bx - dir * 2, y, rot: dir > 0 ? 0 : 180 };
                lx = (ax + bx) / 2; ly = y - 14;
            }
            out.push({
                key: 'rel:' + rel.a + '>' + rel.b + ':' + rel.idx, kind: 'line', rel,
                aName: rel.a, bName: rel.b, dash: rel.dash,
                d, arrow, label: rel.label, lw: tw(rel.label || ' ', F.label) + 16,
                lx, ly, ax: 0, ay: 0, aRot: 0, bx: 0, by: 0, bRot: 0,
            });
        }
        return out;
    }

    /* ══════ arenests gerais (er/flow/class/mindmap/c4) ══════ */
    const FACE_GAP = 42 * ms;
    const R = 9;
    const bo = 38 * ms, po = 14 * ms;

    const hHitM = (y: number, x1: number, x2: number, sa: Entity, sb: Entity, m: number) => entities.some(e => {
        if (e === sa || e === sb) return false;
        return y > e.y! - m && y < e.y! + e.h! + m && e.x! < Math.max(x1, x2) - 2 && e.x! + e.w! > Math.min(x1, x2) + 2;
    });
    const vHitM = (x: number, y1: number, y2: number, sa: Entity, sb: Entity, m: number) => entities.some(e => {
        if (e === sa || e === sb) return false;
        return x > e.x! - m && x < e.x! + e.w! + m && e.y! < Math.max(y1, y2) - 2 && e.y! + e.h! > Math.min(y1, y2) + 2;
    });
    const routeHVH = (A: Anchor, B: Anchor, sa: Entity, sb: Entity) => {
        const mid = (A.x + B.x) / 2, lo = Math.min(A.y, B.y), hi = Math.max(A.y, B.y);
        let best = mid, bestScore = Infinity;
        for (let d = 0; d <= 6000; d += 8) {
            for (const c of d ? [mid - d, mid + d] : [mid]) {
                let score = 0;
                if (vHitM(c, lo, hi, sa, sb, 14)) score++;
                if (hHitM(A.y, A.x, c, sa, sb, 4)) score++;
                if (hHitM(B.y, c, B.x, sa, sb, 4)) score++;
                if (!score) return { c, score: 0 };
                if (score < bestScore) { bestScore = score; best = c; }
            }
        }
        return { c: best, score: bestScore };
    };
    const routeVHV = (A: Anchor, B: Anchor, sa: Entity, sb: Entity) => {
        const mid = (A.y + B.y) / 2, lo = Math.min(A.x, B.x), hi = Math.max(A.x, B.x);
        let best = mid, bestScore = Infinity;
        for (let d = 0; d <= 6000; d += 8) {
            for (const c of d ? [mid - d, mid + d] : [mid]) {
                let score = 0;
                if (hHitM(c, lo, hi, sa, sb, 14)) score++;
                if (vHitM(A.x, A.y, c, sa, sb, 4)) score++;
                if (vHitM(B.x, c, B.y, sa, sb, 4)) score++;
                if (!score) return { c, score: 0 };
                if (score < bestScore) { bestScore = score; best = c; }
            }
        }
        return { c: best, score: bestScore };
    };
    const corridorBlocks = (A: Anchor, B: Anchor, sa: Entity, sb: Entity) => {
        const lo = Math.min(A.x, B.x) - 14, hi = Math.max(A.x, B.x) + 14;
        const lo2 = Math.min(A.y, B.y) - 14, hi2 = Math.max(A.y, B.y) + 14;
        return entities.filter(e => {
            if (e === sa || e === sb) return false;
            return !(e.x! + e.w! < lo || e.x! > hi || e.y! + e.h! < lo2 || e.y! > hi2);
        });
    };
    const rowBlocks = (x1: number, x2: number, y: number, sa: Entity, sb: Entity) => {
        const lo = Math.min(x1, x2), hi = Math.max(x1, x2);
        return entities.filter(e => {
            if (e === sa || e === sb) return false;
            return !(e.y! >= y || e.y! + e.h! <= y || e.x! + e.w! <= lo || e.x! >= hi);
        });
    };
    const colBlocks = (y1: number, y2: number, x: number, sa: Entity, sb: Entity) => {
        const lo = Math.min(y1, y2), hi = Math.max(y1, y2);
        return entities.filter(e => {
            if (e === sa || e === sb) return false;
            return !(e.x! >= x || e.x! + e.w! <= x || e.y! + e.h! <= lo || e.y! >= hi);
        });
    };
    /* H-V-H com dobra no canal `mid` (cantos arredondados) */
    const hvh = (x1: number, y1: number, mid: number, y2: number, x2: number) => {
        if (Math.abs(y2 - y1) < 1) return `M${x1} ${y1}H${x2}`;
        const sy = y2 > y1 ? 1 : -1;
        const r = Math.max(1, Math.min(R, Math.abs(mid - x1), Math.abs(x2 - mid), Math.abs(y2 - y1) / 2));
        return `M${x1} ${y1}H${mid - r}Q${mid} ${y1} ${mid} ${y1 + sy * r}V${y2 - sy * r}Q${mid} ${y2} ${mid + (x2 >= mid ? r : -r)} ${y2}H${x2}`;
    };
    /* V-H-V com dobra no canal `mid` */
    const vhv = (x1: number, y1: number, mid: number, x2: number, y2: number) => {
        if (Math.abs(x2 - x1) < 1) return `M${x1} ${y1}V${y2}`;
        const sx = x2 > x1 ? 1 : -1;
        const r = Math.max(1, Math.min(R, Math.abs(mid - y1), Math.abs(y2 - mid), Math.abs(x2 - x1) / 2));
        return `M${x1} ${y1}V${mid - r}Q${x1} ${mid} ${x1 + sx * r} ${mid}H${x2 - sx * r}Q${x2} ${mid} ${x2} ${mid + (y2 >= mid ? r : -r)}V${y2}`;
    };
    const detourH = (x1: number, y: number, x2: number, blocks: Entity[]) => {
        const sx = x2 > x1 ? 1 : -1;
        const top = Math.min(...blocks.map(t => t.y!)), bot = Math.max(...blocks.map(t => t.y! + t.h!));
        const yd = Math.abs(y - (top - 46)) <= Math.abs((bot + 46) - y) ? top - 46 : bot + 46;
        const off1 = x1 + sx * 26, off2 = x2 - sx * 26, sy = yd > y ? 1 : -1, r = Math.min(R, 24);
        return {
            d: `M${x1} ${y}H${off1 - sx * r}Q${off1} ${y} ${off1} ${y + sy * r}V${yd - sy * r}Q${off1} ${yd} ${off1 + sx * r} ${yd}H${off2 - sx * r}Q${off2} ${yd} ${off2} ${yd - sy * r}V${y + sy * r}Q${off2} ${y} ${off2 + sx * r} ${y}H${x2}`,
            yd,
        };
    };
    const detourV = (x: number, y1: number, y2: number, blocks: Entity[]) => {
        const sy = y2 > y1 ? 1 : -1;
        const left = Math.min(...blocks.map(t => t.x!)), right = Math.max(...blocks.map(t => t.x! + t.w!));
        const xd = Math.abs(x - (left - 46)) <= Math.abs((right + 46) - x) ? left - 46 : right + 46;
        const off1 = y1 + sy * 26, off2 = y2 - sy * 26, sx = xd > x ? 1 : -1, r = Math.min(R, 24);
        return {
            d: `M${x} ${y1}V${off1 - sy * r}Q${x} ${off1} ${x + sx * r} ${off1}H${xd - sx * r}Q${xd} ${off1} ${xd} ${off1 + sy * r}V${off2 - sy * r}Q${xd} ${off2} ${xd - sx * r} ${off2}H${x + sx * r}Q${x} ${off2} ${x} ${off2 + sy * r}V${y2}`,
            xd,
        };
    };
    /* desloca a âncora ao longo da face (vertical: eixo y; horizontal: eixo x) */
    const spread = (P: Anchor, ent: Entity, off: number): Anchor => {
        if (!off) return P;
        const lim = (P.dx ? ent.h! : ent.w!) / 2 - 16;
        const o = clamp(off, -lim, lim);
        return P.dx ? { x: P.x, y: P.y + o, dx: P.dx, dy: P.dy } : { x: P.x + o, y: P.y, dx: P.dx, dy: P.dy };
    };

    interface Item {
        rel: Relation; a: Entity; b: Entity; self: boolean;
        A: Anchor; B: Anchor; aOff: number; bOff: number;
        mmCurve?: [Anchor, Anchor];
    }
    const items: Item[] = [];
    /* várias ligações na mesma face: espalha âncoras (pass 1) */
    const groups = new Map<string, { it: Item; side: 'a' | 'b' }[]>();

    for (const rel of relations) {
        const a = byName.get(rel.a), b = byName.get(rel.b);
        if (!a || !b) continue;
        const self = rel.a === rel.b;
        let A: Anchor, B: Anchor;
        if (self) {
            A = { x: a.x! + a.w!, y: a.y! + a.h! * 0.32, dx: 1, dy: 0 };
            B = { x: a.x! + a.w!, y: a.y! + a.h! * 0.68, dx: 1, dy: 0 };
        } else {
            A = anchor(a, b); B = anchor(b, a);
        }
        const it: Item = { rel, a, b, self, A, B, aOff: 0, bOff: 0 };
        items.push(it);
        if (!self && !rel.mm) {
            for (const [ent, P, side] of [[a, it.A, 'a'], [b, it.B, 'b']] as const) {
                const k = ent.name + '|' + P.dx + ',' + P.dy;
                if (!groups.has(k)) groups.set(k, []);
                groups.get(k)!.push({ it, side });
            }
        }
    }
    for (const list of groups.values()) {
        list.forEach((g, i) => {
            const off = (i - (list.length - 1) / 2) * FACE_GAP;
            if (g.side === 'a') g.it.aOff = off; else g.it.bOff = off;
        });
    }

    /* canais coincidentes (linhas paralelas) ganham desvio de 12px */
    interface Routed extends Item {
        pA: Anchor; pB: Anchor; chan: { c: number; score: number } | null;
    }
    const routed: Routed[] = [];
    for (const it of items) {
        const pA = spread(it.A, it.a, it.aOff);
        const pB = spread(it.B, it.b, it.bOff);
        const rit: Routed = { ...it, pA, pB, chan: null };
        routed.push(rit);
        if (rit.self || rit.rel.mm) continue;
        if (pA.dx !== 0 && pB.dx !== 0) rit.chan = routeHVH(pA, pB, it.a, it.b);
        else if (pA.dy !== 0 && pB.dy !== 0) rit.chan = routeVHV(pA, pB, it.a, it.b);
    }
    const bins = new Map<number, Routed[]>();
    for (const it of routed) {
        if (it.chan == null) continue;
        const k = Math.round(it.chan.c / 8);
        if (!bins.has(k)) bins.set(k, []);
        bins.get(k)!.push(it);
    }
    for (const g of bins.values()) g.forEach((it, i) => { it.chan!.c += (i - (g.length - 1) / 2) * 12; });

    /* pass 2: monta caminhos, marcadores, selos e rótulos (anti-colisão) */
    const placed: { x: number; y: number; w: number; h: number }[] = [];
    const placedBadges: { x: number; y: number; w: number }[] = [];
    const boxOf = (x: number, y: number, w: number) => ({ x: x - w / 2 - 4, y: y - 12, w: w + 8, h: 24 });
    const hit = (bx: { x: number; y: number; w: number; h: number }) =>
        placed.some(p => Math.abs(bx.x - p.x) < (bx.w + p.w) / 2 && Math.abs(bx.y - p.y) < (bx.h + p.h) / 2);
    const rotDeg = (P: Anchor) => Math.atan2(P.dy, P.dx) * 180 / Math.PI;

    routed.forEach((it, idx) => {
        const rel = it.rel;
        const A = { ...it.pA }, B = { ...it.pB };
        let d: string, lx: number, ly: number;
        if (it.self) {
            const dist = Math.hypot(B.x - A.x, B.y - A.y);
            const off = clamp(dist * 0.45, 40, 150);
            const c1x = A.x + A.dx * off, c1y = A.y + A.dy * off, c2x = B.x + B.dx * off, c2y = B.y + B.dy * off;
            d = `M${A.x} ${A.y}C${c1x} ${c1y} ${c2x} ${c2y} ${B.x} ${B.y}`;
            lx = (A.x + 3 * c1x + 3 * c2x + B.x) / 8; ly = (A.y + 3 * c1y + 3 * c2y + B.y) / 8;
        } else if (rel.mm) {
            /* galho do mindmap: bezier horizontal */
            const A0 = anchor(it.a, it.b), B0 = anchor(it.b, it.a);
            const k = clamp(Math.abs(B0.x - A0.x) * 0.45, 30, 120);
            d = `M${A0.x} ${A0.y} C${A0.x + A0.dx * k} ${A0.y} ${B0.x - A0.dx * k} ${B0.y} ${B0.x} ${B0.y}`;
            lx = (A0.x + B0.x) / 2; ly = (A0.y + B0.y) / 2;
            A.x = A0.x; A.y = A0.y; A.dx = A0.dx; A.dy = A0.dy;
            B.x = B0.x; B.y = B0.y; B.dx = B0.dx; B.dy = B0.dy;
        } else if (A.dx !== 0 && B.dx !== 0) {
            /* faces verticais com sobreposição de altura → linha reta */
            const oLo = Math.max(it.a.y!, it.b.y!) + 16, oHi = Math.min(it.a.y! + it.a.h!, it.b.y! + it.b.h!) - 16;
            const sy = clamp((A.y + B.y) / 2, oLo, Math.max(oLo, oHi));
            const canStraight = oHi > oLo && !hHitM(sy, A.x, B.x, it.a, it.b, 2);
            if (Math.abs(A.y - B.y) < 1) {
                const blocks = rowBlocks(A.x, B.x, A.y, it.a, it.b);
                if (blocks.length) {
                    const det = detourH(A.x, A.y, B.x, blocks);
                    d = det.d; lx = (A.x + B.x) / 2; ly = det.yd;
                } else { d = `M${A.x} ${A.y}H${B.x}`; lx = (A.x + B.x) / 2; ly = A.y; }
            } else if (canStraight) {
                A.y = sy; B.y = sy;
                d = `M${A.x} ${sy}H${B.x}`; lx = (A.x + B.x) / 2; ly = sy;
            } else {
                const res = routeHVH(A, B, it.a, it.b);
                if (res.score) {
                    const blocks = corridorBlocks(A, B, it.a, it.b);
                    if (blocks.length) {
                        const sx = B.x > A.x ? 1 : -1, r = Math.min(R, 24);
                        const top = Math.min(...blocks.map(t => t.y!)), bot = Math.max(...blocks.map(t => t.y! + t.h!));
                        const midY = (A.y + B.y) / 2;
                        const yd = Math.abs(midY - (top - 46)) <= Math.abs((bot + 46) - midY) ? top - 46 : bot + 46;
                        const off1 = A.x + sx * 26, off2 = B.x - sx * 26;
                        const sy1 = yd > A.y ? 1 : -1, sy2 = yd > B.y ? -1 : 1;
                        d = `M${A.x} ${A.y}H${off1 - sx * r}Q${off1} ${A.y} ${off1} ${A.y + sy1 * r}V${yd - sy1 * r}Q${off1} ${yd} ${off1 + sx * r} ${yd}H${off2 - sx * r}Q${off2} ${yd} ${off2} ${yd + sy2 * r}V${B.y - sy2 * r}Q${off2} ${B.y} ${off2 + sx * r} ${B.y}H${B.x}`;
                        lx = (off1 + off2) / 2; ly = yd;
                    } else { d = hvh(A.x, A.y, res.c, B.y, B.x); lx = res.c; ly = (A.y + B.y) / 2; }
                } else { d = hvh(A.x, A.y, res.c, B.y, B.x); lx = res.c; ly = (A.y + B.y) / 2; }
            }
        } else if (A.dy !== 0 && B.dy !== 0) {
            /* faces horizontais com sobreposição de largura → linha reta */
            const oLo = Math.max(it.a.x!, it.b.x!) + 16, oHi = Math.min(it.a.x! + it.a.w!, it.b.x! + it.b.w!) - 16;
            const sx = clamp((A.x + B.x) / 2, oLo, Math.max(oLo, oHi));
            const canStraight = oHi > oLo && !vHitM(sx, A.y, B.y, it.a, it.b, 2);
            if (Math.abs(A.x - B.x) < 1) {
                A.x = B.x; /* âncora A acompanha o spread de B */
                const blocks = colBlocks(A.y, B.y, A.x, it.a, it.b);
                if (blocks.length) {
                    const det = detourV(A.x, A.y, B.y, blocks);
                    d = det.d; lx = det.xd; ly = (A.y + B.y) / 2;
                } else { d = `M${A.x} ${A.y}V${B.y}`; lx = A.x; ly = (A.y + B.y) / 2; }
            } else if (canStraight) {
                A.x = sx; B.x = sx;
                d = `M${sx} ${A.y}V${B.y}`; lx = sx; ly = (A.y + B.y) / 2;
            } else {
                const res = routeVHV(A, B, it.a, it.b);
                if (res.score) {
                    const blocks = corridorBlocks(A, B, it.a, it.b);
                    if (blocks.length) {
                        const sy = B.y > A.y ? 1 : -1, r = Math.min(R, 24);
                        const left = Math.min(...blocks.map(t => t.x!)), right = Math.max(...blocks.map(t => t.x! + t.w!));
                        const midX = (A.x + B.x) / 2;
                        const xd = Math.abs(midX - (left - 46)) <= Math.abs((right + 46) - midX) ? left - 46 : right + 46;
                        const off1 = A.y + sy * 26, off2 = B.y - sy * 26;
                        const sx1 = xd > A.x ? 1 : -1, sx2 = xd > B.x ? -1 : 1;
                        d = `M${A.x} ${A.y}V${off1 - sy * r}Q${A.x} ${off1} ${A.x + sx1 * r} ${off1}H${xd - sx1 * r}Q${xd} ${off1} ${xd} ${off1 + sy * r}V${off2 - sy * r}Q${xd} ${off2} ${xd + sx2 * r} ${off2}H${B.x - sx2 * r}Q${B.x} ${off2} ${B.x} ${off2 + sy * r}V${B.y}`;
                        lx = xd; ly = (off1 + off2) / 2;
                    } else { d = vhv(A.x, A.y, res.c, B.x, B.y); lx = (A.x + B.x) / 2; ly = res.c; }
                } else { d = vhv(A.x, A.y, res.c, B.x, B.y); lx = (A.x + B.x) / 2; ly = res.c; }
            }
        } else if (A.dx !== 0) {
            d = hvh(A.x, A.y, B.x, B.y, B.x);
            lx = B.x; ly = (A.y + B.y) / 2;
        } else {
            d = vhv(A.x, A.y, B.y, B.x, B.y);
            lx = (A.x + B.x) / 2; ly = B.y;
        }

        /* rótulo: anti-colisão entre rótulos */
        const lw = tw(rel.label || ' ', F.label) + 16;
        const bx0 = boxOf(lx, ly, lw);
        if (hit(bx0)) {
            for (const dd of [-26, 26, -52, 52, -78, 78]) {
                if (!hit(boxOf(lx, ly + dd, lw))) { ly = ly + dd; break; }
            }
        }
        placed.push(boxOf(lx, ly, lw));

        /* selos de cardinalidade (ER): nunca sobre outro selo nem sobre rótulo */
        let badgeA: EdgeGeom['badgeA'], badgeB: EdgeGeom['badgeB'];
        if (!rel.simple) {
            const coll = (x: number, y: number, w: number) =>
                placedBadges.some(p => Math.abs(x - p.x) < (w + p.w) / 2 + 4 && Math.abs(y - p.y) < 20)
                || placed.some(p => Math.abs(x - p.x) < (w / ms + p.w) / 2 + 4 && Math.abs(y - p.y / ms) < 20);
            const put = (P: Anchor, text: string) => {
                const w = (tw(text, F.card) + 10) * ms;
                const x0 = P.x + P.dx * bo + P.dy * po, y0 = P.y + P.dy * bo - P.dx * po;
                let px = x0, py = y0;
                if (coll(px, py, w)) {
                    for (const extra of [16, 32, 48, 64, 80]) {
                        const nx = P.x + P.dx * (bo + extra) + P.dy * po, ny = P.y + P.dy * (bo + extra) - P.dx * po;
                        if (!coll(nx, ny, w)) { px = nx; py = ny; break; }
                    }
                    if (coll(px, py, w)) {
                        for (const per of [26, -26, 52, -52, 78, -78]) {
                            const nx = x0 + P.dy * per, ny = y0 - P.dx * per;
                            if (!coll(nx, ny, w)) { px = nx; py = ny; break; }
                        }
                    }
                }
                placedBadges.push({ x: px, y: py, w });
                return { x: px, y: py };
            };
            const pa = put(A, CARD_TEXT[rel.ac!]);
            const pb = put(B, CARD_TEXT[rel.bc!]);
            badgeA = { ...pa, text: CARD_TEXT[rel.ac!], tip: `cada ${rel.b} se liga a ${CARD_PHRASE[rel.ac!]} ${rel.a}` };
            badgeB = { ...pb, text: CARD_TEXT[rel.bc!], tip: `cada ${rel.a} tem ${CARD_PHRASE[rel.bc!]} ${rel.b}` };
        }

        out.push({
            key: 'rel:' + rel.a + '>' + rel.b + ':' + idx,
            kind: 'line', rel, aName: rel.a, bName: rel.b, dash: rel.dash,
            d, ax: A.x, ay: A.y, aRot: rotDeg(A), bx: B.x, by: B.y, bRot: rotDeg(B),
            badgeA, badgeB,
            label: rel.label, lw, lx, ly,
        });
    });

    return out;
}
