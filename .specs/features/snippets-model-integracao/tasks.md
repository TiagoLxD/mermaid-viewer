# Tasks — snippets/model/integração

- **T1** `snippets.ts`: SNIPPETS/TYPES/KEYS/CONNS + parseSnippetBody/expandAt/
  adjustStops/computeAcContext/acOptions/isInsideEntityBlock + testes
- **T2** engine.ts usa o módulo; DOM (menu/caret) permanece no engine
- **T3** `model`/`byId` tipados (ParseResult/Ent) — sem `any` de estado
- **T4** integração jsdom: fixture DOM + mountEngine + pipeline com troca de código

Rastreabilidade: R1↔T1/T2 · R2↔T3 · R3↔T4
