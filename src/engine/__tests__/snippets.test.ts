import { describe, expect, it } from 'vitest';
import {
    SNIPPETS, parseSnippetBody, expandAt, adjustStops,
    computeAcContext, acOptions, isInsideEntityBlock,
} from '../snippets';

describe('parseSnippetBody', () => {
    it('separa texto literal e tabstops relativos', () => {
        const { text, stops } = parseSnippetBody('${1:TABELA} ||--o{ ${2:TABELA} : ${3:relacao}');
        expect(text).toBe('TABELA ||--o{ TABELA : relacao');
        expect(stops).toEqual([
            { n: 1, at: 0, len: 6 },
            { n: 2, at: 14, len: 6 },
            { n: 3, at: 23, len: 7 },
        ]);
    });
    it('todos os snippets do dicionário expandem sem erro', () => {
        for (const s of SNIPPETS) {
            const { text, stops } = parseSnippetBody(s.body);
            expect(text).not.toContain('${');
            expect(stops.length).toBeGreaterThan(0);
        }
    });
});

describe('expandAt', () => {
    it('insere no texto, resolve tabstops absolutos e posiciona o cursor no fim', () => {
        const r = expandAt('erDiagram\nXXX\n', 10, 13, '${1:int} ${2:id} PK');
        expect(r.value).toBe('erDiagram\nint id PK\n');
        expect(r.caret).toBe(19); /* fim do snippet inserido (10 + 'int id PK') */
        expect(r.stops).toEqual([
            { start: 10, len: 3, n: 1 },
            { start: 14, len: 2, n: 2 },
        ]);
    });
});

describe('adjustStops', () => {
    const stops = [
        { start: 10, len: 3, n: 1 },
        { start: 20, len: 4, n: 2 },
    ];
    it('digitar ANTES do stop desloca; DENTRO alonga', () => {
        const s = JSON.parse(JSON.stringify(stops));
        adjustStops(s, 8, 0, 5); /* inseriu 5 chars antes de tudo */
        expect(s[0].start).toBe(15);
        expect(s[1].start).toBe(25);
        adjustStops(s, 16, 0, 2); /* digitou dentro do stop 1 */
        expect(s[0].len).toBe(5);
        expect(s[1].start).toBe(27);
    });
});

describe('isInsideEntityBlock', () => {
    const code = 'erDiagram\nUSUARIO {\n    int id\n}\nLOG';
    it('dentro do bloco → true; fora → false', () => {
        expect(isInsideEntityBlock(code, code.indexOf('int id'))).toBe(true);
        expect(isInsideEntityBlock(code, code.indexOf('LOG'))).toBe(false);
    });
});

describe('computeAcContext', () => {
    it('"/…" dispara modo slash com início da query', () => {
        const ctx = computeAcContext('erDiagram\n/', 11, false)!;
        expect(ctx.mode).toBe('slash');
        expect(ctx.qr).toEqual({ q: '/', start: 10 });
    });
    it('dentro de bloco: linha vazia → tipo; após tipo + espaço → chave', () => {
        expect(computeAcContext('X {\n', 4, true)).toMatchObject({ mode: 'type' });
        expect(computeAcContext('X {\nint ', 8, true)).toMatchObject({ mode: 'key' });
    });
    it('fora de bloco: "A " → conectores; "A ||--o{ " → entidades', () => {
        expect(computeAcContext('A ', 2, false)).toMatchObject({ mode: 'conn' });
        expect(computeAcContext('A ||--o{ ', 9, false)).toMatchObject({ mode: 'entity' });
        expect(computeAcContext('Palavra', 7, false)).toBeNull();
    });
});

describe('acOptions', () => {
    it('filtra snippets por prefixo do slash', () => {
        const ctx = computeAcContext('/one', 4, false)!;
        const items = acOptions(ctx, []);
        expect(items.map(i => i.label)).toEqual(['/one-many', '/one-one']); /* ambos começam com /one */
        expect(items[0].snippet?.cmd).toBe('/one-many');
    });
    it('modo entity filtra pelas entidades conhecidas', () => {
        const ctx = computeAcContext('A ||--o{ PE', 11, false)!;
        expect(acOptions(ctx, ['PEDIDO', 'PESSOA', 'LOG']).map(i => i.label))
            .toEqual(['PEDIDO', 'PESSOA']);
    });
    it('modo key lista PK/FK/UK', () => {
        const ctx = computeAcContext('X {\nint id ', 11, true)!;
        expect(acOptions(ctx, []).map(i => i.label)).toEqual(['PK', 'FK', 'UK']);
    });
});
