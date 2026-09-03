import { F, tw } from '../../engine/measure';
import type { Entity } from '../../engine/types';

/* ══════════ Nós do diagrama — componentes SVG declarativos ══════════
   Cada tipo de nó é um componente React. O conteúdo replica as classes
   CSS do tema (t-main, t-title, badge b-pk…). Nada é injetado via JS. */

interface NodeProps {
    ent: Entity;
    onToggle?: (name: string) => void;
}

/* ── ER: tabela com cabeçalho, contagem e atributos ── */
export function EntityTable({ ent }: NodeProps) {
    const { w = 0, h = 0 } = ent;
    const countW = tw(String(ent.attrs.length), F.count) + 12;
    return (
        <>
            <rect className="t-main" x={0} y={0} width={w} height={h} rx={10} />
            <rect className="t-headbg" x={0.5} y={0.5} width={w - 1} height={39.5} rx={9.5} />
            <rect className="t-headbg" x={0.5} y={26} width={w - 1} height={14} />
            <text className="t-title" x={14} y={25}>{ent.name.toUpperCase()}</text>
            <rect className="t-count-bg" x={w - 14 - countW} y={12} width={countW} height={16} rx={8} />
            <text className="t-count" x={w - 14 - countW / 2} y={23} textAnchor="middle">{ent.attrs.length}</text>
            <path className="t-div" d={`M0 40H${w}`} />
            {ent.attrs.length === 0 && (
                <text className="t-empty" x={14} y={57}>— sem campos definidos</text>
            )}
            {ent.attrs.map((a, i) => {
                const yT = 40 + i * 26;
                let bx = 14 + tw(a.name, F.name) + 7;
                const badges = a.keys.map((k) => {
                    const kw = tw(k, F.key) + 12;
                    const el = (
                        <g key={k}>
                            <rect className={`badge b-${k.toLowerCase()}`} x={bx} y={yT + 5.5} width={kw} height={15} rx={7.5} />
                            <text className={`badge-t b-${k.toLowerCase()}`} x={bx + kw / 2} y={yT + 16} textAnchor="middle">{k}</text>
                        </g>
                    );
                    bx += kw + 5;
                    return el;
                });
                const tx = ent.commentW ? w - ent.commentW - 12 : w - 14;
                return (
                    <g key={a.name}>
                        <text className="t-name" x={14} y={yT + 17}>
                            {a.name}
                            {a.comment && <title>{a.comment}</title>}
                        </text>
                        {badges}
                        <text className="t-type" x={tx} y={yT + 16} textAnchor="end">{a.type}</text>
                        {a.comment && (
                            <text
                                className="t-comment"
                                x={w - ent.commentW! + 6}
                                y={yT + 16}
                                style={{ font: 'italic 400 11px var(--mono)', fill: 'var(--ink3)' }}
                            >
                                {a.comment}
                            </text>
                        )}
                    </g>
                );
            })}
            <rect className="t-hit" x={0} y={0} width={w} height={h} />
        </>
    );
}

/* ── Flowchart: retângulo / estádio / losango ── */
export function FlowNode({ ent }: NodeProps) {
    const { w = 0, h = 0, shape = 'rect' } = ent;
    const lbl = ent.label ?? ent.name;
    return (
        <>
            {shape === 'diamond' ? (
                <polygon className="t-main" points={`${w / 2},2 ${w - 2},${h / 2} ${w / 2},${h - 2} 2,${h / 2}`} />
            ) : (
                <rect className="t-main" x={0} y={0} width={w} height={h} rx={shape === 'stadium' ? h / 2 : 10} />
            )}
            <text className="t-name" x={w / 2} y={h / 2 + 4.5} textAnchor="middle">{lbl}</text>
        </>
    );
}

/* ── Mindmap: cor por nível + selo de recolher/expandir ── */
export function MindNode({ ent, onToggle }: NodeProps) {
    const { w = 0, h = 0, shape = 'stadium' } = ent;
    const lbl = ent.label ?? ent.name;
    const root = ent.mmColor == null || ent.mmColor === -1;
    const depth = Math.max(1, ent.mmDepth || 1);
    const cls = (root ? 'mm-root' : 'mm-c' + ((ent.mmColor! + depth - 1) % 8)) + (root ? '' : ' mm-d' + Math.min(3, depth));
    return (
        <>
            {shape === 'diamond' ? (
                <polygon className={'t-main ' + cls} points={`${w / 2},2 ${w - 2},${h / 2} ${w / 2},${h - 2} 2,${h / 2}`} />
            ) : (
                <rect className={'t-main ' + cls} x={0} y={0} width={w} height={h} rx={shape === 'stadium' ? h / 2 : 10} />
            )}
            <text className={'t-name' + (root ? ' mm-root-t' : '')} x={w / 2} y={h / 2 + 4.5} textAnchor="middle">{lbl}</text>
            {ent.hasKids && (
                <>
                    <circle
                        className="mm-tgl"
                        cx={w}
                        cy={0}
                        r={8}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            onToggle?.(ent.name);
                        }}
                    />
                    <text className="mm-tgl-t" x={w} y={3.5} textAnchor="middle">{ent.collapsed ? '+' : '−'}</text>
                </>
            )}
        </>
    );
}

/* ── Sequência: participante (caixa com cabeçalho) ── */
export function SeqNode({ ent }: NodeProps) {
    const { w = 0, h = 0 } = ent;
    return (
        <>
            <rect className="t-main" x={0} y={0} width={w} height={h} rx={10} />
            <rect className="t-headbg" x={0} y={0} width={w} height={h} rx={10} opacity={0.5} />
            <text className="t-title" x={w / 2} y={h / 2 + 4.5} textAnchor="middle">{ent.label ?? ent.name}</text>
        </>
    );
}

/* ── C4: retângulo/estádio com barra de estereótipo, subtítulo e tag ── */
const C4_TAGS: Record<string, string> = {
    person: 'pessoa', system: 'sistema', db: 'banco', queue: 'fila',
    container: 'container', component: 'componente',
};

export function C4Node({ ent }: NodeProps) {
    const { w = 0, h = 0, ext } = ent;
    const stadium = ent.stereo === 'person';
    return (
        <>
            <rect className={'t-main' + (ext ? ' c4-ext' : '')} x={0} y={0} width={w} height={h} rx={stadium ? h / 2 : 10} />
            <rect
                className={'c4-bar c4-' + ent.stereo}
                x={stadium ? h / 2 - 14 : 12}
                y={0}
                width={stadium ? 28 : w - 24}
                height={4}
                rx={2}
            />
            <text className="t-title" x={w / 2} y={27} textAnchor="middle">{ent.label}</text>
            {ent.sub && <text className="c4-sub" x={w / 2} y={45} textAnchor="middle">{ent.sub}</text>}
            <text className="c4-tag" x={w - 12} y={h - 7} textAnchor="end">
                {C4_TAGS[ent.stereo ?? 'system']}{ext ? ' · externo' : ''}
            </text>
        </>
    );
}

/* ── Pie: fatia em arco + percentual (ou título) ── */
export function PieSlice({ ent }: NodeProps) {
    if (ent.pieTitle) {
        return (
            <>
                <text className="pie-title" x={(ent.w ?? 0) / 2} y={22} textAnchor="middle">{ent.label}</text>
                <rect className="t-hit" x={0} y={0} width={ent.w} height={ent.h} />
            </>
        );
    }
    return (
        <g transform={`translate(${ent.ox} ${ent.oy})`}>
            <path className={'pie-slice ' + ent.pieCls} d={ent.slicePath}>
                <title>{`${ent.label}: ${ent.value} (${Math.round((ent.frac ?? 0) * 100)}%)`}</title>
            </path>
            <text className="pie-pct" x={ent.lx} y={(ent.ly ?? 0) + 4} textAnchor="middle">
                {((ent.frac ?? 0) * 100).toFixed((ent.frac ?? 0) * 100 >= 9.95 ? 0 : 1)}%
            </text>
        </g>
    );
}

/* ── dispatcher por tipo ── */
export function NodeContent({ type, ent, onToggle }: { type: string } & NodeProps) {
    switch (type) {
        case 'pie': return <PieSlice ent={ent} />;
        case 'c4': return <C4Node ent={ent} />;
        case 'flow': return <FlowNode ent={ent} />;
        case 'mindmap': return <MindNode ent={ent} onToggle={onToggle} />;
        case 'seq': return <SeqNode ent={ent} />;
        default: return <EntityTable ent={ent} />;
    }
}
