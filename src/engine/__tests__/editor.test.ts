import { describe, expect, it } from 'vitest';
import { highlightMermaid } from '../highlight';
import { buildFormatted } from '../formatter';

describe('highlightMermaid', () => {
    it('destaca palavra-chave, relação e atributos', () => {
        const h = highlightMermaid(`erDiagram
USUARIO ||--o{ PEDIDO : realiza

USUARIO {
    int id PK
    string email "único"
}`);
        expect(h).toContain('<span class="c-kw">erDiagram</span>');
        expect(h).toContain('<span class="c-en">USUARIO</span>');
        expect(h).toContain('<span class="c-card">||--o{</span>');
        expect(h).toContain('<span class="c-key">PK</span>');
        expect(h).toContain('<span class="c-cm">"único"</span>');
        expect(h).toContain('<span class="c-ty">int</span>');
        expect(h.endsWith('\n')).toBe(true);
    });

    it('escapa HTML malicioso', () => {
        const h = highlightMermaid('<script>alert(1)</script>');
        expect(h).not.toContain('<script>');
        expect(h).toContain('&lt;script&gt;');
    });
});

describe('buildFormatted', () => {
    it('alinha relações e agrupa atributos', () => {
        const out = buildFormatted(`erDiagram
USUARIO ||--o{ PEDIDO : realiza

USUARIO {
    int id PK
    string email UK
}`);

        expect(out).toBe(`erDiagram

USUARIO ||--o{ PEDIDO : realiza

USUARIO {
    int id PK
    string email UK
}`);
        expect(out!.split('\n')[2]).toBe('USUARIO ||--o{ PEDIDO : realiza');
    });

    it('retorna null com erros de parse', () => {
        expect(buildFormatted('erDiagram\nX {')).toBeNull();
    });

    it('retorna null para tipo não-ER', () => {
        expect(buildFormatted('pieDiagram\n"a" : 1', 'pie')).toBeNull();
    });
});
