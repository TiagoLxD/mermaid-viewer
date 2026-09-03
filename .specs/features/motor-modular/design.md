# Design: motor modular + cena React

## Arquitetura alvo

```
src/engine/
  types.ts            # modelo do diagrama (Entity, Relation, ParseResult…)
  parser/
    er.ts flow.ts seq.ts class.ts pie.ts mindmap.ts c4.ts
    index.ts          # parseMermaid(text) + detectType(text)
  highlight.ts        # highlightMermaid(text): string (HTML puro)
  formatter.ts        # buildFormatted(text): string | null
  examples.ts         # EXAMPLES: Record<string, string>
  engine.js           # orquestração/interação (drag, câmera, UI) — usa os módulos
src/components/diagram/
  icons.tsx           # ícones React inline (substitui [data-icon])
  nodes.tsx           # EntityTable, FlowNode, MindNode, SeqNode, C4Node, PieSlice
  CrowGlyph.tsx       # glifo de cardinalidade crow's foot
  Scene.tsx           # <g id="gTables"> declarativo: tabela/arestas por props
```

## Decisões

- **D1**: parsers 100% puros (string in → modelo out); DOM não entra.
- **D2**: engine.js continua orquestrador de interação; a construção de nós
  (06-tables.js) é substituída por um React root montado em `#gTables`, que
  re-renderiza a cena a cada atualização do modelo (`Scene` recebe
  `{ type, entities, relations, positions, hoverId, … }`).
- **D3**: ícones viram componentes React (tree com paths importadas); `data-icon`
  é removido dos componentes e do engine.
- **D4**: eventos de interação (drag, hover, toggle mindmap) continuam no engine,
  ligados via delegação no container — componentes são sem estado.

## Riscos

- Réplica de comportamento das tabelas (badges, comentários, contagem) deve
  preservar classes CSS existentes para não quebrar o tema.
