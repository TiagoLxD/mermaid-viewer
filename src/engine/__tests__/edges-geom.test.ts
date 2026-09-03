// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { computeEdges } from '../edges-geom';
import type { Entity, Relation } from '../types';

function box(name: string, x: number, y: number, w = 120, h = 92): Entity {
    return { name, attrs: [], x, y, w, h };
}

const BASE = {
    type: 'er' as const,
    seqTop: 118,
    seqStep: 46,
    ms: 1,
};

describe('computeEdges · ER', () => {
    it('ancoras nas faces voltadas uma para a outra', () => {
        const entities = [box('A', 0, 0), box('B', 400, 0)];
        const relations: Relation[] = [{ a: 'A', b: 'B', label: 'r', ac: 'one', bc: 'zero_more' }];
        const [g] = computeEdges({ ...BASE, entities, relations });
        expect(g.ax).toBe(120); /* borda direita de A */
        expect(g.ay).toBe(46);
        expect(g.bx).toBe(400); /* borda esquerda de B */
        expect(g.bRot).toBe(180);
        /* rota horizontal direta */
        expect(g.d).toBe('M120 46H400');
        expect(g.badgeA).toMatchObject({ text: '1' });
        expect(g.badgeB).toMatchObject({ text: '0..N' });
    });

    it('linha reta quando as faces se sobrepõem verticalmente', () => {
        const entities = [box('A', 0, 0), box('B', 300, 20)];
        const relations: Relation[] = [{ a: 'A', b: 'B', label: '', ac: 'one', bc: 'one' }];
        const [g] = computeEdges({ ...BASE, entities, relations });
        expect(g.d).toBe('M120 56H300'); /* desliza p/ faixa comum (y=56) */
    });

    it('roteia H-V-H quando não há sobreposição', () => {
        const entities = [box('A', 0, 0), box('B', 400, 300)];
        const relations: Relation[] = [{ a: 'A', b: 'B', label: '', ac: 'one', bc: 'one' }];
        const [g] = computeEdges({ ...BASE, entities, relations });
        /* sai reto da face de A, dobra no canal do meio (x=260) e entra em B */
        expect(g.d).toBe('M120 46H251Q260 46 260 55V337Q260 346 269 346H400');
    });

    it('laço (self relation) gera bezier saindo e voltando pela mesma face', () => {
        const entities = [box('A', 0, 0)];
        const relations: Relation[] = [{ a: 'A', b: 'A', label: '', ac: 'one', bc: 'one' }];
        const [g] = computeEdges({ ...BASE, entities, relations });
        expect(g.d).toBe('M120 29.44C160 29.44 160 62.56 120 62.56');
    });

    it('dashed vira classe e badges recebem tooltip com frase', () => {
        const entities = [box('A', 0, 0), box('B', 400, 0)];
        const relations: Relation[] = [{ a: 'A', b: 'B', label: 'tem', ac: 'one', bc: 'zero_more', dash: true }];
        const [g] = computeEdges({ ...BASE, entities, relations });
        expect(g.dash).toBe(true);
        expect(g.badgeB!.tip).toContain('cada A tem zero ou muitos B');
    });
});

describe('computeEdges · sequência', () => {
    it('linhas de vida + mensagens com seta e ordem', () => {
        const entities = [box('U', 0, 118, 110, 44), box('A', 400, 118, 110, 44)];
        entities.forEach(e => { e.seq = true; });
        const relations: Relation[] = [
            { a: 'U', b: 'A', label: 'login', simple: true, seq: true, idx: 0, aMk: 'none', bMk: 'arrow' },
            { a: 'A', b: 'U', label: 'ok', simple: true, seq: true, idx: 1, aMk: 'none', bMk: 'arrow', dash: true },
        ];
        const gs = computeEdges({ ...BASE, type: 'seq', entities, relations, seqBottom: 400 });
        expect(gs.filter(g => g.kind === 'life')).toHaveLength(2);
        const life = gs.find(g => g.key === 'life:U')!;
        expect(life.d).toBe('M55 50 L55 400');
        const m1 = gs.find(g => g.label === 'login')!;
        expect(m1.d).toBe('M57 118 L445 118'); /* sai da borda de U, seta 10px antes da borda de A */
        expect(m1.arrow!.rot).toBe(0);
        const m2 = gs.find(g => g.label === 'ok')!;
        expect(m2.arrow!.rot).toBe(180); /* resposta volta */
    });
});

describe('computeEdges · mindmap', () => {
    it('galhos usam bezier horizontal entre âncoras', () => {
        const entities = [box('R', 0, 0, 94, 46), box('F', 300, 200, 90, 46)];
        const relations: Relation[] = [{ a: 'R', b: 'F', label: '', simple: true, mm: true, aMk: 'none', bMk: 'none' }];
        const [g] = computeEdges({ ...BASE, entities, relations });
        expect(g.d).toBe('M94 23 C186.7 23 207.3 223 300 223'); /* bezier R → face esquerda de F */
    });
});
