import type { AttrKey, EntityAttr, ParseError, ParseResult, Relation } from '../types';

/* ══════════ parser ER (erDiagram) — puro, sem DOM ══════════ */

const REL_RE = /^([A-Za-z_][\w.\-]*)\s+(\|o|\|\||\}o|\}\|)\s*(--|\.\.|==)\s*(o\||\|\||o\{|\|\{)\s+([A-Za-z_][\w.\-]*)\s*:\s*(.+)$/;
const OPEN_RE = /^([A-Za-z_][\w.\-]*)\s*\{$/;
const CLOSE_RE = /^\}+\s*$/;
const ATTR_RE = /^([\w().<>[\],\-]+)\s+([A-Za-z_]\w*)(?:\s+(.*))?$/;
const SOLO_RE = /^[A-Za-z_][\w.\-]*$/;
const CARDMAP: Record<string, 'zero_one' | 'one' | 'zero_more' | 'one_more'> = {
    '|o': 'zero_one', '||': 'one', '}o': 'zero_more', '}|': 'one_more',
    'o|': 'zero_one', 'o{': 'zero_more', '|{': 'one_more',
};

export function parseAttr(line: string): EntityAttr | null {
    const m = line.match(ATTR_RE); if (!m) return null;
    let rest = (m[3] || '').trim(); const keys: AttrKey[] = [];
    for (const k of ['PK', 'FK', 'UK'] as const) {
        const re = new RegExp('(?:^|\\s)' + k + '(?:\\s|$)');
        if (re.test(rest)) { keys.push(k); rest = rest.replace(re, ' '); }
    }
    let comment = '';
    const cm = rest.match(/"([^"]*)"/);
    if (cm) { comment = cm[1]; rest = rest.replace(cm[0], ' '); }
    rest = rest.trim();
    if (rest) return null;
    return { type: m[1], name: m[2], keys, comment };
}

export function parseEr(text: string): ParseResult {
    const ents = new Map<string, { name: string; attrs: EntityAttr[] }>(), relations: Relation[] = [], errors: ParseError[] = [];
    const ensure = (n: string) => { if (!ents.has(n)) ents.set(n, { name: n, attrs: [] }); return ents.get(n)!; };
    const lines = text.split('\n');
    let inBlock = false, cur: { attrs: EntityAttr[] } | null = null;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].replace(/;\s*$/, '').trim();
        if (!line || line.startsWith('%%')) continue;
        if (!inBlock) {
            if (/^erDiagram\b/.test(line)) continue;
            const r = line.match(REL_RE);
            if (r) {
                ensure(r[1]); ensure(r[5]);
                relations.push({
                    a: r[1], b: r[5], lc: r[2], conn: r[3], rc: r[4], label: r[6].replace(/^"|"$/g, '').trim(),
                    ac: CARDMAP[r[2]], bc: CARDMAP[r[4]], dash: r[3] === '..',
                });
                continue;
            }
            const o = line.match(OPEN_RE);
            if (o) { inBlock = true; cur = ensure(o[1]); continue; }
            if (CLOSE_RE.test(line)) continue;
            if (SOLO_RE.test(line)) { ensure(line); continue; }
            errors.push({ line: i + 1, msg: 'não entendi esta linha' });
        } else {
            if (CLOSE_RE.test(line)) { inBlock = false; cur = null; continue; }
            const at = cur ? parseAttr(line) : null;
            if (at && cur) { cur.attrs.push(at); }
            else errors.push({ line: i + 1, msg: 'atributo inválido' });
        }
    }
    if (inBlock) errors.push({ line: lines.length, msg: 'bloco de entidade não fechado' });
    return { type: 'er', entities: [...ents.values()], relations, errors };
}
