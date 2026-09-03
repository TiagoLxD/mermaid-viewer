import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { NodeContent } from './nodes';
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

/** Root React ancorado em um elemento SVG (usado pelo engine em #gTables).
    Guardado no próprio nó do container — idempotente mesmo com remontagens. */
export function mountTables(container: Element): {
    render: (props: TablesProps) => void;
    unmount: () => void;
} {
    const owner = container as Element & { __meridianRoot?: Root };
    const getRoot = () => {
        if (!owner.__meridianRoot) {
            owner.__meridianRoot = createRoot(container);
        }
        return owner.__meridianRoot;
    };
    return {
        render(props) {
            const root = getRoot();
            /* commit síncrono: o engine lê os nós do DOM logo após o render */
            flushSync(() => root.render(<Tables {...props} />));
        },
        unmount() {
            owner.__meridianRoot?.unmount();
            delete owner.__meridianRoot;
        },
    };
}
