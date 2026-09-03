/* ══════════ snippets + autocomplete — dados e lógica PURAS (sem DOM) ══════════ */

export interface Snippet {
    cmd: string;
    desc: string;
    body: string;
}

export const SNIPPETS: Snippet[] = [
    { cmd: '/table', desc: 'bloco de entidade { }', body: '${1:TABELA} {\n    ${2:string} ${3:campo}\n    ${4:string} ${5:campo}\n}' },
    { cmd: '/one-many', desc: 'um→muitos  ||--o{', body: '${1:TABELA} ||--o{ ${2:TABELA} : ${3:relacao}' },
    { cmd: '/many-one', desc: 'muitos→um  }o--||', body: '${1:TABELA} }o--|| ${2:TABELA} : ${3:relacao}' },
    { cmd: '/many-many', desc: 'muitos→muitos  }o--o{', body: '${1:TABELA} }o--o{ ${2:TABELA} : ${3:relacao}' },
    { cmd: '/one-one', desc: 'um→um  ||--||', body: '${1:TABELA} ||--|| ${2:TABELA} : ${3:relacao}' },
    { cmd: '/zero-one', desc: 'um→zero-um  ||--o|', body: '${1:TABELA} ||--o| ${2:TABELA} : ${3:relacao}' },
    { cmd: '/indirect', desc: 'não-identificante (tracejado)  ||..o{', body: '${1:TABELA} ||..o{ ${2:TABELA} : ${3:relacao}' },
    { cmd: '/pk', desc: 'linha de chave primária', body: '${1:int} ${2:id} PK' },
    { cmd: '/fk', desc: 'linha de chave estrangeira', body: '${1:int} ${2:tabela_id} FK' },
    { cmd: '/flow', desc: 'fluxo: nó → nó', body: '${1:Inicio}[${2:Começo}] --> ${3:Fim}[${4:Resultado}]' },
    { cmd: '/decision', desc: 'fluxo: decisão losango', body: '${1:ok}{${2:Tudo certo?}} -->|${3:sim}| ${4:Fim}[${5:Fim}]' },
    { cmd: '/seqmsg', desc: 'sequência: mensagem', body: '${1:Cliente} ->> ${2:Servidor} : ${3:requisição}' },
    { cmd: '/seqreply', desc: 'sequência: resposta tracejada', body: '${1:Servidor} -->> ${2:Cliente} : ${3:resposta}' },
];

/* ── dicionários de autocomplete ── */
export const TYPES: [string, string][] = [
    ['int', 'inteiro'], ['bigint', 'inteiro grande'], ['string', 'texto curto'], ['varchar(255)', 'texto limitado'],
    ['text', 'texto longo'], ['boolean', 'verdadeiro/falso'], ['decimal(10,2)', 'numérico exato'], ['float', 'ponto flutuante'],
    ['double', 'flutuante duplo'], ['date', 'data'], ['datetime', 'data e hora'], ['timestamp', 'data/hora com fuso'],
    ['time', 'hora'], ['uuid', 'identificador único'], ['json', 'documento json'], ['blob', 'binário'],
];
export const KEYS: [string, string][] = [['PK', 'chave primária'], ['FK', 'chave estrangeira'], ['UK', 'chave única']];
export const CONNS: [string, string][] = [
    ['||--o{', 'um → zero ou mais'], ['||--||', 'um → um'], ['||--o|', 'um → zero-um'], ['||--|{', 'um → um ou mais'],
    ['||..o{', 'um → zero+ (tracejada)'], ['}o--o{', 'zero+ → zero+'], ['}o--||', 'zero+ → um'], ['}|--o{', 'um+ → zero+'],
    ['}o..o{', 'zero+ → zero+ (tracejada)'], ['}o..||', 'zero+ → um (tracejada)'],
];

/* ══════════ expansão de snippets ══════════ */

export interface SnippetStop { n: number; at: number; len: number }

/** Decompõe o corpo `${1:default} …` em texto final + tabstops relativos. */
export function parseSnippetBody(body: string): { text: string; stops: SnippetStop[] } {
    const stops: SnippetStop[] = [];
    let text = '', last = 0, m: RegExpExecArray | null;
    const re = /\$\{(\d+):([^}]*)\}/g;
    while ((m = re.exec(body))) {
        text += body.slice(last, m.index);              /* texto literal entre placeholders */
        stops.push({ n: +m[1], at: text.length, len: m[2].length });
        text += m[2];
        last = m.index + m[0].length;
    }
    text += body.slice(last);
    return { text, stops };
}

export interface ResolvedStop { start: number; len: number; n: number }

/** Insere o snippet em `text` entre [start,end) e resolve tabstops absolutos.
    Cursor final = fim do snippet (igual ao legado). */
export function expandAt(text: string, start: number, end: number, body: string): {
    value: string;
    caret: number;
    stops: ResolvedStop[];
} {
    const { text: bodyText, stops } = parseSnippetBody(body);
    const value = text.slice(0, start) + bodyText + text.slice(end);
    const resolved = stops
        .map(s => ({ start: start + s.at, len: s.len, n: s.n }))
        .sort((a, b) => a.n - b.n);
    return { value, caret: start + bodyText.length, stops: resolved };
}

/** Mantém tabstops consistentes enquanto digita dentro do snippet (mutante). */
export function adjustStops(stops: ResolvedStop[], caretBefore: number, removed: number, inserted: number): void {
    const delta = inserted - removed;
    for (const st of stops) {
        if (st.start > caretBefore) st.start += delta;
        else if (st.start + st.len >= caretBefore) st.len += delta;
    }
}

/* ══════════ contexto de autocomplete ══════════ */

export interface AcContext {
    mode: 'slash' | 'type' | 'key' | 'conn' | 'entity';
    prefix?: string;
    wStart?: number;
    qr?: { q: string; start: number };
}

/** Posição está dentro de um bloco `ENT { … }`? */
export function isInsideEntityBlock(text: string, pos: number): boolean {
    let depth = 0;
    for (const l of text.slice(0, pos).split('\n')) {
        const t = l.trim();
        if (!t || t.startsWith('%%')) continue;
        if (/^\}+\s*$/.test(t)) { depth = Math.max(0, depth - 1); continue; }
        if (/\{\s*$/.test(t) && !/[|}]/.test(t)) depth++;
    }
    return depth > 0;
}

/** Contexto de autocomplete na posição do caret (puro; bloco de entidade via flag). */
export function computeAcContext(text: string, pos: number, inEntity: boolean): AcContext | null {
    const before = text.slice(0, pos);
    const lineStart = before.lastIndexOf('\n') + 1;
    const line = before.slice(lineStart);
    const sm = before.match(/\/[\w-]*$/);
    if (sm) return { mode: 'slash', qr: { q: sm[0], start: pos - sm[0].length } };
    const word = line.match(/[\w.\-()]*$/)![0] || '';
    const wStart = pos - word.length;
    const tokens = line.trim().split(/\s+/).filter(Boolean);
    if (inEntity && !/^\s*\}/.test(line)) {
        /* linha vazia/espços = tipos; 1ª palavra = tipos; depois do tipo + espaço = chaves */
        if (!tokens.length) return { mode: 'type', prefix: word, wStart };
        if (tokens.length === 1) return /\s$/.test(line) ? { mode: 'key', prefix: word, wStart } : { mode: 'type', prefix: word, wStart };
        return { mode: 'key', prefix: word, wStart };
    }
    if (!tokens.length) return null;
    if (tokens.length === 1 && !/\s$/.test(line)) return null;                 /* digitando 1ª palavra fora de bloco */
    if (tokens.length === 1) return { mode: 'conn', prefix: word, wStart };    /* "A " → conectores */
    if (tokens.length === 2) {
        if (/^[|}]/.test(tokens[1])) return { mode: 'entity', prefix: word, wStart }; /* "A ||--o{ " → entidades */
        if (/^[|}]/.test(word)) return { mode: 'conn', prefix: word, wStart };
        return null;
    }
    if (tokens.length === 3 && /^[A-Za-z_]/.test(tokens[2])) return { mode: 'entity', prefix: word, wStart };
    return null;
}

export interface AcItem {
    label: string;
    desc: string;
    insert?: string;
    snippet?: Snippet;
}

/** Opções do autocomplete para o contexto (entidades p/ modo 'entity'). */
export function acOptions(ctx: AcContext, entities: string[]): AcItem[] {
    const p = (ctx.prefix || '').toLowerCase();
    switch (ctx.mode) {
        case 'slash':
            return SNIPPETS.filter(s => s.cmd.startsWith(ctx.qr!.q.toLowerCase()))
                .map(s => ({ label: s.cmd, desc: s.desc, snippet: s }));
        case 'type':
            return TYPES.filter(t => t[0].toLowerCase().startsWith(p)).map(t => ({ label: t[0], desc: t[1], insert: t[0] + ' ' }));
        case 'key':
            return KEYS.filter(t => t[0].toLowerCase().startsWith(p)).map(t => ({ label: t[0], desc: t[1], insert: t[0] }));
        case 'conn':
            return CONNS.filter(t => t[0].startsWith(ctx.prefix!)).map(t => ({ label: t[0], desc: t[1], insert: t[0] + ' ' }));
        case 'entity':
            return entities.filter(n => n.toLowerCase().startsWith(p))
                .map(n => ({ label: n, desc: 'entidade', insert: n + ' ' }));
    }
}
