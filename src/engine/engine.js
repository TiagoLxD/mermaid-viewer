// Motor Meridian — toda a mecânica do app (parser, layout, editor, export).
// Organizado em blocos marcados com /* ══════════ NN-nome ══════════ */ — edite aqui mesmo.

import { parseMermaid } from './parser';
import { F, tw } from './measure';
import { mountTables, mountEdgeLines, mountEdgeOverlays } from '../components/diagram/Scene';
import { computeEdges } from './edges-geom';
import { snapMove, pushOut, resolveOverlaps } from './drag-geom';
import { highlightMermaid } from './highlight';
import { buildFormatted } from './formatter';
import { EXAMPLES } from './examples';

export function mountEngine() {
    /* ══════════ 00-core.js ══════════ */
    /* ══════════ refs & helpers ══════════ */
    const $ = id => document.getElementById(id);
    const NS = 'http://www.w3.org/2000/svg';
    const canvas = $('canvas'), scene = $('scene'), gEdges = $('gEdges'), gTables = $('gTables'),
        gTop = $('gTop'), gGuides = $('gGuides'), src = $('src'), hlcode = $('hlcode'), hl = $('hl'),
        panel = $('panel'), statsEl = $('stats'), zoomLbl = $('zoomLbl'),
        parseDot = $('parseDot'), parseText = $('parseText'), parseFoot = $('parseFoot'),
        mm = $('minimap'), mmContent = $('mmContent'), mmView = $('mmView'),
        exportMenu = $('exportMenu'),
        docs = $('docs'), docsBackdrop = $('docsBackdrop');

    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    function svgEl(tag, attrs = {}) { const el = document.createElementNS(NS, tag); for (const k in attrs) el.setAttribute(k, attrs[k]); return el; }
    const store = {
        get(k) { try { return localStorage.getItem('meridian:' + k) } catch (e) { return null } },
        set(k, v) { try { localStorage.setItem('meridian:' + k, v) } catch (e) { } }
    };
    /* aplica o tema salvo imediatamente — evita flash de tema errado no load */
    try {
        const t0 = localStorage.getItem('meridian:theme');
        if (t0) document.documentElement.dataset.theme = t0;
    } catch (e) { }
    const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();


    /* ══════════ 04-measure.js ══════════ */
    /* ══════════ medidas das tabelas ══════════ */


    function measureEntity(e) {
        if (model.type === 'pie') {
            if (e.pieTitle) { e.w = Math.round(tw(e.label, '600 14px "Space Grotesk", sans-serif') + 20); e.h = 30; }
            return; /* geometria das fatias calculada no layout */
        }
        if (model.type === 'c4') {
            e.w = Math.round(Math.max(150, tw(e.label, F.title) + 40, e.sub ? tw(e.sub, F.comment) + 44 : 0));
            e.h = e.sub ? 64 : 50;
            return;
        }
        if (model.type === 'flow' || model.type === 'mindmap') {
            const lbl = e.label ?? e.name;
            e.w = Math.max(90, Math.round(tw(lbl, F.name) + (e.shape === 'diamond' ? 90 : 44)));
            e.h = e.shape === 'diamond' ? 84 : 46;
            return;
        }
        if (model.type === 'seq' || e.seq) {
            e.w = Math.max(110, Math.round(tw(e.label ?? e.name, F.title) + 34));
            e.h = 44;
            return;
        }
        let w = 170;
        const cwCm = Math.max(0, ...e.attrs.map(a => a.comment ? tw(a.comment, F.comment) + 12 : 0));
        e.commentW = Math.round(cwCm);
        for (const a of e.attrs) {
            const bw = a.keys.reduce((s, k) => s + tw(k, F.key) + 12 + 5, 0);
            w = Math.max(w, 14 + tw(a.name, F.name) + (a.keys.length ? 7 + bw : 0) + 12 + tw(a.type, F.type) + 14 + e.commentW);
        }
        const cw = tw(String(e.attrs.length), F.count) + 12;
        w = Math.max(w, 14 + tw(e.name.toUpperCase(), F.title) * 1.14 + 10 + cw + 14 + (e.commentW || 0));
        e.w = Math.round(w);
        e.h = e.attrs.length ? 40 + e.attrs.length * 26 + 6 : 40 + 26 + 8;
    }

    /* ══════════ layout por simulação de forças ══════════ */


    /* ══════════ 05-layout.js ══════════ */
    /* ══════ layout: espaçamento garantido — usado por todos os modos ══════ */
    const GAP_X = 156, GAP_Y = 145;

    /* Empurra tabelas para fora do caminho reto das ligações,
       para as linhas não passarem por cima de entidades alheias */
    function edgeClearance(nodes, links, passes) {
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

    /* modo Forças — grafo físico com repulsão ciente do tamanho */
    function forceInto(nodes, links, fromCurrent) {
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
    function layeredInto(nodes, links, n, GX = GAP_X, GY = GAP_Y) {
        const GAP_X = GX, GAP_Y = GY; /* respiro extra no modo hierárquico */
        const succ = Array.from({ length: n }, () => []), pred = Array.from({ length: n }, () => []);
        for (const [i, j] of links) { succ[i].push(j); pred[j].push(i); }
        const level = new Array(n).fill(0);
        let changed = true, guard = 0;
        while (changed && guard++ <= n + 2) {
            changed = false;
            for (let i = 0; i < n; i++)for (const p of pred[i])
                if (level[p] + 1 > level[i]) { level[i] = level[p] + 1; changed = true; }
        }
        const rows = Array.from({ length: Math.max(...level) + 1 }, () => []);
        nodes.forEach((nd, i) => rows[level[i]].push(i));
        for (const row of rows) row.sort((a, b) => (nodes[a].x ?? 0) - (nodes[b].x ?? 0));
        const xIdx = new Array(n).fill(0);
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
        const claimed = new Set();
        const parentsList = [];
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
    function compactInto(nodes, links, n) {
        const adjL = Array.from({ length: n }, () => []);
        const deg = new Array(n).fill(0);
        for (const [i, j] of links) { adjL[i].push(j); adjL[j].push(i); deg[i]++; deg[j]++; }
        const seen = new Array(n).fill(false), order = [];
        for (const s of [...Array(n).keys()].sort((a, b) => deg[b] - deg[a])) {
            if (seen[s]) continue;
            const q = [s]; seen[s] = true;
            while (q.length) {
                const i = q.shift(); order.push(i);
                for (const j of adjL[i]) if (!seen[j]) { seen[j] = true; q.push(j); }
            }
        }
        const cols = Math.ceil(Math.sqrt(n)), nrows = Math.ceil(n / cols);
        const colW = new Array(cols).fill(0), rowH = new Array(nrows).fill(0);
        order.forEach((idx, k) => {
            colW[k % cols] = Math.max(colW[k % cols], nodes[idx].w);
            rowH[Math.floor(k / cols)] = Math.max(rowH[Math.floor(k / cols)], nodes[idx].h);
        });
        const colX = []; let x = 0; for (let c = 0; c < cols; c++) { colX[c] = x; x += colW[c] + GAP_X; }
        const rowY = []; let y = 0; for (let r = 0; r < nrows; r++) { rowY[r] = y; y += rowH[r] + GAP_Y; }
        order.forEach((idx, k) => {
            const r = Math.floor(k / cols), c = k % cols;
            nodes[idx].x = colX[c] + (colW[c] - nodes[idx].w) / 2;
            nodes[idx].y = rowY[r] + (rowH[r] - nodes[idx].h) / 2;
        });
    }

    /* alinhamento em eixos: repete até estabilizar (nada mais se move) */
    function alignPass(nodes) {
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
    function mindTreeInto(nodes, links, n) {
        const children = Array.from({ length: n }, () => []);
        const indeg = new Array(n).fill(0);
        for (const [i, j] of links) { if (i !== j) { children[i].push(j); indeg[j]++; } }
        const roots = [...Array(n).keys()].filter(i => !indeg[i]);
        if (!roots.length) roots.push(0);
        const visited = new Set();
        const V_GAP = 34, H_GAP = 110;
        let colorN = 0;
        /* posiciona a subárvore i com folhas empilhadas a partir de cur.y;
           devolve yc do nó e anota os membros em bag */
        const walk = (i, depth, color, cur, bag) => {
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
        const branches = [];
        for (const r of roots) {
            visited.add(r);
            Object.assign(nodes[r], { depth: 0, color: -1 });
            const kids = children[r].filter(k => !visited.has(k));
            kids.forEach(k => {
                const bag = [], cur = { y: 0 };
                walk(k, 1, colorN++, cur, bag);
                branches.push({ bag, h: cur.y, side: branches.length % 2, root: r });
            });
            if (!kids.length) nodes[r].yc = 0;
        }
        /* empilha cada lado centrado no eixo da raiz */
        const hgt = list => list.reduce((s, b) => s + b.h, 0) + V_GAP * Math.max(0, list.length - 1);
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
        let x = 0; const colX = new Map();
        [...colW.keys()].sort((a, b) => a - b).forEach(d => { colX.set(d, x); x += colW.get(d) + H_GAP; });
        const W0 = colW.get(0) || 0;
        for (const b of branches)
            for (const i of b.bag) nodes[i].sideL = !!b.side;
        for (const nd of nodes) {
            nd.x = nd.sideL ? W0 - colX.get(nd.depth) - nd.w : colX.get(nd.depth);
            nd.y = nd.yc - nd.h / 2;
        }
    }

    function layoutPositions(entities, relations, fromCurrent, mode = 'force') {
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
        if (model.type === 'mindmap') {
            const vis = entities.map((e, i) => ({ e, i })).filter(x => !x.e.hidden);
            const idx = new Map(vis.map((x, k) => [x.e.name, k]));
            const tn = vis.map(x => ({ w: x.e.w, h: x.e.h }));
            const tl = [];
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
        if (model.type === 'pie') {
            const out = new Map();
            const title = entities.find(e => e.pieTitle);
            const slices = entities.filter(e => !e.pieTitle);
            const total = model.pieTotal || 1;
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
                    const consider = (x, y) => { mnX = Math.min(mnX, x); mxX = Math.max(mxX, x); mnY = Math.min(mnY, y); mxY = Math.max(mxY, y); };
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
        const nodes = entities.map(e => ({ x: e.x ?? 0, y: e.y ?? 0, w: e.w, h: e.h }));
        const links = [];
        for (const r of relations) { const i = map.get(r.a), j = map.get(r.b); if (i != null && j != null && i !== j) links.push([i, j]); }
        if (model.type === 'mindmap') {
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


    /* ══════════ 06-tables.js ══════════ */
    /* ══════════ cena React: nós declarativos + delegação de interação ══════════ */
    let model = { entities: [], relations: [] }, byId = {}, adj = {}, positions = {};
    const SEQ_TOP = 118, SEQ_STEP = 46;
    const mmCollapsed = new Set(); /* ramos do mindmap recolhidos (por nome do nó) */

    const tables = mountTables(gTables);
    function mmToggle(name) {
        if (mmCollapsed.has(name)) mmCollapsed.delete(name);
        else mmCollapsed.add(name);
        applySource(src.value, { resetLayout: true, mode: layoutSel.value });
    }
    function renderTables(animate) {
        tables.render({
            type: model.type,
            entities: model.entities.filter(e => !e.hidden),
            animate,
            onToggle: mmToggle,
        });
        refreshRefs();
    }
    function refreshRefs() {
        gTables.querySelectorAll('g.table').forEach(g => {
            const e = byId[g.dataset.id];
            if (e) { e.g = g; e.inner = g.firstChild; }
        });
    }
    /* visibilidade do mindmap: nó oculto se algum ancestral estiver recolhido */
    function mmHiddenState() {
        const parent = {};
        for (const r of model.relations) parent[r.b] = r.a;
        for (const e of model.entities) {
            let p = parent[e.name], hid = false, guard = 0;
            while (p && guard++ < 100) { if (mmCollapsed.has(p)) { hid = true; break; } p = parent[p]; }
            e.hidden = hid;
            e.hasKids = model.relations.some(r => r.a === e.name);
            e.collapsed = mmCollapsed.has(e.name);
        }
    }
    let hoverId = null, selectedId = null, animating = false, previewMode = false;

    /* delegação de eventos (drag/hover) — os nós são componentes React sem estado */
    gTables.addEventListener('pointerdown', e => {
        if (e.target.closest('.mm-tgl')) return; /* selo do mindmap tem handler próprio */
        const g = e.target.closest('g.table');
        const ent = g && byId[g.dataset.id];
        if (ent) onTableDown(e, ent);
    });
    gTables.addEventListener('pointerover', e => {
        const g = e.target.closest('g.table');
        if (g && byId[g.dataset.id]) { hoverId = g.dataset.id; updateFocus(); }
    });
    gTables.addEventListener('pointerout', e => {
        const g = e.target.closest('g.table');
        if (g && g.dataset.id === hoverId) { hoverId = null; updateFocus(); }
    });

    /* ══════════ 07-edges.js ══════════ */
    /* ══════════ arestas: geometria pura (edges-geom) + render React ══════════ */
    const edgeLayer = mountEdgeLines(gEdges);
    const edgeOverlay = mountEdgeOverlays(gTop);
    let edgeGeoms = [];
    function renderEdges(animate) {
        const ms = clamp(1 / (vw() / cam.w), 1, 1.7); /* compensação de zoom */
        edgeGeoms = computeEdges({
            type: model.type,
            entities: model.entities.filter(e => !e.hidden && e.x != null),
            relations: model.relations,
            seqTop: SEQ_TOP, seqStep: SEQ_STEP, seqBottom: model.seqBottom,
            ms,
        });
        edgeLayer.render({ geoms: edgeGeoms });
        edgeOverlay.render({ geoms: edgeGeoms, ms });
        if (animate && edgeGeoms.length) {
            scene.classList.add('drawing');
            const paths = edgeGeoms
                .map(g => gEdges.querySelector('[data-edge="' + CSS.escape(g.key) + '"] .e-line'))
                .filter(Boolean);
            for (const el of paths) {
                const L = el.getTotalLength();
                el.style.strokeDasharray = L; el.style.strokeDashoffset = L;
                el.getBoundingClientRect();
                el.style.transition = 'stroke-dashoffset .9s cubic-bezier(.35,0,.25,1)';
                requestAnimationFrame(() => { el.style.strokeDashoffset = '0'; });
            }
            setTimeout(() => {
                scene.classList.remove('drawing');
                for (const el of paths) {
                    el.style.transition = ''; el.style.strokeDasharray = ''; el.style.strokeDashoffset = '';
                }
            }, 1150);
        }
    }
    const updateEdgeGeometry = () => renderEdges(false);

    function buildAdj() {
        adj = {};
        for (const r of model.relations) {
            if (!byId[r.a] || !byId[r.b]) continue;
            (adj[r.a] ??= new Set()).add(r.b);
            (adj[r.b] ??= new Set()).add(r.a);
        }
    }

    function updateFocus() {
        const act = hoverId || selectedId;
        for (const name in byId) {
            const g = byId[name].g;
            g.classList.toggle('sel', name === selectedId);
            g.classList.toggle('dimt', !!act && name !== act && !(adj[name] && adj[name].has(act)));
        }
        for (const E of edgeGeoms) {
            if (E.kind === 'life') continue;
            const hit = !!act && (E.aName === act || E.bName === act);
            const dim = !!act && !hit;
            const sel = '[data-edge="' + CSS.escape(E.key) + '"]';
            gEdges.querySelectorAll(sel).forEach(el => {
                el.classList.toggle('on', hit); el.classList.toggle('dim', dim);
            });
            gTop.querySelectorAll(sel).forEach(el => {
                el.classList.toggle('on', hit); el.classList.toggle('dim', dim);
            });
        }
        updateMinimap();
    }

    /* ══════════ 08-camera.js ══════════ */
    /* ══════════ câmera / pan / zoom ══════════ */
    let cam = { x: 0, y: 0, w: 1000, h: 700 }, camAnim = null;
    const vs = () => ({ rw: canvas.clientWidth, rh: canvas.clientHeight });
    const vw = () => canvas.clientWidth;
    function normalizeH() { const { rw, rh } = vs(); cam.h = cam.w * rh / Math.max(1, rw); }
    function screenToWorld(cx, cy) {
        const r = scene.getBoundingClientRect();
        return { x: cam.x + (cx - r.left) / r.width * cam.w, y: cam.y + (cy - r.top) / r.height * cam.h };
    }
    function applyView() {
        normalizeH();
        scene.setAttribute('viewBox', `${cam.x} ${cam.y} ${cam.w} ${cam.h}`);
        const s = vw() / cam.w;
        canvas.style.backgroundSize = `${28 * s}px ${28 * s}px`;
        canvas.style.backgroundPosition = `${(-cam.x * s).toFixed(1)}px ${(-cam.y * s).toFixed(1)}px`;
        zoomLbl.textContent = Math.round(s * 100) + '%';
        updateEdgeGeometry();
        updateMinimap();
    }
    function animateCam(target, dur = 480) {
        cancelAnimationFrame(camAnim);
        const s = { ...cam }, t0 = performance.now();
        const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const step = t => {
            const p = Math.min(1, (t - t0) / dur), k = ease(p);
            cam.x = s.x + (target.x - s.x) * k; cam.y = s.y + (target.y - s.y) * k; cam.w = s.w + (target.w - s.w) * k;
            applyView();
            if (p < 1) camAnim = requestAnimationFrame(step);
        };
        camAnim = requestAnimationFrame(step);
    }
    function contentBBox() {
        if (!model.entities.length) return null;
        let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
        for (const e of model.entities) {
            if (e.hidden) continue;
            x1 = Math.min(x1, e.x); y1 = Math.min(y1, e.y);
            x2 = Math.max(x2, e.x + e.w); y2 = Math.max(y2, e.y + e.h);
        }
        return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
    }
    function fitView(animate = true) {
        const bb = contentBBox(); if (!bb) return;
        const { rw, rh } = vs(), pad = 80;
        const s = Math.min(rw / (bb.w + pad * 2), rh / (bb.h + pad * 2), 1.4);
        const w = rw / s, t = { x: bb.x + bb.w / 2 - w / 2, y: bb.y + bb.h / 2 - w * (rh / rw) / 2, w };
        if (animate) animateCam(t, 560); else { cam.w = t.w; cam.x = t.x; cam.y = t.y; applyView(); }
    }
    function zoomBy(f) {
        const { rw, rh } = vs();
        const cx = cam.x + cam.w / 2, cy = cam.y + cam.h / 2;
        const w = clamp(cam.w / f, rw / 7, rw * 6);
        animateCam({ x: cx - w / 2, y: cy - w * (rh / rw) / 2, w }, 220);
    }
    function resetZoom() {
        const { rw, rh } = vs(), cx = cam.x + cam.w / 2, cy = cam.y + cam.h / 2;
        animateCam({ x: cx - rw / 2, y: cy - rw * (rh / rw) / 2, w: rw }, 260);
    }
    canvas.addEventListener('wheel', e => {
        if (e.target.closest('#toolbar,#minimap')) return;
        e.preventDefault();
        cancelAnimationFrame(camAnim);
        const before = screenToWorld(e.clientX, e.clientY);
        const f = Math.exp(-e.deltaY * (e.ctrlKey ? 0.008 : 0.0014));
        const { rw } = vs();
        cam.w = clamp(cam.w / f, rw / 7, rw * 6);
        normalizeH();
        const after = screenToWorld(e.clientX, e.clientY);
        cam.x += before.x - after.x; cam.y += before.y - after.y;
        applyView();
    }, { passive: false });

    /* ── gestos de toque: 1 dedo = pan/arrasto, 2 dedos = pinch zoom ── */
    const touchPtrs = new Map();
    let pinch = null;
    canvas.addEventListener('pointerdown', e => {
        if (e.pointerType !== 'touch') return;
        touchPtrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (touchPtrs.size === 2) {
            /* segundo dedo: aborta pan/arrasto em curso e inicia o pinch */
            if (dragState) { dragState.ent.g.classList.remove('dragging'); dragState = null; }
            panState = null;
            scene.classList.remove('panning');
            const [p1, p2] = [...touchPtrs.values()];
            pinch = { d: Math.hypot(p1.x - p2.x, p1.y - p2.y), w: cam.w };
        }
    });
    canvas.addEventListener('pointermove', e => {
        if (!touchPtrs.has(e.pointerId)) return;
        touchPtrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (touchPtrs.size >= 2 && pinch) {
            const [p1, p2] = [...touchPtrs.values()];
            const cx = (p1.x + p2.x) / 2, cy = (p1.y + p2.y) / 2;
            const d = Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1;
            const before = screenToWorld(cx, cy);
            const { rw } = vs();
            cam.w = clamp(pinch.w * pinch.d / d, rw / 7, rw * 6);
            normalizeH();
            const after = screenToWorld(cx, cy);
            cam.x += before.x - after.x; cam.y += before.y - after.y;
            applyView();
        }
    });
    const endTouch = e => {
        touchPtrs.delete(e.pointerId);
        if (touchPtrs.size < 2) pinch = null;
    };
    canvas.addEventListener('pointerup', endTouch);
    canvas.addEventListener('pointercancel', endTouch);


    /* ══════════ 09-drag.js ══════════ */
    /* ══════════ arrastar tabelas + guias inteligentes ══════════ */
    let dragState = null, panState = null;

    function drawGuides(sn) {
        gGuides.textContent = '';
        if (sn.gx) gGuides.append(svgEl('line', { class: 'guide', x1: sn.gx.x, y1: sn.gx.y1, x2: sn.gx.x, y2: sn.gx.y2 }));
        if (sn.gy) gGuides.append(svgEl('line', { class: 'guide', x1: sn.gy.x1, y1: sn.gy.y, x2: sn.gy.x2, y2: sn.gy.y }));
    }

    function onTableDown(e, ent) {
        if (e.button !== 0 || animating || previewMode) return;
        e.stopPropagation();
        const p = screenToWorld(e.clientX, e.clientY);
        dragState = { ent, ox: p.x - ent.x, oy: p.y - ent.y, moved: false };
        scene.setPointerCapture(e.pointerId);
        ent.g.classList.add('dragging');
        if (selectedId !== ent.name) { selectedId = ent.name; updateFocus(); }
    }
    scene.addEventListener('pointerdown', e => {
        if (e.button === 1) { e.preventDefault(); }
        if (e.target !== scene) return;
        if (e.button !== 0 && e.button !== 1) return;
        panState = { sx: e.clientX, sy: e.clientY, cx: cam.x, cy: cam.y, moved: false };
        scene.setPointerCapture(e.pointerId);
        scene.classList.add('panning');
    });
    scene.addEventListener('pointermove', e => {
        if (dragState) {
            const p = screenToWorld(e.clientX, e.clientY);
            const ent = dragState.ent;
            const sn = snapMove(model.entities, ent, p.x - dragState.ox, p.y - dragState.oy, 8 / (vw() / cam.w));
            ent.x = sn.nx; ent.y = sn.ny;
            ent.g.setAttribute('transform', `translate(${ent.x} ${ent.y})`);
            drawGuides(sn); updateEdgeGeometry(); updateMinimap();
            dragState.moved = true;
        } else if (panState) {
            const dx = e.clientX - panState.sx, dy = e.clientY - panState.sy;
            if (Math.abs(dx) + Math.abs(dy) > 3) panState.moved = true;
            const r = scene.getBoundingClientRect();
            cam.x = panState.cx - dx * cam.w / r.width;
            cam.y = panState.cy - dy * cam.h / r.height;
            applyView();
        }
    });
    function endPointer(e) {
        if (dragState) {
            const ent = dragState.ent;
            ent.g.classList.remove('dragging');
            gGuides.textContent = '';
            if (dragState.moved) {
                /* nunca termina sobre outra tabela: empurra só ela para fora */
                pushOut(model.entities, ent, GAP_X, GAP_Y);
                ent.g.setAttribute('transform', `translate(${ent.x} ${ent.y})`);
                for (const e2 of model.entities) positions[e2.name] = { x: e2.x, y: e2.y };
                store.set('pos', JSON.stringify(positions));
                updateEdgeGeometry(); updateMinimap();
            }
            dragState = null;
        }
        if (panState) {
            scene.classList.remove('panning');
            if (!panState.moved) { selectedId = null; updateFocus(); }
            panState = null;
        }
    }
    scene.addEventListener('pointerup', endPointer);
    scene.addEventListener('pointercancel', endPointer);
    scene.addEventListener('dblclick', e => { if (e.target === scene) fitView(true); });


    /* ══════════ 10-minimap.js ══════════ */
    /* ══════════ minimapa ══════════ */
    let mmState = null;
    function updateMinimap() {
        const bb = contentBBox();
        if (!bb) { mmContent.textContent = ''; mmView.setAttribute('width', 0); mmState = null; return; }
        const rx = Math.min(bb.x, cam.x) - 40, ry = Math.min(bb.y, cam.y) - 40;
        const w = Math.max(bb.x + bb.w, cam.x + cam.w) + 40 - rx;
        const h = Math.max(bb.y + bb.h, cam.y + cam.h) + 40 - ry;
        const s = Math.min(174 / w, 104 / h), ox = (190 - w * s) / 2, oy = (120 - h * s) / 2;
        mmState = { s, ox, oy, rx, ry };
        mmContent.textContent = '';
        for (const e of model.entities) {
            if (e.hidden) continue;
            mmContent.append(svgEl('rect', {
                x: ox + (e.x - rx) * s, y: oy + (e.y - ry) * s,
                width: Math.max(3, e.w * s), height: Math.max(2.4, e.h * s), rx: 2,
                class: 'mm-t' + (e.name === selectedId ? ' sel' : '')
            }));
        }
        mmView.setAttribute('x', ox + (cam.x - rx) * s); mmView.setAttribute('y', oy + (cam.y - ry) * s);
        mmView.setAttribute('width', cam.w * s); mmView.setAttribute('height', cam.h * s);
    }
    function mmNav(e) {
        if (!mmState) return;
        const r = mm.getBoundingClientRect();
        const wx = mmState.rx + (e.clientX - r.left - mmState.ox) / mmState.s;
        const wy = mmState.ry + (e.clientY - r.top - mmState.oy) / mmState.s;
        cancelAnimationFrame(camAnim);
        cam.x = wx - cam.w / 2; cam.y = wy - cam.h / 2;
        applyView();
    }
    mm.addEventListener('pointerdown', e => {
        e.stopPropagation();
        mm.setPointerCapture(e.pointerId);
        mmNav(e);
        const mv = ev => mmNav(ev);
        mm.addEventListener('pointermove', mv);
        mm.addEventListener('pointerup', () => mm.removeEventListener('pointermove', mv), { once: true });
    });


    /* ══════════ 11-editor.js ══════════ */
    const renderHighlight = () => { hlcode.innerHTML = highlightMermaid(src.value); };

    /* ══════════ formatador ══════════ */
    const buildFormattedLocal = () => buildFormatted(src.value, model.type);

    function formatCode(silent) {
        const formatted = buildFormattedLocal();
        if (formatted == null) { if (!silent) toast('Corrija os erros antes de formatar', 'err'); return false; }
        pushHistory();
        src.value = formatted;
        lastLen = formatted.length; lastCaret = 0; lastSel = 0; snipState = null;
        renderHighlight(); updateGutter(); scheduleApply();
        if (!silent) toast('Código formatado');
        return true;
    }


    /* ══════════ 12-pipeline.js ══════════ */
    /* ══════════ pipeline de aplicação ══════════ */
    function placeNear(ent) {
        const nb = [];
        for (const r of model.relations) {
            const o = r.a === ent.name ? r.b : (r.b === ent.name ? r.a : null);
            if (o && positions[o]) nb.push(positions[o]);
        }
        let cx, cy;
        if (nb.length) {
            cx = nb.reduce((s, p) => s + p.x, 0) / nb.length + ent.w / 2;
            cy = nb.reduce((s, p) => s + p.y, 0) / nb.length + ent.h / 2;
        } else { cx = cam.x + cam.w / 2 - ent.w / 2; cy = cam.y + cam.h / 2 - ent.h / 2; }
        const i = placeNear.n = (placeNear.n || 0) + 1;
        const a = i * 2.1, r = 30 + i * 26;
        ent.x = Math.round(cx + Math.cos(a) * r); ent.y = Math.round(cy + Math.sin(a) * r);
    }

    function applySource(code, opts = {}) {
        let { resetLayout = false } = opts;
        const { animate = false, mode = 'force' } = opts;
        const res = parseMermaid(code);
        if (res.errors.length) { setParseState(res.errors); return false; }
        setParseState(null, res);
        model = res;
        if (model.type === 'mindmap') mmHiddenState();
        for (const e of model.entities) if (!e.hidden) measureEntity(e);
        if (model.type === 'seq') {
            model.seqBottom = SEQ_TOP + Math.max(1, model.relations.length) * SEQ_STEP + 36;
            resetLayout = true; /* sequência sempre re-layouta (posição linear) */
        }
        if (model.type === 'pie') resetLayout = true; /* pizza sempre re-layouta (geometria circular) */
        if (model.type === 'mindmap') resetLayout = true; /* mindmap sempre re-layouta (árvore arrumada) */
        if (resetLayout) {
            const map = layoutPositions(model.entities, model.relations, false, mode);
            /* nós ocultos (ramos recolhidos) não entram no layout: mantêm a posição antiga */
            for (const e of model.entities) { const p = map.get(e.name); if (p) { e.x = p.x; e.y = p.y; } }
        } else {
            placeNear.n = 0; let anyNew = false;
            for (const e of model.entities) {
                const p = positions[e.name];
                if (p) { e.x = p.x; e.y = p.y; } else { placeNear(e); anyNew = true; }
            }
            if (anyNew) resolveOverlaps(model.entities, 40);
        }
        byId = {};
        model.entities.forEach((e) => { if (!e.hidden) byId[e.name] = e; });
        renderTables(animate);
        for (const k of Object.keys(positions)) if (!byId[k]) delete positions[k];
        for (const e of model.entities) positions[e.name] = { x: e.x, y: e.y };
        store.set('pos', JSON.stringify(positions)); store.set('code', code);
        buildAdj(); renderEdges(animate); updateFocus(); updateStats(); updateMinimap();
        return true;
    }
    function savePositions() {
        for (const e of model.entities) positions[e.name] = { x: e.x, y: e.y };
        store.set('pos', JSON.stringify(positions));
    }
    function animateTo(targets, dur, done) {
        animating = true;
        const starts = model.entities.map(e => ({ x: e.x, y: e.y }));
        const t0 = performance.now();
        const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const step = t => {
            const p = Math.min(1, (t - t0) / dur), k = ease(p);
            model.entities.forEach((e, i) => {
                const s = targets.get(e.name); if (!s) return;
                e.x = starts[i].x + (s.x - starts[i].x) * k; e.y = starts[i].y + (s.y - starts[i].y) * k;
                e.g.setAttribute('transform', `translate(${e.x} ${e.y})`);
            });
            updateEdgeGeometry(); updateMinimap();
            if (p < 1) requestAnimationFrame(step);
            else { animating = false; done && done(); }
        };
        requestAnimationFrame(step);
    }
    function organize() {
        if (animating || !model.entities.length) return;
        if (model.type === 'seq') { applySource(src.value, { resetLayout: true, mode: layoutSel.value }); toast('Sequência reorganizada'); return; }
        const targets = layoutPositions(model.entities, model.relations, true, layoutSel.value);
        animateTo(targets, 650, () => { savePositions(); fitView(true); });
    }
    function updateStats() {
        if (model.type === 'pie') {
            const n = model.entities.filter(e => !e.pieTitle).length;
            statsEl.textContent = `${n} fatias · total ${model.pieTotal}`;
            return;
        }
        const vis = model.entities.filter(e => !e.hidden);
        const fields = vis.reduce((s, e) => s + e.attrs.length, 0);
        statsEl.textContent = `${vis.length} entidades · ${edgeGeoms.length} relações · ${fields} campos`;
    }
    function setParseState(errors, res) {
        if (errors && errors.length) {
            parseDot.classList.add('err'); parseFoot.classList.add('err');
            parseText.textContent = `linha ${errors[0].line}: ${errors[0].msg}${errors.length > 1 ? ` (+${errors.length - 1})` : ''}`;
        } else {
            parseDot.classList.remove('err'); parseFoot.classList.remove('err');
            parseText.textContent = `ok · ${res.entities.length} entidades · ${res.relations.length} relações`;
        }
    }


    /* ══════════ 13-export.js ══════════ */
    /* ══════════ exportação SVG / PNG ══════════ */
    let _fontCSS = null;
    async function getFontCSS() {
        if (_fontCSS !== null) return _fontCSS;
        try {
            const link = document.querySelector('link[href*="fonts.googleapis"]');
            const css = await (await fetch(link.href)).text();
            const blocks = css.split('@font-face').slice(1).map(b => '@font-face' + b.slice(0, b.indexOf('}') + 1));
            let out = '';
            for (const b of blocks.filter(x => x.includes('U+0000-00FF'))) {
                const u = b.match(/url\((https:[^)]+)\)/)[1];
                const arr = new Uint8Array(await (await fetch(u)).arrayBuffer());
                let bin = ''; for (let i = 0; i < arr.length; i += 0x8000) bin += String.fromCharCode.apply(null, arr.subarray(i, i + 0x8000));
                out += b.replace(u, `data:font/woff2;base64,${btoa(bin)}`);
            }
            _fontCSS = out;
        } catch (e) { _fontCSS = ''; }
        return _fontCSS;
    }
    const THEME_VARS = ['--surface', '--surface2', '--canvas', '--ink', '--ink2', '--ink3', '--line', '--line2', '--edge', '--accent', '--pkbg', '--pkln', '--pkfg', '--mono', '--sans', '--pie-txt'];
    async function buildExportSVG() {
        const bb = contentBBox(); if (!bb) return null;
        const pad = 56, W = Math.round(bb.w + pad * 2), H = Math.round(bb.h + pad * 2);
        const clone = scene.cloneNode(true);
        clone.removeAttribute('style'); clone.removeAttribute('class');
        clone.setAttribute('xmlns', NS);
        clone.setAttribute('viewBox', `${bb.x - pad} ${bb.y - pad} ${W} ${H}`);
        clone.setAttribute('width', W); clone.setAttribute('height', H);
        clone.querySelector('#gGuides')?.remove();
        clone.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'));
        for (const c of ['enter', 'dragging', 'dim', 'on', 'dimt', 'sel', 'drawing'])
            clone.querySelectorAll('.' + c).forEach(el => el.classList.remove(c));
        const vars = THEME_VARS.map(n => `${n}:${cssVar(n)}`).join(';');
        const st = document.createElementNS(NS, 'style');
        let appCss = '';
        try { appCss = await (await fetch('css/style.css')).text(); } catch (e) { /* file://: exporta só com vars + fontes */ }
        st.textContent = `:root{${vars}} ${appCss} ${await getFontCSS()}`;
        clone.insertBefore(st, clone.firstChild);
        if (store.get('transp') !== '1') {
            const bg = svgEl('rect', { x: bb.x - pad, y: bb.y - pad, width: W, height: H, fill: cssVar('--canvas') });
            clone.insertBefore(bg, st.nextSibling);
        }
        return { str: new XMLSerializer().serializeToString(clone), W, H };
    }
    function downloadBlob(blob, name) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = name; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }
    async function exportSVG() {
        const r = await buildExportSVG();
        if (!r) { toast('Nada para exportar', 'err'); return; }
        downloadBlob(new Blob([r.str], { type: 'image/svg+xml;charset=utf-8' }), 'diagrama-er.svg');
        toast('SVG exportado');
    }
    async function exportPNG() {
        const r = await buildExportSVG();
        if (!r) { toast('Nada para exportar', 'err'); return; }
        try {
            const url = URL.createObjectURL(new Blob([r.str], { type: 'image/svg+xml;charset=utf-8' }));
            const img = new Image();
            await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
            const c = document.createElement('canvas'); c.width = r.W * 2; c.height = r.H * 2;
            const ctx = c.getContext('2d'); ctx.scale(2, 2); ctx.drawImage(img, 0, 0, r.W, r.H);
            URL.revokeObjectURL(url);
            c.toBlob(b => { downloadBlob(b, 'diagrama-er.png'); toast('PNG exportado (2×)'); }, 'image/png');
        } catch (e) { toast('Falha ao gerar PNG', 'err'); }
    }


    /* ══════════ 14-ui.js ══════════ */
    /* ══════════ toasts / tema / painel / menus / docs ══════════ */
    function toast(msg, type = '') {
        const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg;
        $('toasts').append(t);
        requestAnimationFrame(() => t.classList.add('show'));
        setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2400);
    }
    function exportMMD() {
        if (!src.value.trim()) { toast('Nada para salvar', 'err'); return; }
        downloadBlob(new Blob([src.value], { type: 'text/plain;charset=utf-8' }), 'diagrama-er.mmd');
        toast('Código Mermaid salvo');
    }


    /* ══════════ 15-share.js ══════════ */
    /* ══════════ compartilhar URL ══════════ */
    function shareURL() {
        const enc = btoa(unescape(encodeURIComponent(src.value))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        return location.origin + location.pathname + '#d=' + enc;
    }
    function loadSharedCode() {
        const m = location.hash.match(/#d=([\w\-]+)/);
        if (!m) return null;
        try { return decodeURIComponent(escape(atob(m[1].replace(/-/g, '+').replace(/_/g, '/')))); } catch (e) { return null; }
    }
    $('btnShare').onclick = async () => {
        try { await navigator.clipboard.writeText(shareURL()); toast('Link de compartilhamento copiado'); }
        catch (e) { toast('Não foi possível copiar o link', 'err'); }
    };

    function setTheme(t) {
        document.documentElement.dataset.theme = t; store.set('theme', t);
        $('btnTheme').dataset.theme = t;
    }
    $('btnTheme').onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    $('btnPanel').onclick = () => {
        panel.classList.toggle('hidden');
        const hidden = panel.classList.contains('hidden');
        store.set('panel', hidden ? '0' : '1');
        document.body.classList.toggle('code-hidden', hidden);
    };
    $('btnShowCode').onclick = () => $('btnPanel').click();
    $('btnExport').onclick = e => { e.stopPropagation(); exportMenu.classList.toggle('open'); };
    document.addEventListener('click', e => { if (!e.target.closest('.menu-wrap')) exportMenu.classList.remove('open'); });
    exportMenu.querySelectorAll('button').forEach(b => b.onclick = () => {
        exportMenu.classList.remove('open');
        if (b.dataset.x === 'svg') exportSVG();
        else if (b.dataset.x === 'png') exportPNG();
        else exportMMD();
    });
    const optTransp = $('optTransp');
    optTransp.checked = store.get('transp') === '1';
    optTransp.onchange = () => store.set('transp', optTransp.checked ? '1' : '0');

    function toggleDocs(open) {
        const o = open ?? !docs.classList.contains('open');
        docs.classList.toggle('open', o);
        docsBackdrop.classList.toggle('open', o);
    }
    $('btnDocs').onclick = () => toggleDocs();
    $('btnDocsClose').onclick = () => toggleDocs(false);
    docsBackdrop.onclick = () => toggleDocs(false);


    /* ══════════ 16-snippets.js ══════════ */
    /* ══════════ snippets: slash commands + tabstops ══════════ */
    const snipMenu = document.getElementById('snipMenu');
    const SNIPPETS = [
        { cmd: '/table', desc: 'bloco de entidade { }', body: '${1:TABELA} {\n    ${2:string} ${3:campo}\n    ${4:string} ${5:campo}\n}' },
        { cmd: '/one-many', desc: 'um→muitos  ||--o{', body: '${1:TABELA} ||--o{ ${2:TABELA} : ${3:relacao}' },
        { cmd: '/many-one', desc: 'muitos→um  }o--||', body: '${1:TABELA} }o--|| ${2:TABELA} : ${3:relacao}' },
        { cmd: '/many-many', desc: 'muitos→muitos  }o--o{', body: '${1:TABELA} }o--o{ ${2:TABELA} : ${3:relacao}' },
        { cmd: '/one-one', desc: 'um→um  ||--||', body: '${1:TABELA} ||--|| ${2:TABELA} : ${3:relacao}' },
        { cmd: '/zero-one', desc: 'um→zero-um  ||--o|', body: '${1:TABELA} ||--o| ${2:TABELA} : ${3:relacao}' },
        { cmd: '/indirect', desc: 'não-identificante (tracejado)  ||..o{', body: '${1:TABELA} ||..o{ ${2:TABELA} : ${3:relacao}' },
        { cmd: '/pk', desc: 'linha de chave primária', body: '${1:int} ${2:id} PK' },
        { cmd: '/fk', desc: 'linha de chave estrangeira', body: '${1:int} ${2:tabela_id} FK' },
        { cmd: '/flow', desc: 'fluxo: nó → nó', body: '${1:Inicio}[${2:Começo}] --> ${3:Fim}[${4:Resultado}]' },
        { cmd: '/decision', desc: 'fluxo: decisão losango', body: '${1:ok}{${2:Tudo certo?}} -->|${3:sim}| ${4:Fim}[${5:Fim}]' },
        { cmd: '/seqmsg', desc: 'sequência: mensagem', body: '${1:Cliente} ->> ${2:Servidor} : ${3:requisição}' },
        { cmd: '/seqreply', desc: 'sequência: resposta tracejada', body: '${1:Servidor} -->> ${2:Cliente} : ${3:resposta}' }
    ];
    let snipState = null;   /* { stops: [{start,len}], idx } */
    let acList = [], acSel = 0, acCtx = null;

    /* ── dicionários de autocomplete ── */
    const TYPES = [
        ['int', 'inteiro'], ['bigint', 'inteiro grande'], ['string', 'texto curto'], ['varchar(255)', 'texto limitado'],
        ['text', 'texto longo'], ['boolean', 'verdadeiro/falso'], ['decimal(10,2)', 'numérico exato'], ['float', 'ponto flutuante'],
        ['double', 'flutuante duplo'], ['date', 'data'], ['datetime', 'data e hora'], ['timestamp', 'data/hora com fuso'],
        ['time', 'hora'], ['uuid', 'identificador único'], ['json', 'documento json'], ['blob', 'binário']
    ];
    const KEYS = [['PK', 'chave primária'], ['FK', 'chave estrangeira'], ['UK', 'chave única']];
    const CONNS = [
        ['||--o{', 'um → zero ou mais'], ['||--||', 'um → um'], ['||--o|', 'um → zero-um'], ['||--|{', 'um → um ou mais'],
        ['||..o{', 'um → zero+ (tracejada)'], ['}o--o{', 'zero+ → zero+'], ['}o--||', 'zero+ → um'], ['}|--o{', 'um+ → zero+'],
        ['}o..o{', 'zero+ → zero+ (tracejada)'], ['}o..||', 'zero+ → um (tracejada)']
    ];

    const monoCtx = document.createElement('canvas').getContext('2d');
    function caretXY() {
        const cs = getComputedStyle(src);
        monoCtx.font = cs.font;
        const pos = src.selectionStart, before = src.value.slice(0, pos);
        const line = before.split('\n').length - 1;
        const colTxt = before.slice(before.lastIndexOf('\n') + 1);
        const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.7;
        const cw = monoCtx.measureText('M').width || 7.5;
        const wrap = document.querySelector('.code-wrap');
        return {
            x: clamp(parseFloat(cs.paddingLeft) + colTxt.length * cw - src.scrollLeft + 2, 0, wrap.clientWidth - 260),
            y: clamp(parseFloat(cs.paddingTop) + line * lh - src.scrollTop + 2, 0, wrap.clientHeight - 160)
        };
    }
    function closeAc() { snipMenu.classList.remove('open'); acList = []; acCtx = null; }
    function entityNames() {
        const set = new Set();
        for (const m of src.value.matchAll(/^\s*([A-Za-z_][\w.\-]*)\s*\{/gm)) set.add(m[1]);
        for (const m of src.value.matchAll(/([A-Za-z_][\w.\-]*)\s+(?:\|o|\|\||\}o|\}\|)\s*(?:--|\.\.|==)\s*(?:o\||\|\||o\{|\|\{)\s+([A-Za-z_][\w.\-]*)/g)) { set.add(m[1]); set.add(m[2]); }
        return [...set];
    }
    function inEntityBlock(pos) {
        let depth = 0;
        for (const l of src.value.slice(0, pos).split('\n')) {
            const t = l.trim();
            if (/^\}+\s*$/.test(t)) { depth = Math.max(0, depth - 1); continue; }
            if (/\{\s*$/.test(t) && !/[|}]/.test(t)) depth++;
        }
        return depth > 0;
    }
    function computeAc() {
        const pos = src.selectionStart;
        if (pos !== src.selectionEnd) return null;
        const before = src.value.slice(0, pos);
        const lineStart = before.lastIndexOf('\n') + 1;
        const line = before.slice(lineStart);
        const sm = before.match(/\/[\w-]*$/);
        if (sm) return { mode: 'slash', qr: { q: sm[0], start: pos - sm[0].length } };
        const word = line.match(/[\w.\-()]*$/)[0] || '';
        const wStart = pos - word.length;
        const tokens = line.trim().split(/\s+/).filter(Boolean);
        if (inEntityBlock(pos) && !/^\s*\}/.test(line)) {
            /* indentação não afeta a detecção: linha vazia/espços = tipos;
               1ª palavra = tipos; depois do tipo + espaço = chaves (PK/FK/UK) */
            if (!tokens.length) return { mode: 'type', prefix: word, wStart };
            if (tokens.length === 1) return /\s$/.test(line) ? { mode: 'key', prefix: word, wStart } : { mode: 'type', prefix: word, wStart };
            return { mode: 'key', prefix: word, wStart };
        }
        if (!tokens.length) return null;
        if (tokens.length === 1 && !/\s$/.test(line)) return null;                 /* digitando 1ª palavra fora de bloco */
        if (tokens.length === 1) return { mode: 'conn', prefix: word, wStart };    /* "A " → conectores */
        if (tokens.length === 2) {
            if (/^[|}]/.test(tokens[1])) return { mode: 'entity', prefix: word, wStart }; /* "A ||--o{ " → entidades */
            if (/^[|}]/.test(word)) return { mode: 'conn', prefix: word, wStart };
            return null;
        }
        if (tokens.length === 3 && /^[A-Za-z_]/.test(tokens[2])) return { mode: 'entity', prefix: word, wStart };
        return null;
    }
    function renderAc() {
        acCtx = computeAc();
        if (!acCtx) { closeAc(); return; }
        acList = [];
        const p = (acCtx.prefix || '').toLowerCase();
        if (acCtx.mode === 'slash')
            acList = SNIPPETS.filter(s => s.cmd.startsWith(acCtx.qr.q.toLowerCase())).map(s => ({ label: s.cmd, desc: s.desc, snippet: s }));
        else if (acCtx.mode === 'type')
            acList = TYPES.filter(t => t[0].toLowerCase().startsWith(p)).map(t => ({ label: t[0], desc: t[1], insert: t[0] + ' ' }));
        else if (acCtx.mode === 'key')
            acList = KEYS.filter(t => t[0].toLowerCase().startsWith(p)).map(t => ({ label: t[0], desc: t[1], insert: t[0] }));
        else if (acCtx.mode === 'conn')
            acList = CONNS.filter(t => t[0].startsWith(acCtx.prefix)).map(t => ({ label: t[0], desc: t[1], insert: t[0] + ' ' }));
        else if (acCtx.mode === 'entity')
            acList = entityNames().filter(n => n.toLowerCase().startsWith(p)).map(n => ({ label: n, desc: 'entidade', insert: n + ' ' }));
        if (!acList.length) { closeAc(); return; }
        acSel = 0;
        snipMenu.textContent = '';
        acList.forEach((it, i) => {
            const d = document.createElement('div');
            d.className = 'snip-item' + (i === acSel ? ' on' : '');
            d.innerHTML = `<span class="cmd">${esc(it.label)}</span><span class="desc">${esc(it.desc)}</span>`;
            d.onmousedown = e => { e.preventDefault(); acceptAc(it); };
            snipMenu.append(d);
        });
        const cp = caretXY();
        snipMenu.style.left = cp.x + 'px'; snipMenu.style.top = cp.y + 'px';
        snipMenu.classList.add('open');
    }
    function acceptAc(item) {
        if (acCtx.mode === 'slash') { acceptSnippet(item.snippet, acCtx.qr); return; }
        const pos = acCtx.wStart;
        pushHistory();
        src.value = src.value.slice(0, pos) + item.insert + src.value.slice(src.selectionEnd);
        src.selectionStart = src.selectionEnd = pos + item.insert.length;
        lastLen = src.value.length; lastCaret = src.selectionStart; lastSel = src.selectionEnd;
        closeAc(); renderHighlight(); scheduleApply();
    }
    function acceptSnippet(s, qr) {
        /* expande ${n:default}: texto completo + offsets reais dos tabstops */
        const stops = [];
        let text = '', last = 0, m;
        const re = /\$\{(\d+):([^}]*)\}/g;
        while ((m = re.exec(s.body))) {
            text += s.body.slice(last, m.index);              /* texto literal entre placeholders */
            stops[+m[1]] = { at: text.length, len: m[2].length };
            text += m[2];
            last = m.index + m[0].length;
        }
        text += s.body.slice(last);
        const pos = qr.start, end = src.selectionStart;
        src.value = src.value.slice(0, pos) + text + src.value.slice(end);
        pushHistory();
        const resolved = stops
            .map((st, n) => st && { start: pos + st.at, len: st.len, n })
            .filter(Boolean)
            .sort((a, b) => a.n - b.n);
        src.selectionStart = src.selectionEnd = pos + text.length;
        lastLen = src.value.length; lastCaret = pos + text.length; lastSel = pos + text.length;
        snipState = resolved.length ? { stops: resolved, idx: 0 } : null;
        closeAc();
        if (snipState) jumpStop(0);
        renderHighlight(); scheduleApply();
    }
    function jumpStop(i) {
        const st = snipState.stops[i];
        if (!st) { snipState = null; return; }
        snipState.idx = i;
        src.selectionStart = st.start;
        src.selectionEnd = st.start + st.len;
        /* sincroniza o rastreio do snippet com a nova posição do cursor */
        lastLen = src.value.length; lastCaret = st.start; lastSel = st.start + st.len;
    }
    /* mantém tabstops consistentes enquanto digita dentro do snippet */
    function snipAdjust(caretBefore, removed, inserted) {
        if (!snipState) return;
        const delta = inserted - removed;
        for (const st of snipState.stops) {
            if (st.start > caretBefore) st.start += delta;
            else if (st.start + st.len >= caretBefore) st.len += delta;
        }
    }


    /* ══════════ 17-gutter.js ══════════ */
    /* ══════════ gutter: numeração de linhas ══════════ */
    const gutter = document.getElementById('gutter'), gutterIn = document.getElementById('gutterIn');
    let gutterCount = -1;
    function updateGutter() {
        const n = src.value.split('\n').length;
        if (n !== gutterCount) {
            gutterCount = n;
            gutterIn.textContent = '';
            for (let i = 1; i <= n; i++) {
                const s = document.createElement('span');
                s.textContent = i;
                gutterIn.append(s);
            }
        }
        const line = src.value.slice(0, src.selectionStart).split('\n').length - 1;
        [...gutterIn.children].forEach((el, i) => el.classList.toggle('cur', i === line));
        gutterIn.style.transform = `translateY(${-src.scrollTop}px)`;
    }


    /* ══════════ 18-undo.js ══════════ */
    /* ══════════ undo / redo ══════════ */
    const undoStack = [], redoStack = [];
    let beforeState = null, lastPushAt = 0;
    const HIST_LIMIT = 150;
    const snapState = () => ({ value: src.value, s: src.selectionStart, e: src.selectionEnd });
    function pushHistory() {
        undoStack.push(snapState());
        if (undoStack.length > HIST_LIMIT) undoStack.shift();
        redoStack.length = 0;
        lastPushAt = Date.now();
    }
    function restoreState(h) {
        src.value = h.value;
        src.selectionStart = h.s; src.selectionEnd = h.e;
        lastLen = h.value.length; lastCaret = h.s; lastSel = h.e; snipState = null;
        beforeState = snapState();
        closeAc(); renderHighlight(); updateGutter(); scheduleApply();
    }
    function undo() {
        if (!undoStack.length) return;
        redoStack.push(snapState());
        restoreState(undoStack.pop());
    }
    function redo() {
        if (!redoStack.length) return;
        undoStack.push(snapState());
        restoreState(redoStack.pop());
    }


    /* ══════════ 19-editor-events.js ══════════ */
    /* ══════════ editor: eventos ══════════ */
    let applyT = null;
    function scheduleApply() {
        if (document.getElementById('snipMenu').classList.contains('open')) return; /* aguarda snippet ser resolvido */
        clearTimeout(applyT);
        applyT = setTimeout(() => {
            applySource(src.value);
        }, 600);
    }
    function applyNow(showToast) {
        const ok = applySource(src.value);
        if (showToast) toast(ok ? 'Diagrama atualizado' : 'Corrija os erros no código', ok ? '' : 'err');
    }
    let lastLen = src.value.length, lastCaret = 0, lastSel = 0;
    src.addEventListener('input', () => {
        /* digitação: agrupa rajadas de até 500ms num único passo de undo */
        if (Date.now() - lastPushAt > 500 && beforeState) {
            undoStack.push(beforeState);
            if (undoStack.length > HIST_LIMIT) undoStack.shift();
            redoStack.length = 0;
        }
        lastPushAt = Date.now();
        const pos = src.selectionStart;
        /* removidos = tamanho da seleção substituída; inseridos = crescimento do texto */
        const removed = Math.max(0, lastSel - lastCaret);
        const inserted = src.value.length - lastLen + removed;
        snipAdjust(lastCaret, removed, inserted);
        lastLen = src.value.length; lastCaret = pos; lastSel = src.selectionEnd;
        renderHighlight(); scheduleApply();
        renderAc();
        updateGutter();
        beforeState = snapState();
    });
    src.addEventListener('scroll', () => { hl.scrollTop = src.scrollTop; hl.scrollLeft = src.scrollLeft; closeAc(); gutterIn.style.transform = `translateY(${-src.scrollTop}px)`; });
    src.addEventListener('blur', () => setTimeout(closeAc, 120));
    src.addEventListener('click', () => { snipState = null; closeAc(); updateGutter(); editorFocusEntity(); });

    /* clique no editor → foca/destaca a entidade no canvas */
    function entityAtCaret(pos) {
        const lineStart = src.value.lastIndexOf('\n', pos - 1) + 1;
        let lineEnd = src.value.indexOf('\n', lineStart); if (lineEnd === -1) lineEnd = src.value.length;
        const line = src.value.slice(lineStart, lineEnd);
        /* 1) nome de entidade na própria linha (o mais próximo do cursor) */
        const col = pos - lineStart;
        const cands = [...line.matchAll(/[A-Za-z_][\w.\-]*/g)]
            .filter(m => byId[m[0]])
            .sort((a, b) => Math.abs(a.index - col) - Math.abs(b.index - col));
        if (cands.length) return cands[0][0];
        /* 2) dentro de um bloco ENT { ... } */
        let cur = null;
        for (const l of src.value.slice(0, lineStart).split('\n')) {
            const t = l.trim();
            const o = t.match(/^([A-Za-z_][\w.\-]*)\s*\{$/);
            if (o) cur = o[1];
            else if (/^\}+\s*$/.test(t)) cur = null;
        }
        return cur && byId[cur] ? cur : null;
    }
    function editorFocusEntity() {
        const name = entityAtCaret(src.selectionStart);
        const e = name && byId[name];
        if (!e || animating) return;
        if (selectedId !== name) { selectedId = name; updateFocus(); }
        const { rw, rh } = vs();
        const w = clamp(rw / 3.2, e.w * 3, rw / 1.6);
        animateCam({ x: e.x + e.w / 2 - w / 2, y: e.y + e.h / 2 - w * (rh / rw) / 2, w }, 420);
    }
    src.addEventListener('keydown', e => {
        const menuOpen = snipMenu.classList.contains('open');
        if (menuOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            acSel = (acSel + (e.key === 'ArrowDown' ? 1 : acList.length - 1)) % acList.length;
            [...snipMenu.children].forEach((el, i) => el.classList.toggle('on', i === acSel));
            snipMenu.children[acSel].scrollIntoView({ block: 'nearest' });
            return;
        }
        if (menuOpen && (e.key === 'Enter' || (e.key === 'Tab' && acCtx && acCtx.mode === 'slash'))) {
            e.preventDefault();
            acceptAc(acList[acSel]);
            return;
        }
        if (menuOpen && e.key === 'Tab') { e.preventDefault(); closeAc(); return; } /* fora do slash: Tab fecha menu e indentA */
        if (e.key === 'Escape' && menuOpen) { e.preventDefault(); closeAc(); return; }
        if (e.key === 'Escape' && snipState) { snipState = null; return; }

        /* Ctrl+Z desfaz · Ctrl+Shift+Z / Ctrl+Y refaz */
        if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
            e.preventDefault();
            if (e.shiftKey) redo(); else undo();
            return;
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); redo(); return; }

        /* Ctrl+I formata o código */
        if ((e.ctrlKey || e.metaKey) && (e.key === 'i' || e.key === 'I')) { e.preventDefault(); formatCode(); return; }
        /* Ctrl+X sem seleção = recorta a linha inteira */
        if ((e.ctrlKey || e.metaKey) && (e.key === 'x' || e.key === 'X') && src.selectionStart === src.selectionEnd) {
            e.preventDefault();
            pushHistory();
            const s = src.selectionStart;
            const ls = src.value.lastIndexOf('\n', s - 1) + 1;
            let le = src.value.indexOf('\n', s); if (le === -1) le = src.value.length; else le += 1;
            const cut = src.value.slice(ls, le);
            src.value = src.value.slice(0, ls) + src.value.slice(le);
            src.selectionStart = src.selectionEnd = Math.min(ls, src.value.length);
            navigator.clipboard?.writeText(cut).catch(() => { });
            lastLen = src.value.length; lastCaret = ls; lastSel = ls; snipState = null;
            renderHighlight(); updateGutter(); scheduleApply();
            return;
        }
        /* Enter com indentação automática: segue a linha de cima; abre bloco = +4 espaços */
        if (e.key === 'Enter' && !menuOpen && src.selectionStart === src.selectionEnd) {
            e.preventDefault();
            pushHistory();
            const s = src.selectionStart;
            const before = src.value.slice(0, s), after = src.value.slice(s);
            const ls = before.lastIndexOf('\n') + 1;
            const line = before.slice(ls);
            const indent = line.match(/^\s*/)[0];
            let ins = '\n' + indent, caret = s + ins.length;
            if (/\{\s*$/.test(line) && /^\s*\}/.test(after)) {
                ins = '\n' + indent + '    \n' + indent;              /* expande {|} */
                caret = s + 1 + indent.length + 4;
            } else if (/\{\s*$/.test(line)) {
                ins = '\n' + indent + '    ';
                caret = s + ins.length;
            }
            src.value = before + ins + after;
            src.selectionStart = src.selectionEnd = caret;
            lastLen = src.value.length; lastCaret = caret; lastSel = caret; snipState = null;
            renderHighlight(); updateGutter(); scheduleApply(); renderAc();
            return;
        }

        /* auto-fecho de { → insere } logo após (blocos de entidade) */
        if (e.key === '{') {
            const pos = src.selectionStart, after = src.value.slice(src.selectionEnd);
            if (/^([\s]|$)/.test(after) && src.selectionStart === src.selectionEnd) {
                e.preventDefault();
                pushHistory();
                src.value = src.value.slice(0, pos) + '{}' + src.value.slice(pos);
                src.selectionStart = src.selectionEnd = pos + 1;
                lastLen = src.value.length; lastCaret = pos + 1; lastSel = pos + 1;
                renderHighlight(); scheduleApply(); renderAc();
            }
            return;
        }
        if (e.key === '}') {
            /* se o próximo caractere é o } auto-inserido, só pula por cima */
            if (src.selectionStart === src.selectionEnd && src.value[src.selectionStart] === '}') {
                e.preventDefault();
                src.selectionStart = src.selectionEnd = src.selectionStart + 1;
            }
            return;
        }

        if (e.key === 'Tab') {
            e.preventDefault();
            const cur = snipState && snipState.stops[snipState.idx];
            /* está no campo atual se o cursor está dentro do range do placeholder
               (depois de digitar, o cursor fica colapsado no fim do texto) */
            if (snipState && cur && src.selectionStart >= cur.start && src.selectionEnd <= cur.start + cur.len && src.selectionEnd >= cur.start) {
                cur.len = src.selectionEnd - cur.start; /* consolida o que foi digitado */
                const nxt = snipState.idx + 1;
                if (nxt < snipState.stops.length) jumpStop(nxt);
                else { snipState = null; src.selectionStart = src.selectionEnd = cur.start + cur.len; }
                return;
            }
            snipState = null;
            const s = src.selectionStart, en = src.selectionEnd;
            if (s !== en) {
                /* indentação de bloco selecionado */
                const st = src.value.lastIndexOf('\n', s - 1) + 1;
                src.value = src.value.slice(0, st) + src.value.slice(st, en).replace(/^/gm, '    ') + src.value.slice(en);
                src.selectionStart = st; src.selectionEnd = en + 4 * (src.value.slice(st, en).split('\n').length);
            } else {
                src.value = src.value.slice(0, s) + '    ' + src.value.slice(en);
                src.selectionStart = src.selectionEnd = s + 4;
            }
            lastLen = src.value.length; lastCaret = src.selectionStart; lastSel = src.selectionEnd;
            renderHighlight(); scheduleApply();
        }
    });
    window.addEventListener('keydown', e => {
        if (e.key === 'Escape') { exportMenu.classList.remove('open'); toggleDocs(false); selectedId = null; updateFocus(); }
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); applyNow(true); }
        const tag = document.activeElement && document.activeElement.tagName;
        if (e.key === '?' && tag !== 'TEXTAREA' && tag !== 'INPUT') { e.preventDefault(); toggleDocs(); }
        if (!e.ctrlKey && !e.metaKey && !e.altKey && tag !== 'TEXTAREA' && (e.key === 'f' || e.key === 'F')) organize();
        if (!e.ctrlKey && !e.metaKey && !e.altKey && tag !== 'TEXTAREA' && (e.key === 'p' || e.key === 'P')) setPreview(!previewMode);
    });
    $('btnFormat').onclick = () => formatCode();
    $('btnOrganize').onclick = organize;
    const btnPreview = $('btnPreview');
    function setPreview(v) {
        previewMode = v;
        btnPreview.setAttribute('aria-pressed', String(v));
        btnPreview.classList.toggle('on', v);
        btnPreview.title = v ? 'Sair do modo prévia (P) — tabelas travadas' : 'Modo prévia: navegue sem mover tabelas (P)';
        store.set('preview', v ? '1' : '0');
    }
    btnPreview.onclick = () => setPreview(!previewMode);
    setPreview(store.get('preview') === '1');
    const layoutSel = $('layoutSel');
    layoutSel.addEventListener('change', () => {
        store.set('layout', layoutSel.value);
        toast({ force: 'Organização orgânica', layered: 'Organização hierárquica', compact: 'Organização compacta' }[layoutSel.value]);
        organize();
    });
    $('btnZoomIn').onclick = () => zoomBy(1.3);
    $('btnZoomOut').onclick = () => zoomBy(1 / 1.3);
    $('btnFit').onclick = () => fitView(true);
    zoomLbl.onclick = resetZoom;
    /* selecionar tipo → começa um diagrama em branco daquele tipo */
    /* selecionar tipo → começa um diagrama de exemplo daquele tipo */
    const BLANK_HDR = {
        er: 'erDiagram\n    USUARIO ||--o{ PEDIDO : realiza\n\n    USUARIO {\n        int id PK\n        string nome\n    }\n    PEDIDO {\n        int id PK\n        int usuario_id FK\n    }',
        flow: 'flowchart TD\n    Inicio[Começo] --> Decisão{Tudo certo?}\n    Decisão -->|sim| Fim[Resultado]\n    Decisão -.->|não| Inicio',
        seq: 'sequenceDiagram\n    participant U as Usuário\n    participant S as Servidor\n    U ->> S: requisição\n    S -->> U: resposta',
        class: 'classDiagram\n    Animal <|-- Cachorro\n    Animal : +nome\n    Animal : +emitirSom()\n    class Cachorro {\n        +latir()\n    }',
        pie: 'pieDiagram\n    title Exemplo\n    "Vendas" : 40\n    "Suporte" : 25\n    "Infra" : 15',
        mindmap: 'mindmap\n    root((Tema))\n        Ramo A\n            Folha\n        Ramo B',
        c4: 'C4Context\n    title Exemplo\n    Person(user, "Cliente", "Usa o sistema")\n    System(app, "Aplicação", "Core do produto")\n    SystemDb(db, "Banco", "PostgreSQL")\n    Rel(user, app, "Usa", "HTTPS")\n    Rel(app, db, "Persiste", "SQL")'
    };
    $('typeSel').onchange = e => {
        const t = e.target.value;
        if (!t || !BLANK_HDR[t]) return;
        positions = {}; store.set('pos', '{}');
        src.value = BLANK_HDR[t];
        renderHighlight(); updateGutter();
        applySource(src.value, { resetLayout: true, mode: layoutSel.value });
        fitView(true);
        toast('Novo diagrama de exemplo — edite o código à vontade');
    };
    $('examples').onchange = e => {
        positions = {}; store.set('pos', '{}');
        src.value = EXAMPLES[+e.target.value].code;
        renderHighlight(); updateGutter();
        applySource(src.value, { resetLayout: true, animate: true, mode: layoutSel.value });
        fitView(true);
        toast(`Exemplo “${EXAMPLES[+e.target.value].name}” carregado`);
    };


    /* ══════════ 20-panel-resize.js ══════════ */
    /* ══════════ painel redimensionável ══════════ */
    const panelResize = $('panelResize');
    {
        const savedW = parseInt(store.get('panelW'));
        if (savedW >= 260 && savedW <= 720) panel.style.width = savedW + 'px';
    }
    panelResize.addEventListener('pointerdown', e => {
        if (panel.classList.contains('hidden')) return;
        e.preventDefault();
        panelResize.setPointerCapture(e.pointerId);
        panelResize.classList.add('dragging');
        panel.classList.add('resizing');
        const startX = e.clientX, startW = panel.getBoundingClientRect().width;
        const move = ev => {
            const w = clamp(Math.round(startW + (ev.clientX - startX)), 260, 720);
            panel.style.width = w + 'px';
        };
        const up = ev => {
            panelResize.releasePointerCapture(e.pointerId);
            panelResize.classList.remove('dragging');
            panel.classList.remove('resizing');
            panelResize.removeEventListener('pointermove', move);
            panelResize.removeEventListener('pointerup', up);
            store.set('panelW', String(clamp(Math.round(panel.getBoundingClientRect().width), 260, 720)));
            applyView();
        };
        panelResize.addEventListener('pointermove', move);
        panelResize.addEventListener('pointerup', up);
    });
    new ResizeObserver(() => applyView()).observe(canvas);


    /* ══════════ 21-docs.js ══════════ */
    /* ── tabs da documentação ── */
    const docsTabs = $('docsTabs');
    const docsSections = [...document.querySelectorAll('#docs .docs-body section[data-tab]')];
    function setDocsTab(tab) {
        docsTabs.querySelectorAll('.dt-tab').forEach(b => {
            const on = b.dataset.tab === tab;
            b.classList.toggle('on', on);
            b.setAttribute('aria-selected', String(on));
        });
        docsSections.forEach(s => s.classList.toggle('on', s.dataset.tab === tab));
    }
    docsTabs.querySelectorAll('.dt-tab').forEach(b => b.onclick = () => setDocsTab(b.dataset.tab));
    setDocsTab('geral');

    function insertTemplate(tpl) {
        const s = src.selectionStart ?? src.value.length, e = src.selectionEnd ?? s;
        const before = src.value.slice(0, s), after = src.value.slice(e);
        const pad = before && !before.endsWith('\n') ? '\n' : '';
        src.value = before + pad + tpl + '\n' + after;
        renderHighlight();
        src.focus();
        const iA = src.value.indexOf('ENTIDADE_A', s);
        src.setSelectionRange(iA, iA + 10);
        scheduleApply();
        toggleDocs(false);
        toast('Gabarito inserido — substitua as entidades');
    }
    document.querySelectorAll('.chip[data-tpl]').forEach(b => b.addEventListener('click', () => insertTemplate(b.dataset.tpl)));


    /* ══════════ inicialização ══════════ */
    async function init() {
        setTheme(store.get('theme') || 'light');
        if (store.get('panel') === '0' || innerWidth < 861) {
            panel.classList.add('hidden');
            document.body.classList.add('code-hidden');
        }
        try {
            await Promise.all([
                document.fonts.load('600 12px "Space Grotesk"'),
                document.fonts.load('500 12px "JetBrains Mono"'),
                document.fonts.load('400 11px "JetBrains Mono"'),
                document.fonts.load('italic 400 11px "JetBrains Mono"'),
                document.fonts.load('700 8.5px "JetBrains Mono"'),
                document.fonts.load('600 9.5px "JetBrains Mono"')
            ]);
        } catch (e) { }
        try { positions = JSON.parse(store.get('pos')) || {}; } catch (e) { positions = {}; }
        const shared = loadSharedCode();
        const saved = shared ?? store.get('code');
        src.value = saved ?? EXAMPLES[0].code;
        beforeState = snapState();
        const idx = EXAMPLES.findIndex(x => x.code === src.value);
        if (idx >= 0) $('examples').value = String(idx);
        renderHighlight();
        updateGutter();
        applyView();
        layoutSel.value = store.get('layout') || 'layered';
        applySource(src.value, { resetLayout: !saved || !!shared, mode: layoutSel.value });
        fitView(true);
    }
    document.fonts.ready.then(init, init);

}
