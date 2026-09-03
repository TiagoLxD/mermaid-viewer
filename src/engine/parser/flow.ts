import type { Entity, EntityAttr, ParseError, ParseResult, Relation } from '../types';

/* ══════════ parser flowchart — puro, sem DOM ══════════ */

export function parseFlow(text: string): ParseResult {
    const ents = new Map<string, Entity>(), relations: Relation[] = [], errors: ParseError[] = [];
    const ensure = (id: string, label?: string, shape?: Entity['shape']) => {
        if (!ents.has(id)) ents.set(id, { name: id, attrs: [], label: label || id, shape: shape || 'rect' });
        else {
            const e = ents.get(id)!;
            if (label) e.label = label;
            if (shape && shape !== 'rect') e.shape = shape;
        }
        return ents.get(id)!;
    };
    function addNode(seg: string): string | null {
        seg = seg.trim(); if (!seg) return null;
        const m = seg.match(/^([A-Za-z_][\w\-.]*)\s*(\(\(|[\(\[\{])([^\)\}\]]*)[\)\}\]]+$/) || seg.match(/^([A-Za-z_][\w\-.]*)$/);
        if (!m) return null;
        const shapeRaw = m[2] || '';
        const shape = shapeRaw.startsWith('(') ? 'stadium' : shapeRaw.startsWith('{') ? 'diamond' : 'rect';
        ensure(m[1], (m[3] || '').trim(), shape);
        return m[1];
    }
    const OP = /(?:-->|-\.->|==>)\s*\|([^|]*)\||--\s+([^->]+?)\s+-->|-\.->|==>|-->|---/;
    for (const raw of text.split('\n')) {
        const line = raw.trim();
        if (!line || line.startsWith('%%') || /^(flowchart|graph|subgraph|end|classDef)\b/i.test(line)) continue;
        let prevId: string | null = null, rest: string = line, pending: { arrow: boolean; dash: boolean; label: string } | null = null, guard = 0;
        while (rest && guard++ < 40) {
            const m = rest.match(OP) as RegExpMatchArray | null;
            if (!m) {
                const id = addNode(rest);
                if (prevId && id && id !== prevId)
                    relations.push({ a: prevId, b: id, label: pending?.label || '', dash: !!pending?.dash, simple: true, aMk: 'none', bMk: pending?.arrow ? 'arrow' : 'none' });
                break;
            }
            const left = rest.slice(0, m.index!);
            rest = rest.slice(m.index! + m[0].length);
            const id = addNode(left);
            if (prevId && id && id !== prevId)
                relations.push({ a: prevId, b: id, label: pending?.label || '', dash: !!pending?.dash, simple: true, aMk: 'none', bMk: pending?.arrow ? 'arrow' : 'none' });
            if (id) prevId = id;
            const core = m[0].replace(/\|[^|]*\|/, '');
            pending = { arrow: core.includes('>'), dash: core.includes('.'), label: (m[1] ?? m[2] ?? '').trim() };
        }
    }
    return { type: 'flow', entities: [...ents.values()], relations, errors };
}
