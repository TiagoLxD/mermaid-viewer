# STATE — Meridian

## Decisões

- 2026-09-03: Motor 100% TypeScript, strict limpo. Render em duas camadas
  (React estrutural / atributos diretos por frame). SceneBridge isola a cena.
- 2026-09-03: **UI declarativa** — engine não cria DOM de interface:
  - Toasts: store pub/sub (`toast.ts`) + `<Toasts>`;
  - Gutter/SnippetMenu/Highlight: componentes do EditorPanel alimentados por
    `state/ui-bus.ts` (CustomEvents: meridian:gutter / meridian:ac /
    meridian:highlight; aceitação volta por meridian:ac-accept);
  - Guias de alinhamento e rects do minimapa: `SceneBridge`
    (setGuides/clearGuides/drawMinimap/clearMinimap).
  DOM criado pelo engine restante: só export (style/link/canvas do PNG).
- 2026-09-03: `snippets.ts` puro; estado central tipado; integração jsdom
  (73 testes); CI (tsc + vitest + build; deploy com gate de testes).

## Blockers / riscos

- `engine.ts` ainda usa `any` em handlers locais — apertar aos poucos.
- Bus por CustomEvents em window: nominal, mas não tipado end-to-end
  (evolução: eventos tipados).

## Todos / ideias

- Testes de interação jsdom (drag via PointerEvent sintético).
- Badge de status do CI no README.
- Export de SVG/PNG pode virar módulo `export.ts` puro-ish (último bloco
  grande dentro do engine).

## Preferências

- Usuário prefere fluxo spec-driven (.specs/), commits atômicos, testes Vitest.
