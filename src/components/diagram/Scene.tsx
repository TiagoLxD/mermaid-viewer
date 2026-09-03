import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { NodeContent } from './nodes';
import { EdgeLines, EdgeOverlays } from './edges';
import type { EdgeGeom } from '../../engine/edges-geom';
import type { Entity } from '../../engine/types';

/* ══════════ Cena declarativa — montada pelo engine dentro de <g id="gTables"> ══════════ */

export interface TablesProps {
    type: string;
    entities: Entity[];
    animate: boolean;
    onToggle: (name: string) => void;
}

/** Lista de nós do diagrama; cada <g class="table"> é posicionado via transform. */
export function Tables({ type, entities, animate, onToggle }: TablesProps) {
    return (
        <>
            {entities.map((ent, i) => (
                <g
                    key={ent.name}
                    className={'table' + (type === 'mindmap' ? ' mm-click' : '')}
                    data-id={ent.name}
                    transform={`translate(${ent.x} ${ent.y})`}
                >
                    <g
                        className={animate ? 't-inner enter' : 't-inner'}
                        style={animate ? { animationDelay: `${80 + i * 32}ms` } : undefined}
                    >
                        <NodeContent type={type} ent={ent} onToggle={onToggle} />
                    </g>
                </g>
            ))}
        </>
    );
}

/** Root React ancorado em um elemento SVG — idempotente (root guardado no próprio nó). */
function svgRoot(container: Element) {
    const owner = container as Element & { __meridianRoot?: Root };
    return {
        render(node: React.ReactNode) {
            if (!owner.__meridianRoot) owner.__meridianRoot = createRoot(container);
            const root = owner.__meridianRoot;
            /* commit síncrono: o engine lê os nós do DOM logo após o render */
            flushSync(() => root.render(node));
        },
        unmount() {
            owner.__meridianRoot?.unmount();
            delete owner.__meridianRoot;
        },
    };
}

export function mountTables(container: Element) {
    const root = svgRoot(container);
    return {
        render: (props: TablesProps) => root.render(<Tables {...props} />),
        unmount: root.unmount,
    };
}

export interface EdgeLayerProps {
    geoms: EdgeGeom[];
    ms?: number;
}

/** Linhas das arestas — montado em <g id="gEdges">. */
export function mountEdgeLines(container: Element) {
    const root = svgRoot(container);
    return {
        render: ({ geoms }: EdgeLayerProps) => root.render(<EdgeLines geoms={geoms} />),
        unmount: root.unmount,
    };
}

/** Marcadores/selos/rótulos — montado em <g id="gTop">. */
export function mountEdgeOverlays(container: Element) {
    const root = svgRoot(container);
    return {
        render: ({ geoms, ms = 1 }: EdgeLayerProps) => root.render(<EdgeOverlays geoms={geoms} ms={ms} />),
        unmount: root.unmount,
    };
}
