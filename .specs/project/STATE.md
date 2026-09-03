# STATE — Meridian

## Decisões

- 2026-09-03: Motor modular — parsers/highlight/formatter/examples puros em
  `src/engine/`, cobertos por Vitest (24 testes). `engine.js` permanece
  orquestrador de interação (drag/câmera/edges/minimap), importando os módulos.
- 2026-09-03: Nós do diagrama renderizados via React (`components/diagram/`),
  root montado em `#gTables` com `flushSync` (commit síncrono p/ refs do engine).
  Ícones são componentes React; nada de `innerHTML`/`createElementNS` para nós.
- 2026-09-03: Ícones alternáveis (tema/prévia) controlados por data-attr + CSS.

## Blockers / riscos

- Arestas (`07-edges.js`) ainda construídas via `createElementNS` no engine —
  próximo passo: extrair cálculo de path (puro) + componente `Edge` React.
- Verificação runtime headless cobriu o tipo ER; demais tipos validados só por
  teste unitário do parser — checar flow/seq/class/pie/mindmap/c4 no navegador.

## Todos / ideias

- Migrar `engine.js` (JS → TS) por blocos.
- Testes de integração da cena (jsdom + mountEngine) p/ tipos não-ER.
- `store`, toasts e undo como módulos puros testáveis.

## Preferências

- Usuário prefere fluxo spec-driven (.specs/) com commits atômicos por tarefa.
