import type { Entity, MarkerKind, ParseError, ParseResult, Relation } from '../types';

/* ══════════ parser diagrama de classes — puro, sem DOM ══════════ */

export function parseClass(text: string): ParseResult {
    const ents = new Map<string, Entity>(), relations: Relation[] = [], errors: ParseError[] = [];
    const ensure = (n: string) => { if (!ents.has(n)) ents.set(n, { name: n, attrs: [] }); return ents.get(n)!; };
    let cur: Entity | null = null;
    text.split('\n').forEach(raw => {
        const line = raw.trim();
        if (!line || line.startsWith('%%') || /^classDiagram\b/i.test(line)) return;
        if (/^\}+\s*$/.test(line)) { cur = null; return; }
        let m = line.match(/^([\w~.\-]+)\s*\{$/);
        if (m) { cur = ensure(m[1]); return; }
        if (cur) { cur.attrs.push({ type: '', name: line, keys: [], comment: '' }); return; }
        m = line.match(/^class\s+([\w~.\-]+)\s*\{$/);
        if (m) { cur = ensure(m[1]); return; }
        m = line.match(/^class\s+([\w~.\-]+)/);
        if (m) { ensure(m[1]); return; }
        m = line.match(/^([\w~.\-]+)\s*(<\|--|--\|>|--\*|--o|\*--|o--|\.\.\|>|-->|\.\.|---)\s*([\w~.\-]+)(?:\s*:\s*(.*))?$/);
        if (m) {
            const map: Record<string, { aMk: MarkerKind; bMk: MarkerKind; dash: boolean }> = {
                '<|--': { aMk: 'tri', bMk: 'none', dash: false }, '--|>': { aMk: 'none', bMk: 'tri', dash: false },
                '--*': { aMk: 'diamond', bMk: 'none', dash: false }, '*--': { aMk: 'none', bMk: 'diamond', dash: false },
                '--o': { aMk: 'odiamond', bMk: 'none', dash: false }, 'o--': { aMk: 'none', bMk: 'odiamond', dash: false },
                '..|>': { aMk: 'none', bMk: 'tri', dash: true }, '-->': { aMk: 'none', bMk: 'arrow', dash: false },
                '..': { aMk: 'none', bMk: 'none', dash: true }, '---': { aMk: 'none', bMk: 'none', dash: false },
            };
            const mk = map[m[2]] || { aMk: 'none' as MarkerKind, bMk: 'none' as MarkerKind, dash: false };
            ensure(m[1]); ensure(m[3]);
            relations.push({ a: m[1], b: m[3], label: (m[4] || '').trim(), dash: mk.dash, simple: true, aMk: mk.aMk, bMk: mk.bMk });
        }
    });
    return { type: 'class', entities: [...ents.values()], relations, errors };
}
