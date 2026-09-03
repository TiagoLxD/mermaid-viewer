# STATE — Meridian

## Decisões

- 2026-09-03: Motor 100% TypeScript (`src/engine/engine.ts`), strict mode limpo.
- 2026-09-03: **Estratégia de render em duas camadas** (após regressão de perf):
  - React render **só na mudança estrutural** (applySource: código novo, tipo,
    recolher mindmap) — nós E arestas;
  - por frame (drag/pan/zoom): roteamento recalculado (edges-geom, puro) e
    aplicado via `setAttribute` direto em refs cacheadas (`edgeRefs`,
    `mmRects`) — zero reconciliação/flushSync por pointermove;
  - rect da cena cacheado por gesto (`cacheSceneRect`), invalidado no resize;
  - guard `engineMounted` evita listeners duplicados do double-effect StrictMode.
  Medição CDP: pointermove handler média 1,3ms / máx 2,4ms (antes: violações de
  35–62ms por forced reflow + rAF > 62ms).
- 2026-09-03: Verificação runtime headless (CDP): 7 tipos renderizam, drag ok.
  Nota: `document.fonts.ready` em headless só resolve com fetch externo abortado.

## Blockers / riscos

- `engine.ts` usa `any` em refs DOM e estado interno — apertar gradualmente.
- Guard `engineMounted` assume full-reload do Vite p/ HMR do engine (padrão).

## Todos / ideias

- Extrair snippets como módulo puro testável.
- Tipar EngineModel/byId (remover `any` gradualmente).
- Teste CDP de drag/perf automatizado na CI.

## Preferências

- Usuário prefere fluxo spec-driven (.specs/) com commits atômicos por tarefa.
