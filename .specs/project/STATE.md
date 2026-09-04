# STATE — Meridian

## Decisões

- 2026-09-03: Motor 100% TypeScript, strict limpo. Render em duas camadas
  (React estrutural / atributos diretos por frame). SceneBridge isola a cena.
- 2026-09-03: **UI 100% declarativa** — Toasts, Gutter, SnippetMenu, Highlight,
  ExportMenu são componentes React; engine publica estado por bus
  (state/ui-bus.ts: meridian:gutter/ac/highlight/export/transp + ac-accept).
  Guias e minimapa na SceneBridge. DOM criado pelo engine: só export de arquivo
  (style/link/canvas/download) e medição de caret.
- 2026-09-03: `export.ts`: buildExportSVG (clone+limpeza+tema+fontes embutidas),
  getFontCSS cacheado, downloadBlob. `measure.ts`: whenFontsReady (motivo:
  medição de texto do canvas precisa das métricas finais antes do 1º layout).
- 2026-09-03: Estado central tipado (SceneModel/Ent/EdgeGeom); snippets puros;
  integração jsdom (73 testes); CI (tsc+vitest+build; deploy com gate).

## Blockers / riscos

- `engine.ts` ainda usa `any` em handlers locais — apertar aos poucos.
- Bus por CustomEvents em window: não tipado end-to-end.

## Todos / ideias

- Testes de interação jsdom (drag via PointerEvent sintético).
- Badge de status do CI no README.
- Dividir engine.ts por concerns (camera.ts, drag.ts, editor-events.ts) —
  hoje coeso via closures de estado compartilhado; exigiria rearranjo de estado.

## Preferências

- Usuário prefere fluxo spec-driven (.specs/), commits atômicos, testes Vitest.
