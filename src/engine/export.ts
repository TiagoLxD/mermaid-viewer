/* ══════════ exportação SVG/PNG/MMD — isolada do orquestrador ══════════ */

const NS = 'http://www.w3.org/2000/svg';
const THEME_VARS = ['--surface', '--surface2', '--canvas', '--ink', '--ink2', '--ink3', '--line', '--line2', '--edge', '--accent', '--pkbg', '--pkln', '--pkfg', '--mono', '--sans', '--pie-txt'];

export function svgEl(tag: string, attrs: Record<string, string | number>): SVGElement {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, String(attrs[k]));
    return el;
}

export function cssVar(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

let _fontCSS: string | null = null;
/** CSS das fontes embutido no SVG (para abrir fora do navegador). */
export async function getFontCSS(): Promise<string> {
    if (_fontCSS !== null) return _fontCSS;
    try {
        const link = document.querySelector('link[href*="fonts.googleapis"]') as HTMLLinkElement | null;
        const css = await (await fetch(link!.href)).text();
        const blocks = css.split('@font-face').slice(1).map(b => '@font-face' + b.slice(0, b.indexOf('}') + 1));
        let out = '';
        for (const b of blocks.filter(x => x.includes('U+0000-00FF'))) {
            const u = b.match(/url\((https:[^)]+)\)/)![1];
            const arr = new Uint8Array(await (await fetch(u)).arrayBuffer());
            let bin = '';
            for (let i = 0; i < arr.length; i += 0x8000) bin += String.fromCharCode.apply(null, arr.subarray(i, i + 0x8000) as unknown as number[]);
            out += b.replace(u, `data:font/woff2;base64,${btoa(bin)}`);
        }
        _fontCSS = out;
    } catch { _fontCSS = ''; }
    return _fontCSS;
}

export interface ExportSvgParams {
    scene: SVGSVGElement;
    /** bbox do conteúdo no mundo */
    bbox: { x: number; y: number; w: number; h: number } | null;
    transparent: boolean;
    appCssUrl?: string;
}

/** Clona a cena, limpa estados transitórios e embute tema+fontes. */
export async function buildExportSVG(p: ExportSvgParams): Promise<{ str: string; W: number; H: number } | null> {
    const bb = p.bbox;
    if (!bb) return null;
    const pad = 56, W = Math.round(bb.w + pad * 2), H = Math.round(bb.h + pad * 2);
    const clone = p.scene.cloneNode(true) as SVGSVGElement;
    clone.removeAttribute('style'); clone.removeAttribute('class');
    clone.setAttribute('xmlns', NS);
    clone.setAttribute('viewBox', `${bb.x - pad} ${bb.y - pad} ${W} ${H}`);
    clone.setAttribute('width', String(W)); clone.setAttribute('height', String(H));
    clone.querySelector('#gGuides')?.remove();
    clone.querySelectorAll('[style]').forEach((el: any) => el.removeAttribute('style'));
    for (const c of ['enter', 'dragging', 'dim', 'on', 'dimt', 'sel', 'drawing'])
        clone.querySelectorAll('.' + c).forEach((el: any) => el.classList.remove(c));
    const vars = THEME_VARS.map(n => `${n}:${cssVar(n)}`).join(';');
    const st = document.createElementNS(NS, 'style');
    let appCss = '';
    try { appCss = await (await fetch(p.appCssUrl ?? 'css/style.css')).text(); } catch { /* file://: exporta só com vars + fontes */ }
    st.textContent = `:root{${vars}} ${appCss} ${await getFontCSS()}`;
    clone.insertBefore(st, clone.firstChild);
    if (!p.transparent) {
        const bg = svgEl('rect', { x: bb.x - pad, y: bb.y - pad, width: W, height: H, fill: cssVar('--canvas') });
        clone.insertBefore(bg, st.nextSibling);
    }
    return { str: new XMLSerializer().serializeToString(clone), W, H };
}

export function downloadBlob(blob: Blob, name: string): void {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
