# STATE — Meridian

## Decisões

- 2026-09-03: Motor 100% TypeScript, strict limpo. Render em duas camadas
  (React estrutural / atributos diretos por frame). SceneBridge isola a cena.
- 2026-09-03: `snippets.ts` puro — expansão com tabstops, adjust pós-digitação,
  contexto/filtragem de autocomplete. Engine só pinta o menu.
- 2026-09-03: Estado central tipado: `SceneModel`/`Ent`/`EdgeGeom` — sem `any`
  em model/byId/positions/edgeGeoms.
- 2026-09-03: **Teste de integração jsdom** (`pipeline.integration.test.ts`):
  fixture DOM + mountEngine + troca de código pelo debounce real (600ms).
  Stub Requirements: ResizeObserver, document.fonts. Comportamento legado
  travado: código com erro preserva a cena anterior.
- Contrato de refs da cena travado por teste (sufixos :a/:b/:ba/:bb em data-edge).

## Blockers / riscos

- `engine.ts` ainda usa `any` em refs DOM locais ($, handlers) — apertar aos
  poucos (baixo valor imediato).

## Todos / ideias

- CI (GitHub Actions) rodando vitest + build.
- Testes de interação jsdom (drag via PointerEvent sintético).

## Preferências

- Usuário prefere fluxo spec-driven (.specs/), commits atômicos, testes Vitest.
