import { useEffect } from 'react';
import { mountEngine } from '../engine/engine.js';
import { TopBar } from './TopBar';
import { EditorPanel } from './EditorPanel';
import { Stage } from './Stage';
import { DocsPanel } from './DocsPanel';

/**
 * Shell da aplicação. Os elementos aqui renderizados são identificados
 * por `id` e manipulados diretamente pelo engine (mountEngine), que
 * assume o comportamento (parser, layout, editor, export).
 */
export default function EngineHost() {
    useEffect(() => {
        mountEngine();
    }, []);

    return (
        <>
            <TopBar />

            <main id="app">
                <EditorPanel />
                <div id="panelResize" title="Arraste para redimensionar o painel de código" />
                <Stage />
            </main>

            <DocsPanel />

            <div id="toasts" />
        </>
    );
}
