import type { Entity, ParseError, ParseResult, Relation } from '../types';

/* ══════════ parser mindmap (hierarquia por indentação) — puro, sem DOM ══════════ */

export function parseMindmap(text: string): ParseResult {
    const ents = new Map<string, Entity>(), relations: Relation[] = [], errors: ParseError[] = [];
    const ensure = (label: string, shape: Entity['shape']) => {
        let key = label, n = 2;
        while (ents.has(key) && ents.get(key)!.shape !== shape) key = label + ' ' + n++;
        if (!ents.has(key)) ents.set(key, { name: key, label, shape: shape!, attrs: [] });
        return key;
    };
    const chain: { indent: number; key: string }[] = []; /* tolera qualquer largura de indentação */
    text.split('\n').forEach((raw, i) => {
        const t = raw.trim();
        if (!t || t.startsWith('%%') || t.startsWith('::') || /^mindmap\b/.test(t)) return;
        const indent = raw.match(/^\s*/)![0].replace(/\t/g, '  ').length;
        let label: string, shape: Entity['shape'] = 'stadium', mm: RegExpMatchArray | null;
        if ((mm = t.match(/^(?:[\w\-.]+)?\(\((.+)\)\)$/))) { label = mm[1].trim(); shape = 'stadium'; }
        else if ((mm = t.match(/^(?:[\w\-.]+)?\[(.+)\]$/))) { label = mm[1].trim(); shape = 'rect'; }
        else if ((mm = t.match(/^(?:[\w\-.]+)?\((.+)\)$/))) { label = mm[1].trim(); shape = 'stadium'; }
        else if ((mm = t.match(/^(?:[\w\-.]+)?\{\{(.+)\}\}$/))) { label = mm[1].trim(); shape = 'diamond'; }
        else if (/^[\w\-.][\w\-.\s]*$/.test(t)) { label = t; shape = 'stadium'; }
        else { errors.push({ line: i + 1, msg: 'não entendi esta linha' }); return; }
        const key = ensure(label, shape);
        while (chain.length && chain[chain.length - 1].indent >= indent) chain.pop();
        const parent = chain.length ? chain[chain.length - 1].key : null;
        chain.push({ indent, key });
        if (parent && parent !== key)
            relations.push({ a: parent, b: key, label: '', dash: false, simple: true, aMk: 'none', bMk: 'none', mm: true });
    });
    return { type: 'mindmap', entities: [...ents.values()], relations, errors };
}
