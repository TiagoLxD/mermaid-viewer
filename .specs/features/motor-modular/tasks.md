# Tasks — motor modular

- **T1** Vitest + tipos (`src/engine/types.ts`) + parsers puros (`parser/*.ts`) + testes dos 7 tipos. ✔ `vitest run` verde
- **T2** `highlight.ts`, `formatter.ts`, `examples.ts` extraídos + testes. ✔ build sem regressão
- **T3** `engine.js` consome os módulos (código inline removido). ✔ app funciona
- **T4** Ícones React (`src/components/diagram/icons.tsx`), `shared/Icon` usa-os, injeção `[data-icon]` removida do engine. ✔ sem `data-icon` no DOM
- **T5** Componentes SVG dos nós (`nodes.tsx`, `CrowGlyph.tsx`, `Scene.tsx`); engine renderiza `#gTables` via React. ✔ nada construído via `createElementNS` nos nós

Rastreabilidade: R1↔T1 · R2↔T2 · R3↔T1/T2 · R4↔T4 · R5↔T5 · R6↔todos
