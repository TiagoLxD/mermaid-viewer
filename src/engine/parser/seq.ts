import type { Entity, ParseError, ParseResult, Relation } from '../types';

/* ══════════ parser diagrama de sequência — puro, sem DOM ══════════ */

export function parseSeq(text: string): ParseResult {
    const ents = new Map<string, Entity>(), relations: Relation[] = [], errors: ParseError[] = [];
    const ensure = (name: string, label?: string) => {
        if (!ents.has(name)) ents.set(name, { name, attrs: [], seq: true, label: label || name });
        else if (label) ents.get(name)!.label = label;
        return ents.get(name)!;
    };
    let idx = 0;
    text.split('\n').forEach((raw, i) => {
        const line = raw.trim();
        if (!line || line.startsWith('%%') || /^sequenceDiagram\b/i.test(line)) return;
        let m = line.match(/^(?:participant|actor)\s+([\w\-.]+)(?:\s+as\s+(.+))?$/i);
        if (m) { ensure(m[1], (m[2] || '').trim() || m[1]); return; }
        m = line.match(/^([\w\-.]+)\s*(-?>|-->>|->>|-x|--x|->)\s*([\w\-.]+)\s*:\s*(.*)$/);
        if (m) {
            ensure(m[1]); ensure(m[3]);
            relations.push({ a: m[1], b: m[3], label: m[4].trim(), dash: m[2].startsWith('--'), simple: true, seq: true, idx: idx++, aMk: 'none', bMk: 'arrow' });
            return;
        }
        if (/^(note|autonumber|activate|deactivate|loop|alt|else|end|opt|par|and|rect|box)\b/i.test(line)) return;
        errors.push({ line: i + 1, msg: 'não entendi esta linha' });
    });
    return { type: 'seq', entities: [...ents.values()], relations, errors };
}
