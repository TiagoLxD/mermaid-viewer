import type { Entity, ParseError, ParseResult, Relation } from '../types';

/* ══════════ parser C4 model — puro, sem DOM ══════════ */

export function parseC4(text: string): ParseResult {
    const ents = new Map<string, Entity>(), relations: Relation[] = [], errors: ParseError[] = [];
    const STEREO: Record<string, string> = {
        Person: 'person', Person_Ext: 'person', System: 'system', System_Ext: 'system',
        SystemDb: 'db', SystemDb_Ext: 'db', SystemQueue: 'queue', SystemQueue_Ext: 'queue',
        Container: 'container', Container_Ext: 'container', ContainerDb: 'db', ContainerDb_Ext: 'db',
        Component: 'component', Component_Ext: 'component', ComponentDb: 'db',
    };
    const ensure = (name: string, label?: string, sub?: string, stereo?: string, ext?: boolean) => {
        if (!ents.has(name)) ents.set(name, { name, label: label || name, sub: sub || '', stereo: stereo || 'system', ext: !!ext, attrs: [] });
        else {
            const e = ents.get(name)!;
            if (label) e.label = label; if (sub) e.sub = sub; if (stereo) e.stereo = stereo;
        }
        return ents.get(name)!;
    };
    text.split('\n').forEach((raw, i) => {
        const line = raw.trim();
        if (!line || line.startsWith('%%') || /^C4(Context|Container|Component|Dynamic|Deployment)\b/i.test(line)) return;
        if (/^(title\s+|showData|\}+|Boundary\b|Enterprise_Boundary\b|System_Boundary\b|Container_Boundary\b)/i.test(line)) return;
        let m = line.match(/^(Person|System|SystemDb|SystemQueue|Container|ContainerDb|Component|ComponentDb)(_Ext)?\s*\(\s*([\w\-.]+)\s*,\s*"([^"]*)"(?:\s*,\s*"([^"]*)")?(?:\s*,\s*"([^"]*)")?\s*\)/);
        if (m) {
            const fourArg = /^(Container|Component|ContainerDb|ComponentDb)/.test(m[1]);
            const sub = fourArg ? (m[6] ?? m[5] ?? '') : (m[5] ?? '');
            const tech = fourArg && m[6] ? (m[5] || '') : (m[6] || '');
            ensure(m[3], m[4], [sub, tech].filter(Boolean).join(' · '), STEREO[m[1] + (m[2] || '')], !!m[2]);
            return;
        }
        m = line.match(/^Rel(?:_(?:L|R|Up|Down|Back|Neigh))?\s*\(\s*([\w\-.]+)\s*,\s*([\w\-.]+)\s*,\s*"([^"]*)"(?:\s*,\s*"([^"]*)")?\s*\)/);
        if (m) {
            ensure(m[1]); ensure(m[2]);
            relations.push({
                a: m[1], b: m[2], label: [m[3], m[4]].filter(Boolean).join(' · '),
                dash: false, simple: true, aMk: 'none', bMk: 'arrow',
            });
            return;
        }
        if (/^(Lay_|UpdateRel|Support|Deployment_Node|DeploymentNode|Add)/.test(line)) return;
        errors.push({ line: i + 1, msg: 'não entendi esta linha' });
    });
    return { type: 'c4', entities: [...ents.values()], relations, errors };
}
