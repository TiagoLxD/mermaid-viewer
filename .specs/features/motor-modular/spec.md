# Feature: Refatorar o motor legado em módulos testáveis + renderização em componentes React

## Contexto

`src/engine/engine.js` (~2.8k linhas, JS) concentra parser, measure, layout, render
(via `document.createElementNS` + `innerHTML` de ícones), editor, câmera, drag,
minimap, export, UI. Nada disso é testável isoladamente. A UI React ainda
depende de o engine injetar conteúdo no DOM (`[data-icon]`, conteúdo das tabelas).

## Requisitos

- **R1 · Parsers puros**: toda a lógica de parsing (`parseMermaid` + er, flow, seq,
  class, pie, mindmap, c4, `detectType`) extraída para módulos TypeScript puros em
  `src/engine/parser/` — sem acesso a DOM. Mesmos resultados do legado.
- **R2 · Utilitários puros**: `highlight` (texto → HTML do editor), `formatter`
  (código → código formatado), `examples` (dados dos exemplos) e mapas de
  cardinalidade extraídos como módulos puros.
- **R3 · Cobertura Vitest**: cada módulo puro coberto por testes em
  `src/engine/__tests__/` (parser de todos os 7 tipos, highlight, formatter).
- **R4 · Ícones em React**: os ícones passam a ser componentes React inline
  (`<svg>`), eliminando a injeção via `innerHTML` (`[data-icon]`) do engine.
- **R5 · Nós do diagrama em React**: cada tipo de nó/tabela vira componente SVG
  declarativo (`EntityTable`, `FlowNode`, `MindNode`, `SeqNode`, `C4Node`,
  `PieSlice` + glifos crow's foot) — o engine passa a renderizar o modelo via
  React, sem construir DOM à mão.
- **R6 · Regressão zero**: app funciona igual (build ✓, diagrama renderiza,
  editor/highlight/formatar funcionam).

## Fora de escopo (fases futuras)

- Migração do engine.js para TS integral (layout/câmera/drag continuam JS).
- Undo/snippets/export virarem módulos (já isoláveis depois).

## Verificação

- `npx vitest run` ✓ (novos testes)
- `npx tsc --noEmit` ✓ · `npm run build` ✓
- App no dev server renderiza os 7 tipos sem erro de console.
