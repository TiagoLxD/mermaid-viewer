import { describe, expect, it } from 'vitest';
import { snapMove, pushOut, resolveOverlaps, type Box } from '../drag-geom';

const box = (name: string, x: number, y: number, w = 120, h = 92): Box => ({ name, x, y, w, h });

describe('snapMove', () => {
    it('encaixa no centro alinhado (eixo x mais próximo)', () => {
        const a = box('A', 100, 0);
        const b = box('B', 0, 300);
        /* B arrastado para perto de alinhar o centro com A (cx: 160) */
        const s = snapMove([a, b], b, 103, 300, 8);
        expect(s.nx).toBe(100); /* 103 + d(=100+60-163=-3) */
        expect(s.gx).toMatchObject({ x: 160 });
        expect(s.gy).toBeNull();
    });

    it('encaixa por borda (l de B contra r de A)', () => {
        const a = box('A', 0, 0);
        const b = box('B', 0, 300);
        const s = snapMove([a, b], b, 118, 300, 8);
        expect(s.nx).toBe(120); /* borda esquerda de B encosta na direita de A */
        expect(s.gx).toMatchObject({ x: 120 });
        expect(s.gy).toBeNull();
    });

    it('nunca encaixa nos dois eixos ao mesmo tempo', () => {
        const a = box('A', 100, 100);
        const b = box('B', 0, 0);
        const s = snapMove([a, b], b, 103, 103, 8);
        expect(s.gx === null || s.gy === null).toBe(true);
        expect([s.gx, s.gy].some(Boolean)).toBe(true);
    });

    it('fora do threshold não há encaixe nem guia', () => {
        const a = box('A', 100, 100);
        const b = box('B', 0, 0);
        const s = snapMove([a, b], b, 300, 300, 8);
        expect(s.gx).toBeNull();
        expect(s.gy).toBeNull();
        expect(s.nx).toBe(300);
    });
});

describe('pushOut', () => {
    it('empurra a entidade arrastada para fora da sobreposição', () => {
        const a = box('A', 0, 0);
        const b = box('B', 50, 0); /* sobrepõe A */
        pushOut([a, b], b, 156, 145);
        const dx = (b.x + b.w / 2) - (a.x + a.w / 2);
        const px = (a.w + b.w) / 2 + 156 - Math.abs(dx);
        const dy = (b.y + b.h / 2) - (a.y + a.h / 2);
        const py = (a.h + b.h) / 2 + 145 - Math.abs(dy);
        expect(px <= 0 || py <= 0).toBe(true); /* sem sobreposição */
        expect(a.x).toBe(0); /* só a arrastada se move */
    });
});

describe('resolveOverlaps', () => {
    it('separa o par movendo os dois, metade para cada', () => {
        const a = box('A', 0, 0);
        const b = box('B', 50, 0);
        resolveOverlaps([a, b], 40);
        const dx = Math.abs((a.x + a.w / 2) - (b.x + b.w / 2));
        expect(dx).toBeGreaterThanOrEqual(a.w + 156 - 1e-6);
    });
});
