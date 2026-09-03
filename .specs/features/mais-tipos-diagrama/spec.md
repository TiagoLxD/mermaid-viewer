# Feature: Mais tipos de diagrama (Pie, Mindmap, C4)

## Requisitos

- **R1 · Pie** (`pieDiagram`): linhas `"Rótulo" : valor`; título opcional com `title …`; fatias em arco SVG real com % dentro; tooltip com valor; paleta de 8 cores com variantes light/dark; sempre re-layouta (geometria circular).
- **R2 · Mindmap** (`mindmap`): hierarquia por indentação (2 espaços/nível); formas `[retângulo]`, `(arredondado)`, `((raiz))`, `{{losango}}` com id opcional antes (`root((Tema))`); nós ligados por linha simples; layout em camadas/força existentes.
- **R3 · C4** (`C4Context/Container/Component/Dynamic`): `Person/System/SystemDb/SystemQueue/Container/Component` com sufixo `_Ext` (borda tracejada); `Container/Component` com 4 args (tech + descrição); `Rel(a, b, "desc", "tech")` com seta e rótulo; nó mostra título, descrição e tag de estereótipo com barra colorida por tipo.
- **R4 · Integração**: seletor "Tipo…", exemplos no dropdown, abas da documentação, destaque de palavra-chave no editor e estatísticas da barra de status.

## Implementação

Tudo em `src/engine/engine.js` (parsers, measure, layout do pie, render) + `public/css/style.css` (paleta) + `src/components/EngineHost.jsx` (seletores/docs).

## Verificação

- `vite build` ✓
- Parsers testados via node (extração das funções puras): pie, mindmap (com id+forma), C4 (person/db/container/ext/rel) ✓
