// @vitest-environment jsdom
import { describe, expect, it, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { act } from 'react';

/* ══════════ integração: fixture DOM → mountEngine → pipeline parse→cena ══════════ */

vi.hoisted(() => {
    // jsdom não tem ResizeObserver nem FontFaceSet — stubs ANTES do import do engine
    (globalThis as any).ResizeObserver = class {
        observe() { }
        unobserve() { }
        disconnect() { }
    };
    Object.defineProperty(document, 'fonts', {
        configurable: true,
        value: {
            ready: Promise.resolve(),
            load: async () => [],
            addEventListener() { },
        },
    });
});

const IDS = [
    'canvas', 'scene', 'gEdges', 'gTables', 'gTop', 'gGuides', 'src', 'hl', 'hlcode',
    'panel', 'stats', 'zoomLbl', 'parseDot', 'parseText', 'parseFoot',
    'minimap', 'mmContent', 'mmView', 'exportMenu', 'docs', 'docsBackdrop',
    'snipMenu', 'gutter', 'gutterIn', 'toasts',
    'btnDocs', 'btnShare', 'btnExport', 'btnTheme', 'btnPanel', 'btnFormat',
    'btnShowCode', 'btnOrganize', 'btnZoomOut', 'btnZoomIn', 'btnPreview', 'btnFit',
    'layoutSel', 'typeSel', 'examples', 'optTransp', 'btnDocsClose', 'docsTabs', 'panelResize',
];

function mountFixture() {
    document.body.innerHTML = IDS.map(id => `<div id="${id}"></div>`).join('')
        + `<svg id="sceneSvg"></svg><select id="layoutSel"><option value="force"></option></select>`;
    // elementos estruturais corretos por tag
    document.getElementById('scene')!.outerHTML =
        '<svg id="scene"><g id="gEdges"></g><g id="gTables"></g><g id="gTop"></g><g id="gGuides"></g></svg>';
    document.getElementById('minimap')!.outerHTML = '<svg id="minimap"><g id="mmContent"></g><rect id="mmView" rx="3"></rect></svg>';
    document.getElementById('gutter')!.innerHTML = '<div id="gutterIn"></div>';
    document.getElementById('hl')!.innerHTML = '<code id="hlcode"></code>';
    document.getElementById('src')!.outerHTML =
        '<textarea id="src"></textarea>';
}

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

beforeAll(async () => {
    mountFixture();
    const { mountEngine } = await import('../engine');
    mountEngine();
    // init é assíncrono (fonts.ready); aguarda microtasks
    await Promise.resolve();
    await Promise.resolve();
});

const count = (sel: string) => document.querySelectorAll(sel).length;
const srcEl = () => document.getElementById('src') as unknown as HTMLTextAreaElement;

async function applyCode(code: string) {
    const s = srcEl();
    /* updates de React (cena via createRoot) precisam de act(...) */
    await act(async () => {
        s.value = code;
        s.dispatchEvent(new Event('input', { bubbles: true }));
        /* scheduleApply tem debounce de 600ms */
        await vi.advanceTimersByTimeAsync(700);
    });
}

describe('pipeline applySource → cena', () => {
    it('exemplo default (ER) renderiza tabelas, arestas e símbolos', async () => {
        await act(async () => { await vi.advanceTimersByTimeAsync(100); });
        expect(count('#gTables g.table')).toBe(11);
        expect(count('#gEdges g.edge')).toBe(13);
        expect(count('#gTop .e-mk')).toBe(26);
        expect(count('#gTop .e-card')).toBe(26);
        expect(count('#gTop .e-label')).toBe(13);
    });

    it('troca de código via input re-renderiza a cena (ER → flowchart)', async () => {
        await applyCode(`flowchart TD
P[Pedido] --> E{Estoque?}
E -->|sim| PG[Pagar]`);
        expect(count('#gTables g.table')).toBe(3);
        expect(count('#gEdges g.edge')).toBe(2);
        /* nó em losango */
        expect(document.querySelector('#gTables [data-id="E"] polygon')).toBeTruthy();
        /* marcador de seta no fim de cada aresta */
        expect(count('#gTop .e-mk')).toBe(4); /* 2 arestas × 2 pontas */
    });

    it('sequência: linhas de vida + mensagens', async () => {
        await applyCode(`sequenceDiagram
U ->> A: login
A -->> U: token`);
        expect(count('#gTables g.table')).toBe(2);
        expect(count('#gEdges .e-life')).toBe(2);
        expect(count('#gEdges .e-arrow')).toBe(2);
    });

    it('código com erro → cena anterior permanece, status sinaliza erro', async () => {
        await applyCode('erDiagram\nX {');
        expect(count('#gTables g.table')).toBe(2); /* cena anterior preservada */
        expect(document.getElementById('parseFoot')?.classList.contains('err')).toBe(true);
        /* recupera com código válido */
        await applyCode('erDiagram\nA ||--|| B : r');
        expect(count('#gTables g.table')).toBe(2);
        expect(document.getElementById('parseFoot')?.classList.contains('err')).toBe(false);
    });

    it('highlight do editor é publicado no bus (componente renderiza)', async () => {
        const seen: string[] = [];
        const h = (e: Event) => seen.push((e as CustomEvent).detail.html);
        window.addEventListener('meridian:highlight', h);
        await applyCode('erDiagram\nUSUARIO ||--o{ PEDIDO : realiza');
        window.removeEventListener('meridian:highlight', h);
        expect(seen[seen.length-1]).toContain('<span class="c-kw">erDiagram</span>');
        expect(seen[seen.length-1]).toContain('<span class="c-en">USUARIO</span>');
    });
});
