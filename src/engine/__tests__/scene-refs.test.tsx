// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { EdgeLines, EdgeOverlays } from '../../components/diagram/edges';
import type { EdgeGeom, } from '../edges-geom';
import type { Relation } from '../types';

/* ══════════ contrato da cena: refs por data-edge que o engine usa p/ updates por frame ══════════ */

const rel: Relation = {
    a: 'A', b: 'B', label: 'tem', lc: '||', conn: '--', rc: 'o{',
    ac: 'one', bc: 'zero_more', dash: false,
};

const geom = (over: Partial<EdgeGeom> = {}): EdgeGeom => ({
    key: 'rel:A>B:0',
    kind: 'line', rel, aName: 'A', bName: 'B',
    d: 'M100 50H300',
    ax: 100, ay: 50, aRot: 0, bx: 300, by: 50, bRot: 180,
    badgeA: { x: 138, y: 50, text: '1', tip: 'cada B se liga a exatamente um A' },
    badgeB: { x: 262, y: 50, text: '0..N', tip: 'cada A tem zero ou muitos B' },
    label: 'tem', lw: 40, lx: 200, ly: 50,
    ...over,
});

describe('EdgeLines · refs por data-edge', () => {
    it('cada linha é endereçável pela chave da aresta', () => {
        const html = renderToStaticMarkup(createElement(EdgeLines, { geoms: [geom()] }));
        expect(html).toContain('data-edge="rel:A&gt;B:0"');
        expect(html).toContain('class="e-line"');
    });
});

describe('EdgeOverlays · refs por data-edge (bug: pés de galinha presos ao arrastar)', () => {
    const html = renderToStaticMarkup(createElement(EdgeOverlays, { geoms: [geom()], ms: 1 }));

    it('marcador A tem data-edge com sufixo :a', () => {
        expect(html).toMatch(/class="e-mk" data-edge="rel:A&gt;B:0:a"/);
    });
    it('marcador B tem data-edge com sufixo :b', () => {
        expect(html).toMatch(/class="e-mk" data-edge="rel:A&gt;B:0:b"/);
    });
    it('selo de cardinalidade A tem data-edge :ba', () => {
        expect(html).toMatch(/class="e-card" data-edge="rel:A&gt;B:0:ba"/);
    });
    it('selo de cardinalidade B tem data-edge :bb', () => {
        expect(html).toMatch(/class="e-card" data-edge="rel:A&gt;B:0:bb"/);
    });
    it('rótulo é o único elemento com a chave pura (sem sufixo)', () => {
        expect(html).toMatch(/class="e-label" data-edge="rel:A&gt;B:0"/);
        /* sem sufixos duplicados na chave pura: 1 mk ':a' + 1 ':b' + selos ':ba'/':bb' */
        expect(html.match(/data-edge="rel:A&gt;B:0"/g)).toHaveLength(1);
    });

    it('consulta do bridge encontra todos os refs (selectores do refreshEdgeRefs)', () => {
        /* CSS.escape real do jsdom — mesmos selectores do refreshEdgeRefs */
        const holder = document.createElement('g');
        holder.innerHTML = html.replace(/class="/g, 'class="');
        document.body.append(holder);
        const q = (sel: string) => holder.querySelector('[data-edge="' + CSS.escape(sel) + '"]');
        expect(q('rel:A>B:0:a')).toBeTruthy();
        expect(q('rel:A>B:0:b')).toBeTruthy();
        expect(q('rel:A>B:0:ba')).toBeTruthy();
        expect(q('rel:A>B:0:bb')).toBeTruthy();
        expect(q('rel:A>B:0')?.getAttribute('class')).toBe('e-label');
        holder.remove();
    });
});
