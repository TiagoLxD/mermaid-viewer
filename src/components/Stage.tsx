import { Button } from '../shared/Button';
import { Icon } from '../shared/Icon';

const LAYOUTS = [
    { value: 'layered', label: 'Hierárquico' },
    { value: 'force', label: 'Orgânico' },
    { value: 'compact', label: 'Compacta' },
] as const;

/** Palco do diagrama: canvas SVG + toolbar de zoom/layout + minimapa + statusbar. */
export function Stage() {
    return (
        <section id="stage">
            <div id="canvas">
                <Button
                    id="btnShowCode"
                    variant="ghost"
                    modifier="icon-btn"
                    icon="panel"
                    title="Mostrar painel de código"
                    aria-label="Mostrar painel de código"
                />

                <svg id="scene">
                    <g id="gEdges" />
                    <g id="gTables" />
                    <g id="gTop" />
                    <g id="gGuides" />
                </svg>

                <div id="toolbar">
                    <select id="layoutSel" className="tb-select" title="Modo de organização automática">
                        {LAYOUTS.map((l) => (
                            <option key={l.value} value={l.value}>
                                {l.label}
                            </option>
                        ))}
                    </select>
                    <Button
                        id="btnOrganize"
                        className="tb-btn"
                        icon="wand"
                        title="Reorganizar no modo selecionado (F)"
                        aria-label="Reorganizar"
                    />
                    <span className="tb-sep" />
                    <Button
                        id="btnZoomOut"
                        className="tb-btn"
                        icon="minus"
                        title="Reduzir zoom"
                        aria-label="Reduzir zoom"
                    />
                    <button type="button" className="tb-zoom" id="zoomLbl" title="Restaurar zoom para 100%">
                        100%
                    </button>
                    <Button
                        id="btnZoomIn"
                        className="tb-btn"
                        icon="plus"
                        title="Ampliar zoom"
                        aria-label="Ampliar zoom"
                    />
                    <span className="tb-sep" />
                    <Button
                        id="btnPreview"
                        className="tb-btn"
                        title="Modo prévia: navegue sem mover tabelas (P)"
                        aria-label="Modo prévia"
                        aria-pressed="false"
                    >
                        <span className="i-lock"><Icon name="lock" size={15} /></span>
                        <span className="i-unlock"><Icon name="unlock" size={15} /></span>
                    </Button>
                    <Button
                        id="btnFit"
                        className="tb-btn"
                        icon="fit"
                        title="Enquadrar diagrama"
                        aria-label="Enquadrar"
                    />
                </div>

                <svg id="minimap" aria-label="Minimapa">
                    <g id="mmContent" />
                    <rect id="mmView" rx="3" />
                </svg>
            </div>

            <footer id="statusbar">
                <span id="stats">—</span>
                <span className="hints">
                    arraste as tabelas · role para zoom · F reorganiza · duplo clique enquadra · ? abre a
                    documentação
                </span>
            </footer>
        </section>
    );
}
