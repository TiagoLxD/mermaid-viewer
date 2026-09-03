import { resolveOverlaps, type Box } from './drag-geom';
import { edgeClearance } from './layout-clearance';

type LNode = Box & { [k: string]: any };
type Link = [number, number];
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const GAP_X = 156, GAP_Y = 145;

/* ══════════ layout do diagrama — funções PURAS (sem DOM) ══════════ */
/* modo Forças — grafo físico com repulsão ciente do tamanho */
function forceInto(nodes: LNode[], links: Link[], fromCurrent: boolean) {
    const n = nodes.length;
    if (!fromCurrent) {
        const R = Math.max(280, n * 50);
        nodes.forEach((nd, i) => { const a = i / n * Math.PI * 2 - Math.PI / 2; nd.x = Math.cos(a) * R * 1.6; nd.y = Math.sin(a) * R * 1.05; });
    }
    const desired = clamp(nodes.reduce((s, d) => s + d.w + d.h, 0) / n / 1.5, 300, 430);
    const cx0 = nodes.reduce((s, d) => s + d.x, 0) / n, cy0 = nodes.reduce((s, d) => s + d.y, 0) / n;
    const iters = 560;
    for (let it = 0; it < iters; it++) {
        const cool = 1 - it / iters, cap = 8 + 85 * cool;
        const fx = new Float64Array(n), fy = new Float64Array(n);
        for (let i = 0; i < n; i++)for (let j = i + 1; j < n; j++) {
            const a = nodes[i], b = nodes[j];
            const dx = (a.x + a.w / 2) - (b.x + b.w / 2), dy = (a.y + a.h / 2) - (b.y + b.h / 2);
            const d = Math.sqrt(dx * dx + dy * dy) + 0.01;
            const sepX = (a.w + b.w) / 2 + GAP_X, sepY = (a.h + b.h) / 2 + GAP_Y;
            const sep = Math.hypot(sepX, sepY);
            if (d < sep * 2.1) {
                const overlap = (sepX - Math.abs(dx) > 0) && (sepY - Math.abs(dy) > 0);
                const f = (sep * sep) / (d * d) * 90 * (overlap ? 2.4 : 1);
                const ux = dx / d * f, uy = dy / d * f;
                fx[i] += ux; fy[i] += uy; fx[j] -= ux; fy[j] -= uy;
            }
        }
        for (const [i, j] of links) {
            const a = nodes[i], b = nodes[j];
            const dx = (b.x + b.w / 2) - (a.x + a.w / 2), dy = (b.y + b.h / 2) - (a.y + a.h / 2);
            const d = Math.sqrt(dx * dx + dy * dy) + 0.01;
            const f = (d - desired) * 0.09, ux = dx / d * f, uy = dy / d * f;
            fx[i] += ux; fy[i] += uy; fx[j] -= ux; fy[j] -= uy;
            /* viés de leitura: a tabela “filha” (lado B, onde fica a FK)
               desliza suavemente para baixo da “pai” — reduz cruzamentos
               e dá hierarquia ao modo forças sem engessar */
            const bias = 7 * (0.35 + cool);
            fy[i] -= bias; fy[j] += bias;
        }
        for (let i = 0; i < n; i++) {
            fx[i] += (cx0 - nodes[i].x) * 0.02; fy[i] += (cy0 - nodes[i].y) * 0.02;
            nodes[i].x += clamp(fx[i], -cap, cap); nodes[i].y += clamp(fy[i], -cap, cap);
        }
    }
}

/* modo Camadas — hierarquia de cima para baixo (pais → filhas),
   colunas ordenadas por barycenter para reduzir cruzamentos */
function layeredInto(nodes: LNode[], links: Link[], n: number, GX = GAP_X, GY = GAP_Y) {
    const GAP_X = GX; /* GY entra direto no empilhamento das linhas */
    const succ: number[][] = Array.from({ length: n }, () => []), pred: number[][] = Array.from({ length: n }, () => []);
    for (const [i, j] of links) { succ[i].push(j); pred[j].push(i); }
    const level = new Array(n).fill(0);
    let changed = true, guard = 0;
    while (changed && guard++ <= n + 2) {
        changed = false;
        for (let i = 0; i < n; i++)for (const p of pred[i])
            if (level[p] + 1 > level[i]) { level[i] = level[p] + 1; changed = true; }
    }
    const rows: number[][] = Array.from({ length: Math.max(...level) + 1 }, () => []);
    nodes.forEach((_, i) => rows[level[i]].push(i));
    for (const row of rows) row.sort((a, b) => (nodes[a].x ?? 0) - (nodes[b].x ?? 0));
    const xIdx: number[] = new Array(n).fill(0);
    rows.forEach(row => row.forEach((i, ord) => xIdx[i] = ord));
    for (let sweep = 0; sweep < 8; sweep++) {
        const down = sweep % 2 === 0;
        for (const row of (down ? rows : [...rows].reverse())) {
            const keys = row.map(i => {
                const nb = down ? pred[i] : succ[i];
                return nb.length ? nb.reduce((s, x) => s + xIdx[x], 0) / nb.length : xIdx[i];
            });
            row.map((i, k) => [i, keys[k]])
                .sort((a, b) => a[1] - b[1] || a[0] - b[0])
                .forEach(([i], ord) => { row[ord] = i; xIdx[i] = ord; });
        }
    }
    const posX = rows.map(row => {
        let x = 0; return row.map(i => { const v = x; x += nodes[i].w + GX; return v; });
    });
    for (let it = 0; it < 24; it++) {
        rows.forEach((row, r) => {
            row.forEach((i, k) => {
                const nb = [...pred[i], ...succ[i]];
                if (nb.length) {
                    const cx = nb.reduce((s, x) => s + posX[level[x]][xIdx[x]] + nodes[x].w / 2, 0) / nb.length;
                    posX[r][k] += (cx - nodes[i].w / 2 - posX[r][k]) * 0.5;
                }
            });
            /* separação primeiro: o max-pass abre espaço movendo o
               vizinho esquerdo, para o pull abaixo não bater nele */
            for (let k = 1; k < row.length; k++) {
                const min = posX[r][k - 1] + nodes[row[k - 1]].w + GX;
                if (posX[r][k] < min) posX[r][k] = min;
            }
            for (let k = row.length - 2; k >= 0; k--) {
                const max = posX[r][k + 1] - nodes[row[k]].w - GX;
                if (posX[r][k] > max) posX[r][k] = max;
            }
            /* pai com filhos em linhas distantes: desliza até o eixo
               deles por último — na próxima iteração o max-pass abre
               o espaço que faltar movendo os vizinhos */
            row.forEach((i, k) => {
                const dist = succ[i].filter(x => level[x] !== level[i] + 1);
                if (dist.length) {
                    const cx2 = dist.reduce((s, x) => s + posX[level[x]][xIdx[x]] + nodes[x].w / 2, 0) / dist.length;
                    posX[r][k] += (cx2 - nodes[i].w / 2 - posX[r][k]) * 0.12;
                }
            });
        });
    }
    /* agrupa a família: pais com MENOS filhos reivindicam primeiro
       (o pai solitário ancora o filho embaixo dele), e qualquer filho
       pode ser agrupado — cada filho pertence a um só pai */
    const claimed = new Set<number>();
    const parentsList: [number, number][] = [];
    rows.forEach((row, r) => row.forEach(i => { if (succ[i].length) parentsList.push([r, i]); }));
    parentsList.sort((a, b) => succ[a[1]].length - succ[b[1]].length);
    for (const [r, i] of parentsList) {
        const kids = succ[i].filter(k => !claimed.has(k));
        if (!kids.length) continue;
        kids.forEach(k => claimed.add(k));
        kids.sort((a, b) => posX[level[a]][xIdx[a]] - posX[level[b]][xIdx[b]]);
        const totalW = kids.reduce((s, k) => s + nodes[k].w, 0) + GX * (kids.length - 1);
        let start = posX[r][xIdx[i]] + nodes[i].w / 2 - totalW / 2;
        for (const k of kids) {
            const rr = level[k], kk = xIdx[k];
            const min = kk > 0 ? posX[rr][kk - 1] + nodes[rows[rr][kk - 1]].w + GX : -Infinity;
            const x = Math.max(start, min);
            posX[rr][kk] = x;
            start = x + nodes[k].w + GX;
        }
    }
    /* alinhamento pai↔filho distante + separação, iterando até estabilizar.
       O max-pass é essencial: abre espaço puxando os vizinhos esquerdos */
    for (let rep = 0; rep < 24; rep++) {
        rows.forEach((row, r) => {
            for (const i of row) {
                const others = succ[i].filter(k => level[k] !== level[i] + 1);
                if (!others.length) continue;
                const cx = others.reduce((s, k) => s + posX[level[k]][xIdx[k]] + nodes[k].w / 2, 0) / others.length;
                const want = cx - nodes[i].w / 2;
                const k = xIdx[i];
                /* se o pai precisa passar da esquerda, o prefixo inteiro
                   da linha desliza junto (gaps internos preservados) */
                if (k > 0) {
                    const limit = posX[r][k - 1] + nodes[row[k - 1]].w + GAP_X;
                    if (want < limit) for (let j = 0; j < k; j++) posX[r][j] -= limit - want;
                }
                posX[r][k] = want;
            }
            for (let k = 1; k < row.length; k++) {
                const min = posX[r][k - 1] + nodes[row[k - 1]].w + GAP_X;
                if (posX[r][k] < min) posX[r][k] = min;
            }
            for (let k = row.length - 2; k >= 0; k--) {
                const max = posX[r][k + 1] - nodes[row[k]].w - GAP_X;
                if (posX[r][k] > max) posX[r][k] = max;
            }
        });
    }
    /* offset ÚNICO para todas as linhas: qualquer diferença de off
       entre linhas quebraria os eixos pai↔filho já alinhados */
    const widths = posX.map((row, r) => row.length ? row[row.length - 1] + nodes[rows[r][row.length - 1]].w : 0);
    const maxW = Math.max(0, ...widths);
    const off = (maxW - Math.max(...widths)) / 2;
    let y = 0;
    rows.forEach((row, r) => {
        const h = row.length ? Math.max(...row.map(i => nodes[i].h)) : 0;
        row.forEach((i, k) => { nodes[i].x = posX[r][k] + off; nodes[i].y = y + (h - nodes[i].h) / 2; });
        y += h + GY;
    });
}

/* modo Compacta — grade densa; conectadas ficam vizinhas via BFS por grau */
function compactInto(nodes: LNode[], links: Link[], n: number) {
    const adjL: number[][] = Array.from({ length: n }, () => []);
    const deg = new Array(n).fill(0);
    for (const [i, j] of links) { adjL[i].push(j); adjL[j].push(i); deg[i]++; deg[j]++; }
    const seen = new Array(n).fill(false), order: number[] = [];
    for (const s of [...Array(n).keys()].sort((a, b) => deg[b] - deg[a])) {
        if (seen[s]) continue;
        const q: number[] = [s]; seen[s] = true;
        while (q.length) {
            const i = q.shift()!; order.push(i);
            for (const j of adjL[i]) if (!seen[j]) { seen[j] = true; q.push(j); }
        }
    }
    const cols = Math.ceil(Math.sqrt(n)), nrows = Math.ceil(n / cols);
    const colW = new Array(cols).fill(0), rowH = new Array(nrows).fill(0);
    order.forEach((idx, k) => {
        colW[k % cols] = Math.max(colW[k % cols], nodes[idx].w);
        rowH[Math.floor(k / cols)] = Math.max(rowH[Math.floor(k / cols)], nodes[idx].h);
    });
    const colX: number[] = []; let x = 0; for (let c = 0; c < cols; c++) { colX[c] = x; x += colW[c] + GAP_X; }
    const rowY: number[] = []; let y = 0; for (let r = 0; r < nrows; r++) { rowY[r] = y; y += rowH[r] + GAP_Y; }
    order.forEach((idx, k) => {
        const r = Math.floor(k / cols), c = k % cols;
        nodes[idx].x = colX[c] + (colW[c] - nodes[idx].w) / 2;
        nodes[idx].y = rowY[r] + (rowH[r] - nodes[idx].h) / 2;
    });
}

/* alinhamento em eixos: repete até estabilizar (nada mais se move) */
function alignPass(nodes: LNode[]) {
    for (let rep = 0; rep < 60; rep++) {
        const before = nodes.map(nd => nd.x.toFixed(1) + ',' + nd.y.toFixed(1)).join(';');
        for (const axis of ['x', 'y']) {
            const size = axis === 'x' ? 'w' : 'h';
            const c = nodes.map(nd => nd[axis] + nd[size] / 2);
            const order = [...nodes.keys()].sort((a, b) => c[a] - c[b]);
            let i = 0;
            while (i < order.length) {
                let j = i;
                while (j + 1 < order.length && c[order[j + 1]] - c[order[i]] < 46) j++;
                const group = order.slice(i, j + 1);
                if (group.length > 1) {
                    const mean = group.reduce((s, k) => s + c[k], 0) / group.length;
                    for (const k of group) nodes[k][axis] += mean - c[k];
                }
                i = j + 1;
            }
        }
        resolveOverlaps(nodes, 60);
        const after = nodes.map(nd => nd.x.toFixed(1) + ',' + nd.y.toFixed(1)).join(';');
        if (after === before) break;
    }
}

/* modo Mindmap — árvore clássica: folhas empilhadas, pai centrado nos
   filhos, subárvores sem sobreposição → ramos nunca se cruzam.
   Cada raiz/ramo ganha uma cor (usada na renderização). */
function mindTreeInto(nodes: LNode[], links: Link[], n: number) {
    const children: number[][] = Array.from({ length: n }, () => []);
    const indeg = new Array(n).fill(0);
    for (const [i, j] of links) { if (i !== j) { children[i].push(j); indeg[j]++; } }
    const roots = [...Array(n).keys()].filter(i => !indeg[i]);
    if (!roots.length) roots.push(0);
    const visited = new Set<number>();
    const V_GAP = 34, H_GAP = 110;
    let colorN = 0;
    /* posiciona a subárvore i com folhas empilhadas a partir de cur.y;
       devolve yc do nó e anota os membros em bag */
    const walk = (i: number, depth: number, color: number, cur: { y: number }, bag: number[]) => {
        visited.add(i);
        bag.push(i);
        const nd = nodes[i];
        nd.depth = depth; nd.color = color;
        const kids = children[i].filter(k => !visited.has(k));
        if (!kids.length) {
            nd.yc = cur.y + nd.h / 2;
            cur.y += nd.h + V_GAP;
        } else {
            /* filhos diretos da raiz iniciam um novo ramo (cor própria);
               descendentes herdam a cor do ramo */
            const ys = kids.map(k => walk(k, depth + 1, depth === 0 ? colorN++ : color, cur, bag));
            nd.yc = (ys[0] + ys[ys.length - 1]) / 2;
        }
        return nd.yc;
    };
    /* cada ramo de topo vira uma subárvore independente (coords relativas);
       ramos alternam lado: 1º direita, 2º esquerda, 3º direita… */
    const branches: { bag: number[]; h: number; side: number; root: number }[] = [];
    for (const r of roots) {
        visited.add(r);
        Object.assign(nodes[r], { depth: 0, color: -1 });
        const kids = children[r].filter(k => !visited.has(k));
        kids.forEach(k => {
            const bag: number[] = [], cur = { y: 0 };
            walk(k, 1, colorN++, cur, bag);
            branches.push({ bag, h: cur.y, side: branches.length % 2, root: r });
        });
        if (!kids.length) nodes[r].yc = 0;
    }
    /* empilha cada lado centrado no eixo da raiz */
    const hgt = (list: { h: number }[]) => list.reduce((s, b) => s + b.h, 0) + V_GAP * Math.max(0, list.length - 1);
    for (const side of [0, 1]) {
        const list = branches.filter(b => b.side === side);
        let y = -hgt(list) / 2;
        for (const b of list) {
            for (const i of b.bag) nodes[i].yc += y;
            y += b.h + V_GAP;
        }
    }
    /* raiz centrada no meio vertical dos ramos dela */
    for (const r of roots) {
        const ys = branches.filter(b => b.root === r).map(b => nodes[b.bag[0]].yc);
        if (ys.length) nodes[r].yc = (Math.min(...ys) + Math.max(...ys)) / 2;
    }
    /* colunas por profundidade (à direita); lado esquerdo espelha */
    const colW = new Map();
    for (const nd of nodes) {
        if (nd.depth == null) { nd.depth = 0; nd.color = -1; }
        colW.set(nd.depth, Math.max(colW.get(nd.depth) || 0, nd.w));
    }
    let x = 0; const colX = new Map<number, number>();
    [...colW.keys()].sort((a, b) => a - b).forEach(d => { colX.set(d, x); x += colW.get(d) + H_GAP; });
    const W0 = colW.get(0) || 0;
    for (const b of branches)
        for (const i of b.bag) nodes[i].sideL = !!b.side;
    for (const nd of nodes) {
        nd.x = nd.sideL ? W0 - (colX.get(nd.depth) ?? 0) - nd.w : (colX.get(nd.depth) ?? 0);
        nd.y = nd.yc - nd.h / 2;
    }
}

export function layoutPositions(entities: any[], relations: any[], fromCurrent: boolean, mode = 'force', type = 'er', pieTotal = 0) {
    const n = entities.length; if (!n) return new Map();
    /* sequência: participantes espalhados em linha, ordem de declaração */
    if (entities.some(e => e.seq)) {
        const out = new Map();
        let x = 90;
        for (const e of entities) { out.set(e.name, { x: Math.round(x), y: 40 }); x += e.w + 100; }
        return out;
    }
    /* mindmap: árvore clássica sempre — ocultos (ramos recolhidos) saem
       do layout e recebem posição fora da área visível */
    if (type === 'mindmap') {
        const vis = entities.map((e, i) => ({ e, i })).filter(x => !x.e.hidden);
        const idx = new Map(vis.map((x, k) => [x.e.name, k]));
        const tn: LNode[] = vis.map(x => ({ name: x.e.name, x: 0, y: 0, w: x.e.w, h: x.e.h }));
        const tl: Link[] = [];
        for (const r of relations) { const a = idx.get(r.a), b = idx.get(r.b); if (a != null && b != null && a !== b) tl.push([a, b]); }
        mindTreeInto(tn, tl, tn.length);
        vis.forEach((x, k) => { x.e.mmColor = tn[k].color; x.e.mmDepth = tn[k].depth; });
        let mnX = Infinity, mnY = Infinity;
        for (const nd of tn) { mnX = Math.min(mnX, nd.x); mnY = Math.min(mnY, nd.y); }
        const out = new Map();
        vis.forEach((x, k) => out.set(x.e.name, {
            x: Math.round((tn[k].x - mnX + 70) / 8) * 8,
            y: Math.round((tn[k].y - mnY + 70) / 8) * 8
        }));
        return out;
    }
    /* pizza: fatias ao redor do centro (sempre re-layouta) */
    if (type === 'pie') {
        const out = new Map();
        const title = entities.find(e => e.pieTitle);
        const slices = entities.filter(e => !e.pieTitle);
        const total = pieTotal || 1;
        const R = clamp(110 + Math.sqrt(total) * 10, 150, 320);
        if (title) out.set(title.name, { x: Math.round(-title.w / 2), y: Math.round(-R - 70 - title.h) });
        const PAD = 16;
        let a0 = -Math.PI / 2;
        slices.forEach((s, i) => {
            const frac = s.value / total, a1 = a0 + frac * Math.PI * 2;
            s.frac = frac; s.pieCls = 'pie-c' + (i % 8);
            s.midA = (a0 + a1) / 2;
            /* caminho em coords centradas no eixo da pizza */
            const x0 = Math.cos(a0) * R, y0 = Math.sin(a0) * R, x1 = Math.cos(a1) * R, y1 = Math.sin(a1) * R;
            if (frac >= 0.9999) {
                s.slicePath = `M0 ${-R} A${R} ${R} 0 1 1 0 ${R} A${R} ${R} 0 1 1 0 ${-R} Z`;
                s.mnX = -R; s.mnY = -R; s.mxX = R; s.mxY = R;
            } else {
                s.slicePath = `M0 0 L${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 ${frac > 0.5 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
                let mnX = 0, mnY = 0, mxX = 0, mxY = 0;
                const consider = (x: number, y: number) => { mnX = Math.min(mnX, x); mxX = Math.max(mxX, x); mnY = Math.min(mnY, y); mxY = Math.max(mxY, y); };
                consider(x0, y0); consider(x1, y1);
                for (let k = 0; k < 4; k++) {
                    const ak = -Math.PI / 2 + k * Math.PI / 2;
                    if (((ak - a0 + Math.PI * 2) % (Math.PI * 2)) <= a1 - a0)
                        consider(Math.cos(ak) * R, Math.sin(ak) * R);
                }
                s.mnX = mnX; s.mnY = mnY; s.mxX = mxX; s.mxY = mxY;
            }
            s.ox = PAD - s.mnX; s.oy = PAD - s.mnY;
            s.w = Math.round(s.mxX - s.mnX + PAD * 2);
            s.h = Math.round(s.mxY - s.mnY + PAD * 2);
            s.lx = Math.cos(s.midA) * R * 0.62 + s.ox;
            s.ly = Math.sin(s.midA) * R * 0.62 + s.oy;
            out.set(s.name, { x: Math.round(s.mnX - PAD), y: Math.round(s.mnY - PAD) });
            a0 = a1;
        });
        return out;
    }
    const map = new Map(entities.map((e, i) => [e.name, i]));
    const nodes: LNode[] = entities.map(e => ({ name: e.name, x: e.x ?? 0, y: e.y ?? 0, w: e.w, h: e.h }));
    const links: Link[] = [];
    for (const r of relations) { const i = map.get(r.a), j = map.get(r.b); if (i != null && j != null && i !== j) links.push([i, j]); }
    if (type === 'mindmap') {
        /* árvore clássica sempre — independe do modo selecionado */
        mindTreeInto(nodes, links, n);
        entities.forEach((e, i) => { e.mmColor = nodes[i].color; e.mmDepth = nodes[i].depth; });
    } else if (mode === 'layered') {
        /* hierárquico já sai separado e alinhado do layeredInto;
           resolveOverlaps/edgeClearagem globais só desalinham as famílias */
        layeredInto(nodes, links, n, GAP_X + 60, GAP_Y + 80);
    } else if (mode === 'compact') compactInto(nodes, links, n);
    else {
        forceInto(nodes, links, fromCurrent); alignPass(nodes);
        resolveOverlaps(nodes, 150);
        edgeClearance(nodes, links, 6);
    }
    let mnX = Infinity, mnY = Infinity;
    for (const nd of nodes) { mnX = Math.min(mnX, nd.x); mnY = Math.min(mnY, nd.y); }
    const out = new Map();
    entities.forEach((e, i) => out.set(e.name, {
        x: Math.round((nodes[i].x - mnX + 70) / 8) * 8,
        y: Math.round((nodes[i].y - mnY + 70) / 8) * 8
    }));
    return out;
}


