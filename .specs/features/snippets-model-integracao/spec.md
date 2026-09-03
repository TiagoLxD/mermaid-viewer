# Feature: Snippets puros + modelo tipado + integração pipeline

## Requisitos

- **R1 · Snippets/autocomplete puros**: dados (SNIPPETS, TYPES, KEYS, CONNS) e
  lógica (expansão `${n:default}` com tabstops, ajuste de tabstops pós-digitação,
  contexto de autocomplete, filtragem de opções) extraídos para
  `src/engine/snippets.ts` — sem DOM. Engine só renderiza menu/caret.
- **R2 · Modelo tipado**: `model`/`byId` deixam de ser `any` no engine
  (`ParseResult` + entidades de cena `Ent`); strict continua limpo.
- **R3 · Integração jsdom**: teste que monta o engine com fixture DOM,
  aplica código e verifica pipeline parse→layout→cena (tabelas/arestas na DOM),
  incluindo troca de código via evento `input`.

## Fora de escopo

- Migração de câmera/drag para classes; export/download.

## Verificação

- Vitest: novos testes de snippets (expansão, tabstops, adjust, ac) e de
  integração ✓ · `tsc --noEmit` ✓ · build ✓ · smoke headless 7 tipos ✓
