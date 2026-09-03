# STATE — Meridian

## Decisões

- 2026-09-03: Motor modular — parsers/highlight/formatter/examples/measure
  puros em `src/engine/`, cobertos por Vitest. `engine.js` permanece
  orquestrador de interação, importando os módulos.
- 2026-09-03: Nós do diagrama renderizados via React (`components/diagram/`),
  root montado em `#gTables` com `flushSync` (commit síncrono p/ refs do engine).
  Ícones são componentes React; nada de `innerHTML`/`createElementNS` para nós.
- 2026-09-03: Arestas — geometria 100% pura em `edges-geom.ts` (âncoras,
  espalhamento, roteamento H-V-H/V-H-V, contornos, laços, mindmap, sequência);
  render React em `gEdges`/`gTop` (EdgeLines/EdgeOverlays/CrowGlyph/MiniRel).
- 2026-09-03: Drag — `drag-geom.ts` puro (snapMove/pushOut/resolveOverlaps).
- Verificação runtime headless (Chromium): os 7 tipos de diagrama renderizam
  sem erros de console (seed via localStorage `meridian:code`).

## Blockers / riscos

- `engine.js` ainda é JS (orquestração de câmera/pan/UI/editor-events).
  Migração integral para TS exigiria ~900 correções (null-safety + tipos DOM);
  estratégia adotada: continuar extraindo blocos puros por pela lógica testável.

## Todos / ideias

- Extrair para módulos puros: edgeClearance (layout), store, undo, toasts.
- Migração JS→TS do restante do engine por blocos (câmera → drag → UI).
- `store`, toasts e undo como módulos puros testáveis.

## Preferências

- Usuário prefere fluxo spec-driven (.specs/) com commits atômicos por tarefa.
