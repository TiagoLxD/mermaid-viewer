import { useEffect, useState } from 'react';
import { mountEngine } from '../engine/engine';
import { TopBar } from './TopBar';
import { EditorPanel } from './EditorPanel';
import { PanelResize, DEFAULT_PANEL_W } from './PanelResize';
import { Stage } from './Stage';
import { DocsPanel } from './DocsPanel';
import { Toasts } from './Toasts';
import { DropZone } from './DropZone';

/**
 * Shell da aplicação. Os elementos aqui renderizados são identificados
 * por `id` e manipulados diretamente pelo engine (mountEngine), que
 * assume o comportamento (parser, layout, editor, export).
 */
export default function EngineHost() {
    const [panelW, setPanelW] = useState(DEFAULT_PANEL_W);

    useEffect(() => {
        mountEngine();
    }, []);

    return (
        <>
            <TopBar />

            <main id="app">
                <EditorPanel width={panelW} />
                <PanelResize width={panelW} onResize={setPanelW} />
                <Stage />
            </main>

            <DocsPanel />

            <DropZone />
            <Toasts />
        </>
    );
}
