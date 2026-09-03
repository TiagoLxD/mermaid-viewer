/* ══════════ medição de texto (canvas offscreen) — usada por measure e pelos componentes ══════════ */

export const F = {
    name: '500 12px "JetBrains Mono", ui-monospace, monospace',
    type: '400 11px "JetBrains Mono", ui-monospace, monospace',
    key: '700 8.5px "JetBrains Mono", ui-monospace, monospace',
    title: '600 12px "Space Grotesk", sans-serif',
    count: '600 9px "JetBrains Mono", ui-monospace, monospace',
    label: '500 10px "JetBrains Mono", ui-monospace, monospace',
    card: '600 9.5px "JetBrains Mono", ui-monospace, monospace',
    comment: 'italic 400 11px "JetBrains Mono", ui-monospace, monospace',
} as const;

let mctx: CanvasRenderingContext2D | null = null;
function ctx(): CanvasRenderingContext2D {
    if (!mctx) mctx = document.createElement('canvas').getContext('2d')!;
    return mctx;
}

/** Largura do texto na fonte dada (via canvas offscreen). */
export function tw(t: string, font: string): number {
    const c = ctx();
    c.font = font;
    return c.measureText(t).width;
}
