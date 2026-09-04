// Motor Meridian — toda a mecânica do app (parser, layout, editor, export).
// Organizado em blocos marcados com /* ══════════ NN-nome ══════════ */ — edite aqui mesmo.

import { parseMermaid } from './parser';
import { F, tw, whenFontsReady } from './measure';
import { createSceneBridge } from './scene-bridge';
import { expandAt, adjustStops, computeAcContext, acOptions, isInsideEntityBlock, type ResolvedStop } from './snippets';
import { toast } from './toast';
import { buildExportSVG, downloadBlob, type ExportSvgParams } from './export';
import { onExport, onNew, onLoadCode, onTransparent, type ExportFormat } from '../state/ui-bus';
import { publishAc, publishGutter, publishHighlight, onAcAccept } from '../state/ui-bus';
import { computeEdges, type EdgeGeom } from './edges-geom';
import type { Entity, ParseResult } from './types';
import { snapMove, pushOut, GAP_X, GAP_Y } from './drag-geom';
import { resolveOverlaps } from './drag-geom';
import { layoutPositions } from './layout';
import { store } from './store';
import { createHistory } from './history';
import { entityAtCaret as entityAtCaretPure } from './caret';
import { highlightMermaid } from './highlight';
import { buildFormatted } from './formatter';
import { EXAMPLES } from './examples';

let engineMounted = false; /* StrictMode roda o effect 2× em dev — sem guard, listeners duplicam */
/** Entidade de cena: geometria garantida (pós-measure) + refs de DOM. */
type Ent = Entity & { x: number; y: number; w: number; h: number; g?: Element; inner?: Element };
type SceneModel = Omit<ParseResult, 'entities'> & { entities: Ent[]; seqBottom?: number };

export function mountEngine() {
    if (engineMounted) return;
    engineMounted = true;
    /* ══════════ 00-core.js ══════════ */
    /* ══════════ refs & helpers ══════════ */
    const $ = (id: string): any => document.getElementById(id);
    const canvas = $('canvas'), scene = $('scene'), gEdges = $('gEdges'), gTables = $('gTables'),
        gTop = $('gTop'), gGuides = $('gGuides'), src = $('src'), hl = $('hl'),
        panel = $('panel'), statsEl = $('stats'), zoomLbl = $('zoomLbl'),
        parseDot = $('parseDot'), parseText = $('parseText'), parseFoot = $('parseFoot'),
        mm = $('minimap'), mmContent = $('mmContent'), mmView = $('mmView'),
        docs = $('docs'), docsBackdrop = $('docsBackdrop');

    const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

    /* ══════════ 04-measure.js ══════════ */
    /* ══════════ medidas das tabelas ══════════ */


    function measureEntity(e: any) {
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
        const cwCm = Math.max(0, ...e.attrs.map((a: any) => a.comment ? tw(a.comment, F.comment) + 12 : 0));
        e.commentW = Math.round(cwCm);
        for (const a of e.attrs) {
            const bw = a.keys.reduce((s: any, k: any) => s + tw(k, F.key) + 12 + 5, 0);
            w = Math.max(w, 14 + tw(a.name, F.name) + (a.keys.length ? 7 + bw : 0) + 12 + tw(a.type, F.type) + 14 + e.commentW);
        }
        const cw = tw(String(e.attrs.length), F.count) + 12;
        w = Math.max(w, 14 + tw(e.name.toUpperCase(), F.title) * 1.14 + 10 + cw + 14 + (e.commentW || 0));
        e.w = Math.round(w);
        e.h = e.attrs.length ? 40 + e.attrs.length * 26 + 6 : 40 + 26 + 8;
    }

    /* ══════════ layout por simulação de forças ══════════ */


    /* ══════════ 06-tables.js ══════════ */
    /* ══════════ cena React: nós declarativos + delegação de interação ══════════ */
    let model: SceneModel = { type: 'er', entities: [], relations: [], errors: [] };
    const byId: Record<string, Ent> = {};
    let adj: Record<string, Set<string>> = {};
    let positions: Record<string, { x: number; y: number }> = {};
    const SEQ_TOP = 118, SEQ_STEP = 46;
    const mmCollapsed = new Set(); /* ramos do mindmap recolhidos (por nome do nó) */

    const sceneBridge = createSceneBridge(gTables, gEdges, gTop, gGuides, mmContent, mmView);
    function mmToggle(name: any) {
        if (mmCollapsed.has(name)) mmCollapsed.delete(name);
        else mmCollapsed.add(name);
        applySource(src.value, { resetLayout: true, mode: layoutSel.value });
    }
    function renderTables(animate: any) {
        for (const { id, g } of sceneBridge.renderTables({
            type: model.type,
            entities: model.entities.filter((e: any) => !e.hidden),
            animate,
            onToggle: mmToggle,
        })) {
            const e = byId[id];
            if (e) { e.g = g; e.inner = g.firstElementChild ?? undefined; }
        }
    }
    /* visibilidade do mindmap: nó oculto se algum ancestral estiver recolhido */
    function mmHiddenState() {
        const parent: any = {};
        for (const r of model.relations) parent[r.b] = r.a;
        for (const e of model.entities) {
            let p = parent[e.name], hid = false, guard = 0;
            while (p && guard++ < 100) { if (mmCollapsed.has(p)) { hid = true; break; } p = parent[p]; }
            e.hidden = hid;
            e.hasKids = model.relations.some((r: any) => r.a === e.name);
            e.collapsed = mmCollapsed.has(e.name);
        }
    }
    let hoverId: any = null, selectedId: any = null, animating = false, previewMode = false;

    /* delegação de eventos (drag/hover) — os nós são componentes React sem estado */
    gTables.addEventListener('pointerdown', (e: any) => {
        if (e.target.closest('.mm-tgl')) return; /* selo do mindmap tem handler próprio */
        const g = e.target.closest('g.table');
        const ent = g && byId[g.dataset.id];
        if (ent) onTableDown(e, ent);
    });
    gTables.addEventListener('pointerover', (e: any) => {
        const g = e.target.closest('g.table');
        if (g && byId[g.dataset.id]) { hoverId = g.dataset.id; updateFocus(); }
    });
    gTables.addEventListener('pointerout', (e: any) => {
        const g = e.target.closest('g.table');
        if (g && g.dataset.id === hoverId) { hoverId = null; updateFocus(); }
    });

    /* ══════════ 07-edges.js ══════════ */
    /* ══════════ arestas: geometria pura (edges-geom) + ponte de cena.
       React só na mudança estrutural; por frame, atributos diretos. ══════════ */
    let edgeGeoms: EdgeGeom[] = [];
    function currentMs() { return clamp(1 / (vw() / cam.w), 1, 1.7); }
    function computeGeoms(): EdgeGeom[] {
        return computeEdges({
            type: model.type,
            entities: model.entities.filter((e: any) => !e.hidden && e.x != null),
            relations: model.relations,
            seqTop: SEQ_TOP, seqStep: SEQ_STEP, seqBottom: model.seqBottom,
            ms: currentMs(),
        });
    }
    function renderEdges(animate: any) {
        edgeGeoms = computeGeoms();
        sceneBridge.renderEdges(edgeGeoms, currentMs());
        if (animate && edgeGeoms.length) {
            scene.classList.add('drawing');
            const paths = edgeGeoms
                .map((g: any) => sceneBridge.edgeLineEl(g.key))
                .filter(Boolean);
            for (const el of paths) {
                const L = el!.getTotalLength();
                el!.style.strokeDasharray = String(L); el!.style.strokeDashoffset = String(L);
                el!.getBoundingClientRect();
                el!.style.transition = 'stroke-dashoffset .9s cubic-bezier(.35,0,.25,1)';
                requestAnimationFrame(() => { el!.style.strokeDashoffset = '0'; });
            }
            setTimeout(() => {
                scene.classList.remove('drawing');
                for (const el of paths) {
                    el!.style.transition = ''; el!.style.strokeDasharray = ''; el!.style.strokeDashoffset = '';
                }
            }, 1150);
        }
    }
    /* por frame (drag/pan/zoom): recalcula geometria e aplica atributos */
    const updateEdgeGeometry = () => { edgeGeoms = computeGeoms(); sceneBridge.updateEdges(edgeGeoms, currentMs()); };

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
            g?.classList.toggle('sel', name === selectedId);
            g?.classList.toggle('dimt', !!act && name !== act && !(adj[name] && adj[name].has(act)));
        }
        for (const E of edgeGeoms) {
            if (E.kind === 'life') continue;
            const hit = !!act && (E.aName === act || E.bName === act);
            const dim = !!act && !hit;
            sceneBridge.setEdgeFocus(E.key, hit, dim);
        }
        updateMinimap();
    }

    /* ══════════ 08-camera.js ══════════ */
    /* ══════════ câmera / pan / zoom ══════════ */
    let cam: any = { x: 0, y: 0, w: 1000, h: 700 }, camAnim: any = null;
    const vs = () => ({ rw: canvas.clientWidth, rh: canvas.clientHeight });
    const vw = () => canvas.clientWidth;
    function normalizeH() { const { rw, rh } = vs(); cam.h = cam.w * rh / Math.max(1, rw); }
    let sceneRect: any = null; /* cache do rect da cena durante gestos */
    function cacheSceneRect() { sceneRect = scene.getBoundingClientRect(); }
    function screenToWorld(cx: any, cy: any) {
        const r = sceneRect ?? (sceneRect = scene.getBoundingClientRect());
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
    function animateCam(target: any, dur = 480) {
        cancelAnimationFrame(camAnim);
        const s = { ...cam }, t0 = performance.now();
        const ease = (t: any) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const step = (t: any) => {
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
    function zoomBy(f: any) {
        const { rw, rh } = vs();
        const cx = cam.x + cam.w / 2, cy = cam.y + cam.h / 2;
        const w = clamp(cam.w / f, rw / 7, rw * 6);
        animateCam({ x: cx - w / 2, y: cy - w * (rh / rw) / 2, w }, 220);
    }
    function resetZoom() {
        const { rw, rh } = vs(), cx = cam.x + cam.w / 2, cy = cam.y + cam.h / 2;
        animateCam({ x: cx - rw / 2, y: cy - rw * (rh / rw) / 2, w: rw }, 260);
    }
    canvas.addEventListener('wheel', (e: any) => {
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
    let pinch: any = null;
    canvas.addEventListener('pointerdown', (e: any) => {
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
    canvas.addEventListener('pointermove', (e: any) => {
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
    const endTouch = (e: any) => {
        touchPtrs.delete(e.pointerId);
        if (touchPtrs.size < 2) pinch = null;
    };
    canvas.addEventListener('pointerup', endTouch);
    canvas.addEventListener('pointercancel', endTouch);


    /* ══════════ 09-drag.js ══════════ */
    /* ══════════ arrastar tabelas + guias inteligentes ══════════ */
    let dragState: any = null, panState: any = null;

    function drawGuides(sn: any) {
        sceneBridge.setGuides({ gx: sn.gx, gy: sn.gy });
    }

    function onTableDown(e: any, ent: any) {
        if (e.button !== 0 || animating || previewMode) return;
        e.stopPropagation();
        cacheSceneRect();
        const p = screenToWorld(e.clientX, e.clientY);
        dragState = { ent, ox: p.x - ent.x, oy: p.y - ent.y, moved: false };
        scene.setPointerCapture(e.pointerId);
        ent.g.classList.add('dragging');
        if (selectedId !== ent.name) { selectedId = ent.name; updateFocus(); }
    }
    scene.addEventListener('pointerdown', (e: any) => {
        if (e.button === 1) { e.preventDefault(); }
        if (e.target !== scene) return;
        if (e.button !== 0 && e.button !== 1) return;
        cacheSceneRect();
        panState = { sx: e.clientX, sy: e.clientY, cx: cam.x, cy: cam.y, moved: false };
        scene.setPointerCapture(e.pointerId);
        scene.classList.add('panning');
    });
    scene.addEventListener('pointermove', (e: any) => {
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
            const r = sceneRect ?? (sceneRect = scene.getBoundingClientRect());
            cam.x = panState.cx - dx * cam.w / r.width;
            cam.y = panState.cy - dy * cam.h / r.height;
            applyView();
        }
    });
    function endPointer(_e: PointerEvent) {
        if (dragState) {
            const ent = dragState.ent;
            ent.g.classList.remove('dragging');
            sceneBridge.clearGuides();
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
    scene.addEventListener('dblclick', (e: any) => { if (e.target === scene) fitView(true); });


    /* ══════════ 10-minimap.js ══════════ */
    /* ══════════ minimapa ══════════ */
    let mmState: any = null;
    function updateMinimap() {
        const bb = contentBBox();
        if (!bb) { sceneBridge.clearMinimap(); mmState = null; return; }
        const rx = Math.min(bb.x, cam.x) - 40, ry = Math.min(bb.y, cam.y) - 40;
        const w = Math.max(bb.x + bb.w, cam.x + cam.w) + 40 - rx;
        const h = Math.max(bb.y + bb.h, cam.y + cam.h) + 40 - ry;
        const s = Math.min(174 / w, 104 / h), ox = (190 - w * s) / 2, oy = (120 - h * s) / 2;
        mmState = { s, ox, oy, rx, ry };
        const items = model.entities
            .filter((e: Ent) => !e.hidden)
            .map((e: Ent) => ({
                name: e.name,
                x: ox + (e.x - rx) * s, y: oy + (e.y - ry) * s,
                w: Math.max(3, e.w * s), h: Math.max(2.4, e.h * s),
                sel: e.name === selectedId,
            }));
        sceneBridge.drawMinimap(items, {
            x: ox + (cam.x - rx) * s, y: oy + (cam.y - ry) * s,
            w: cam.w * s, h: cam.h * s,
        });
    }
    function mmNav(e: any) {
        if (!mmState) return;
        const r = mm.getBoundingClientRect();
        const wx = mmState.rx + (e.clientX - r.left - mmState.ox) / mmState.s;
        const wy = mmState.ry + (e.clientY - r.top - mmState.oy) / mmState.s;
        cancelAnimationFrame(camAnim);
        cam.x = wx - cam.w / 2; cam.y = wy - cam.h / 2;
        applyView();
    }
    mm.addEventListener('pointerdown', (e: any) => {
        e.stopPropagation();
        mm.setPointerCapture(e.pointerId);
        mmNav(e);
        const mv = (ev: any) => mmNav(ev);
        mm.addEventListener('pointermove', mv);
        mm.addEventListener('pointerup', () => mm.removeEventListener('pointermove', mv), { once: true });
    });


    /* ══════════ 11-editor.js ══════════ */
    const renderHighlight = () => publishHighlight(highlightMermaid(src.value));

    /* ══════════ formatador ══════════ */
    const buildFormattedLocal = () => buildFormatted(src.value, model.type);

    function formatCode(silent?: boolean) {
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
    function placeNear(ent: any) {
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
        const i = (placeNear as any).n = ((placeNear as any).n || 0) + 1;
        const a = i * 2.1, r = 30 + i * 26;
        ent.x = Math.round(cx + Math.cos(a) * r); ent.y = Math.round(cy + Math.sin(a) * r);
    }

    function applySource(code: string, opts: any = {}) {
        let { resetLayout = false } = opts;
        const { animate = false, mode = 'force' } = opts;
        const res = parseMermaid(code);
        if (res.errors.length) { setParseState(res.errors); return false; }
        setParseState(null as any, res);
        model = res as SceneModel;
        if (model.type === 'mindmap') mmHiddenState();
        for (const e of model.entities) if (!e.hidden) measureEntity(e);
        if (model.type === 'seq') {
            model.seqBottom = SEQ_TOP + Math.max(1, model.relations.length) * SEQ_STEP + 36;
            resetLayout = true; /* sequência sempre re-layouta (posição linear) */
        }
        if (model.type === 'pie') resetLayout = true; /* pizza sempre re-layouta (geometria circular) */
        if (model.type === 'mindmap') resetLayout = true; /* mindmap sempre re-layouta (árvore arrumada) */
        if (resetLayout) {
            const map = layoutPositions(model.entities, model.relations, false, mode, model.type, model.pieTotal);
            /* nós ocultos (ramos recolhidos) não entram no layout: mantêm a posição antiga */
            for (const e of model.entities) { const p = map.get(e.name); if (p) { e.x = p.x; e.y = p.y; } }
        } else {
            (placeNear as any).n = 0; let anyNew = false;
            for (const e of model.entities) {
                const p = positions[e.name];
                if (p) { e.x = p.x; e.y = p.y; } else { placeNear(e); anyNew = true; }
            }
            if (anyNew) resolveOverlaps(model.entities, 40);
        }
        for (const k of Object.keys(byId)) delete byId[k];
        model.entities.forEach((e: Ent) => { if (!e.hidden) byId[e.name] = e; });
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
    function animateTo(targets: any, dur: any, done: any) {
        animating = true;
        const starts = model.entities.map((e: any) => ({ x: e.x, y: e.y }));
        const t0 = performance.now();
        const ease = (t: any) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const step = (t: any) => {
            const p = Math.min(1, (t - t0) / dur), k = ease(p);
            model.entities.forEach((e: any, i: any) => {
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
        const targets = layoutPositions(model.entities, model.relations, true, layoutSel.value, model.type, model.pieTotal);
        animateTo(targets, 650, () => { savePositions(); fitView(true); });
    }
    function updateStats() {
        if (model.type === 'pie') {
            const n = model.entities.filter((e: any) => !e.pieTitle).length;
            statsEl.textContent = `${n} fatias · total ${model.pieTotal}`;
            return;
        }
        const vis = model.entities.filter((e: any) => !e.hidden);
        const fields = vis.reduce((s: any, e: any) => s + e.attrs.length, 0);
        statsEl.textContent = `${vis.length} entidades · ${edgeGeoms.length} relações · ${fields} campos`;
    }
    function setParseState(errors: any, res?: any) {
        if (errors && errors.length) {
            parseDot.classList.add('err'); parseFoot.classList.add('err');
            parseText.textContent = `linha ${errors[0].line}: ${errors[0].msg}${errors.length > 1 ? ` (+${errors.length - 1})` : ''}`;
        } else {
            parseDot.classList.remove('err'); parseFoot.classList.remove('err');
            parseText.textContent = `ok · ${res.entities.length} entidades · ${res.relations.length} relações`;
        }
    }


    /* ══════════ 13-export.js ══════════ */
    /* ══════════ exportação: lógica em export.ts; engine só liga ao modelo ══════════ */
    async function buildSVG() {
        return buildExportSVG({
            scene,
            bbox: contentBBox(),
            transparent: store.get('transp') === '1',
        } as ExportSvgParams);
    }
    async function exportSVG() {
        const r = await buildSVG();
        if (!r) { toast('Nada para exportar', 'err'); return; }
        downloadBlob(new Blob([r.str], { type: 'image/svg+xml;charset=utf-8' }), 'diagrama-er.svg');
        toast('SVG exportado');
    }
    async function exportPNG() {
        const r = await buildSVG();
        if (!r) { toast('Nada para exportar', 'err'); return; }
        try {
            const url = URL.createObjectURL(new Blob([r.str], { type: 'image/svg+xml;charset=utf-8' }));
            const img = new Image();
            await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
            const c = document.createElement('canvas'); c.width = r.W * 2; c.height = r.H * 2;
            const ctx = c.getContext('2d')!; ctx.scale(2, 2); ctx.drawImage(img, 0, 0, r.W, r.H);
            URL.revokeObjectURL(url);
            c.toBlob((b: Blob | null) => { if (b) downloadBlob(b, 'diagrama-er.png'); toast('PNG exportado (2×)'); }, 'image/png');
        } catch { toast('Falha ao gerar PNG', 'err'); }
    }
    function exportMMD() {
        if (!src.value.trim()) { toast('Nada para salvar', 'err'); return; }
        downloadBlob(new Blob([src.value], { type: 'text/plain;charset=utf-8' }), 'diagrama-er.mmd');
        toast('Código Mermaid salvo');
    }
    function runExport(format: ExportFormat) {
        if (format === 'svg') exportSVG();
        else if (format === 'png') exportPNG();
        else exportMMD();
    }

    /* ══════════ 14-ui.js ══════════ */
    /* ══════════ toasts / tema / painel / menus / docs ══════════ */


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

    function setTheme(t: any) {
        document.documentElement.dataset.theme = t;
        $('btnTheme').dataset.theme = t;
        // Notifica o sistema React sobre mudança de tema (sistema gerencia persistência automaticamente)
        window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme: t } }));
    }
    // Listener para responder a mudanças de tema do sistema React
    window.addEventListener('theme-sync', (e: any) => {
        const theme = e.detail.theme;
        document.documentElement.dataset.theme = theme;
        $('btnTheme').dataset.theme = theme;
    });
    $('btnTheme').onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    $('btnPanel').onclick = () => {
        panel.classList.toggle('hidden');
        const hidden = panel.classList.contains('hidden');
        store.set('panel', hidden ? '0' : '1');
        document.body.classList.toggle('code-hidden', hidden);
    };
    $('btnShowCode').onclick = () => $('btnPanel').click();
    onExport(runExport);
    onTransparent((on: boolean) => store.set('transp', on ? '1' : '0'));

    function toggleDocs(open = true) {
        const o = open ?? !docs.classList.contains('open');
        docs.classList.toggle('open', o);
        docsBackdrop.classList.toggle('open', o);
    }
    $('btnDocs').onclick = () => toggleDocs(true);
    $('btnDocsClose').onclick = () => toggleDocs(false);
    docsBackdrop.onclick = () => toggleDocs(false);


    /* ══════════ 16-snippets.js ══════════ */
    /* ══════════ snippets: slash commands + tabstops ══════════ */
    let snipState: { stops: ResolvedStop[]; idx: number } | null = null;
    let acList: any[] = [], acSel = 0, acCtx: any = null;
    let acOpen = false;
    function publishAcState() {
        publishAc({
            open: acOpen, sel: acSel, x: acXY.x, y: acXY.y,
            items: acList.map((it: any) => ({ label: it.label, desc: it.desc, item: it })),
        });
    }
    let acXY = { x: 0, y: 0 };

    const monoCtx = document.createElement('canvas').getContext('2d')!;
    function caretXY() {
        const cs = getComputedStyle(src);
        monoCtx.font = cs.font;
        const pos = src.selectionStart, before = src.value.slice(0, pos);
        const line = before.split('\n').length - 1;
        const colTxt = before.slice(before.lastIndexOf('\n') + 1);
        const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.7;
        const cw = monoCtx.measureText('M').width || 7.5;
        const wrap = document.querySelector('.code-wrap') as HTMLElement;
        return {
            x: clamp(parseFloat(cs.paddingLeft) + colTxt.length * cw - src.scrollLeft + 2, 0, wrap.clientWidth - 260),
            y: clamp(parseFloat(cs.paddingTop) + line * lh - src.scrollTop + 2, 0, wrap.clientHeight - 160)
        };
    }
    function closeAc() {
        acList = []; acCtx = null;
        if (acOpen) { acOpen = false; publishAcState(); }
    }
    function entityNames() {
        const set = new Set();
        for (const m of src.value.matchAll(/^\s*([A-Za-z_][\w.\-]*)\s*\{/gm)) set.add(m[1]);
        for (const m of src.value.matchAll(/([A-Za-z_][\w.\-]*)\s+(?:\|o|\|\||\}o|\}\|)\s*(?:--|\.\.|==)\s*(?:o\||\|\||o\{|\|\{)\s+([A-Za-z_][\w.\-]*)/g)) { set.add(m[1]); set.add(m[2]); }
        return [...set];
    }
    const inEntityBlock = (pos: any) => isInsideEntityBlock(src.value, pos);

    function computeAc(): any {
        return computeAcContext(src.value, src.selectionStart, inEntityBlock(src.selectionStart));
    }
    function renderAc() {
        acCtx = computeAc();
        if (!acCtx) { closeAc(); return; }
        acList = acOptions(acCtx, entityNames() as string[]);
        if (!acList.length) { closeAc(); return; }
        acSel = 0;
        acXY = caretXY();
        acOpen = true;
        publishAcState();
    }
    function acceptAc(item: any) {
        if (acCtx.mode === 'slash') { acceptSnippet(item.snippet, acCtx.qr); return; }
        const pos = acCtx.wStart;
        pushHistory();
        src.value = src.value.slice(0, pos) + item.insert + src.value.slice(src.selectionEnd);
        src.selectionStart = src.selectionEnd = pos + item.insert.length;
        lastLen = src.value.length; lastCaret = src.selectionStart; lastSel = src.selectionEnd;
        closeAc(); renderHighlight(); scheduleApply();
    }
    function acceptSnippet(s: any, qr: any) {
        /* expande ${n:default}: texto completo + offsets reais dos tabstops */
        const r = expandAt(src.value, qr.start, src.selectionStart, s.body);
        src.value = r.value;
        pushHistory();
        src.selectionStart = src.selectionEnd = r.caret;
        lastLen = src.value.length; lastCaret = r.caret; lastSel = r.caret;
        snipState = r.stops.length ? { stops: r.stops, idx: 0 } : null;
        closeAc();
        if (snipState) jumpStop(0);
        renderHighlight(); scheduleApply();
    }
    function jumpStop(i: any) {
        if (!snipState) return;
        const st = snipState.stops[i];
        if (!st) { snipState = null; return; }
        snipState.idx = i;
        src.selectionStart = st.start;
        src.selectionEnd = st.start + st.len;
        /* sincroniza o rastreio do snippet com a nova posição do cursor */
        lastLen = src.value.length; lastCaret = st.start; lastSel = st.start + st.len;
    }
    /* mantém tabstops consistentes enquanto digita dentro do snippet */
    function snipAdjust(caretBefore: any, removed: any, inserted: any) {
        if (!snipState) return;
        adjustStops(snipState.stops, caretBefore, removed, inserted);
    }

    /* ══════════ 17-gutter.js ══════════ */
    /* ══════════ gutter: numeração de linhas ══════════ */
        let gutterCount = -1;
    function updateGutter() {
        const n = src.value.split('\n').length;
        const line = src.value.slice(0, src.selectionStart).split('\n').length - 1;
        publishGutter({ count: n, cur: line, scrollTop: src.scrollTop });
    }

    /* ══════════ 18-undo.js ══════════ */
    /* ══════════ undo / redo ══════════ */
    const hist = createHistory();
    let beforeState: any = null;
    const snapState = () => ({ value: src.value, s: src.selectionStart, e: src.selectionEnd });
    function pushHistory() { hist.push(snapState()); }
    function restoreState(h: any) {
        src.value = h.value;
        src.selectionStart = h.s; src.selectionEnd = h.e;
        lastLen = h.value.length; lastCaret = h.s; lastSel = h.e; snipState = null;
        beforeState = snapState();
        closeAc(); renderHighlight(); updateGutter(); scheduleApply();
    }
    function undo() {
        const h = hist.undo(snapState());
        if (h) restoreState(h);
    }
    function redo() {
        const h = hist.redo(snapState());
        if (h) restoreState(h);
    }


    /* ══════════ 19-editor-events.js ══════════ */
    /* ══════════ editor: eventos ══════════ */
    let applyT: any = null;
    function scheduleApply() {
        if (acOpen) return; /* aguarda snippet ser resolvido */
        clearTimeout(applyT);
        applyT = setTimeout(() => {
            applySource(src.value);
        }, 600);
    }
    function applyNow(showToast: any) {
        const ok = applySource(src.value);
        if (showToast) toast(ok ? 'Diagrama atualizado' : 'Corrija os erros no código', ok ? '' : 'err');
    }
    let lastLen = src.value.length, lastCaret = 0, lastSel = 0;
    src.addEventListener('input', () => {
        /* digitação: agrupa rajadas de até 500ms num único passo de undo */
        hist.noteBurst(beforeState);
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
    src.addEventListener('scroll', () => { hl.scrollTop = src.scrollTop; hl.scrollLeft = src.scrollLeft; closeAc(); publishGutter({ count: gutterCount, cur: src.value.slice(0, src.selectionStart).split('\n').length - 1, scrollTop: src.scrollTop }); });
    src.addEventListener('blur', () => setTimeout(closeAc, 120));
    src.addEventListener('click', () => { snipState = null; closeAc(); updateGutter(); editorFocusEntity(); });

    /* clique no editor → foca/destaca a entidade no canvas */
    const entityAtCaret = (pos: any) => entityAtCaretPure(src.value, pos, new Set(Object.keys(byId)));

    function editorFocusEntity() {
        const name = entityAtCaret(src.selectionStart);
        const e = name && byId[name];
        if (!e || animating) return;
        if (selectedId !== name) { selectedId = name; updateFocus(); }
        const { rw, rh } = vs();
        const w = clamp(rw / 3.2, e.w * 3, rw / 1.6);
        animateCam({ x: e.x + e.w / 2 - w / 2, y: e.y + e.h / 2 - w * (rh / rw) / 2, w }, 420);
    }
    src.addEventListener('keydown', (e: any) => {
        if (acOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            acSel = (acSel + (e.key === 'ArrowDown' ? 1 : acList.length - 1)) % acList.length;
            publishAcState(); /* componente rola o item selecionado à vista */
            return;
        }
        if (acOpen && (e.key === 'Enter' || (e.key === 'Tab' && acCtx && acCtx.mode === 'slash'))) {
            e.preventDefault();
            acceptAc(acList[acSel]);
            return;
        }
        if (acOpen && e.key === 'Tab') { e.preventDefault(); closeAc(); return; } /* fora do slash: Tab fecha menu e indentA */
        if (e.key === 'Escape' && acOpen) { e.preventDefault(); closeAc(); return; }
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
        if (e.key === 'Enter' && !acOpen && src.selectionStart === src.selectionEnd) {
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
        if (e.key === 'Escape') {
            document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            toggleDocs(false); selectedId = null; updateFocus();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); applyNow(true); }
        const tag: string | undefined = document.activeElement?.tagName;
        if (e.key === '?' && tag !== 'TEXTAREA' && tag !== 'INPUT') { e.preventDefault(); toggleDocs(); }
        if (!e.ctrlKey && !e.metaKey && !e.altKey && tag !== 'TEXTAREA' && (e.key === 'f' || e.key === 'F')) organize();
        if (!e.ctrlKey && !e.metaKey && !e.altKey && tag !== 'TEXTAREA' && (e.key === 'p' || e.key === 'P')) setPreview(!previewMode);
    });
    onAcAccept((item: any) => acceptAc(item));
    $('btnFormat').onclick = () => formatCode();
    $('btnOrganize').onclick = organize;
    const btnPreview = $('btnPreview');
    function setPreview(v: any) {
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
        toast(({ force: 'Organização orgânica', layered: 'Organização hierárquica', compact: 'Organização compacta' } as any)[layoutSel.value]);
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
    const typeSel = $('typeSel') as HTMLSelectElement | null;
    if (typeSel) typeSel.onchange = (e: any) => {
        const t = (e.target as HTMLSelectElement).value;
        if (!t || !(BLANK_HDR as any)[t]) return;
        loadCode((BLANK_HDR as any)[t]);
        toast('Novo diagrama de exemplo — edite o código à vontade');
    };
    $('examples').onchange = (e: any) => {
        loadCode(EXAMPLES[+e.target.value].code, { animate: true });
        toast(`Exemplo “${EXAMPLES[+e.target.value].name}” carregado`);
    };

    /* carregar código (exemplos, arquivos .mmd e menu Novo) */
    function loadCode(code: string, opts: any = {}) {
        positions = {}; store.set('pos', '{}');
        src.value = code;
        renderHighlight(); updateGutter();
        applySource(src.value, { resetLayout: true, ...opts, mode: layoutSel.value });
        fitView(true);
    }

    /* menu Novo / Limpar tudo (TopBar) */
    onNew((t) => {
        const code = t === 'blank' ? 'erDiagram' : (BLANK_HDR as any)[t];
        if (code == null) return;
        loadCode(code);
        toast(t === 'blank' ? 'Editor limpo — crie seu novo diagrama' : 'Novo diagrama — edite o código à vontade');
    });

    /* drag & drop / abrir arquivo .mmd/.mermaid */
    onLoadCode((code, name) => {
        loadCode(code);
        toast(name ? `Arquivo “${name}” carregado` : 'Diagrama carregado');
    });


    /* ══════════ 20-panel-resize.js ══════════ */
    /* a largura do painel é controlada pelo componente React <PanelResize/>;
     * aqui só a cena precisa reagir ao novo tamanho do canvas. */
    new ResizeObserver(() => { sceneRect = null; applyView(); }).observe(canvas);


    /* ══════════ 21-docs.js ══════════ */
    /* ── tabs da documentação ── */
    const docsTabs = $('docsTabs');
    const docsSections = [...document.querySelectorAll('#docs .docs-body section[data-tab]')];
    function setDocsTab(tab: any) {
        docsTabs.querySelectorAll('.dt-tab').forEach((b: any) => {
            const on = b.dataset.tab === tab;
            b.classList.toggle('on', on);
            b.setAttribute('aria-selected', String(on));
        });
        docsSections.forEach((s: any) => s.classList.toggle('on', s.dataset.tab === tab));
    }
    docsTabs.querySelectorAll('.dt-tab').forEach((b: any) => b.onclick = () => setDocsTab(b.dataset.tab));
    setDocsTab('geral');

    function insertTemplate(tpl: any) {
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
    document.querySelectorAll('.chip[data-tpl]').forEach((b: any) => b.addEventListener('click', () => insertTemplate(b.dataset.tpl)));


    /* ══════════ inicialização ══════════ */
    async function init() {
        // Aplica o tema salvo automaticamente pelo sistema
        const savedTheme = store.get('theme') || 'light';
        document.documentElement.dataset.theme = savedTheme;
        $('btnTheme').dataset.theme = savedTheme;

        if (store.get('panel') === '0' || innerWidth < 861) {
            panel.classList.add('hidden');
            document.body.classList.add('code-hidden');
        }
        /* fontes antes do 1º layout: as medidas de texto precisam das métricas finais */
        await whenFontsReady();
        try { positions = JSON.parse(store.get('pos') || '{}') || {}; } catch { positions = {}; }
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
