import { F, tw } from '../../engine/measure';
import { CARD_TEXT, type Cardinality, type MarkerKind } from '../../engine/types';
import type { EdgeGeom } from '../../engine/edges-geom';

/* ══════════ Arestas — componentes SVG declarativos (linhas, marcadores, selos, rótulos) ══════════ */

/** Pé de galinha (cardinalidade ER). Origem = borda da entidade; +x aponta p/ fora. */
export function CrowGlyph({ type }: { type: Cardinality }) {
    const P = (d: string, key: string) => <path key={key} className="mp" d={d} />;
    const C = (cx: number, key: string) => <circle key={key} className="mc" cx={cx} cy={0} r={3.4} />;
    if (type === 'one') return <>{P('M9.5 -5.2V5.2', 'a')}{P('M15.5 -5.2V5.2', 'b')}</>;
    if (type === 'zero_one') return <>{P('M9.5 -5.2V5.2', 'a')}{C(16.8, 'b')}</>;
    if (type === 'one_more')
        return <>{P('M10 0L0 -6', 'a')}{P('M10 0L0 0', 'b')}{P('M10 0L0 6', 'c')}{P('M15.5 -5.2V5.2', 'd')}</>;
    return <>{P('M10 0L0 -6', 'a')}{P('M10 0L0 0', 'b')}{P('M10 0L0 6', 'c')}{C(16.8, 'd')}</>;
}

/** Marcadores de classe/flow (seta, triângulo, losango…). */
export function SimpleMarker({ kind }: { kind?: MarkerKind }) {
    if (!kind || kind === 'none') return null;
    if (kind === 'arrow') return <path d="M0 0 L-11 -5 L-9 0 L-11 5 Z" fill="var(--edge)" />;
    if (kind === 'tri') return <path d="M0 0 L-12 -6 L-12 6 Z" fill="var(--edge)" />;
    if (kind === 'diamond') return <path d="M0 0 L-8 -5 L-16 0 L-8 5 Z" fill="var(--edge)" />;
    return <path d="M0 0 L-8 -5 L-16 0 L-8 5 Z" fill="var(--canvas)" stroke="var(--edge)" strokeWidth={1.4} />;
}

/** Preview de cardinalidade da documentação (substitui o miniRel do engine). */
export function MiniRel({ lc, conn, rc }: { lc: Cardinality; conn: string; rc: Cardinality }) {
    return (
        <svg
            className={'mini-rel' + (conn === '..' ? ' dashed' : '')}
            viewBox="0 0 176 34"
            width={176}
            height={34}
        >
            <rect x={21} y={8} width={9} height={20} rx={2} className="mb" />
            <rect x={146} y={8} width={9} height={20} rx={2} className="mb" />
            <path d="M30 18H146" className="ml" />
            {/* glifo esquerdo: ancorado na borda direita da caixa, aponta para a linha */}
            <g transform="translate(30 18)"><CrowGlyph type={lc} /></g>
            {/* glifo direito: ancorado na borda esquerda da caixa, aponta de volta */}
            <g transform="translate(146 18) rotate(180)"><CrowGlyph type={rc} /></g>
            <text x={58} y={9} textAnchor="middle">{CARD_TEXT[lc]}</text>
            <text x={118} y={9} textAnchor="middle">{CARD_TEXT[rc]}</text>
        </svg>
    );
}

/** Linhas (em <g id="gEdges">): path da aresta + seta da sequência. */
export function EdgeLines({ geoms }: { geoms: EdgeGeom[] }) {
    return (
        <>
            {geoms.map((g) =>
                g.kind === 'life' ? (
                    <g key={g.key} className="edge" data-edge={g.key}>
                        <path className="e-life" d={g.d} />
                    </g>
                ) : (
                    <g key={g.key} className={'edge' + (g.dash ? ' dash' : '')} data-edge={g.key}>
                        <path className={'e-line' + (g.rel?.mm ? ' mm-line' : '')} d={g.d} />
                        {g.arrow && <path className="e-arrow" d={g.arrow.d} />}
                    </g>
                ),
            )}
        </>
    );
}

/** Símbolos sobrepostos (em <g id="gTop">): marcadores, selos e rótulos. */
export function EdgeOverlays({ geoms, ms }: { geoms: EdgeGeom[]; ms: number }) {
    return (
        <>
            {geoms.map((g) => {
                if (g.kind === 'life') return null;
                const rel = g.rel!;
                const mk = (
                    P: { x: number; y: number; rot: number },
                    kind: MarkerKind | undefined,
                    crow: Cardinality | undefined,
                    key: string,
                ) => (
                    <g
                        key={key}
                        className="e-mk"
                        data-edge={key}
                        transform={`translate(${P.x} ${P.y}) rotate(${P.rot}) scale(${ms})`}
                    >
                        {rel.simple ? <SimpleMarker kind={kind} /> : <CrowGlyph type={crow!} />}
                    </g>
                );
                const badge = (b: NonNullable<EdgeGeom['badgeA']>, key: string) => {
                    const w = Math.round(tw(b.text, F.card)) + 10;
                    return (
                        <g key={key} className="e-card" data-edge={key} transform={`translate(${b.x} ${b.y}) scale(${ms})`}>
                            <title>{b.tip || b.text}</title>
                            <rect x={-w / 2} y={-7} width={w} height={14} rx={7} />
                            <text textAnchor="middle" y={3}>{b.text}</text>
                        </g>
                    );
                };
                return (
                    <g key={g.key}>
                        {mk({ x: g.ax, y: g.ay, rot: g.aRot }, rel.aMk, rel.ac, g.key + ':a')}
                        {mk({ x: g.bx, y: g.by, rot: g.bRot }, rel.bMk, rel.bc, g.key + ':b')}
                        {g.badgeA && badge(g.badgeA, g.key + ':ba')}
                        {g.badgeB && badge(g.badgeB, g.key + ':bb')}
                        <g className="e-label" data-edge={g.key} transform={`translate(${g.lx} ${g.ly})`}>
                            <rect x={-g.lw / 2} y={-9} width={g.lw} height={18} rx={9} />
                            <text textAnchor="middle" y={3.5}>{g.label}</text>
                        </g>
                    </g>
                );
            })}
        </>
    );
}
