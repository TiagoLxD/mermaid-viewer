import type { Entity, ParseError, ParseResult, Relation } from '../types';

/* ══════════ parser pieDiagram — puro, sem DOM ══════════ */

export function parsePie(text: string): ParseResult {
    const errors: ParseError[] = [], slices: { label: string; value: number }[] = [];
    let title = '';
    text.split('\n').forEach((raw, i) => {
        const line = raw.trim();
        if (!line || line.startsWith('%%') || /^pieDiagram\b/i.test(line)) return;
        if (/^showData$/i.test(line)) return;
        let m = line.match(/^title\s+(.+)$/i);
        if (m) { title = m[1].trim(); return; }
        m = line.match(/^"([^"]*)"\s*:\s*([\d.]+)\s*$/);
        if (m) {
            const v = parseFloat(m[2]);
            if (v > 0) { slices.push({ label: m[1] || ('fatia ' + (slices.length + 1)), value: v }); return; }
            errors.push({ line: i + 1, msg: 'o valor deve ser maior que zero' }); return;
        }
        errors.push({ line: i + 1, msg: 'use "Rótulo" : valor' });
    });
    if (!slices.length && !errors.length) errors.push({ line: 1, msg: 'nenhuma fatia declarada' });
    const entities: Entity[] = [];
    if (title) entities.push({ name: '__pieTitle', pieTitle: true, label: title, attrs: [] });
    slices.forEach((s, i) => entities.push({ name: '__slice' + i, label: s.label, value: s.value, attrs: [] }));
    return {
        type: 'pie', entities, relations: [], errors,
        pieTotal: slices.reduce((s, x) => s + x.value, 0),
    };
}
