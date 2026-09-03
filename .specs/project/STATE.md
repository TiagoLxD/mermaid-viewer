# STATE — Meridian

## Decisões

- 2026-09-03: Motor 100% TypeScript (`src/engine/engine.ts`), strict mode limpo.
- 2026-09-03: **Render em duas camadas** (correção de performance):
  React só na mudança estrutural; por frame (drag/pan/zoom), geometria
  aplicada via `setAttribute` em refs cacheadas. Medição CDP: pointermove
  média 1,3ms / máx 2,4ms (antes 35–62ms).
- 2026-09-03: **SceneBridge** (`scene-bridge.ts`): toda a parte React/DOM da
  cena (roots de tabelas/arestas, cache de refs, aplicação de geometria,
  classes de foco) vive fora do orquestrador. `engine.ts` = câmera, drag,
  pipeline parse→apply, editor.
- 2026-09-03: Contrato de refs da cena travado por teste
  (`scene-refs.test.tsx`): sufixos `:a/:b/:ba/:bb` em `data-edge` —
  sem eles pés de galinha/selos congelam durante o drag (bug corrigido).
- 2026-09-03: Verificação runtime headless (Chromium): 7 tipos renderizam.
  Nota: `document.fonts.ready` em headless exige abortar fetch externo.

## Blockers / riscos

- `engine.ts` usa `any` em refs DOM/estado — apertar gradualmente.
- Guard `engineMounted` assume full-reload do Vite p/ HMR do engine (padrão).

## Todos / ideias

- Extrair snippets (slash commands) como módulo puro.
- Tipar EngineModel/byId (remover `any` gradualmente).
- Teste de integração do pipeline applySource → SceneBridge (jsdom).

## Preferências

- Usuário prefere fluxo spec-driven (.specs/) com commits atômicos e testes
  via Vitest (não scripts CDP ad-hoc).
