# Meridian (React) — editor de diagramas Mermaid

Reescrita em **React + Vite** do Meridian. ER, Flowchart, Sequência e Classes — editor com autocomplete/snippets, canvas com layout automático (forças/camadas/compacta), exportação SVG/PNG/.mmd, compartilhamento por URL e colaboração ao vivo.

## Rodar localmente

```bash
cd web
npm install
npm run dev
```

## Deploy GitHub Pages

1. Suba o repositório para o GitHub
2. **Settings → Pages → Source: GitHub Actions**
3. O workflow `.github/workflows/deploy.yml` builda e publica automaticamente a cada push em `main`
4. URL: `https://<seu-user>.github.io/<repo>/`

## Colaboração entre máquinas

Três transportes, o mais simples primeiro:

| Transporte | Quando usar | Config |
|---|---|---|
| `broadcast` (padrão) | abas do mesmo navegador | nada — funciona sem config |
| Supabase Realtime | equipe distribuída, sem servidor próprio | `VITE_SUPABASE_URL` + `VITE_SUPABASE_KEY` (anon key) |
| Cloudflare Worker | equipe distribuída, servidor próprio grátis | `VITE_COLLAB_WS=https://meridian-collab.<conta>.workers.dev` |

Para o **Worker** (pasta `server/`):
```bash
cd server
npx wrangler deploy
```
Salas são identificadas por UUID aleatório (compartilhado junto do link) — nada é persistido no servidor; tudo morre quando a sala esvazia. Máx. 12 pessoas por sala.

Para **Supabase**: crie um projeto grátis, ative o Realtime e use a anon key (RLS negado por padrão — broadcast efêmero não precisa de tabelas).

Sala atual aparece como `?room=<id>` na URL.

## Arquitetura

Migração pragmática: **React é só a casca** (renderiza o mesmo DOM com os mesmos IDs) e o **motor legado roda intacto** — zero reescrita de mecânica, zero regressão.

```
web/src/
├── App.jsx                  ← monta o EngineHost
├── components/
│   └── EngineHost.jsx       markup do app com os mesmos IDs do monólito
└── engine/
    └── engine.js            concatenação fiel de js/00..22 (toda a mecânica:
                              parser multi-tipo, layout, guias, minimapa, snippets,
                              autocomplete, undo, gutter, resize, colabs...)
```

**Como funciona**: `mountEngine()` é chamado após o mount; o motor se liga por `getElementById` exatamente como sempre fez. Para evoluir um módulo, edite diretamente a seção correspondente dentro de `src/engine/engine.js` (cada bloco é marcado com `/* ══════════ NN-nome ══════════ */`).

**Princípio**: engines são funções puras (fáceis de testar com Node/Vitest); React só guarda estado de UI e renderiza. O transporte de colaboração é uma interface — trocar BroadcastChannel por WebSocket/Supabase não muda componentes.

## Variáveis de ambiente (opcional)

Crie `web/.env.local`:
```
VITE_COLLAB_WS=            # URL do Worker (prioridade)
VITE_SUPABASE_URL=         # ou Supabase
VITE_SUPABASE_KEY=         # anon key (publishable — segura no front)
```

## Segurança

- Nenhum dado sai do navegador por padrão (localStorage + sala local)
- Anon keys do Supabase são publishable por design; sem secrets no front
- Worker: sem persistência, sem execução de conteúdo, rooms por UUID imprevisível, limite de conexões, payload saneado (≤128KB)
