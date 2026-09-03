import { describe, expect, it } from 'vitest';
import { parseMermaid, detectType } from '../parser';
import { parseEr } from '../parser/er';

describe('detectType', () => {
    it.each([
        ['erDiagram\n X ||--o{ Y : r', 'er'],
        ['flowchart TD\n A --> B', 'flow'],
        ['graph TD\n A --> B', 'flow'],
        ['sequenceDiagram\n A->>B: hi', 'seq'],
        ['classDiagram\n A <|-- B', 'class'],
        ['pieDiagram\n "a" : 1', 'pie'],
        ['mindmap\n root((T))', 'mindmap'],
        ['C4Context\n Person(u, "U", "d")', 'c4'],
        ['', 'er'],
    ])('%s… → %s', (code, expected) => {
        expect(detectType(code)).toBe(expected);
    });
});

describe('parseEr', () => {
    it('faz parse de relações e blocos de atributos', () => {
        const r = parseEr(`erDiagram
USUARIO ||--o{ PEDIDO : realiza
USUARIO ||..o{ AVALIACAO : faz

USUARIO {
    int id PK
    string email UK
    string telefone "opcional"
}`);
        expect(r.type).toBe('er');
        expect(r.errors).toEqual([]);
        expect(r.relations).toHaveLength(2);
        expect(r.relations[0]).toMatchObject({
            a: 'USUARIO', b: 'PEDIDO', lc: '||', conn: '--', rc: 'o{',
            ac: 'one', bc: 'zero_more', label: 'realiza', dash: false,
        });
        expect(r.relations[1].dash).toBe(true);
        const u = r.entities.find(e => e.name === 'USUARIO')!;
        expect(u.attrs).toHaveLength(3);
        expect(u.attrs[0]).toEqual({ type: 'int', name: 'id', keys: ['PK'], comment: '' });
        expect(u.attrs[2].comment).toBe('opcional');
    });

    it('entidade solta e cardinalidades exóticas', () => {
        const r = parseEr('erDiagram\nLOG\nA }o--|| B : tem');
        expect(r.entities.map(e => e.name)).toEqual(['LOG', 'A', 'B']);
        expect(r.relations[0]).toMatchObject({ ac: 'zero_more', bc: 'one', conn: '--' });
    });

    it('reporta erros de linha e bloco não fechado', () => {
        const r = parseEr('erDiagram\nX {\n  foo bar baz\n');
        expect(r.errors.map(e => e.msg)).toEqual(['atributo inválido', 'bloco de entidade não fechado']);
    });
});

describe('parseFlow', () => {
    it('nós com formas e rótulos de seta', () => {
        const r = parseMermaid(`flowchart TD
P[Pedido criado] --> E{Estoque?}
E -->|sim| PG[Pagar]
E -.->|não| CA[Espera]`);
        expect(r.type).toBe('flow');
        expect(r.errors).toEqual([]);
        const e = r.entities.find(x => x.name === 'E')!;
        expect(e.shape).toBe('diamond');
        expect(r.relations).toEqual([
            { a: 'P', b: 'E', label: '', dash: false, simple: true, aMk: 'none', bMk: 'arrow' },
            { a: 'E', b: 'PG', label: 'sim', dash: false, simple: true, aMk: 'none', bMk: 'arrow' },
            { a: 'E', b: 'CA', label: 'não', dash: true, simple: true, aMk: 'none', bMk: 'arrow' },
        ]);
    });
});

describe('parseSeq', () => {
    it('participantes e mensagens em ordem', () => {
        const r = parseMermaid(`sequenceDiagram
participant U as Usuário
U ->> A: login
A -->> U: token`);
        expect(r.entities.map(e => e.name)).toEqual(['U', 'A']);
        expect(r.entities[0].label).toBe('Usuário');
        expect(r.relations.map(m => [m.a, m.b, m.label, m.dash])).toEqual([
            ['U', 'A', 'login', false],
            ['A', 'U', 'token', true],
        ]);
        expect(r.relations.map(m => m.idx)).toEqual([0, 1]);
    });
});

describe('parseClass', () => {
    it('herança, composição e membros', () => {
        const r = parseMermaid(`classDiagram
Veiculo <|-- Carro
Veiculo *-- Motor
class Carro {
    +int portas
    +abrirPortaMalas()
}`);
        expect(r.relations[0]).toMatchObject({ a: 'Veiculo', b: 'Carro', aMk: 'tri', bMk: 'none', dash: false });
        expect(r.relations[1]).toMatchObject({ aMk: 'none', bMk: 'diamond' });
        const c = r.entities.find(e => e.name === 'Carro')!;
        expect(c.attrs.map(a => a.name)).toEqual(['+int portas', '+abrirPortaMalas()']);
    });
});

describe('parsePie', () => {
    it('fatias, título e total', () => {
        const r = parseMermaid(`pieDiagram
title Meu título
"Vendas" : 40
"Suporte" : 10`);
        expect(r.pieTotal).toBe(50);
        expect(r.entities).toHaveLength(3);
        expect(r.entities[0]).toMatchObject({ pieTitle: true, label: 'Meu título' });
        expect(r.entities[1]).toMatchObject({ label: 'Vendas', value: 40 });
        expect(r.errors).toEqual([]);
    });

    it('rejeita valor zero/negativo e linha inválida', () => {
        const r = parseMermaid('pieDiagram\n"zero" : 0\nlixo');
        expect(r.errors).toHaveLength(2);
        expect(r.errors[0].msg).toBe('o valor deve ser maior que zero');
    });
});

describe('parseMindmap', () => {
    it('hierarquia por indentação vira relações', () => {
        const r = parseMermaid(`mindmap
root((Sistema))
    Frontend
        Web App
    Dados`);
        expect(r.type).toBe('mindmap');
        const root = r.entities.find(e => e.label === 'Sistema')!;
        expect(root.shape).toBe('stadium');
        expect(r.relations).toHaveLength(3);
        expect(r.relations.map(x => [x.a, x.b])).toEqual([
            ['Sistema', 'Frontend'],
            ['Frontend', 'Web App'],
            ['Sistema', 'Dados'],
        ]);
    });
});

describe('parseC4', () => {
    it('person/system/db/container e relações', () => {
        const r = parseMermaid(`C4Context
Person(aluno, "Aluno", "Consome")
SystemDb(db, "Banco", "PostgreSQL")
Container(api, "API", "Node.js", "Serve dados")
SystemDb_Ext(ext, "DB externo", "Oracle")
Rel(aluno, api, "Usa", "HTTPS")`);
        expect(r.type).toBe('c4');
        const p = r.entities.find(e => e.name === 'aluno')!;
        expect(p.stereo).toBe('person');
        const db = r.entities.find(e => e.name === 'db')!;
        expect(db.stereo).toBe('db');
        const api = r.entities.find(e => e.name === 'api')!;
        expect(api.sub).toBe('Serve dados · Node.js');
        const ext = r.entities.find(e => e.name === 'ext')!;
        expect(ext.ext).toBe(true);
        expect(r.relations[0]).toMatchObject({ a: 'aluno', b: 'api', bMk: 'arrow' });
    });
});
