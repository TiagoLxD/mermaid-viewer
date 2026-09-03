import { parseMermaid } from './parser';

/* ══════════ formatador ER — puro ══════════ */

/** Formata código ER. Retorna null se houver erros de parse ou não for ER. */
export function buildFormatted(text: string, knownType?: string): string | null {
    if (knownType && knownType !== 'er') return null;
    const res = parseMermaid(text);
    if (res.type !== 'er' || res.errors.length) return null;
    const lines: string[] = ['erDiagram', ''];
    const rels = res.relations;
    const w = Math.max(0, ...rels.map(r => `${r.a} ${r.lc}${r.conn}${r.rc} ${r.b}`.length));
    for (const r of rels) lines.push(`${`${r.a} ${r.lc}${r.conn}${r.rc} ${r.b}`.padEnd(w)} : ${r.label}`);
    for (const e of res.entities) {
        if (!e.attrs.length) continue;
        lines.push('', `${e.name} {`);
        for (const a of e.attrs) {
            let l = `    ${a.type} ${a.name}`;
            if (a.keys.length) l += ' ' + a.keys.join(' ');
            if (a.comment) l += ` "${a.comment}"`;
            lines.push(l);
        }
        lines.push('}');
    }
    for (const e of res.entities)
        if (!e.attrs.length && !rels.some(r => r.a === e.name || r.b === e.name)) lines.push('', e.name);
    return lines.join('\n');
}
