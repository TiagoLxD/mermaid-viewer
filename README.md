# Meridian — editor de diagramas Mermaid

Editor visual de diagramas **Mermaid** que roda 100% no navegador: **Flowchart, Diagrama ER, Sequência e Classes**.

🔗 **Demo:** https://tiagolxd.github.io/mermaid-viewer/

## Funcionalidades

- ✍️ **Editor com autocomplete e snippets** — comece a digitar e receba sugestões de sintaxe para os 4 tipos de diagrama suportados; destaque de sintaxe e numeração de linhas no gutter.
- 🖼️ **Canvas com layout automático** — o motor de layout organiza o diagrama com algoritmos de forças, camadas e modo compacto, sem você precisar posicionar nada.
- 🔀 **Parser multi-tipo** — detecta e renderiza Flowchart, ER, Sequência e Classes a partir da mesma caixa de texto.
- 🧭 **Minimapa e zoom/pan** — navegue por diagramas grandes com minimapa, zoom e arraste do canvas.
- ↩️ **Undo/redo** — histórico completo de edições.
- 📤 **Exportação** — baixe o diagrama como **SVG**, **PNG** ou o código-fonte **`.mmd`**.
- 🔗 **Compartilhamento por URL** — o diagrama é codificado no link; quem abrir vê exatamente o mesmo desenho.
- 👥 **Colaboração ao vivo** — edite com outras pessoas em tempo real (BroadcastChannel entre abas; opcionalmente Supabase Realtime ou WebSocket próprio). Salas efêmeras identificadas por `?room=<id>` — nada é persistido em servidor.
- 🔒 **Privacidade por padrão** — nenhum dado sai do navegador; tudo roda client-side (localStorage + sala local).

## Como usar

1. Abra a [demo](https://tiagolxd.github.io/mermaid-viewer/) (ou rode localmente, abaixo).
2. Escreva o Mermaid no editor à esquerda — ex.:

```mermaid
flowchart TD
    A[Início] --> B{Decisão}
    B -- sim --> C[Ok]
    B -- não --> D[Fim]
```

3. O canvas à direita renderiza em tempo real; ajuste o layout (forças/camadas/compacto), exporte ou copie o link de compartilhamento.

## Rodar localmente

```bash
npm install
npm run dev
```

Build de produção: `npm run build` (gera `dist/`).

## Colaboração entre máquinas (opcional)

| Transporte | Quando usar | Config |
|---|---|---|
| `broadcast` (padrão) | abas do mesmo navegador | nada — funciona sem config |
| Supabase Realtime | equipe distribuída, sem servidor próprio | `VITE_SUPABASE_URL` + `VITE_SUPABASE_KEY` (anon key) |
| Cloudflare Worker | equipe distribuída, servidor próprio grátis | `VITE_COLLAB_WS=https://meridian-collab.<conta>.workers.dev` |

Variáveis opcionais em `.env.local`:

```
VITE_COLLAB_WS=            # URL do Worker (prioridade)
VITE_SUPABASE_URL=         # ou Supabase
VITE_SUPABASE_KEY=         # anon key (publishable — segura no front)
```

Salas morrem quando esvaziam — nada é persistido no servidor. Máx. 12 pessoas por sala.

## Arquitetura

**React é só a casca** (renderiza o mesmo DOM com os mesmos IDs) e o **motor legado roda intacto** — zero reescrita de mecânica, zero regressão.

```
src/
├── App.jsx                  ← monta o EngineHost
├── components/
│   └── EngineHost.jsx       markup do app
└── engine/
    └── engine.js            toda a mecânica: parser multi-tipo, layout,
                              guias, minimapa, snippets, autocomplete,
                              undo, gutter, resize, colaboração...
```

O transporte de colaboração é uma interface — trocar BroadcastChannel por WebSocket/Supabase não muda componentes.

## Segurança

- Nenhum dado sai do navegador por padrão (localStorage + sala local)
- Anon keys do Supabase são publishable por design; sem secrets no front
- Worker (opcional): sem persistência, rooms por UUID imprevisível, limite de conexões, payload saneado (≤128KB)

## Roadmap

- [ ] **Mais tipos de diagrama** — Gantt, State, Pie, Git graph, Mindmap
- [ ] **Templates e galeria** — diagramas de exemplo prontos por categoria
- [ ] **Temas visuais** — claro/escuro e paletas customizáveis para o canvas
- [ ] **Salvamento local de múltiplos diagramas** — biblioteca de projetos no navegador
- [ ] **Importação** — abrir arquivos `.mmd`/`.svg` por drag & drop
- [ ] **Exportação PDF** e copiar imagem para a área de transferência
- [ ] **Editor de propriedades visual** — editar nós/arestas clicando no canvas (sem digitar Mermaid)
- [ ] **Modo apresentação** — navegar pelo diagrama passo a passo
- [ ] **PWA offline** — instalar como app e usar sem conexão
- [ ] **Refatorar o motor legado em módulos testáveis** — separar `src/engine/engine.js` em unidades puras cobertas por Vitest
- [ ] **Versionamento de diagramas** — histórico de snapshots com diff visual

## Deploy (GitHub Pages)

O workflow `.github/workflows/deploy.yml` builda e publica automaticamente a cada push em `main` (requer **Settings → Pages → Source: GitHub Actions** no repositório).

## Licença

MIT
