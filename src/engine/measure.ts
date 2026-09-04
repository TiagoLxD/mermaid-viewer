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

let mctx: CanvasRenderingContext2D | null | undefined;
function ctx(): CanvasRenderingContext2D | null {
    if (mctx === undefined) {
        try { mctx = document.createElement('canvas').getContext('2d'); }
        catch { mctx = null; }
    }
    return mctx;
}

/** Largura do texto na fonte dada (via canvas offscreen).
    Sem canvas disponível (ex.: jsdom), estima por caracteres monoespaçados. */
export function tw(t: string, font: string): number {
    const c = ctx();
    if (!c) return t.length * 7.2;
    c.font = font;
    return c.measureText(t).width;
}

/** Aguarda as fontes da UI carregarem. As larguras das tabelas são medidas
    via canvas (tw) — medir antes do carregamento produziria tabelas com
    largura errada que só seriam corrigidas no próximo re-layout. */
export async function whenFontsReady(): Promise<void> {
    try {
        await Promise.all([
            document.fonts.load('600 12px "Space Grotesk"'),
            document.fonts.load('500 12px "JetBrains Mono"'),
            document.fonts.load('400 11px "JetBrains Mono"'),
            document.fonts.load('italic 400 11px "JetBrains Mono"'),
            document.fonts.load('700 8.5px "JetBrains Mono"'),
            document.fonts.load('600 9.5px "JetBrains Mono"'),
        ]);
    } catch { /* ambientes sem FontFaceSet: mede com fallback */ }
}
