import { describe, expect, it } from 'vitest';
import { layoutPositions } from '../layout';
import type { Entity, Relation } from '../types';

const box = (name: string, w = 120, h = 92): Entity => ({ name, attrs: [], w, h });

describe('layoutPositions', () => {
    it('hierárquico: pai acima, filho abaixo, sem sobreposição', () => {
        const entities = [box('A'), box('B')];
        const relations: Relation[] = [{ a: 'A', b: 'B', label: 'r' }];
        const out = layoutPositions(entities, relations, false, 'layered', 'er');
        const a = out.get('A')!, b = out.get('B')!;
        expect(b.y).toBeGreaterThan(a.y); /* filho vem depois (abaixo) */
        /* sem sobreposição vertical entre linhas */
        expect(b.y).toBeGreaterThanOrEqual(a.y + 92 + 100);
    });

    it('sequência: participantes em linha, ordem de declaração', () => {
        const entities = [
            { name: 'U', attrs: [], seq: true, w: 110, h: 44 },
            { name: 'A', attrs: [], seq: true, w: 110, h: 44 },
        ];
        const out = layoutPositions(entities, [], false, 'force', 'seq');
        expect(out.get('U')!.x).toBeLessThan(out.get('A')!.x);
        expect(out.get('U')!.y).toBe(40);
    });

    it('pizza: fatias ao redor do centro e título acima', () => {
        const title: Entity = { name: '__pieTitle', pieTitle: true, label: 'T', attrs: [], w: 60, h: 30 };
        const s1: Entity = { name: '__slice0', label: 'a', value: 30, attrs: [] };
        const s2: Entity = { name: '__slice1', label: 'b', value: 10, attrs: [] };
        const out = layoutPositions([title, s1, s2], [], false, 'force', 'pie', 40);
        expect(out.has('__pieTitle')).toBe(true);
        expect(out.has('__slice0')).toBe(true);
        expect(s1.frac).toBeCloseTo(0.75);
    });

    it('posições arredondadas em múltiplos de 8', () => {
        const entities = [box('A'), box('B')];
        const relations: Relation[] = [{ a: 'A', b: 'B', label: '' }];
        const out = layoutPositions(entities, relations, false, 'force', 'er');
        for (const p of out.values()) {
            expect(p.x % 8).toBe(0);
            expect(p.y % 8).toBe(0);
        }
    });
});
