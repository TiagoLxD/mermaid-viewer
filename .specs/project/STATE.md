# STATE — Meridian

## Decisões

- 2026-09-03: Motor modular — parsers, highlight, formatter, examples, measure,
  edges-geom (roteamento completo), drag-geom, layout (force/layered/compact/
  mindmap/pie), edgeClearance, store, history (undo/redo), toast e caret
  extraídos como módulos puros em `src/engine/`, cobertos por Vitest (50 testes).
- 2026-09-03: Nós e arestas renderizados via React (`components/diagram/`):
  roots em `#gTables`/`#gEdges`/`#gTop` com `flushSync` (commit síncrono p/ refs).
  Ícones são componentes React; nada de `innerHTML`/`createElementNS` p/ conteúdo.
- 2026-09-03: Verificação runtime headless (Chromium): os 7 tipos de diagrama
  renderizam sem erros de console (seed via localStorage `meridian:code`).

## Blockers / riscos

- `engine.js` (~1.2k linhas) agora é quase só colagem de DOM/estado: câmera/pan,
  drag events, editor events, snippets, export, docs, panel-resize, toasts glue.
  Migração desses para TS depende de tipar refs DOM; baixo valor imediato.

## Todos / ideias

- Extrair snippets (slash commands + tabstops) como módulo puro se houver
  necessidade de testá-los.
- Testes de integração (jsdom) do pipeline applySource → Scene.
- Migrar camera/drag-events para TS quando o engine for tipado por inteiro.

## Preferências

- Usuário prefere fluxo spec-driven (.specs/) com commits atômicos por tarefa.
