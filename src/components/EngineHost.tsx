import { useEffect, useState } from 'react';
import { mountEngine } from '../engine/engine';
import { store } from '../engine/store';
import { TopBar } from './TopBar';
import { EditorPanel } from './EditorPanel';
import { PanelResize, DEFAULT_PANEL_W } from './PanelResize';
import { Stage } from './Stage';
import { DocsPanel } from './DocsPanel';
import { Toasts } from './Toasts';
import { DropZone } from './DropZone';

const savedHidden = store.get('panel') === '0' || innerWidth < 861;

/**
 * Shell da aplicação. Os elementos aqui renderizados são identificados
 * por `id` e manipulados diretamente pelo engine (mountEngine), que
 * assume o comportamento (parser, layout, editor, export).
 */
export default function EngineHost() {
    const [panelW, setPanelW] = useState(DEFAULT_PANEL_W);
    const [panelHidden, setPanelHidden] = useState(savedHidden);

    useEffect(() => {
        mountEngine();
    }, []);

    /* painel ocultável: só persiste e espelha a classe no body p/ CSS */
    useEffect(() => {
        document.body.classList.toggle('code-hidden', panelHidden);
        store.set('panel', panelHidden ? '0' : '1');
    }, [panelHidden]);

    useEffect(() => {
        const h = () => setPanelHidden((v) => !v);
        window.addEventListener('meridian:toggle-panel', h);
        return () => window.removeEventListener('meridian:toggle-panel', h);
    }, []);

    return (
        <>
            <TopBar />

            <main id="app">
                <EditorPanel width={panelW} hidden={panelHidden} />
                <PanelResize width={panelW} onResize={setPanelW} />
                <Stage />
            </main>

            <DocsPanel />

            <DropZone />
            <Toasts />
        </>
    );
}
