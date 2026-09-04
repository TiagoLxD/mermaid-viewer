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

/* ── export ── */
export type ExportFormat = 'mmd' | 'svg' | 'png';

export function requestExport(format: ExportFormat) {
    window.dispatchEvent(new CustomEvent('meridian:export', { detail: format }));
}

export function onExport(handler: (format: ExportFormat) => void): () => void {
    const h = (e: Event) => handler((e as CustomEvent).detail);
    window.addEventListener('meridian:export', h);
    return () => window.removeEventListener('meridian:export', h);
}

export function publishTransparent(on: boolean) {
    window.dispatchEvent(new CustomEvent('meridian:transp', { detail: on }));
}

export function onTransparent(handler: (on: boolean) => void): () => void {
    const h = (e: Event) => handler(!!(e as CustomEvent).detail);
    window.addEventListener('meridian:transp', h);
    return () => window.removeEventListener('meridian:transp', h);
}

/* ── arquivo: novo / limpar / abrir (drag & drop e input) ── */

/** Componente → engine: cria um diagrama novo do tipo informado ('blank' limpa tudo). */
export function requestNew(type: string) {
    window.dispatchEvent(new CustomEvent('meridian:new', { detail: type }));
}

export function onNew(handler: (type: string) => void): () => void {
    const h = (e: Event) => handler(String((e as CustomEvent).detail));
    window.addEventListener('meridian:new', h);
    return () => window.removeEventListener('meridian:new', h);
}

/** Componente → engine: carrega código vindo de um arquivo .mmd/.mermaid. */
export function requestLoadCode(code: string, name = '') {
    window.dispatchEvent(new CustomEvent('meridian:load-code', { detail: { code, name } }));
}

export function onLoadCode(handler: (code: string, name: string) => void): () => void {
    const h = (e: Event) => {
        const d = (e as CustomEvent).detail ?? {};
        handler(String(d.code ?? ''), String(d.name ?? ''));
    };
    window.addEventListener('meridian:load-code', h);
    return () => window.removeEventListener('meridian:load-code', h);
}

/** Componente → componente: pede ao DropZone para abrir o seletor de arquivos. */
export function requestOpenFile() {
    window.dispatchEvent(new CustomEvent('meridian:open-file'));
}

/* ── painel de código: mostrar/ocultar ── */

/** Componente → componente: alterna visibilidade do painel de código. */
export function requestTogglePanel() {
    window.dispatchEvent(new CustomEvent('meridian:toggle-panel'));
}

/* ── documentação: abrir/fechar ── */

/** Componente → componente: abre (true), fecha (false) ou alterna (undefined) os docs. */
export function requestToggleDocs(open?: boolean) {
    window.dispatchEvent(new CustomEvent('meridian:toggle-docs', { detail: open }));
}

export function onToggleDocs(handler: (open: boolean | undefined) => void): () => void {
    const h = (e: Event) => handler((e as CustomEvent).detail as boolean | undefined);
    window.addEventListener('meridian:toggle-docs', h);
    return () => window.removeEventListener('meridian:toggle-docs', h);
}
