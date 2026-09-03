/* ══════════ barramento engine → componentes de UI ══════════
   O engine publica estado (CustomEvents em window); os componentes
   escutam e renderizam. Aceitação do menu volta por evento de resposta. */

export interface GutterState {
    count: number;
    cur: number;
    scrollTop: number;
}

export function publishGutter(s: GutterState) {
    window.dispatchEvent(new CustomEvent('meridian:gutter', { detail: s }));
}

export function subscribeGutter(handler: (s: GutterState) => void): () => void {
    const h = (e: Event) => handler((e as CustomEvent).detail);
    window.addEventListener('meridian:gutter', h);
    return () => window.removeEventListener('meridian:gutter', h);
}

export interface AcMenuState {
    open: boolean;
    items: { label: string; desc: string; item: any }[];
    sel: number;
    x: number;
    y: number;
}

export function publishAc(s: AcMenuState) {
    window.dispatchEvent(new CustomEvent('meridian:ac', { detail: s }));
}

export function subscribeAc(handler: (s: AcMenuState) => void): () => void {
    const h = (e: Event) => handler((e as CustomEvent).detail);
    window.addEventListener('meridian:ac', h);
    return () => window.removeEventListener('meridian:ac', h);
}

/** Componente → engine: usuário aceitou um item do menu. */
export function acceptAcItem(item: any) {
    window.dispatchEvent(new CustomEvent('meridian:ac-accept', { detail: item }));
}

export function onAcAccept(handler: (item: any) => void): () => void {
    const h = (e: Event) => handler((e as CustomEvent).detail);
    window.addEventListener('meridian:ac-accept', h);
    return () => window.removeEventListener('meridian:ac-accept', h);
}

export function publishHighlight(html: string) {
    window.dispatchEvent(new CustomEvent('meridian:highlight', { detail: { html } }));
}

export function subscribeHighlight(handler: (html: string) => void): () => void {
    const h = (e: Event) => handler((e as CustomEvent).detail?.html ?? '');
    window.addEventListener('meridian:highlight', h);
    return () => window.removeEventListener('meridian:highlight', h);
}
