# STATE — Meridian

## Decisões

- 2026-09-03: Motor 100% TypeScript, strict limpo. Render em duas camadas
  (React estrutural / atributos diretos por frame). SceneBridge isola a cena.
- 2026-09-03: `snippets.ts` puro; estado central tipado (SceneModel/Ent/EdgeGeom).
- 2026-09-03: Teste de integração jsdom (pipeline applySource → cena, 73 testes).
- 2026-09-03: **CI** (`.github/workflows/ci.yml`): push/PR → tsc + vitest + build
  (node 20, cache npm). Deploy do Pages roda os testes como gate antes do build.
- Contrato de refs da cena travado por teste (sufixos :a/:b/:ba/:bb em data-edge).

## Blockers / riscos

- `engine.ts` ainda usa `any` em refs DOM locais ($, handlers) — apertar aos
  poucos (baixo valor imediato).

## Todos / ideias

- Testes de interação jsdom (drag via PointerEvent sintético).
- Badge de status do CI no README.

## Preferências

- Usuário prefere fluxo spec-driven (.specs/), commits atômicos, testes Vitest.
