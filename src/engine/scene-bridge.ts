import { mountEdgeLines, mountEdgeOverlays, mountTables } from '../components/diagram/Scene';
import { EdgeLines, EdgeOverlays } from '../components/diagram/edges';
import type { EdgeGeom } from './edges-geom';

export interface GuideSpec { gx: { x: number; y1: number; y2: number } | null; gy: { y: number; x1: number; x2: number } | null }
export interface MiniItem { name: string; x: number; y: number; w: number; h: number; sel: boolean }
export interface MiniView { x: number; y: number; w: number; h: number }

/* ══════════ ponte cena ↔ engine ══════════
   Concentra tudo que é React/DOM da cena do diagrama:
   - render estrutural (mudança de modelo) via React;
   - updates por frame (drag/pan/zoom) via setAttribute direto
     em refs cacheadas — sem reconciliação no caminho quente.
   O engine.orquestrador chama esta ponte; não toca no DOM da cena. */

export interface TableRenderOptions {
    type: string;
    entities: any[];
    animate: boolean;
    onToggle: (name: string) => void;
}

export interface SceneBridge {
    /** render estrutural das tabelas + devolve nós p/ refs do engine */
    renderTables(opts: TableRenderOptions): { id: string; g: Element }[];
    /** render estrutural das arestas (linhas + símbolos) */
    renderEdges(geoms: EdgeGeom[], ms: number): void;
    /** update por frame: aplica geometria por atributos (sem React) */
    updateEdges(geoms: EdgeGeom[], ms: number): void;
    /** path da linha de uma aresta (p/ animação de desenho) */
    edgeLineEl(key: string): SVGPathElement | null;
    /** aplica classes de foco/dim nos símbolos de uma aresta */
    setEdgeFocus(key: string, hit: boolean, dim: boolean): void;
    /** guias de alinhamento do drag (linhas em gGuides) */
    setGuides(g: GuideSpec): void;
    clearGuides(): void;
    /** rects do minimapa (cache interno por entidade) + janela da câmera */
    drawMinimap(items: MiniItem[], view: MiniView): void;
    clearMinimap(): void;
}

export function createSceneBridge(gTables: Element, gEdges: Element, gTop: Element, gGuides: Element, mmContent: Element, mmView: Element): SceneBridge {
    let mmRects: Map<string, Element> = new Map();
    const tablesRoot = mountTables(gTables);
    const linesRoot = mountEdgeLines(gEdges);
    const overlaysRoot = mountEdgeOverlays(gTop);

    let edgeRefs: Map<string, {
        line: SVGPathElement | null;
        arrow: SVGPathElement | null;
        mkA: Element | null; mkB: Element | null;
        badgeA: Element | null; badgeB: Element | null;
        label: Element | null;
    }> = new Map();

    function esc(key: string) { return CSS.escape(String(key)); }

    function refreshEdgeRefs(geoms: EdgeGeom[]) {
        edgeRefs = new Map();
        for (const g of geoms) {
            const lineG = gEdges.querySelector(`[data-edge="${esc(g.key)}"]`);
            if (!lineG) continue;
            edgeRefs.set(g.key, {
                line: lineG.querySelector('.e-line'),
                arrow: lineG.querySelector('.e-arrow'),
                mkA: gTop.querySelector(`[data-edge="${esc(g.key + ':a')}"]`),
                mkB: gTop.querySelector(`[data-edge="${esc(g.key + ':b')}"]`),
                badgeA: gTop.querySelector(`[data-edge="${esc(g.key + ':ba')}"]`),
                badgeB: gTop.querySelector(`[data-edge="${esc(g.key + ':bb')}"]`),
                label: gTop.querySelector(`[data-edge="${esc(g.key)}"]`),
            });
        }
    }

    function applyGeometry(geoms: EdgeGeom[], ms: number) {
        for (const g of geoms) {
            const R = edgeRefs.get(g.key);
            if (!R) continue;
            if (g.kind === 'life') { R.line?.setAttribute('d', g.d); continue; }
            R.line?.setAttribute('d', g.d);
            if (R.arrow && g.arrow) {
                R.arrow.setAttribute('d', g.arrow.d);
                R.arrow.setAttribute('transform', `translate(${g.arrow.x} ${g.arrow.y}) rotate(${g.arrow.rot})`);
            }
            R.mkA?.setAttribute('transform', `translate(${g.ax} ${g.ay}) rotate(${g.aRot}) scale(${ms})`);
            R.mkB?.setAttribute('transform', `translate(${g.bx} ${g.by}) rotate(${g.bRot}) scale(${ms})`);
            R.badgeA?.setAttribute('transform', g.badgeA ? `translate(${g.badgeA.x} ${g.badgeA.y}) scale(${ms})` : 'scale(0)');
            R.badgeB?.setAttribute('transform', g.badgeB ? `translate(${g.badgeB.x} ${g.badgeB.y}) scale(${ms})` : 'scale(0)');
            if (R.label) {
                R.label.setAttribute('transform', `translate(${g.lx} ${g.ly})`);
                R.label.querySelector('rect')?.setAttribute('x', String(-g.lw / 2));
                R.label.querySelector('text')?.setAttribute('y', '3.5');
            }
        }
    }

    return {
        renderTables(opts) {
            tablesRoot.render(opts);
            const nodes: { id: string; g: Element }[] = [];
            gTables.querySelectorAll('g.table').forEach((g) => {
                const id = (g as HTMLElement).dataset?.id;
                if (id) nodes.push({ id, g });
            });
            return nodes;
        },

        renderEdges(geoms, ms) {
            linesRoot.render({ geoms });
            overlaysRoot.render({ geoms, ms });
            refreshEdgeRefs(geoms);
            applyGeometry(geoms, ms);
        },

        updateEdges(geoms, ms) {
            applyGeometry(geoms, ms);
        },

        edgeLineEl(key) {
            return (edgeRefs.get(key)?.line as SVGPathElement) ?? null;
        },

        setEdgeFocus(key, hit, dim) {
            const sel = `[data-edge="${esc(key)}"]`;
            for (const root of [gEdges, gTop]) {
                root.querySelectorAll(sel).forEach((el) => {
                    el.classList.toggle('on', hit);
                    el.classList.toggle('dim', dim);
                });
            }
        },

        setGuides(g) {
            gGuides.textContent = '';
            const NS = 'http://www.w3.org/2000/svg';
            if (g.gx) {
                const l = document.createElementNS(NS, 'line');
                l.setAttribute('class', 'guide');
                l.setAttribute('x1', String(g.gx.x)); l.setAttribute('y1', String(g.gx.y1));
                l.setAttribute('x2', String(g.gx.x)); l.setAttribute('y2', String(g.gx.y2));
                gGuides.append(l);
            }
            if (g.gy) {
                const l = document.createElementNS(NS, 'line');
                l.setAttribute('class', 'guide');
                l.setAttribute('x1', String(g.gy.x1)); l.setAttribute('y1', String(g.gy.y));
                l.setAttribute('x2', String(g.gy.x2)); l.setAttribute('y2', String(g.gy.y));
                gGuides.append(l);
            }
        },

        clearGuides() {
            gGuides.textContent = '';
        },

        drawMinimap(items, view) {
            const NS = 'http://www.w3.org/2000/svg';
            const vis = new Set<string>();
            for (const it of items) {
                vis.add(it.name);
                let r = mmRects.get(it.name);
                if (!r) {
                    r = document.createElementNS(NS, 'rect');
                    r.setAttribute('rx', '2');
                    mmRects.set(it.name, r);
                    mmContent.append(r);
                }
                r.setAttribute('x', String(it.x)); r.setAttribute('y', String(it.y));
                r.setAttribute('width', String(it.w)); r.setAttribute('height', String(it.h));
                r.setAttribute('class', 'mm-t' + (it.sel ? ' sel' : ''));
            }
            for (const [name, r] of mmRects) if (!vis.has(name)) { r.remove(); mmRects.delete(name); }
            mmView.setAttribute('x', String(view.x)); mmView.setAttribute('y', String(view.y));
            mmView.setAttribute('width', String(view.w)); mmView.setAttribute('height', String(view.h));
        },

        clearMinimap() {
            mmContent.textContent = '';
            mmRects = new Map();
            mmView.setAttribute('width', '0');
        },
    };
}

/* reexportado p/ testes de contrato da cena */
export { EdgeLines, EdgeOverlays };
