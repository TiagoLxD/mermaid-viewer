// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { edgeClearance } from '../layout-clearance';
import { createStore } from '../store';
import { createHistory } from '../history';
import { showToast } from '../toast';
import { entityAtCaret } from '../caret';
import type { Box } from '../drag-geom';

const box = (name: string, x: number, y: number, w = 120, h = 92): Box => ({ name, x, y, w, h });

describe('edgeClearance', () => {
    it('empurra a entidade de fora do caminho reto entre duas ligadas', () => {
        const a = box('A', 0, 0), b = box('B', 600, 0), c = box('C', 310, 5);
        edgeClearance([a, b, c], [[0, 1]], 3);
        const dy = Math.abs((c.y + c.h / 2) - 46); /* centro da linha y=46 */
        expect(dy).toBeGreaterThanOrEqual(Math.min(c.w, c.h) / 2 + 40 - 1);
    });

    it('não move nada quando o caminho está livre', () => {
        const a = box('A', 0, 0), b = box('B', 600, 0), c = box('C', 0, 400);
        const before = { x: c.x, y: c.y };
        edgeClearance([a, b, c], [[0, 1]], 3);
        expect([c.x, c.y]).toEqual([before.x, before.y]);
    });
});

describe('createStore', () => {
    it('usa o prefixo meridian: e sobrevive a storage quebrado', () => {
        const mem = new Map<string, string>();
        const fake = {
            getItem: (k: string) => mem.get(k) ?? null,
            setItem: (k: string, v: string) => { mem.set(k, v); },
        };
        const s = createStore(fake);
        s.set('theme', 'dark');
        expect(mem.get('meridian:theme')).toBe('dark');
        expect(s.get('theme')).toBe('dark');

        const broken = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } };
        const s2 = createStore(broken);
        expect(s2.get('theme')).toBeNull();
        expect(() => s2.set('theme', 'dark')).not.toThrow();
    });
});

describe('createHistory', () => {
    it('push/undo/redo com limit e limpeza do redo', () => {
        const h = createHistory(3);
        h.push({ value: 'a', s: 0, e: 0 });
        h.push({ value: 'b', s: 1, e: 1 });
        const back = h.undo({ value: 'c', s: 2, e: 2 })!;
        expect(back.value).toBe('b');
        const fwd = h.redo({ value: 'b2', s: 0, e: 0 })!;
        expect(fwd.value).toBe('c');
        h.push({ value: 'd', s: 0, e: 0 }); /* limpa redo */
        expect(h.redo({ value: 'x', s: 0, e: 0 })).toBeNull();
        expect(h.undo({ value: 'x', s: 0, e: 0 })!.value).toBe('d');
    });

    it('noteBurst agrupa rajadas e inicia novo passo após burstMs', () => {
        const h = createHistory();
        h.push({ value: 'a', s: 0, e: 0 }); /* lastPushAt = now */
        h.noteBurst({ value: 'ab', s: 1, e: 1 }, 100); /* rajada: não empilha */
        const back = h.undo({ value: 'abc', s: 2, e: 2 })!;
        expect(back.value).toBe('a'); /* só o push explícito */
        /* nova digitação após 600ms: empilha o before */
        h.noteBurst({ value: 'ab', s: 1, e: 1 }, 100 + 600);
        expect(h.undo({ value: 'abc', s: 0, e: 0 })!.value).toBe('ab');
    });
});

describe('showToast', () => {
    it('cria elemento com textContent (sem HTML) e remove após o tempo', () => {
        vi.useFakeTimers();
        const container = document.createElement('div');
        showToast(container, '<b>oi</b>');
        const t = container.firstChild as HTMLElement;
        expect(t.className).toBe('toast ');
        expect(t.textContent).toBe('<b>oi</b>'); /* escapado por textContent */
        vi.advanceTimersByTime(2400 + 300);
        expect(container.contains(t)).toBe(false);
        vi.useRealTimers();
    });
});

describe('entityAtCaret', () => {
    const known = new Set(['USUARIO', 'PEDIDO']);
    const code = 'USUARIO ||--o{ PEDIDO : realiza\n\nUSUARIO {\n    int id PK\n}';
    it('na linha de relação, pega o token mais próximo do cursor', () => {
        expect(entityAtCaret(code, 3, known)).toBe('USUARIO');
        expect(entityAtCaret(code, 18, known)).toBe('PEDIDO');
    });
    it('dentro de bloco, retorna a entidade do bloco', () => {
        expect(entityAtCaret(code, code.indexOf('int id'), known)).toBe('USUARIO');
    });
    it('linha sem entidade conhecida → null', () => {
        expect(entityAtCaret('xpto\nfoo bar', 5, known)).toBeNull();
    });
});
