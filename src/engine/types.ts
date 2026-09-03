/* ══════════ Modelo do diagrama Meridian — compartilhado por parser/layout/render ══════════ */

export type DiagramType = 'er' | 'flow' | 'seq' | 'class' | 'pie' | 'mindmap' | 'c4';

export type AttrKey = 'PK' | 'FK' | 'UK';

export interface EntityAttr {
    type: string;
    name: string;
    keys: AttrKey[];
    comment: string;
}

export type NodeShape = 'rect' | 'stadium' | 'diamond';

export type Cardinality = 'one' | 'zero_one' | 'one_more' | 'zero_more';

export type MarkerKind = 'none' | 'arrow' | 'tri' | 'diamond' | 'odiamond';

export interface ParseError {
    line: number;
    msg: string;
}

/** Entidade/nó do modelo — campos opcionais variam por tipo de diagrama. */
export interface Entity {
    name: string;
    attrs: EntityAttr[];
    /* rótulo alternativo (flow/seq/mindmap/c4) */
    label?: string;
    /* forma do nó (flow/mindmap) */
    shape?: NodeShape;
    /* diagrama de sequência */
    seq?: boolean;
    idx?: number;
    /* mindmap */
    mmColor?: number | null;
    mmDepth?: number;
    hidden?: boolean;
    hasKids?: boolean;
    collapsed?: boolean;
    /* C4 */
    sub?: string;
    stereo?: string;
    ext?: boolean;
    /* pie */
    pieTitle?: boolean;
    value?: number;
    frac?: number;
    slicePath?: string;
    pieCls?: string;
    ox?: number;
    oy?: number;
    lx?: number;
    ly?: number;
    /* geometria (preenchida por measure/layout) */
    x?: number;
    y?: number;
    w?: number;
    h?: number;
    commentW?: number;
}

export interface Relation {
    a: string;
    b: string;
    label: string;
    /* ER */
    lc?: string;
    rc?: string;
    conn?: string;
    ac?: Cardinality;
    bc?: Cardinality;
    dash?: boolean;
    /* tipos simplificados (flow/seq/class/mindmap/c4) */
    simple?: boolean;
    mm?: boolean;
    seq?: boolean;
    idx?: number;
    aMk?: MarkerKind;
    bMk?: MarkerKind;
}

export interface ParseResult {
    type: DiagramType;
    entities: Entity[];
    relations: Relation[];
    errors: ParseError[];
    /** total do pie (só em parsePie) */
    pieTotal?: number;
}

export const CARD_TEXT: Record<Cardinality, string> = {
    one: '1',
    zero_one: '0..1',
    one_more: '1..N',
    zero_more: '0..N',
};

export const CARD_PHRASE: Record<Cardinality, string> = {
    one: 'exatamente um',
    zero_one: 'no máximo um',
    one_more: 'um ou muitos',
    zero_more: 'zero ou muitos',
};
