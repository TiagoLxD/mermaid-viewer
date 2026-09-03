# Feature: UI declarativa — engine sem criação de DOM

## Requisitos

- **R1 · Toasts em React**: store puro (`toast.ts` ganha subscribe/push) +
  componente `<Toasts>` no EngineHost; engine só publica `toast(msg, type)`.
- **R2 · Gutter no EditorPanel**: componente `<Gutter>` (numeração + offset de
  scroll); engine publica estado via evento `meridian:gutter` e não cria spans.
- **R3 · Menu de snippets/autocomplete em React**: `<SnippetMenu>` recebe
  `{open, items, sel, x, y}` via evento `meridian:ac`; aceitar item devolve
  `meridian:ac-accept`; engine não cria divs do menu.
- **R4 · Highlight em React**: `<Highlight>` no EditorPanel recebe o HTML via
  evento `meridian:highlight`; engine não escreve `hlcode.innerHTML` diretamente.
- **R5 · Guias e minimapa na bridge**: `drawGuides` e os rects do minimapa
  movidos para `SceneBridge` (DOM da cena é responsabilidade da ponte);
  engine passa dados, não constrói elementos.

## Fora de escopo

- Export (canvas/download), `<style>` do export, caretXY (medição).

## Verificação

- `grep` sem `document.createElement`/`append` de UI no engine (sobra: export);
- Vitest: testes do store de toast e do bus de eventos; 73+ testes verdes;
- `tsc` ✓ · build ✓ · smoke headless ✓
