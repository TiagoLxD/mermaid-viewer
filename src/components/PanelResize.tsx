import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { store } from '../engine/store';

const MIN = 260;
const MAX = 720;
const clamp = (v: number) => Math.min(MAX, Math.max(MIN, v));

const saved = parseInt(store.get('panelW') || '', 10);
export const DEFAULT_PANEL_W = saved >= MIN && saved <= MAX ? saved : 370;

interface PanelResizeProps {
    /** largura atual do painel (state do EngineHost) */
    width: number;
    /** chamada apenas ao soltar o divisor, com a largura final */
    onResize: (w: number) => void;
}

/**
 * Divisor de arrastar entre o painel de código e o palco.
 *
 * Durante o drag a largura é aplicada direto no DOM (#panel.style.width),
 * sem re-render — por isso acompanha o mouse de forma fluida. Ao soltar,
 * o estado do EngineHost é sincronizado e a largura persistida.
 */
export function PanelResize({ width, onResize }: PanelResizeProps) {
    const [dragging, setDragging] = useState(false);
    const startX = useRef(0);
    const startW = useRef(0);
    const lastW = useRef(width);

    const onPointerDown = (e: ReactPointerEvent) => {
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        startX.current = e.clientX;
        startW.current = width;
        lastW.current = width;
        /* mata a transition de width do painel durante o gesto (senão fica "elástico") */
        document.getElementById('panel')!.classList.add('resizing');
        setDragging(true);
    };

    const onPointerMove = (e: ReactPointerEvent) => {
        if (!dragging) return;
        lastW.current = clamp(Math.round(startW.current + (e.clientX - startX.current)));
        /* caminho rápido: DOM direto, zero re-render durante o gesto */
        document.getElementById('panel')!.style.width = lastW.current + 'px';
    };

    const onPointerUp = (e: ReactPointerEvent) => {
        if (!dragging) return;
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        setDragging(false);
        document.getElementById('panel')!.classList.remove('resizing');
        onResize(lastW.current); /* sincroniza o React só no fim */
        store.set('panelW', String(lastW.current));
    };

    return (
        <div
            id="panelResize"
            className={dragging ? 'dragging' : undefined}
            title="Arraste para redimensionar o painel de código"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
        />
    );
}
