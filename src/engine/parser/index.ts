import type { DiagramType, ParseResult } from '../types';
import { parseEr } from './er';
import { parseFlow } from './flow';
import { parseSeq } from './seq';
import { parseClass } from './class';
import { parsePie } from './pie';
import { parseMindmap } from './mindmap';
import { parseC4 } from './c4';

/* ══════════ dispatcher de parsers — puro, sem DOM ══════════ */

export function detectType(text: string): DiagramType {
    const m = text.match(/^\s*(erDiagram|flowchart|graph|sequenceDiagram|classDiagram|stateDiagram-v2|stateDiagram|pieDiagram|mindmap|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment)\b/m);
    return ({
        erDiagram: 'er', flowchart: 'flow', graph: 'flow', sequenceDiagram: 'seq', classDiagram: 'class',
        stateDiagram: 'flow', 'stateDiagram-v2': 'flow',
        pieDiagram: 'pie', mindmap: 'mindmap',
        C4Context: 'c4', C4Container: 'c4', C4Component: 'c4', C4Dynamic: 'c4', C4Deployment: 'c4',
    } as Record<string, DiagramType>)[m?.[1] ?? ''] || 'er';
}

/** Faz o parse do código Mermaid para o modelo do Meridian. */
export function parseMermaid(text: string): ParseResult {
    const t = detectType(text);
    if (t === 'flow') return parseFlow(text);
    if (t === 'seq') return parseSeq(text);
    if (t === 'class') return parseClass(text);
    if (t === 'pie') return parsePie(text);
    if (t === 'mindmap') return parseMindmap(text);
    if (t === 'c4') return parseC4(text);
    return parseEr(text);
}
