# STATE — Meridian

## Decisões

- 2026-09-03: Motor 100% TypeScript (`src/engine/engine.ts`), strict mode limpo.
  Estratégia gradual: módulos puros tipados (parser, edges-geom, layout,
  drag-geom, history, store…) e o orquestrador com `any` nos refs DOM/estado
  (evolução incremental: apertar os tipos por blocos, começando por model/byId).
- 2026-09-03: Nós e arestas renderizados via React (`components/diagram/`):
  roots em `#gTables`/`#gEdges`/`#gTop` com `flushSync` (commit síncrono p/ refs).
  Ícones são componentes React; nada de `innerHTML`/`createElementNS` p/ conteúdo.
- 2026-09-03: Verificação runtime: Chromium headless (CDP) — os 7 tipos de
  diagrama renderizam sem erros de console; drag testado com eventos pointer
  sintéticos via CDP (tabela move, pushOut executa).
  Nota: em headless, `document.fonts.ready` só resolve com fetch externo
  abortado (Fetch.failRequest) — lembrar nos testes futuros.

## Blockers / riscos

- `engine.ts` usa `any` em refs DOM e estado interno (model/byId/cam/etc.) —
  apertar gradualmente (sugestão: interface EngineModel + typed refs).

## Todos / ideias

- Extrair snippets (slash commands + tabstops) como módulo puro testável.
- Teste de integração (jsdom/CDP) do pipeline applySource → Scene na CI.
- Tipar EngineModel/byId no engine.ts (remover `any` gradualmente).

## Preferências

- Usuário prefere fluxo spec-driven (.specs/) com commits atômicos por tarefa.
