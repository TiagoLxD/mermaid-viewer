// Motor Meridian — toda a mecânica do app (parser, layout, editor, export).
// Organizado em blocos marcados com /* ══════════ NN-nome ══════════ */ — edite aqui mesmo.

export function mountEngine() {
    /* ══════════ 00-core.js ══════════ */
    /* ══════════ refs & helpers ══════════ */
    const $ = id => document.getElementById(id);
    const NS = 'http://www.w3.org/2000/svg';
    const canvas = $('canvas'), scene = $('scene'), gEdges = $('gEdges'), gTables = $('gTables'),
        gTop = $('gTop'), gGuides = $('gGuides'), src = $('src'), hlcode = $('hlcode'), hl = $('hl'),
        panel = $('panel'), statsEl = $('stats'), zoomLbl = $('zoomLbl'),
        parseDot = $('parseDot'), parseText = $('parseText'), parseFoot = $('parseFoot'),
        mm = $('minimap'), mmContent = $('mmContent'), mmView = $('mmView'),
        exportMenu = $('exportMenu'),
        docs = $('docs'), docsBackdrop = $('docsBackdrop');

    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    function svgEl(tag, attrs = {}) { const el = document.createElementNS(NS, tag); for (const k in attrs) el.setAttribute(k, attrs[k]); return el; }
    const store = {
        get(k) { try { return localStorage.getItem('meridian:' + k) } catch (e) { return null } },
        set(k, v) { try { localStorage.setItem('meridian:' + k, v) } catch (e) { } }
    };
    /* aplica o tema salvo imediatamente — evita flash de tema errado no load */
    try {
        const t0 = localStorage.getItem('meridian:theme');
        if (t0) document.documentElement.dataset.theme = t0;
    } catch (e) { }
    const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();


    /* ══════════ 01-icons.js ══════════ */
    /* ══════════ ícones (traço 24×24) ══════════ */
    const ICONS = {
        copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
        users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
        users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
        download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
        chevD: '<path d="m6 9 6 6 6-6"/>',
        sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
        moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
        panel: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
        wand: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
        minus: '<path d="M5 12h14"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
        fit: '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>',
        book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
        help: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
        x: '<path d="M18 6 6 18M6 6l12 12"/>'
    };
    function icon(n, s = 16) { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[n]}</svg>` }
    document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon, el.dataset.size || 16) });


    /* ══════════ 02-data.js ══════════ */
    /* ══════════ exemplos ══════════ */
    const EXAMPLES = [
        {
            name: 'E-commerce', code:
                `erDiagram
        USUARIO ||--o{ PEDIDO : realiza
        USUARIO ||--o{ CARRINHO : possui
        PEDIDO ||--|{ ITEM_PEDIDO : contem
        PRODUTO ||--o{ ITEM_PEDIDO : e_comprado
        PRODUTO ||--o{ CARRINHO_ITEM : esta_em
        CARRINHO ||--o{ CARRINHO_ITEM : contem
        PEDIDO ||--|| ENDERECO : entrega_em
        USUARIO ||--o{ ENDERECO : tem
        USUARIO ||..o{ AVALIACAO : faz
        PRODUTO ||..o{ AVALIACAO : recebe
        CATEGORIA ||--o{ PRODUTO : organiza
        PRODUTO ||--o{ IMAGEM : possui
        PEDIDO ||--|| STATUS_PEDIDO : tem

        USUARIO {
    int id PK
    string email UK
    string senha
    string nome
    string telefone
    datetime data_criacao
        }
        PEDIDO {
    int id PK
    int usuario_id FK
    int endereco_id FK
    decimal total
    datetime criado_em
        }
        ITEM_PEDIDO {
    int id PK
    int pedido_id FK
    int produto_id FK
    int quantidade
    decimal preco_unitario
        }
        PRODUTO {
    int id PK
    int categoria_id FK
    string nome
    string slug UK
    decimal preco
    int estoque
        }
        CATEGORIA {
    int id PK
    string nome UK
    int categoria_pai_id FK
        }
        CARRINHO {
    int id PK
    int usuario_id FK
    datetime atualizado_em
        }
        CARRINHO_ITEM {
    int id PK
    int carrinho_id FK
    int produto_id FK
    int quantidade
        }
        ENDERECO {
    int id PK
    int usuario_id FK
    string logradouro
    string cidade
    string uf
    string cep
        }
        STATUS_PEDIDO {
    int id PK
    string nome UK
        }
        AVALIACAO {
    int id PK
    int usuario_id FK
    int produto_id FK
    int nota
    text comentario
        }
        IMAGEM {
    int id PK
    int produto_id FK
    string url
    string alt
        }`},
        {
            name: 'Fluxo de pedido', code:
                `flowchart TD
        P[Pedido criado] --> E{Estoque disponível?}
        E -->|sim| PG[Processar pagamento]
        E -->|não| CA[Carrinho aguardando]
        PG --> F[Pedido faturado] --> ENV[Envio preparado]
        PG -.->|falha| CA
        CA --> E`
        },
        {
            name: 'Autenticação (seq.)', code:
                `sequenceDiagram
        participant U as Usuário
        participant A as API
        participant D as Banco de Dados
        U ->> A: login(email, senha)
        A ->> D: buscar usuário
        D -->> A: registro + hash
        A ->> A: verificar senha
        A -->> U: token JWT`
        },
        {
            name: 'Veículos (classes)', code:
                `classDiagram
        Veiculo <|-- Carro
        Veiculo <|-- Moto
        Veiculo *-- Motor
        Motor --|> Peca
        class Veiculo {
    +String placa
    +ligar()
    +mover()
        }
        class Carro {
    +int portas
    +abrirPortaMalas()
        }
        class Moto {
    +empinar()
        }
        class Motor {
    +int cilindradas
        }
        class Peca {
    +String codigo
        }`}
    ];


    /* ══════════ 03-parser.js ══════════ */
    /* ══════════ parser da sintaxe erDiagram ══════════ */
    const REL_RE = /^([A-Za-z_][\w.\-]*)\s+(\|o|\|\||\}o|\}\|)\s*(--|\.\.|==)\s*(o\||\|\||o\{|\|\{)\s+([A-Za-z_][\w.\-]*)\s*:\s*(.+)$/;
    const OPEN_RE = /^([A-Za-z_][\w.\-]*)\s*\{$/;
    const CLOSE_RE = /^\}+\s*$/;
    const ATTR_RE = /^([\w().<>[\],\-]+)\s+([A-Za-z_]\w*)(?:\s+(.*))?$/;
    const SOLO_RE = /^[A-Za-z_][\w.\-]*$/;
    const CARDMAP = { '|o': 'zero_one', '||': 'one', '}o': 'zero_more', '}|': 'one_more', 'o|': 'zero_one', 'o{': 'zero_more', '|{': 'one_more' };

    function parseAttr(line) {
        const m = line.match(ATTR_RE); if (!m) return null;
        let rest = (m[3] || '').trim(); const keys = [];
        for (const k of ['PK', 'FK', 'UK']) {
            const re = new RegExp('(?:^|\\s)' + k + '(?:\\s|$)');
            if (re.test(rest)) { keys.push(k); rest = rest.replace(re, ' '); }
        }
        let comment = '';
        const cm = rest.match(/"([^"]*)"/);
        if (cm) { comment = cm[1]; rest = rest.replace(cm[0], ' '); }
        rest = rest.trim();
        if (rest) return null;
        return { type: m[1], name: m[2], keys, comment };
    }

    function detectType(text) {
        const m = text.match(/^\s*(erDiagram|flowchart|graph|sequenceDiagram|classDiagram|stateDiagram-v2|stateDiagram)\b/m);
        return { erDiagram: 'er', flowchart: 'flow', graph: 'flow', sequenceDiagram: 'seq', classDiagram: 'class', stateDiagram: 'flow', 'stateDiagram-v2': 'flow' }[m?.[1]] || 'er';
    }

    /* ── parser flowchart ── */
    function parseFlow(text) {
        const ents = new Map(), relations = [], errors = [];
        const ensure = (id, label, shape) => {
            if (!ents.has(id)) ents.set(id, { name: id, attrs: [], label: label || id, shape: shape || 'rect' });
            else { const e = ents.get(id); if (label) e.label = label; if (shape && shape !== 'rect') e.shape = shape; }
            return ents.get(id);
        };
        function addNode(seg) {
            seg = seg.trim(); if (!seg) return null;
            const m = seg.match(/^([A-Za-z_][\w\-.]*)\s*(\(\(|[\(\[\{])([^\)\}\]]*)[\)\}\]]+$/) || seg.match(/^([A-Za-z_][\w\-.]*)$/);
            if (!m) return null;
            const shapeRaw = m[2] || '';
            const shape = shapeRaw.startsWith('(') ? 'stadium' : shapeRaw.startsWith('{') ? 'diamond' : 'rect';
            ensure(m[1], (m[3] || '').trim(), shape);
            return m[1];
        }
        const OP = /(?:-->|-\.->|==>)\s*\|([^|]*)\||--\s+([^->]+?)\s+-->|-\.->|==>|-->|---/;
        for (const raw of text.split('\n')) {
            const line = raw.trim();
            if (!line || line.startsWith('%%') || /^(flowchart|graph|subgraph|end|classDef)\b/i.test(line)) continue;
            let prevId = null, rest = line, pending = null, guard = 0;
            while (rest && guard++ < 40) {
                const m = rest.match(OP);
                if (!m) {
                    const id = addNode(rest);
                    if (prevId && id && id !== prevId)
                        relations.push({ a: prevId, b: id, label: pending?.label || '', dash: !!pending?.dash, simple: true, aMk: 'none', bMk: pending?.arrow ? 'arrow' : 'none' });
                    break;
                }
                const left = rest.slice(0, m.index);
                rest = rest.slice(m.index + m[0].length);
                const id = addNode(left);
                if (prevId && id && id !== prevId)
                    relations.push({ a: prevId, b: id, label: pending?.label || '', dash: !!pending?.dash, simple: true, aMk: 'none', bMk: pending?.arrow ? 'arrow' : 'none' });
                if (id) prevId = id;
                const core = m[0].replace(/\|[^|]*\|/, '');
                pending = { arrow: core.includes('>'), dash: core.includes('.'), label: (m[1] ?? m[2] ?? '').trim() };
            }
        }
        return { type: 'flow', entities: [...ents.values()], relations, errors };
    }

    /* ── parser diagrama de sequência ── */
    function parseSeq(text) {
        const ents = new Map(), relations = [], errors = [];
        const ensure = (name, label) => {
            if (!ents.has(name)) ents.set(name, { name, attrs: [], seq: true, label: label || name });
            else if (label) ents.get(name).label = label;
            return ents.get(name);
        };
        let idx = 0;
        text.split('\n').forEach((raw, i) => {
            const line = raw.trim();
            if (!line || line.startsWith('%%') || /^sequenceDiagram\b/i.test(line)) return;
            let m = line.match(/^(?:participant|actor)\s+([\w\-.]+)(?:\s+as\s+(.+))?$/i);
            if (m) { ensure(m[1], (m[2] || '').trim() || m[1]); return; }
            m = line.match(/^([\w\-.]+)\s*(-?>|-->>|->>|-x|--x|->)\s*([\w\-.]+)\s*:\s*(.*)$/);
            if (m) {
                ensure(m[1]); ensure(m[3]);
                relations.push({ a: m[1], b: m[3], label: m[4].trim(), dash: m[2].startsWith('--'), simple: true, seq: true, idx: idx++, aMk: 'none', bMk: 'arrow' });
                return;
            }
            if (/^(note|autonumber|activate|deactivate|loop|alt|else|end|opt|par|and|rect|box)\b/i.test(line)) return;
            errors.push({ line: i + 1, msg: 'não entendi esta linha' });
        });
        return { type: 'seq', entities: [...ents.values()], relations, errors };
    }

    /* ── parser diagrama de classes ── */
    function parseClass(text) {
        const ents = new Map(), relations = [], errors = [];
        const ensure = n => { if (!ents.has(n)) ents.set(n, { name: n, attrs: [] }); return ents.get(n); };
        let cur = null;
        text.split('\n').forEach(raw => {
            const line = raw.trim();
            if (!line || line.startsWith('%%') || /^classDiagram\b/i.test(line)) return;
            if (/^\}+\s*$/.test(line)) { cur = null; return; }
            let m = line.match(/^([\w~.\-]+)\s*\{$/);
            if (m) { cur = ensure(m[1]); return; }
            if (cur) { cur.attrs.push({ type: '', name: line, keys: [], comment: '' }); return; }
            m = line.match(/^class\s+([\w~.\-]+)\s*\{$/);
            if (m) { cur = ensure(m[1]); return; }
            m = line.match(/^class\s+([\w~.\-]+)/);
            if (m) { ensure(m[1]); return; }
            m = line.match(/^([\w~.\-]+)\s*(<\|--|--\|>|--\*|--o|\*--|o--|\.\.\|>|-->|\.\.|---)\s*([\w~.\-]+)(?:\s*:\s*(.*))?$/);
            if (m) {
                const map = {
                    '<|--': { aMk: 'tri', bMk: 'none', dash: false }, '--|>': { aMk: 'none', bMk: 'tri', dash: false },
                    '--*': { aMk: 'diamond', bMk: 'none', dash: false }, '*--': { aMk: 'none', bMk: 'diamond', dash: false },
                    '--o': { aMk: 'odiamond', bMk: 'none', dash: false }, 'o--': { aMk: 'none', bMk: 'odiamond', dash: false },
                    '..|>': { aMk: 'none', bMk: 'tri', dash: true }, '-->': { aMk: 'none', bMk: 'arrow', dash: false },
                    '..': { aMk: 'none', bMk: 'none', dash: true }, '---': { aMk: 'none', bMk: 'none', dash: false }
                }[m[2]] || { aMk: 'none', bMk: 'none', dash: false };
                ensure(m[1]); ensure(m[3]);
                relations.push({ a: m[1], b: m[3], label: (m[4] || '').trim(), dash: map.dash, simple: true, aMk: map.aMk, bMk: map.bMk });
            }
        });
        return { type: 'class', entities: [...ents.values()], relations, errors };
    }

    function parseMermaid(text) {
        const t = detectType(text);
        if (t === 'flow') return parseFlow(text);
        if (t === 'seq') return parseSeq(text);
        if (t === 'class') return parseClass(text);
        const ents = new Map(), relations = [], errors = [];
        const ensure = n => { if (!ents.has(n)) ents.set(n, { name: n, attrs: [] }); return ents.get(n); };
        const lines = text.split('\n');
        let inBlock = false, cur = null;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].replace(/;\s*$/, '').trim();
            if (!line || line.startsWith('%%')) continue;
            if (!inBlock) {
                if (/^erDiagram\b/.test(line)) continue;
                const r = line.match(REL_RE);
                if (r) {
                    ensure(r[1]); ensure(r[5]);
                    relations.push({
                        a: r[1], b: r[5], lc: r[2], conn: r[3], rc: r[4], label: r[6].replace(/^"|"$/g, '').trim(),
                        ac: CARDMAP[r[2]], bc: CARDMAP[r[4]], dash: r[3] === '..'
                    });
                    continue;
                }
                const o = line.match(OPEN_RE);
                if (o) { inBlock = true; cur = ensure(o[1]); continue; }
                if (CLOSE_RE.test(line)) continue;
                if (SOLO_RE.test(line)) { ensure(line); continue; }
                errors.push({ line: i + 1, msg: 'não entendi esta linha' });
            } else {
                if (CLOSE_RE.test(line)) { inBlock = false; cur = null; continue; }
                const at = parseAttr(line);
                if (at) { cur.attrs.push(at); }
                else errors.push({ line: i + 1, msg: 'atributo inválido' });
            }
        }
        if (inBlock) errors.push({ line: lines.length, msg: 'bloco de entidade não fechado' });
        return { type: 'er', entities: [...ents.values()], relations, errors };
    }


    /* ══════════ 04-measure.js ══════════ */
    /* ══════════ medidas das tabelas ══════════ */
    const mctx = document.createElement('canvas').getContext('2d');
    const F = {
        name: '500 12px "JetBrains Mono", ui-monospace, monospace',
        type: '400 11px "JetBrains Mono", ui-monospace, monospace',
        key: '700 8.5px "JetBrains Mono", ui-monospace, monospace',
        title: '600 12px "Space Grotesk", sans-serif',
        count: '600 9px "JetBrains Mono", ui-monospace, monospace',
        label: '500 10px "JetBrains Mono", ui-monospace, monospace',
        card: '600 9.5px "JetBrains Mono", ui-monospace, monospace',
        comment: 'italic 400 11px "JetBrains Mono", ui-monospace, monospace'
    };
    function tw(t, font) { mctx.font = font; return mctx.measureText(t).width; }

    function measureEntity(e) {
        if (model.type === 'flow') {
            const lbl = e.label ?? e.name;
            e.w = Math.max(90, Math.round(tw(lbl, F.name) + (e.shape === 'diamond' ? 90 : 44)));
            e.h = e.shape === 'diamond' ? 84 : 46;
            return;
        }
        if (model.type === 'seq' || e.seq) {
            e.w = Math.max(110, Math.round(tw(e.label ?? e.name, F.title) + 34));
            e.h = 44;
            return;
        }
        let w = 170;
        const cwCm = Math.max(0, ...e.attrs.map(a => a.comment ? tw(a.comment, F.comment) + 12 : 0));
        e.commentW = Math.round(cwCm);
        for (const a of e.attrs) {
            const bw = a.keys.reduce((s, k) => s + tw(k, F.key) + 12 + 5, 0);
            w = Math.max(w, 14 + tw(a.name, F.name) + (a.keys.length ? 7 + bw : 0) + 12 + tw(a.type, F.type) + 14 + e.commentW);
        }
        const cw = tw(String(e.attrs.length), F.count) + 12;
        w = Math.max(w, 14 + tw(e.name.toUpperCase(), F.title) * 1.14 + 10 + cw + 14 + (e.commentW || 0));
        e.w = Math.round(w);
        e.h = e.attrs.length ? 40 + e.attrs.length * 26 + 6 : 40 + 26 + 8;
    }

    /* ══════════ layout por simulação de forças ══════════ */


    /* ══════════ 05-layout.js ══════════ */
    /* ══════ layout: espaçamento garantido — usado por todos os modos ══════ */
    const GAP_X = 78, GAP_Y = 66;

    function resolveOverlaps(nodes, iters, gx = GAP_X, gy = GAP_Y) {
        for (let it = 0; it < iters; it++) {
            let any = false;
            for (let i = 0; i < nodes.length; i++)for (let j = i + 1; j < nodes.length; j++) {
                const a = nodes[i], b = nodes[j];
                const dx = (a.x + a.w / 2) - (b.x + b.w / 2), dy = (a.y + a.h / 2) - (b.y + b.h / 2);
                const px = (a.w + b.w) / 2 + gx - Math.abs(dx), py = (a.h + b.h) / 2 + gy - Math.abs(dy);
                if (px > 0 && py > 0) {
                    any = true;
                    if (px / (a.w + b.w) < py / (a.h + b.h)) { const s = (dx >= 0 ? 1 : -1) * px / 2; a.x += s; b.x -= s; }
                    else { const s = (dy >= 0 ? 1 : -1) * py / 2; a.y += s; b.y -= s; }
                }
            }
            if (!any) break;
        }
    }

    /* Empurra tabelas para fora do caminho reto das ligações,
       para as linhas não passarem por cima de entidades alheias */
    function edgeClearance(nodes, links, passes) {
        for (let p = 0; p < passes; p++) {
            let moved = false;
            for (const [i, j] of links) {
                const a = nodes[i], b = nodes[j];
                const ax = a.x + a.w / 2, ay = a.y + a.h / 2, bx = b.x + b.w / 2, by = b.y + b.h / 2;
                const ex = bx - ax, ey = by - ay, len2 = ex * ex + ey * ey || 1;
                for (let k = 0; k < nodes.length; k++) {
                    if (k === i || k === j) continue;
                    const c = nodes[k];
                    const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
                    const t = clamp(((cx - ax) * ex + (cy - ay) * ey) / len2, 0, 1);
                    const px = ax + ex * t, py = ay + ey * t;
                    let dx = cx - px, dy = cy - py, d = Math.hypot(dx, dy);
                    const need = Math.min(c.w, c.h) / 2 + 40;
                    if (d < need) {
                        if (d < 0.01) { const ang = (k * 2.399) % 6.283; dx = Math.cos(ang); dy = Math.sin(ang); d = 1; }
                        c.x += dx / d * (need - d); c.y += dy / d * (need - d); moved = true;
                    }
                }
            }
            if (!moved) break;
            resolveOverlaps(nodes, 60);
        }
    }

    /* modo Forças — grafo físico com repulsão ciente do tamanho */
    function forceInto(nodes, links, fromCurrent) {
        const n = nodes.length;
        if (!fromCurrent) {
            const R = Math.max(280, n * 50);
            nodes.forEach((nd, i) => { const a = i / n * Math.PI * 2 - Math.PI / 2; nd.x = Math.cos(a) * R * 1.6; nd.y = Math.sin(a) * R * 1.05; });
        }
        const desired = clamp(nodes.reduce((s, d) => s + d.w + d.h, 0) / n / 1.5, 300, 430);
        const cx0 = nodes.reduce((s, d) => s + d.x, 0) / n, cy0 = nodes.reduce((s, d) => s + d.y, 0) / n;
        const iters = 560;
        for (let it = 0; it < iters; it++) {
            const cool = 1 - it / iters, cap = 8 + 85 * cool;
            const fx = new Float64Array(n), fy = new Float64Array(n);
            for (let i = 0; i < n; i++)for (let j = i + 1; j < n; j++) {
                const a = nodes[i], b = nodes[j];
                const dx = (a.x + a.w / 2) - (b.x + b.w / 2), dy = (a.y + a.h / 2) - (b.y + b.h / 2);
                const d = Math.sqrt(dx * dx + dy * dy) + 0.01;
                const sepX = (a.w + b.w) / 2 + GAP_X, sepY = (a.h + b.h) / 2 + GAP_Y;
                const sep = Math.hypot(sepX, sepY);
                if (d < sep * 2.1) {
                    const overlap = (sepX - Math.abs(dx) > 0) && (sepY - Math.abs(dy) > 0);
                    const f = (sep * sep) / (d * d) * 90 * (overlap ? 2.4 : 1);
                    const ux = dx / d * f, uy = dy / d * f;
                    fx[i] += ux; fy[i] += uy; fx[j] -= ux; fy[j] -= uy;
                }
            }
            for (const [i, j] of links) {
                const a = nodes[i], b = nodes[j];
                const dx = (b.x + b.w / 2) - (a.x + a.w / 2), dy = (b.y + b.h / 2) - (a.y + a.h / 2);
                const d = Math.sqrt(dx * dx + dy * dy) + 0.01;
                const f = (d - desired) * 0.09, ux = dx / d * f, uy = dy / d * f;
                fx[i] += ux; fy[i] += uy; fx[j] -= ux; fy[j] -= uy;
            }
            for (let i = 0; i < n; i++) {
                fx[i] += (cx0 - nodes[i].x) * 0.02; fy[i] += (cy0 - nodes[i].y) * 0.02;
                nodes[i].x += clamp(fx[i], -cap, cap); nodes[i].y += clamp(fy[i], -cap, cap);
            }
        }
    }

    /* modo Camadas — hierarquia de cima para baixo (pais → filhas),
       colunas ordenadas por barycenter para reduzir cruzamentos */
    function layeredInto(nodes, links, n) {
        const succ = Array.from({ length: n }, () => []), pred = Array.from({ length: n }, () => []);
        for (const [i, j] of links) { succ[i].push(j); pred[j].push(i); }
        const level = new Array(n).fill(0);
        let changed = true, guard = 0;
        while (changed && guard++ <= n + 2) {
            changed = false;
            for (let i = 0; i < n; i++)for (const p of pred[i])
                if (level[p] + 1 > level[i]) { level[i] = level[p] + 1; changed = true; }
        }
        const rows = Array.from({ length: Math.max(...level) + 1 }, () => []);
        nodes.forEach((nd, i) => rows[level[i]].push(i));
        for (const row of rows) row.sort((a, b) => (nodes[a].x ?? 0) - (nodes[b].x ?? 0));
        const xIdx = new Array(n).fill(0);
        rows.forEach(row => row.forEach((i, ord) => xIdx[i] = ord));
        for (let sweep = 0; sweep < 8; sweep++) {
            const down = sweep % 2 === 0;
            for (const row of (down ? rows : [...rows].reverse())) {
                const keys = row.map(i => {
                    const nb = down ? pred[i] : succ[i];
                    return nb.length ? nb.reduce((s, x) => s + xIdx[x], 0) / nb.length : xIdx[i];
                });
                row.map((i, k) => [i, keys[k]])
                    .sort((a, b) => a[1] - b[1] || a[0] - b[0])
                    .forEach(([i], ord) => { row[ord] = i; xIdx[i] = ord; });
            }
        }
        const posX = rows.map(row => {
            let x = 0; return row.map(i => { const v = x; x += nodes[i].w + GAP_X; return v; });
        });
        for (let it = 0; it < 24; it++) {
            rows.forEach((row, r) => {
                row.forEach((i, k) => {
                    const nb = [...pred[i], ...succ[i]];
                    if (nb.length) {
                        const cx = nb.reduce((s, x) => s + posX[level[x]][xIdx[x]] + nodes[x].w / 2, 0) / nb.length;
                        posX[r][k] += (cx - nodes[i].w / 2 - posX[r][k]) * 0.5;
                    }
                });
                for (let k = 1; k < row.length; k++) {
                    const min = posX[r][k - 1] + nodes[row[k - 1]].w + GAP_X;
                    if (posX[r][k] < min) posX[r][k] = min;
                }
                for (let k = row.length - 2; k >= 0; k--) {
                    const max = posX[r][k + 1] - nodes[row[k]].w - GAP_X;
                    if (posX[r][k] > max) posX[r][k] = max;
                }
            });
        }
        let y = 0;
        rows.forEach((row, r) => {
            const h = Math.max(...row.map(i => nodes[i].h));
            row.forEach((i, k) => { nodes[i].x = posX[r][k]; nodes[i].y = y + (h - nodes[i].h) / 2; });
            y += h + GAP_Y;
        });
    }

    /* modo Compacta — grade densa; conectadas ficam vizinhas via BFS por grau */
    function compactInto(nodes, links, n) {
        const adjL = Array.from({ length: n }, () => []);
        const deg = new Array(n).fill(0);
        for (const [i, j] of links) { adjL[i].push(j); adjL[j].push(i); deg[i]++; deg[j]++; }
        const seen = new Array(n).fill(false), order = [];
        for (const s of [...Array(n).keys()].sort((a, b) => deg[b] - deg[a])) {
            if (seen[s]) continue;
            const q = [s]; seen[s] = true;
            while (q.length) {
                const i = q.shift(); order.push(i);
                for (const j of adjL[i]) if (!seen[j]) { seen[j] = true; q.push(j); }
            }
        }
        const cols = Math.ceil(Math.sqrt(n)), nrows = Math.ceil(n / cols);
        const colW = new Array(cols).fill(0), rowH = new Array(nrows).fill(0);
        order.forEach((idx, k) => {
            colW[k % cols] = Math.max(colW[k % cols], nodes[idx].w);
            rowH[Math.floor(k / cols)] = Math.max(rowH[Math.floor(k / cols)], nodes[idx].h);
        });
        const colX = []; let x = 0; for (let c = 0; c < cols; c++) { colX[c] = x; x += colW[c] + GAP_X; }
        const rowY = []; let y = 0; for (let r = 0; r < nrows; r++) { rowY[r] = y; y += rowH[r] + GAP_Y; }
        order.forEach((idx, k) => {
            const r = Math.floor(k / cols), c = k % cols;
            nodes[idx].x = colX[c] + (colW[c] - nodes[idx].w) / 2;
            nodes[idx].y = rowY[r] + (rowH[r] - nodes[idx].h) / 2;
        });
    }

    function layoutPositions(entities, relations, fromCurrent, mode = 'force') {
        const n = entities.length; if (!n) return new Map();
        /* sequência: participantes espalhados em linha, ordem de declaração */
        if (entities.some(e => e.seq)) {
            const out = new Map();
            let x = 90;
            for (const e of entities) { out.set(e.name, { x: Math.round(x), y: 40 }); x += e.w + 100; }
            return out;
        }
        const map = new Map(entities.map((e, i) => [e.name, i]));
        const nodes = entities.map(e => ({ x: e.x ?? 0, y: e.y ?? 0, w: e.w, h: e.h }));
        const links = [];
        for (const r of relations) { const i = map.get(r.a), j = map.get(r.b); if (i != null && j != null && i !== j) links.push([i, j]); }
        if (mode === 'layered') layeredInto(nodes, links, n);
        else if (mode === 'compact') compactInto(nodes, links, n);
        else forceInto(nodes, links, fromCurrent);
        resolveOverlaps(nodes, 150);
        if (mode !== 'compact') edgeClearance(nodes, links, mode === 'force' ? 6 : 3);
        let mnX = Infinity, mnY = Infinity;
        for (const nd of nodes) { mnX = Math.min(mnX, nd.x); mnY = Math.min(mnY, nd.y); }
        const out = new Map();
        entities.forEach((e, i) => out.set(e.name, {
            x: Math.round((nodes[i].x - mnX + 70) / 8) * 8,
            y: Math.round((nodes[i].y - mnY + 70) / 8) * 8
        }));
        return out;
    }


    /* ══════════ 06-tables.js ══════════ */
    /* ══════════ construção das tabelas ══════════ */
    let model = { entities: [], relations: [] }, byId = {}, adj = {}, edgeNodes = [], positions = {};
    let hoverId = null, selectedId = null, animating = false;

    function buildTableNode(ent, animate, idx) {
        const g = svgEl('g', { class: 'table' }); g.dataset.id = ent.name;
        const inner = svgEl('g', { class: 't-inner' });
        if (animate) { inner.classList.add('enter'); inner.style.animationDelay = (80 + idx * 32) + 'ms'; }
        g.append(inner); renderTableContent(ent, inner);
        g.setAttribute('transform', `translate(${ent.x} ${ent.y})`);
        g.addEventListener('pointerdown', e => onTableDown(e, ent));
        g.addEventListener('pointerenter', () => { hoverId = ent.name; updateFocus(); });
        g.addEventListener('pointerleave', () => { hoverId = null; updateFocus(); });
        ent.g = g; ent.inner = inner;
        return g;
    }

    const SEQ_TOP = 118, SEQ_STEP = 46;

    function renderFlowNode(ent, inner) {
        const { w, h, shape } = ent, lbl = ent.label ?? ent.name;
        if (shape === 'diamond')
            inner.append(svgEl('polygon', { points: `${w / 2},2 ${w - 2},${h / 2} ${w / 2},${h - 2} 2,${h / 2}`, class: 't-main' }));
        else
            inner.append(svgEl('rect', { x: 0, y: 0, width: w, height: h, rx: shape === 'stadium' ? h / 2 : 10, class: 't-main' }));
        const t = svgEl('text', { x: w / 2, y: h / 2 + 4.5, 'text-anchor': 'middle', class: 't-name' });
        t.textContent = lbl; inner.append(t);
    }

    function renderSeqNode(ent, inner) {
        const { w, h } = ent, lbl = ent.label ?? ent.name;
        inner.append(svgEl('rect', { x: 0, y: 0, width: w, height: h, rx: 10, class: 't-main' }));
        inner.append(svgEl('rect', { x: 0, y: 0, width: w, height: h, rx: 10, class: 't-headbg', opacity: .5 }));
        const t = svgEl('text', { x: w / 2, y: h / 2 + 4.5, 'text-anchor': 'middle', class: 't-title' });
        t.textContent = lbl; inner.append(t);
    }

    function renderTableContent(ent, inner) {
        if (model.type === 'flow') return renderFlowNode(ent, inner);
        if (model.type === 'seq') return renderSeqNode(ent, inner);
        inner.textContent = '';
        inner.append(svgEl('rect', { class: 't-main', x: 0, y: 0, width: ent.w, height: ent.h, rx: 10 }));
        inner.append(svgEl('rect', { class: 't-headbg', x: .5, y: .5, width: ent.w - 1, height: 39.5, rx: 9.5 }));
        inner.append(svgEl('rect', { class: 't-headbg', x: .5, y: 26, width: ent.w - 1, height: 14 }));
        const title = svgEl('text', { class: 't-title', x: 14, y: 25 }); title.textContent = ent.name.toUpperCase();
        inner.append(title);
        const cw = tw(String(ent.attrs.length), F.count) + 12;
        inner.append(svgEl('rect', { class: 't-count-bg', x: ent.w - 14 - cw, y: 12, width: cw, height: 16, rx: 8 }));
        const cnt = svgEl('text', { class: 't-count', x: ent.w - 14 - cw / 2, y: 23, 'text-anchor': 'middle' });
        cnt.textContent = ent.attrs.length; inner.append(cnt);
        inner.append(svgEl('path', { class: 't-div', d: `M0 40H${ent.w}` }));
        if (!ent.attrs.length) {
            const t = svgEl('text', { class: 't-empty', x: 14, y: 40 + 17 }); t.textContent = '— sem campos definidos';
            inner.append(t);
        }
        ent.attrs.forEach((a, i) => {
            const yT = 40 + i * 26;
            const name = svgEl('text', { class: 't-name', x: 14, y: yT + 17 }); name.textContent = a.name;
            if (a.comment) { const ti = svgEl('title'); ti.textContent = a.comment; name.append(ti); }
            inner.append(name);
            let bx = 14 + tw(a.name, F.name) + 7;
            for (const k of a.keys) {
                const kw = tw(k, F.key) + 12;
                inner.append(svgEl('rect', { class: 'badge b-' + k.toLowerCase(), x: bx, y: yT + 5.5, width: kw, height: 15, rx: 7.5 }));
                const t = svgEl('text', { class: 'badge-t b-' + k.toLowerCase(), x: bx + kw / 2, y: yT + 16, 'text-anchor': 'middle' });
                t.textContent = k; inner.append(t); bx += kw + 5;
            }
            const tx = ent.commentW ? ent.w - ent.commentW - 12 : ent.w - 14;
            const ty = svgEl('text', { class: 't-type', x: tx, y: yT + 16, 'text-anchor': 'end' });
            ty.textContent = a.type; inner.append(ty);
            if (a.comment) {
                const cm = svgEl('text', { class: 't-comment', x: ent.w - ent.commentW + 6, y: yT + 16, style: 'font: italic 400 11px var(--mono); fill: var(--ink3)' });
                cm.textContent = a.comment; inner.append(cm);
            }
        });
        inner.append(svgEl('rect', { class: 't-hit', x: 0, y: 0, width: ent.w, height: ent.h }));
    }


    /* ══════════ 07-edges.js ══════════ */
    /* ══════════ arestas crow's foot (estilo mermaid) ══════════ */
    const CARD_TEXT = { one: '1', zero_one: '0..1', one_more: '1..N', zero_more: '0..N' };

    /* glifo construído por DOM nativo (sem innerHTML, à prova de namespace).
       Origem local (0,0) = centro da borda da entidade; +x aponta para fora
       dela, ao longo da linha — como no mermaid: pé de galinha encostado na
       entidade, traço/círculo sobre a linha. */
    function crowGlyph(type) {
        const g = svgEl('g');
        const P = d => g.append(svgEl('path', { class: 'mp', d }));
        const C = cx => g.append(svgEl('circle', { class: 'mc', cx, cy: 0, r: 3.4 }));
        if (type === 'one') { P('M9.5 -5.2V5.2'); P('M15.5 -5.2V5.2'); }
        else if (type === 'zero_one') { P('M9.5 -5.2V5.2'); C(16.8); }
        else if (type === 'one_more') { P('M10 0L0 -6'); P('M10 0L0 0'); P('M10 0L0 6'); P('M15.5 -5.2V5.2'); }
        else { P('M10 0L0 -6'); P('M10 0L0 0'); P('M10 0L0 6'); C(16.8); }
        return g;
    }
    function crowMarker(type) {
        const w = svgEl('g', { class: 'e-mk' });
        w.append(crowGlyph(type));
        return w;
    }
    function cardBadge(txt) {
        const w = Math.round(tw(txt, F.card)) + 10;
        const g = svgEl('g', { class: 'e-card' });
        g.append(svgEl('rect', { x: -w / 2, y: -7, width: w, height: 14, rx: 7 }));
        const t = svgEl('text', { 'text-anchor': 'middle', y: 3 }); t.textContent = txt;
        g.append(t);
        return g;
    }
    function anchor(a, b) {
        const dx = (b.x + b.w / 2) - (a.x + a.w / 2), dy = (b.y + b.h / 2) - (a.y + a.h / 2);
        if (Math.abs(dx) >= Math.abs(dy))
            return dx > 0 ? { x: a.x + a.w, y: a.y + a.h / 2, dx: 1, dy: 0 } : { x: a.x, y: a.y + a.h / 2, dx: -1, dy: 0 };
        return dy > 0 ? { x: a.x + a.w / 2, y: a.y + a.h, dx: 0, dy: 1 } : { x: a.x + a.w / 2, y: a.y, dx: 0, dy: -1 };
    }

    function simpleMarker(kind) {
        const g = svgEl('g', { class: 'e-mk' });
        if (!kind || kind === 'none') return g;
        if (kind === 'arrow') g.append(svgEl('path', { d: 'M0 0 L-11 -5 L-9 0 L-11 5 Z', fill: 'var(--edge)' }));
        else if (kind === 'tri') g.append(svgEl('path', { d: 'M0 0 L-12 -6 L-12 6 Z', fill: 'var(--edge)' }));
        else if (kind === 'diamond') g.append(svgEl('path', { d: 'M0 0 L-8 -5 L-16 0 L-8 5 Z', fill: 'var(--edge)' }));
        else if (kind === 'odiamond') g.append(svgEl('path', { d: 'M0 0 L-8 -5 L-16 0 L-8 5 Z', fill: 'var(--canvas)', stroke: 'var(--edge)', 'stroke-width': 1.4 }));
        return g;
    }

    function buildEdges(animate) {
        gEdges.textContent = ''; gTop.textContent = ''; edgeNodes = [];
        if (model.type === 'seq') return buildSeqEdges(animate);
        for (const rel of model.relations) {
            const a = byId[rel.a], b = byId[rel.b]; if (!a || !b || rel.a === rel.b) continue;
            /* linha: camada de baixo */
            const g = svgEl('g', { class: 'edge' + (rel.dash ? ' dash' : '') });
            const line = svgEl('path', { class: 'e-line' });
            g.append(line); gEdges.append(g);
            /* símbolos + selos + rótulo: camada de cima (nunca atrás das tabelas) */
            const ma = rel.simple ? simpleMarker(rel.aMk) : crowMarker(rel.ac);
            const mb = rel.simple ? simpleMarker(rel.bMk) : crowMarker(rel.bc);
            const ba = rel.simple ? svgEl('g') : cardBadge(CARD_TEXT[rel.ac]);
            const bb = rel.simple ? svgEl('g') : cardBadge(CARD_TEXT[rel.bc]);
            const lg = svgEl('g', { class: 'e-label' });
            const lw = tw(rel.label || ' ', F.label) + 16;
            const lr = svgEl('rect', { width: lw, height: 18, rx: 9 });
            const lt = svgEl('text', { 'text-anchor': 'middle' }); lt.textContent = rel.label;
            lg.append(lr, lt);
            gTop.append(ma, mb, ba, bb, lg);
            edgeNodes.push({ rel, g, line, ma, mb, ba, bb, lg, lr, lt, lw });
        }
        updateEdgeGeometry();
        if (animate && edgeNodes.length) {
            scene.classList.add('drawing');
            for (const E of edgeNodes) {
                const L = E.line.getTotalLength();
                E.line.style.strokeDasharray = L; E.line.style.strokeDashoffset = L;
                E.line.getBoundingClientRect();
                E.line.style.transition = 'stroke-dashoffset .9s cubic-bezier(.35,0,.25,1)';
                requestAnimationFrame(() => E.line.style.strokeDashoffset = '0');
            }
            setTimeout(() => {
                scene.classList.remove('drawing');
                for (const E of edgeNodes) {
                    E.line.style.transition = ''; E.line.style.strokeDasharray = ''; E.line.style.strokeDashoffset = '';
                }
            }, 1150);
        }
    }

    function buildSeqEdges(animate) {
        for (const e of model.entities) {
            const g = svgEl('g', { class: 'edge' });
            const line = svgEl('path', { class: 'e-life' });
            g.append(line); gEdges.append(g);
            edgeNodes.push({ seq: true, life: true, entName: e.name, g, line });
        }
        for (const rel of model.relations) {
            const g = svgEl('g', { class: 'edge' + (rel.dash ? ' dash' : '') });
            const line = svgEl('path', { class: 'e-line' });
            const ah = svgEl('path', { class: 'e-arrow' });
            g.append(line, ah); gEdges.append(g);
            const lg = svgEl('g', { class: 'e-label' });
            const lw = tw(rel.label || ' ', F.label) + 16;
            const lr = svgEl('rect', { width: lw, height: 18, rx: 9 });
            const lt = svgEl('text', { 'text-anchor': 'middle' }); lt.textContent = rel.label;
            lg.append(lr, lt); gTop.append(lg);
            edgeNodes.push({ seq: true, rel, g, line, ah, lg, lr, lt, lw });
        }
        updateEdgeGeometry();
    }

    function updateSeqEdge(E) {
        if (E.life) {
            const e = byId[E.entName]; if (!e) return;
            E.line.setAttribute('d', `M${e.x + e.w / 2} ${e.h + 6} L${e.x + e.w / 2} ${model.seqBottom || 600}`);
            return;
        }
        const a = byId[E.rel.a], b = byId[E.rel.b]; if (!a || !b) return;
        const y = SEQ_TOP + E.rel.idx * SEQ_STEP;
        if (a === b) {
            const x = a.x + a.w / 2;
            E.line.setAttribute('d', `M${x} ${y} h60 a12 12 0 0 1 12 12 v6 a12 12 0 0 1 -12 12 h-60`);
            E.ah.setAttribute('d', 'M0 0 L-11 -5 L-9 0 L-11 5 Z');
            E.ah.setAttribute('transform', `translate(${x + 2} ${y + 30}) rotate(180)`);
            E.lg.setAttribute('transform', `translate(${x + 45} ${y - 6})`);
        } else {
            const ax = a.x + a.w / 2, bx = b.x + b.w / 2, dir = bx >= ax ? 1 : -1;
            E.line.setAttribute('d', `M${ax + dir * 2} ${y} L${bx - dir * 10} ${y}`);
            E.ah.setAttribute('d', 'M0 0 L-11 -5 L-9 0 L-11 5 Z');
            E.ah.setAttribute('transform', `translate(${bx - dir * 2} ${y}) rotate(${dir > 0 ? 0 : 180})`);
            E.lg.setAttribute('transform', `translate(${(ax + bx) / 2} ${y - 14})`);
        }
        E.lr.setAttribute('x', -E.lw / 2); E.lr.setAttribute('y', -9); E.lt.setAttribute('y', 3.5);
    }

    function updateEdgeGeometry() {
        /* compensação de zoom: símbolos e selos não encolhem demais ao reduzir */
        const ms = clamp(1 / (vw() / cam.w), 1, 1.7);
        const bo = 38 * ms, po = 14 * ms;
        for (const E of edgeNodes) {
            if (E.seq) { updateSeqEdge(E); continue; }
            const a = byId[E.rel.a], b = byId[E.rel.b]; if (!a || !b) continue;
            const A = anchor(a, b), B = anchor(b, a);
            const dist = Math.hypot(B.x - A.x, B.y - A.y);
            const off = clamp(dist * 0.45, 40, 150);
            const c1x = A.x + A.dx * off, c1y = A.y + A.dy * off, c2x = B.x + B.dx * off, c2y = B.y + B.dy * off;
            E.line.setAttribute('d', `M${A.x} ${A.y}C${c1x} ${c1y} ${c2x} ${c2y} ${B.x} ${B.y}`);
            const rotA = Math.atan2(A.dy, A.dx) * 180 / Math.PI, rotB = Math.atan2(B.dy, B.dx) * 180 / Math.PI;
            E.ma.setAttribute('transform', `translate(${A.x} ${A.y}) rotate(${rotA}) scale(${ms})`);
            E.mb.setAttribute('transform', `translate(${B.x} ${B.y}) rotate(${rotB}) scale(${ms})`);
            E.ba.setAttribute('transform', `translate(${A.x + A.dx * bo + A.dy * po} ${A.y + A.dy * bo - A.dx * po}) scale(${ms})`);
            E.bb.setAttribute('transform', `translate(${B.x + B.dx * bo + B.dy * po} ${B.y + B.dy * bo - B.dx * po}) scale(${ms})`);
            const mx = (A.x + 3 * c1x + 3 * c2x + B.x) / 8, my = (A.y + 3 * c1y + 3 * c2y + B.y) / 8;
            E.lg.setAttribute('transform', `translate(${mx} ${my})`);
            E.lr.setAttribute('x', -E.lw / 2); E.lr.setAttribute('y', -9);
            E.lt.setAttribute('y', 3.5);
        }
    }

    function buildAdj() {
        adj = {};
        for (const r of model.relations) {
            if (!byId[r.a] || !byId[r.b]) continue;
            (adj[r.a] ??= new Set()).add(r.b);
            (adj[r.b] ??= new Set()).add(r.a);
        }
    }

    function updateFocus() {
        const act = hoverId || selectedId;
        for (const name in byId) {
            const g = byId[name].g;
            g.classList.toggle('sel', name === selectedId);
            g.classList.toggle('dimt', !!act && name !== act && !(adj[name] && adj[name].has(act)));
        }
        for (const E of edgeNodes) {
            const hit = !!act && (E.rel.a === act || E.rel.b === act);
            const dim = !!act && !hit;
            E.g.classList.toggle('on', hit);
            E.g.classList.toggle('dim', dim);
            for (const el of [E.ma, E.mb, E.ba, E.bb, E.lg]) {
                el.classList.toggle('on', hit);
                el.classList.toggle('dim', dim);
            }
        }
        updateMinimap();
    }


    /* ══════════ 08-camera.js ══════════ */
    /* ══════════ câmera / pan / zoom ══════════ */
    let cam = { x: 0, y: 0, w: 1000, h: 700 }, camAnim = null;
    const vs = () => ({ rw: canvas.clientWidth, rh: canvas.clientHeight });
    const vw = () => canvas.clientWidth;
    function normalizeH() { const { rw, rh } = vs(); cam.h = cam.w * rh / Math.max(1, rw); }
    function screenToWorld(cx, cy) {
        const r = scene.getBoundingClientRect();
        return { x: cam.x + (cx - r.left) / r.width * cam.w, y: cam.y + (cy - r.top) / r.height * cam.h };
    }
    function applyView() {
        normalizeH();
        scene.setAttribute('viewBox', `${cam.x} ${cam.y} ${cam.w} ${cam.h}`);
        const s = vw() / cam.w;
        canvas.style.backgroundSize = `${28 * s}px ${28 * s}px`;
        canvas.style.backgroundPosition = `${(-cam.x * s).toFixed(1)}px ${(-cam.y * s).toFixed(1)}px`;
        zoomLbl.textContent = Math.round(s * 100) + '%';
        updateEdgeGeometry();
        updateMinimap();
    }
    function animateCam(target, dur = 480) {
        cancelAnimationFrame(camAnim);
        const s = { ...cam }, t0 = performance.now();
        const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const step = t => {
            const p = Math.min(1, (t - t0) / dur), k = ease(p);
            cam.x = s.x + (target.x - s.x) * k; cam.y = s.y + (target.y - s.y) * k; cam.w = s.w + (target.w - s.w) * k;
            applyView();
            if (p < 1) camAnim = requestAnimationFrame(step);
        };
        camAnim = requestAnimationFrame(step);
    }
    function contentBBox() {
        if (!model.entities.length) return null;
        let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
        for (const e of model.entities) {
            x1 = Math.min(x1, e.x); y1 = Math.min(y1, e.y);
            x2 = Math.max(x2, e.x + e.w); y2 = Math.max(y2, e.y + e.h);
        }
        return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
    }
    function fitView(animate = true) {
        const bb = contentBBox(); if (!bb) return;
        const { rw, rh } = vs(), pad = 80;
        const s = Math.min(rw / (bb.w + pad * 2), rh / (bb.h + pad * 2), 1.4);
        const w = rw / s, t = { x: bb.x + bb.w / 2 - w / 2, y: bb.y + bb.h / 2 - w * (rh / rw) / 2, w };
        if (animate) animateCam(t, 560); else { cam.w = t.w; cam.x = t.x; cam.y = t.y; applyView(); }
    }
    function zoomBy(f) {
        const { rw, rh } = vs();
        const cx = cam.x + cam.w / 2, cy = cam.y + cam.h / 2;
        const w = clamp(cam.w / f, rw / 7, rw * 6);
        animateCam({ x: cx - w / 2, y: cy - w * (rh / rw) / 2, w }, 220);
    }
    function resetZoom() {
        const { rw, rh } = vs(), cx = cam.x + cam.w / 2, cy = cam.y + cam.h / 2;
        animateCam({ x: cx - rw / 2, y: cy - rw * (rh / rw) / 2, w: rw }, 260);
    }
    canvas.addEventListener('wheel', e => {
        if (e.target.closest('#toolbar,#minimap')) return;
        e.preventDefault();
        cancelAnimationFrame(camAnim);
        const before = screenToWorld(e.clientX, e.clientY);
        const f = Math.exp(-e.deltaY * (e.ctrlKey ? 0.008 : 0.0014));
        const { rw } = vs();
        cam.w = clamp(cam.w / f, rw / 7, rw * 6);
        normalizeH();
        const after = screenToWorld(e.clientX, e.clientY);
        cam.x += before.x - after.x; cam.y += before.y - after.y;
        applyView();
    }, { passive: false });


    /* ══════════ 09-drag.js ══════════ */
    /* ══════════ arrastar tabelas + guias inteligentes ══════════ */
    let dragState = null, panState = null;

    function snapMove(ent, nx, ny) {
        const s = vw() / cam.w, thr = 8 / s;
        let bx = null, by = null;
        const A = { l: nx, r: nx + ent.w, cx: nx + ent.w / 2, t: ny, b: ny + ent.h, cy: ny + ent.h / 2 };
        for (const o of model.entities) {
            if (o === ent) continue;
            const B = { l: o.x, r: o.x + o.w, cx: o.x + o.w / 2, t: o.y, b: o.y + o.h, cy: o.y + o.h / 2 };
            for (const [ka, kb] of [['cx', 'cx'], ['l', 'l'], ['r', 'r'], ['l', 'r'], ['r', 'l']]) {
                const d = B[kb] - A[ka];
                if (Math.abs(d) < thr && (!bx || Math.abs(d) < Math.abs(bx.d))) bx = { d, x: B[kb], o };
            }
            for (const [ka, kb] of [['cy', 'cy'], ['t', 't'], ['b', 'b'], ['t', 'b'], ['b', 't']]) {
                const d = B[kb] - A[ka];
                if (Math.abs(d) < thr && (!by || Math.abs(d) < Math.abs(by.d))) by = { d, y: B[kb], o };
            }
        }
        /* encaixe somente em UM eixo por vez (o mais próximo) — nunca na diagonal */
        if (bx && by) {
            if (Math.abs(bx.d) <= Math.abs(by.d)) by = null; else bx = null;
        }
        if (bx) nx += bx.d;
        if (by) ny += by.d;
        const out = { nx, ny, gx: null, gy: null };
        if (bx) out.gx = { x: bx.x, y1: Math.min(ny, bx.o.y) - 26, y2: Math.max(ny + ent.h, bx.o.y + bx.o.h) + 26 };
        if (by) out.gy = { y: by.y, x1: Math.min(nx, by.o.x) - 26, x2: Math.max(nx + ent.w, by.o.x + by.o.w) + 26 };
        return out;
    }
    function drawGuides(sn) {
        gGuides.textContent = '';
        if (sn.gx) gGuides.append(svgEl('line', { class: 'guide', x1: sn.gx.x, y1: sn.gx.y1, x2: sn.gx.x, y2: sn.gx.y2 }));
        if (sn.gy) gGuides.append(svgEl('line', { class: 'guide', x1: sn.gy.x1, y1: sn.gy.y, x2: sn.gy.x2, y2: sn.gy.y }));
    }

    function onTableDown(e, ent) {
        if (e.button !== 0 || animating) return;
        e.stopPropagation();
        const p = screenToWorld(e.clientX, e.clientY);
        dragState = { ent, ox: p.x - ent.x, oy: p.y - ent.y, moved: false };
        scene.setPointerCapture(e.pointerId);
        ent.g.classList.add('dragging');
        if (selectedId !== ent.name) { selectedId = ent.name; updateFocus(); }
    }
    scene.addEventListener('pointerdown', e => {
        if (e.button === 1) { e.preventDefault(); }
        if (e.target !== scene) return;
        if (e.button !== 0 && e.button !== 1) return;
        panState = { sx: e.clientX, sy: e.clientY, cx: cam.x, cy: cam.y, moved: false };
        scene.setPointerCapture(e.pointerId);
        scene.classList.add('panning');
    });
    scene.addEventListener('pointermove', e => {
        if (dragState) {
            const p = screenToWorld(e.clientX, e.clientY);
            const ent = dragState.ent;
            const sn = snapMove(ent, p.x - dragState.ox, p.y - dragState.oy);
            ent.x = sn.nx; ent.y = sn.ny;
            ent.g.setAttribute('transform', `translate(${ent.x} ${ent.y})`);
            drawGuides(sn); updateEdgeGeometry(); updateMinimap();
            dragState.moved = true;
        } else if (panState) {
            const dx = e.clientX - panState.sx, dy = e.clientY - panState.sy;
            if (Math.abs(dx) + Math.abs(dy) > 3) panState.moved = true;
            const r = scene.getBoundingClientRect();
            cam.x = panState.cx - dx * cam.w / r.width;
            cam.y = panState.cy - dy * cam.h / r.height;
            applyView();
        }
    });
    function endPointer(e) {
        if (dragState) {
            const ent = dragState.ent;
            ent.g.classList.remove('dragging');
            gGuides.textContent = '';
            if (dragState.moved) savePositions();
            dragState = null;
        }
        if (panState) {
            scene.classList.remove('panning');
            if (!panState.moved) { selectedId = null; updateFocus(); }
            panState = null;
        }
    }
    scene.addEventListener('pointerup', endPointer);
    scene.addEventListener('pointercancel', endPointer);
    scene.addEventListener('dblclick', e => { if (e.target === scene) fitView(true); });


    /* ══════════ 10-minimap.js ══════════ */
    /* ══════════ minimapa ══════════ */
    let mmState = null;
    function updateMinimap() {
        const bb = contentBBox();
        if (!bb) { mmContent.textContent = ''; mmView.setAttribute('width', 0); mmState = null; return; }
        const rx = Math.min(bb.x, cam.x) - 40, ry = Math.min(bb.y, cam.y) - 40;
        const w = Math.max(bb.x + bb.w, cam.x + cam.w) + 40 - rx;
        const h = Math.max(bb.y + bb.h, cam.y + cam.h) + 40 - ry;
        const s = Math.min(174 / w, 104 / h), ox = (190 - w * s) / 2, oy = (120 - h * s) / 2;
        mmState = { s, ox, oy, rx, ry };
        mmContent.textContent = '';
        for (const e of model.entities) {
            mmContent.append(svgEl('rect', {
                x: ox + (e.x - rx) * s, y: oy + (e.y - ry) * s,
                width: Math.max(3, e.w * s), height: Math.max(2.4, e.h * s), rx: 2,
                class: 'mm-t' + (e.name === selectedId ? ' sel' : '')
            }));
        }
        mmView.setAttribute('x', ox + (cam.x - rx) * s); mmView.setAttribute('y', oy + (cam.y - ry) * s);
        mmView.setAttribute('width', cam.w * s); mmView.setAttribute('height', cam.h * s);
    }
    function mmNav(e) {
        if (!mmState) return;
        const r = mm.getBoundingClientRect();
        const wx = mmState.rx + (e.clientX - r.left - mmState.ox) / mmState.s;
        const wy = mmState.ry + (e.clientY - r.top - mmState.oy) / mmState.s;
        cancelAnimationFrame(camAnim);
        cam.x = wx - cam.w / 2; cam.y = wy - cam.h / 2;
        applyView();
    }
    mm.addEventListener('pointerdown', e => {
        e.stopPropagation();
        mm.setPointerCapture(e.pointerId);
        mmNav(e);
        const mv = ev => mmNav(ev);
        mm.addEventListener('pointermove', mv);
        mm.addEventListener('pointerup', () => mm.removeEventListener('pointermove', mv), { once: true });
    });


    /* ══════════ 11-editor.js ══════════ */
    /* ══════════ highlight do editor ══════════ */
    const REL_HL = /^(\s*)([A-Za-z_][\w.\-]*)(\s*)((?:\|o|\|\||\}o|\}\|)(?:--|\.\.|==)(?:o\||\|\||o\{|\|\{))(\s*)([A-Za-z_][\w.\-]*)(\s*:\s*)(.*)$/;
    const OPEN_HL = /^(\s*)([A-Za-z_][\w.\-]*)(\s*\{)(\s*)$/;
    const CLOSE_HL = /^(\s*)(\}+\s*)$/;
    const ATTR_HL = /^(\s*)([\w().<>[\],\-]+)(\s+)([A-Za-z_]\w*)(\s*)(.*)$/;
    const SOLO_HL = /^(\s*)([A-Za-z_][\w.\-]*)\s*$/;
    function hlRest(rest) {
        let out = '';
        for (const p of rest.split(/("[^"]*")/g)) {
            if (p.startsWith('"')) out += `<span class="c-cm">${esc(p)}</span>`;
            else out += esc(p).replace(/\b(PK|FK|UK)\b/g, '<span class="c-key">$1</span>');
        }
        return out;
    }
    function renderHighlight() {
        let inBlock = false; const out = [];
        for (const raw of src.value.split('\n')) {
            const line = raw.replace(/;\s*$/, ''), t = line.trim();
            let h = null, m;
            if (t.startsWith('%%')) h = `<span class="c-cm">${esc(line)}</span>`;
            else if (/^erDiagram\b/.test(t)) h = `<span class="c-kw">${esc(line)}</span>`;
            else if (m = line.match(REL_HL))
                h = `${esc(m[1])}<span class="c-en">${esc(m[2])}</span><span class="c-card">${esc(m[3])}</span><span class="c-card">${esc(m[4])}</span><span class="c-card">${esc(m[5])}</span><span class="c-en">${esc(m[6])}</span><span class="c-col">${esc(m[7])}</span><span class="c-lb">${esc(m[8])}</span>`;
            else if (m = line.match(OPEN_HL)) { h = `${esc(m[1])}<span class="c-en">${esc(m[2])}</span><span class="c-br">${esc(m[3])}</span>`; inBlock = true; }
            else if (m = line.match(CLOSE_HL)) { h = `${esc(m[1])}<span class="c-br">${esc(m[2])}</span>`; if (inBlock) inBlock = false; }
            else if (inBlock && (m = line.match(ATTR_HL)))
                h = `${esc(m[1])}<span class="c-ty">${esc(m[2])}</span>${esc(m[3])}<span class="c-en">${esc(m[4])}</span>${esc(m[5])}${hlRest(m[6])}`;
            else if (m = line.match(SOLO_HL)) h = `${esc(m[1])}<span class="c-en">${esc(m[2])}</span>`;
            out.push(h ?? esc(line));
        }
        hlcode.innerHTML = out.join('\n') + '\n';
    }

    /* ══════════ formatador ══════════ */
    function buildFormatted() {
        if (model.type && model.type !== 'er') return null;
        const res = parseMermaid(src.value);
        if (res.errors.length) return null;
        const lines = ['erDiagram', ''];
        const rels = res.relations;
        const w = Math.max(0, ...rels.map(r => `${r.a} ${r.lc}${r.conn}${r.rc} ${r.b}`.length));
        for (const r of rels) lines.push(`${`${r.a} ${r.lc}${r.conn}${r.rc} ${r.b}`.padEnd(w)} : ${r.label}`);
        for (const e of res.entities) {
            if (!e.attrs.length) continue;
            lines.push('', `${e.name} {`);
            for (const a of e.attrs) {
                let l = `    ${a.type} ${a.name}`;
                if (a.keys.length) l += ' ' + a.keys.join(' ');
                if (a.comment) l += ` "${a.comment}"`;
                lines.push(l);
            }
            lines.push('}');
        }
        for (const e of res.entities)
            if (!e.attrs.length && !rels.some(r => r.a === e.name || r.b === e.name)) lines.push('', e.name);
        return lines.join('\n');
    }
    function formatCode(silent) {
        const formatted = buildFormatted();
        if (formatted == null) { if (!silent) toast('Corrija os erros antes de formatar', 'err'); return false; }
        pushHistory();
        src.value = formatted;
        lastLen = formatted.length; lastCaret = 0; lastSel = 0; snipState = null;
        renderHighlight(); updateGutter(); scheduleApply();
        if (!silent) toast('Código formatado');
        return true;
    }


    /* ══════════ 12-pipeline.js ══════════ */
    /* ══════════ pipeline de aplicação ══════════ */
    function placeNear(ent) {
        const nb = [];
        for (const r of model.relations) {
            const o = r.a === ent.name ? r.b : (r.b === ent.name ? r.a : null);
            if (o && positions[o]) nb.push(positions[o]);
        }
        let cx, cy;
        if (nb.length) {
            cx = nb.reduce((s, p) => s + p.x, 0) / nb.length + ent.w / 2;
            cy = nb.reduce((s, p) => s + p.y, 0) / nb.length + ent.h / 2;
        } else { cx = cam.x + cam.w / 2 - ent.w / 2; cy = cam.y + cam.h / 2 - ent.h / 2; }
        const i = placeNear.n = (placeNear.n || 0) + 1;
        const a = i * 2.1, r = 30 + i * 26;
        ent.x = Math.round(cx + Math.cos(a) * r); ent.y = Math.round(cy + Math.sin(a) * r);
    }

    function applySource(code, opts = {}) {
        let { resetLayout = false } = opts;
        const { animate = false, mode = 'force' } = opts;
        const res = parseMermaid(code);
        if (res.errors.length) { setParseState(res.errors); return false; }
        setParseState(null, res);
        model = res;
        for (const e of model.entities) measureEntity(e);
        if (model.type === 'seq') {
            model.seqBottom = SEQ_TOP + Math.max(1, model.relations.length) * SEQ_STEP + 36;
            resetLayout = true; /* sequência sempre re-layouta (posição linear) */
        }
        if (resetLayout) {
            const map = layoutPositions(model.entities, model.relations, false, mode);
            for (const e of model.entities) { const p = map.get(e.name); e.x = p.x; e.y = p.y; }
        } else {
            placeNear.n = 0; let anyNew = false;
            for (const e of model.entities) {
                const p = positions[e.name];
                if (p) { e.x = p.x; e.y = p.y; } else { placeNear(e); anyNew = true; }
            }
            if (anyNew) resolveOverlaps(model.entities, 40);
        }
        gTables.textContent = ''; byId = {};
        model.entities.forEach((e, i) => { byId[e.name] = e; gTables.append(buildTableNode(e, animate, i)); });
        for (const k of Object.keys(positions)) if (!byId[k]) delete positions[k];
        for (const e of model.entities) positions[e.name] = { x: e.x, y: e.y };
        store.set('pos', JSON.stringify(positions)); store.set('code', code);
        buildAdj(); buildEdges(animate); updateFocus(); updateStats(); updateMinimap();
        return true;
    }
    function savePositions() {
        for (const e of model.entities) positions[e.name] = { x: e.x, y: e.y };
        store.set('pos', JSON.stringify(positions));
    }
    function animateTo(targets, dur, done) {
        animating = true;
        const starts = model.entities.map(e => ({ x: e.x, y: e.y }));
        const t0 = performance.now();
        const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const step = t => {
            const p = Math.min(1, (t - t0) / dur), k = ease(p);
            model.entities.forEach((e, i) => {
                const s = targets.get(e.name); if (!s) return;
                e.x = starts[i].x + (s.x - starts[i].x) * k; e.y = starts[i].y + (s.y - starts[i].y) * k;
                e.g.setAttribute('transform', `translate(${e.x} ${e.y})`);
            });
            updateEdgeGeometry(); updateMinimap();
            if (p < 1) requestAnimationFrame(step);
            else { animating = false; done && done(); }
        };
        requestAnimationFrame(step);
    }
    function organize() {
        if (animating || !model.entities.length) return;
        if (model.type === 'seq') { applySource(src.value, { resetLayout: true, mode: layoutSel.value }); toast('Sequência reorganizada'); return; }
        const targets = layoutPositions(model.entities, model.relations, true, layoutSel.value);
        animateTo(targets, 650, () => { savePositions(); fitView(true); });
    }
    function updateStats() {
        const fields = model.entities.reduce((s, e) => s + e.attrs.length, 0);
        statsEl.textContent = `${model.entities.length} entidades · ${edgeNodes.length} relações · ${fields} campos`;
    }
    function setParseState(errors, res) {
        if (errors && errors.length) {
            parseDot.classList.add('err'); parseFoot.classList.add('err');
            parseText.textContent = `linha ${errors[0].line}: ${errors[0].msg}${errors.length > 1 ? ` (+${errors.length - 1})` : ''}`;
        } else {
            parseDot.classList.remove('err'); parseFoot.classList.remove('err');
            parseText.textContent = `ok · ${res.entities.length} entidades · ${res.relations.length} relações`;
        }
    }


    /* ══════════ 13-export.js ══════════ */
    /* ══════════ exportação SVG / PNG ══════════ */
    let _fontCSS = null;
    async function getFontCSS() {
        if (_fontCSS !== null) return _fontCSS;
        try {
            const link = document.querySelector('link[href*="fonts.googleapis"]');
            const css = await (await fetch(link.href)).text();
            const blocks = css.split('@font-face').slice(1).map(b => '@font-face' + b.slice(0, b.indexOf('}') + 1));
            let out = '';
            for (const b of blocks.filter(x => x.includes('U+0000-00FF'))) {
                const u = b.match(/url\((https:[^)]+)\)/)[1];
                const arr = new Uint8Array(await (await fetch(u)).arrayBuffer());
                let bin = ''; for (let i = 0; i < arr.length; i += 0x8000) bin += String.fromCharCode.apply(null, arr.subarray(i, i + 0x8000));
                out += b.replace(u, `data:font/woff2;base64,${btoa(bin)}`);
            }
            _fontCSS = out;
        } catch (e) { _fontCSS = ''; }
        return _fontCSS;
    }
    const THEME_VARS = ['--surface', '--surface2', '--canvas', '--ink', '--ink2', '--ink3', '--line', '--line2', '--edge', '--accent', '--pkbg', '--pkln', '--pkfg', '--mono', '--sans'];
    async function buildExportSVG() {
        const bb = contentBBox(); if (!bb) return null;
        const pad = 56, W = Math.round(bb.w + pad * 2), H = Math.round(bb.h + pad * 2);
        const clone = scene.cloneNode(true);
        clone.removeAttribute('style'); clone.removeAttribute('class');
        clone.setAttribute('xmlns', NS);
        clone.setAttribute('viewBox', `${bb.x - pad} ${bb.y - pad} ${W} ${H}`);
        clone.setAttribute('width', W); clone.setAttribute('height', H);
        clone.querySelector('#gGuides')?.remove();
        clone.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'));
        for (const c of ['enter', 'dragging', 'dim', 'on', 'dimt', 'sel', 'drawing'])
            clone.querySelectorAll('.' + c).forEach(el => el.classList.remove(c));
        const vars = THEME_VARS.map(n => `${n}:${cssVar(n)}`).join(';');
        const st = document.createElementNS(NS, 'style');
        let appCss = '';
        try { appCss = await (await fetch('css/style.css')).text(); } catch (e) { /* file://: exporta só com vars + fontes */ }
        st.textContent = `:root{${vars}} ${appCss} ${await getFontCSS()}`;
        clone.insertBefore(st, clone.firstChild);
        const bg = svgEl('rect', { x: bb.x - pad, y: bb.y - pad, width: W, height: H, fill: cssVar('--canvas') });
        clone.insertBefore(bg, st.nextSibling);
        return { str: new XMLSerializer().serializeToString(clone), W, H };
    }
    function downloadBlob(blob, name) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = name; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }
    async function exportSVG() {
        const r = await buildExportSVG();
        if (!r) { toast('Nada para exportar', 'err'); return; }
        downloadBlob(new Blob([r.str], { type: 'image/svg+xml;charset=utf-8' }), 'diagrama-er.svg');
        toast('SVG exportado');
    }
    async function exportPNG() {
        const r = await buildExportSVG();
        if (!r) { toast('Nada para exportar', 'err'); return; }
        try {
            const url = URL.createObjectURL(new Blob([r.str], { type: 'image/svg+xml;charset=utf-8' }));
            const img = new Image();
            await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
            const c = document.createElement('canvas'); c.width = r.W * 2; c.height = r.H * 2;
            const ctx = c.getContext('2d'); ctx.scale(2, 2); ctx.drawImage(img, 0, 0, r.W, r.H);
            URL.revokeObjectURL(url);
            c.toBlob(b => { downloadBlob(b, 'diagrama-er.png'); toast('PNG exportado (2×)'); }, 'image/png');
        } catch (e) { toast('Falha ao gerar PNG', 'err'); }
    }


    /* ══════════ 14-ui.js ══════════ */
    /* ══════════ toasts / tema / painel / menus / docs ══════════ */
    function toast(msg, type = '') {
        const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg;
        $('toasts').append(t);
        requestAnimationFrame(() => t.classList.add('show'));
        setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2400);
    }
    function exportMMD() {
        if (!src.value.trim()) { toast('Nada para salvar', 'err'); return; }
        downloadBlob(new Blob([src.value], { type: 'text/plain;charset=utf-8' }), 'diagrama-er.mmd');
        toast('Código Mermaid salvo');
    }


    /* ══════════ 15-share.js ══════════ */
    /* ══════════ compartilhar URL ══════════ */
    function shareURL() {
        const enc = btoa(unescape(encodeURIComponent(src.value))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        return location.origin + location.pathname + '#d=' + enc;
    }
    function loadSharedCode() {
        const m = location.hash.match(/#d=([\w\-]+)/);
        if (!m) return null;
        try { return decodeURIComponent(escape(atob(m[1].replace(/-/g, '+').replace(/_/g, '/')))); } catch (e) { return null; }
    }
    $('btnShare').onclick = async () => {
        try { await navigator.clipboard.writeText(shareURL()); toast('Link de compartilhamento copiado'); }
        catch (e) { toast('Não foi possível copiar o link', 'err'); }
    };

    function setTheme(t) {
        document.documentElement.dataset.theme = t; store.set('theme', t);
        $('btnTheme').innerHTML = icon(t === 'dark' ? 'sun' : 'moon');
    }
    $('btnTheme').onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    $('btnPanel').onclick = () => {
        panel.classList.toggle('hidden');
        store.set('panel', panel.classList.contains('hidden') ? '0' : '1');
    };
    $('btnCopy').onclick = async () => {
        try { await navigator.clipboard.writeText(src.value); toast('Código Mermaid copiado'); }
        catch (e) { toast('Não foi possível copiar', 'err'); }
    };
    $('btnExport').onclick = e => { e.stopPropagation(); exportMenu.classList.toggle('open'); };
    document.addEventListener('click', e => { if (!e.target.closest('.menu-wrap')) exportMenu.classList.remove('open'); });
    exportMenu.querySelectorAll('button').forEach(b => b.onclick = () => {
        exportMenu.classList.remove('open');
        if (b.dataset.x === 'svg') exportSVG();
        else if (b.dataset.x === 'png') exportPNG();
        else exportMMD();
    });

    function toggleDocs(open) {
        const o = open ?? !docs.classList.contains('open');
        docs.classList.toggle('open', o);
        docsBackdrop.classList.toggle('open', o);
    }
    $('btnDocs').onclick = () => toggleDocs();
    $('btnDocsClose').onclick = () => toggleDocs(false);
    docsBackdrop.onclick = () => toggleDocs(false);


    /* ══════════ 16-snippets.js ══════════ */
    /* ══════════ snippets: slash commands + tabstops ══════════ */
    const snipMenu = document.getElementById('snipMenu');
    const SNIPPETS = [
        { cmd: '/table', desc: 'bloco de entidade { }', body: '${1:TABELA} {\n    ${2:string} ${3:campo}\n    ${4:string} ${5:campo}\n}' },
        { cmd: '/one-many', desc: 'um→muitos  ||--o{', body: '${1:TABELA} ||--o{ ${2:TABELA} : ${3:relacao}' },
        { cmd: '/many-one', desc: 'muitos→um  }o--||', body: '${1:TABELA} }o--|| ${2:TABELA} : ${3:relacao}' },
        { cmd: '/many-many', desc: 'muitos→muitos  }o--o{', body: '${1:TABELA} }o--o{ ${2:TABELA} : ${3:relacao}' },
        { cmd: '/one-one', desc: 'um→um  ||--||', body: '${1:TABELA} ||--|| ${2:TABELA} : ${3:relacao}' },
        { cmd: '/zero-one', desc: 'um→zero-um  ||--o|', body: '${1:TABELA} ||--o| ${2:TABELA} : ${3:relacao}' },
        { cmd: '/indirect', desc: 'não-identificante (tracejado)  ||..o{', body: '${1:TABELA} ||..o{ ${2:TABELA} : ${3:relacao}' },
        { cmd: '/pk', desc: 'linha de chave primária', body: '${1:int} ${2:id} PK' },
        { cmd: '/fk', desc: 'linha de chave estrangeira', body: '${1:int} ${2:tabela_id} FK' },
        { cmd: '/flow', desc: 'fluxo: nó → nó', body: '${1:Inicio}[${2:Começo}] --> ${3:Fim}[${4:Resultado}]' },
        { cmd: '/decision', desc: 'fluxo: decisão losango', body: '${1:ok}{${2:Tudo certo?}} -->|${3:sim}| ${4:Fim}[${5:Fim}]' },
        { cmd: '/seqmsg', desc: 'sequência: mensagem', body: '${1:Cliente} ->> ${2:Servidor} : ${3:requisição}' },
        { cmd: '/seqreply', desc: 'sequência: resposta tracejada', body: '${1:Servidor} -->> ${2:Cliente} : ${3:resposta}' }
    ];
    let snipState = null;   /* { stops: [{start,len}], idx } */
    let acList = [], acSel = 0, acCtx = null;

    /* ── dicionários de autocomplete ── */
    const TYPES = [
        ['int', 'inteiro'], ['bigint', 'inteiro grande'], ['string', 'texto curto'], ['varchar(255)', 'texto limitado'],
        ['text', 'texto longo'], ['boolean', 'verdadeiro/falso'], ['decimal(10,2)', 'numérico exato'], ['float', 'ponto flutuante'],
        ['double', 'flutuante duplo'], ['date', 'data'], ['datetime', 'data e hora'], ['timestamp', 'data/hora com fuso'],
        ['time', 'hora'], ['uuid', 'identificador único'], ['json', 'documento json'], ['blob', 'binário']
    ];
    const KEYS = [['PK', 'chave primária'], ['FK', 'chave estrangeira'], ['UK', 'chave única']];
    const CONNS = [
        ['||--o{', 'um → zero ou mais'], ['||--||', 'um → um'], ['||--o|', 'um → zero-um'], ['||--|{', 'um → um ou mais'],
        ['||..o{', 'um → zero+ (tracejada)'], ['}o--o{', 'zero+ → zero+'], ['}o--||', 'zero+ → um'], ['}|--o{', 'um+ → zero+'],
        ['}o..o{', 'zero+ → zero+ (tracejada)'], ['}o..||', 'zero+ → um (tracejada)']
    ];

    const monoCtx = document.createElement('canvas').getContext('2d');
    function caretXY() {
        const cs = getComputedStyle(src);
        monoCtx.font = cs.font;
        const pos = src.selectionStart, before = src.value.slice(0, pos);
        const line = before.split('\n').length - 1;
        const colTxt = before.slice(before.lastIndexOf('\n') + 1);
        const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.7;
        const cw = monoCtx.measureText('M').width || 7.5;
        const wrap = document.querySelector('.code-wrap');
        return {
            x: clamp(parseFloat(cs.paddingLeft) + colTxt.length * cw - src.scrollLeft + 2, 0, wrap.clientWidth - 260),
            y: clamp(parseFloat(cs.paddingTop) + line * lh - src.scrollTop + 2, 0, wrap.clientHeight - 160)
        };
    }
    function closeAc() { snipMenu.classList.remove('open'); acList = []; acCtx = null; }
    function entityNames() {
        const set = new Set();
        for (const m of src.value.matchAll(/^\s*([A-Za-z_][\w.\-]*)\s*\{/gm)) set.add(m[1]);
        for (const m of src.value.matchAll(/([A-Za-z_][\w.\-]*)\s+(?:\|o|\|\||\}o|\}\|)\s*(?:--|\.\.|==)\s*(?:o\||\|\||o\{|\|\{)\s+([A-Za-z_][\w.\-]*)/g)) { set.add(m[1]); set.add(m[2]); }
        return [...set];
    }
    function inEntityBlock(pos) {
        let depth = 0;
        for (const l of src.value.slice(0, pos).split('\n')) {
            const t = l.trim();
            if (/^\}+\s*$/.test(t)) { depth = Math.max(0, depth - 1); continue; }
            if (/\{\s*$/.test(t) && !/[|}]/.test(t)) depth++;
        }
        return depth > 0;
    }
    function computeAc() {
        const pos = src.selectionStart;
        if (pos !== src.selectionEnd) return null;
        const before = src.value.slice(0, pos);
        const lineStart = before.lastIndexOf('\n') + 1;
        const line = before.slice(lineStart);
        const sm = before.match(/\/[\w-]*$/);
        if (sm) return { mode: 'slash', qr: { q: sm[0], start: pos - sm[0].length } };
        const word = line.match(/[\w.\-()]*$/)[0] || '';
        const wStart = pos - word.length;
        const tokens = line.trim().split(/\s+/).filter(Boolean);
        if (inEntityBlock(pos) && !/^\s*\}/.test(line)) {
            /* indentação não afeta a detecção: linha vazia/espços = tipos;
               1ª palavra = tipos; depois do tipo + espaço = chaves (PK/FK/UK) */
            if (!tokens.length) return { mode: 'type', prefix: word, wStart };
            if (tokens.length === 1) return /\s$/.test(line) ? { mode: 'key', prefix: word, wStart } : { mode: 'type', prefix: word, wStart };
            return { mode: 'key', prefix: word, wStart };
        }
        if (!tokens.length) return null;
        if (tokens.length === 1 && !/\s$/.test(line)) return null;                 /* digitando 1ª palavra fora de bloco */
        if (tokens.length === 1) return { mode: 'conn', prefix: word, wStart };    /* "A " → conectores */
        if (tokens.length === 2) {
            if (/^[|}]/.test(tokens[1])) return { mode: 'entity', prefix: word, wStart }; /* "A ||--o{ " → entidades */
            if (/^[|}]/.test(word)) return { mode: 'conn', prefix: word, wStart };
            return null;
        }
        if (tokens.length === 3 && /^[A-Za-z_]/.test(tokens[2])) return { mode: 'entity', prefix: word, wStart };
        return null;
    }
    function renderAc() {
        acCtx = computeAc();
        if (!acCtx) { closeAc(); return; }
        acList = [];
        const p = (acCtx.prefix || '').toLowerCase();
        if (acCtx.mode === 'slash')
            acList = SNIPPETS.filter(s => s.cmd.startsWith(acCtx.qr.q.toLowerCase())).map(s => ({ label: s.cmd, desc: s.desc, snippet: s }));
        else if (acCtx.mode === 'type')
            acList = TYPES.filter(t => t[0].toLowerCase().startsWith(p)).map(t => ({ label: t[0], desc: t[1], insert: t[0] + ' ' }));
        else if (acCtx.mode === 'key')
            acList = KEYS.filter(t => t[0].toLowerCase().startsWith(p)).map(t => ({ label: t[0], desc: t[1], insert: t[0] }));
        else if (acCtx.mode === 'conn')
            acList = CONNS.filter(t => t[0].startsWith(acCtx.prefix)).map(t => ({ label: t[0], desc: t[1], insert: t[0] + ' ' }));
        else if (acCtx.mode === 'entity')
            acList = entityNames().filter(n => n.toLowerCase().startsWith(p)).map(n => ({ label: n, desc: 'entidade', insert: n + ' ' }));
        if (!acList.length) { closeAc(); return; }
        acSel = 0;
        snipMenu.textContent = '';
        acList.forEach((it, i) => {
            const d = document.createElement('div');
            d.className = 'snip-item' + (i === acSel ? ' on' : '');
            d.innerHTML = `<span class="cmd">${esc(it.label)}</span><span class="desc">${esc(it.desc)}</span>`;
            d.onmousedown = e => { e.preventDefault(); acceptAc(it); };
            snipMenu.append(d);
        });
        const cp = caretXY();
        snipMenu.style.left = cp.x + 'px'; snipMenu.style.top = cp.y + 'px';
        snipMenu.classList.add('open');
    }
    function acceptAc(item) {
        if (acCtx.mode === 'slash') { acceptSnippet(item.snippet, acCtx.qr); return; }
        const pos = acCtx.wStart;
        pushHistory();
        src.value = src.value.slice(0, pos) + item.insert + src.value.slice(src.selectionEnd);
        src.selectionStart = src.selectionEnd = pos + item.insert.length;
        lastLen = src.value.length; lastCaret = src.selectionStart; lastSel = src.selectionEnd;
        closeAc(); renderHighlight(); scheduleApply();
    }
    function acceptSnippet(s, qr) {
        /* expande ${n:default}: texto completo + offsets reais dos tabstops */
        const stops = [];
        let text = '', last = 0, m;
        const re = /\$\{(\d+):([^}]*)\}/g;
        while ((m = re.exec(s.body))) {
            text += s.body.slice(last, m.index);              /* texto literal entre placeholders */
            stops[+m[1]] = { at: text.length, len: m[2].length };
            text += m[2];
            last = m.index + m[0].length;
        }
        text += s.body.slice(last);
        const pos = qr.start, end = src.selectionStart;
        src.value = src.value.slice(0, pos) + text + src.value.slice(end);
        pushHistory();
        const resolved = stops
            .map((st, n) => st && { start: pos + st.at, len: st.len, n })
            .filter(Boolean)
            .sort((a, b) => a.n - b.n);
        src.selectionStart = src.selectionEnd = pos + text.length;
        lastLen = src.value.length; lastCaret = pos + text.length; lastSel = pos + text.length;
        snipState = resolved.length ? { stops: resolved, idx: 0 } : null;
        closeAc();
        if (snipState) jumpStop(0);
        renderHighlight(); scheduleApply();
    }
    function jumpStop(i) {
        const st = snipState.stops[i];
        if (!st) { snipState = null; return; }
        snipState.idx = i;
        src.selectionStart = st.start;
        src.selectionEnd = st.start + st.len;
        /* sincroniza o rastreio do snippet com a nova posição do cursor */
        lastLen = src.value.length; lastCaret = st.start; lastSel = st.start + st.len;
    }
    /* mantém tabstops consistentes enquanto digita dentro do snippet */
    function snipAdjust(caretBefore, removed, inserted) {
        if (!snipState) return;
        const delta = inserted - removed;
        for (const st of snipState.stops) {
            if (st.start > caretBefore) st.start += delta;
            else if (st.start + st.len >= caretBefore) st.len += delta;
        }
    }


    /* ══════════ 17-gutter.js ══════════ */
    /* ══════════ gutter: numeração de linhas ══════════ */
    const gutter = document.getElementById('gutter'), gutterIn = document.getElementById('gutterIn');
    let gutterCount = -1;
    function updateGutter() {
        const n = src.value.split('\n').length;
        if (n !== gutterCount) {
            gutterCount = n;
            gutterIn.textContent = '';
            for (let i = 1; i <= n; i++) {
                const s = document.createElement('span');
                s.textContent = i;
                gutterIn.append(s);
            }
        }
        const line = src.value.slice(0, src.selectionStart).split('\n').length - 1;
        [...gutterIn.children].forEach((el, i) => el.classList.toggle('cur', i === line));
        gutterIn.style.transform = `translateY(${-src.scrollTop}px)`;
    }


    /* ══════════ 18-undo.js ══════════ */
    /* ══════════ undo / redo ══════════ */
    const undoStack = [], redoStack = [];
    let beforeState = null, lastPushAt = 0;
    const HIST_LIMIT = 150;
    const snapState = () => ({ value: src.value, s: src.selectionStart, e: src.selectionEnd });
    function pushHistory() {
        undoStack.push(snapState());
        if (undoStack.length > HIST_LIMIT) undoStack.shift();
        redoStack.length = 0;
        lastPushAt = Date.now();
    }
    function restoreState(h) {
        src.value = h.value;
        src.selectionStart = h.s; src.selectionEnd = h.e;
        lastLen = h.value.length; lastCaret = h.s; lastSel = h.e; snipState = null;
        beforeState = snapState();
        closeAc(); renderHighlight(); updateGutter(); scheduleApply();
    }
    function undo() {
        if (!undoStack.length) return;
        redoStack.push(snapState());
        restoreState(undoStack.pop());
    }
    function redo() {
        if (!redoStack.length) return;
        undoStack.push(snapState());
        restoreState(redoStack.pop());
    }


    /* ══════════ 19-editor-events.js ══════════ */
    /* ══════════ editor: eventos ══════════ */
    let applyT = null;
    function scheduleApply() {
        if (document.getElementById('snipMenu').classList.contains('open')) return; /* aguarda snippet ser resolvido */
        clearTimeout(applyT);
        applyT = setTimeout(() => {
            applySource(src.value);
        }, 600);
    }
    function applyNow(showToast) {
        const ok = applySource(src.value);
        if (showToast) toast(ok ? 'Diagrama atualizado' : 'Corrija os erros no código', ok ? '' : 'err');
    }
    let lastLen = src.value.length, lastCaret = 0, lastSel = 0;
    src.addEventListener('input', () => {
        /* digitação: agrupa rajadas de até 500ms num único passo de undo */
        if (Date.now() - lastPushAt > 500 && beforeState) {
            undoStack.push(beforeState);
            if (undoStack.length > HIST_LIMIT) undoStack.shift();
            redoStack.length = 0;
        }
        lastPushAt = Date.now();
        const pos = src.selectionStart;
        /* removidos = tamanho da seleção substituída; inseridos = crescimento do texto */
        const removed = Math.max(0, lastSel - lastCaret);
        const inserted = src.value.length - lastLen + removed;
        snipAdjust(lastCaret, removed, inserted);
        lastLen = src.value.length; lastCaret = pos; lastSel = src.selectionEnd;
        renderHighlight(); scheduleApply();
        renderAc();
        updateGutter();
        beforeState = snapState();
    });
    src.addEventListener('scroll', () => { hl.scrollTop = src.scrollTop; hl.scrollLeft = src.scrollLeft; closeAc(); gutterIn.style.transform = `translateY(${-src.scrollTop}px)`; });
    src.addEventListener('blur', () => setTimeout(closeAc, 120));
    src.addEventListener('click', () => { snipState = null; closeAc(); updateGutter(); editorFocusEntity(); });

    /* clique no editor → foca/destaca a entidade no canvas */
    function entityAtCaret(pos) {
        const lineStart = src.value.lastIndexOf('\n', pos - 1) + 1;
        let lineEnd = src.value.indexOf('\n', lineStart); if (lineEnd === -1) lineEnd = src.value.length;
        const line = src.value.slice(lineStart, lineEnd);
        /* 1) nome de entidade na própria linha (o mais próximo do cursor) */
        const col = pos - lineStart;
        const cands = [...line.matchAll(/[A-Za-z_][\w.\-]*/g)]
            .filter(m => byId[m[0]])
            .sort((a, b) => Math.abs(a.index - col) - Math.abs(b.index - col));
        if (cands.length) return cands[0][0];
        /* 2) dentro de um bloco ENT { ... } */
        let cur = null;
        for (const l of src.value.slice(0, lineStart).split('\n')) {
            const t = l.trim();
            const o = t.match(/^([A-Za-z_][\w.\-]*)\s*\{$/);
            if (o) cur = o[1];
            else if (/^\}+\s*$/.test(t)) cur = null;
        }
        return cur && byId[cur] ? cur : null;
    }
    function editorFocusEntity() {
        const name = entityAtCaret(src.selectionStart);
        const e = name && byId[name];
        if (!e || animating) return;
        if (selectedId !== name) { selectedId = name; updateFocus(); }
        const { rw, rh } = vs();
        const w = clamp(rw / 3.2, e.w * 3, rw / 1.6);
        animateCam({ x: e.x + e.w / 2 - w / 2, y: e.y + e.h / 2 - w * (rh / rw) / 2, w }, 420);
    }
    src.addEventListener('keydown', e => {
        const menuOpen = snipMenu.classList.contains('open');
        if (menuOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            acSel = (acSel + (e.key === 'ArrowDown' ? 1 : acList.length - 1)) % acList.length;
            [...snipMenu.children].forEach((el, i) => el.classList.toggle('on', i === acSel));
            snipMenu.children[acSel].scrollIntoView({ block: 'nearest' });
            return;
        }
        if (menuOpen && (e.key === 'Enter' || (e.key === 'Tab' && acCtx && acCtx.mode === 'slash'))) {
            e.preventDefault();
            acceptAc(acList[acSel]);
            return;
        }
        if (menuOpen && e.key === 'Tab') { e.preventDefault(); closeAc(); return; } /* fora do slash: Tab fecha menu e indentA */
        if (e.key === 'Escape' && menuOpen) { e.preventDefault(); closeAc(); return; }
        if (e.key === 'Escape' && snipState) { snipState = null; return; }

        /* Ctrl+Z desfaz · Ctrl+Shift+Z / Ctrl+Y refaz */
        if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
            e.preventDefault();
            if (e.shiftKey) redo(); else undo();
            return;
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); redo(); return; }

        /* Ctrl+I formata o código */
        if ((e.ctrlKey || e.metaKey) && (e.key === 'i' || e.key === 'I')) { e.preventDefault(); formatCode(); return; }
        /* Ctrl+X sem seleção = recorta a linha inteira */
        if ((e.ctrlKey || e.metaKey) && (e.key === 'x' || e.key === 'X') && src.selectionStart === src.selectionEnd) {
            e.preventDefault();
            pushHistory();
            const s = src.selectionStart;
            const ls = src.value.lastIndexOf('\n', s - 1) + 1;
            let le = src.value.indexOf('\n', s); if (le === -1) le = src.value.length; else le += 1;
            const cut = src.value.slice(ls, le);
            src.value = src.value.slice(0, ls) + src.value.slice(le);
            src.selectionStart = src.selectionEnd = Math.min(ls, src.value.length);
            navigator.clipboard?.writeText(cut).catch(() => { });
            lastLen = src.value.length; lastCaret = ls; lastSel = ls; snipState = null;
            renderHighlight(); updateGutter(); scheduleApply();
            return;
        }
        /* Enter com indentação automática: segue a linha de cima; abre bloco = +4 espaços */
        if (e.key === 'Enter' && !menuOpen && src.selectionStart === src.selectionEnd) {
            e.preventDefault();
            pushHistory();
            const s = src.selectionStart;
            const before = src.value.slice(0, s), after = src.value.slice(s);
            const ls = before.lastIndexOf('\n') + 1;
            const line = before.slice(ls);
            const indent = line.match(/^\s*/)[0];
            let ins = '\n' + indent, caret = s + ins.length;
            if (/\{\s*$/.test(line) && /^\s*\}/.test(after)) {
                ins = '\n' + indent + '    \n' + indent;              /* expande {|} */
                caret = s + 1 + indent.length + 4;
            } else if (/\{\s*$/.test(line)) {
                ins = '\n' + indent + '    ';
                caret = s + ins.length;
            }
            src.value = before + ins + after;
            src.selectionStart = src.selectionEnd = caret;
            lastLen = src.value.length; lastCaret = caret; lastSel = caret; snipState = null;
            renderHighlight(); updateGutter(); scheduleApply(); renderAc();
            return;
        }

        /* auto-fecho de { → insere } logo após (blocos de entidade) */
        if (e.key === '{') {
            const pos = src.selectionStart, after = src.value.slice(src.selectionEnd);
            if (/^([\s]|$)/.test(after) && src.selectionStart === src.selectionEnd) {
                e.preventDefault();
                pushHistory();
                src.value = src.value.slice(0, pos) + '{}' + src.value.slice(pos);
                src.selectionStart = src.selectionEnd = pos + 1;
                lastLen = src.value.length; lastCaret = pos + 1; lastSel = pos + 1;
                renderHighlight(); scheduleApply(); renderAc();
            }
            return;
        }
        if (e.key === '}') {
            /* se o próximo caractere é o } auto-inserido, só pula por cima */
            if (src.selectionStart === src.selectionEnd && src.value[src.selectionStart] === '}') {
                e.preventDefault();
                src.selectionStart = src.selectionEnd = src.selectionStart + 1;
            }
            return;
        }

        if (e.key === 'Tab') {
            e.preventDefault();
            const cur = snipState && snipState.stops[snipState.idx];
            /* está no campo atual se o cursor está dentro do range do placeholder
               (depois de digitar, o cursor fica colapsado no fim do texto) */
            if (snipState && cur && src.selectionStart >= cur.start && src.selectionEnd <= cur.start + cur.len && src.selectionEnd >= cur.start) {
                cur.len = src.selectionEnd - cur.start; /* consolida o que foi digitado */
                const nxt = snipState.idx + 1;
                if (nxt < snipState.stops.length) jumpStop(nxt);
                else { snipState = null; src.selectionStart = src.selectionEnd = cur.start + cur.len; }
                return;
            }
            snipState = null;
            const s = src.selectionStart, en = src.selectionEnd;
            if (s !== en) {
                /* indentação de bloco selecionado */
                const st = src.value.lastIndexOf('\n', s - 1) + 1;
                src.value = src.value.slice(0, st) + src.value.slice(st, en).replace(/^/gm, '    ') + src.value.slice(en);
                src.selectionStart = st; src.selectionEnd = en + 4 * (src.value.slice(st, en).split('\n').length);
            } else {
                src.value = src.value.slice(0, s) + '    ' + src.value.slice(en);
                src.selectionStart = src.selectionEnd = s + 4;
            }
            lastLen = src.value.length; lastCaret = src.selectionStart; lastSel = src.selectionEnd;
            renderHighlight(); scheduleApply();
        }
    });
    window.addEventListener('keydown', e => {
        if (e.key === 'Escape') { exportMenu.classList.remove('open'); toggleDocs(false); selectedId = null; updateFocus(); }
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); applyNow(true); }
        const tag = document.activeElement && document.activeElement.tagName;
        if (e.key === '?' && tag !== 'TEXTAREA' && tag !== 'INPUT') { e.preventDefault(); toggleDocs(); }
        if (!e.ctrlKey && !e.metaKey && !e.altKey && tag !== 'TEXTAREA' && (e.key === 'f' || e.key === 'F')) organize();
    });
    $('btnApply').onclick = () => applyNow(true);
    $('btnFormat').onclick = () => formatCode();
    $('btnOrganize').onclick = organize;
    const layoutSel = $('layoutSel');
    layoutSel.addEventListener('change', () => {
        store.set('layout', layoutSel.value);
        toast({ force: 'Organizando por forças', layered: 'Organizando em camadas', compact: 'Organizando compacto' }[layoutSel.value]);
        organize();
    });
    $('btnZoomIn').onclick = () => zoomBy(1.3);
    $('btnZoomOut').onclick = () => zoomBy(1 / 1.3);
    $('btnFit').onclick = () => fitView(true);
    zoomLbl.onclick = resetZoom;
    /* selecionar tipo → começa um diagrama em branco daquele tipo */
    const BLANK_HDR = { er: 'erDiagram\n', flow: 'flowchart TD\n', seq: 'sequenceDiagram\n', class: 'classDiagram\n' };
    $('typeSel').onchange = e => {
        const t = e.target.value;
        if (!t || !BLANK_HDR[t]) return;
        positions = {}; store.set('pos', '{}');
        src.value = BLANK_HDR[t];
        renderHighlight(); updateGutter();
        applySource(src.value, { resetLayout: true, mode: layoutSel.value });
        fitView(true);
        toast('Novo diagrama em branco — digite / no editor para snippets');
    };
    $('examples').onchange = e => {
        positions = {}; store.set('pos', '{}');
        src.value = EXAMPLES[+e.target.value].code;
        renderHighlight(); updateGutter();
        applySource(src.value, { resetLayout: true, animate: true, mode: layoutSel.value });
        fitView(true);
        toast(`Exemplo “${EXAMPLES[+e.target.value].name}” carregado`);
    };


    /* ══════════ 20-panel-resize.js ══════════ */
    /* ══════════ painel redimensionável ══════════ */
    const panelResize = $('panelResize');
    {
        const savedW = parseInt(store.get('panelW'));
        if (savedW >= 260 && savedW <= 720) panel.style.width = savedW + 'px';
    }
    panelResize.addEventListener('pointerdown', e => {
        if (panel.classList.contains('hidden')) return;
        e.preventDefault();
        panelResize.setPointerCapture(e.pointerId);
        panelResize.classList.add('dragging');
        panel.classList.add('resizing');
        const startX = e.clientX, startW = panel.getBoundingClientRect().width;
        const move = ev => {
            const w = clamp(Math.round(startW + (ev.clientX - startX)), 260, 720);
            panel.style.width = w + 'px';
        };
        const up = ev => {
            panelResize.releasePointerCapture(e.pointerId);
            panelResize.classList.remove('dragging');
            panel.classList.remove('resizing');
            panelResize.removeEventListener('pointermove', move);
            panelResize.removeEventListener('pointerup', up);
            store.set('panelW', String(clamp(Math.round(panel.getBoundingClientRect().width), 260, 720)));
            applyView();
        };
        panelResize.addEventListener('pointermove', move);
        panelResize.addEventListener('pointerup', up);
    });
    new ResizeObserver(() => applyView()).observe(canvas);


    /* ══════════ 21-docs.js ══════════ */
    /* ══════════ documentação: prévias e gabaritos ══════════ */
    function miniRel(lc, conn, rc) {
        const s = svgEl('svg', { class: 'mini-rel' + (conn === '..' ? ' dashed' : ''), viewBox: '0 0 176 34', width: 176, height: 34 });
        s.append(svgEl('rect', { x: 21, y: 8, width: 9, height: 20, rx: 2, class: 'mb' }));
        s.append(svgEl('rect', { x: 146, y: 8, width: 9, height: 20, rx: 2, class: 'mb' }));
        s.append(svgEl('path', { d: 'M30 18H146', class: 'ml' }));
        /* glifo esquerdo: ancorado na borda direita da caixa, aponta para a linha */
        const gl = svgEl('g', { transform: 'translate(30 18)' }); gl.append(crowGlyph(lc));
        /* glifo direito: ancorado na borda esquerda da caixa, aponta de volta */
        const gr = svgEl('g', { transform: 'translate(146 18) rotate(180)' }); gr.append(crowGlyph(rc));
        s.append(gl, gr);
        const tl = svgEl('text', { x: 58, y: 9, 'text-anchor': 'middle' }); tl.textContent = CARD_TEXT[lc];
        const tr = svgEl('text', { x: 118, y: 9, 'text-anchor': 'middle' }); tr.textContent = CARD_TEXT[rc];
        s.append(tl, tr);
        return s;
    }
    document.querySelectorAll('.mini[data-rel]').forEach(el => {
        const [lc, conn, rc] = el.dataset.rel.split(' ');
        el.append(miniRel(lc, conn, rc));
    });
    /* ── tabs da documentação ── */
    const docsTabs = $('docsTabs');
    const docsSections = [...document.querySelectorAll('#docs .docs-body section[data-tab]')];
    function setDocsTab(tab) {
        docsTabs.querySelectorAll('.dt-tab').forEach(b => {
            const on = b.dataset.tab === tab;
            b.classList.toggle('on', on);
            b.setAttribute('aria-selected', String(on));
        });
        docsSections.forEach(s => s.classList.toggle('on', s.dataset.tab === tab));
    }
    docsTabs.querySelectorAll('.dt-tab').forEach(b => b.onclick = () => setDocsTab(b.dataset.tab));
    setDocsTab('geral');

    function insertTemplate(tpl) {
        const s = src.selectionStart ?? src.value.length, e = src.selectionEnd ?? s;
        const before = src.value.slice(0, s), after = src.value.slice(e);
        const pad = before && !before.endsWith('\n') ? '\n' : '';
        src.value = before + pad + tpl + '\n' + after;
        renderHighlight();
        src.focus();
        const iA = src.value.indexOf('ENTIDADE_A', s);
        src.setSelectionRange(iA, iA + 10);
        scheduleApply();
        toggleDocs(false);
        toast('Gabarito inserido — substitua as entidades');
    }
    document.querySelectorAll('.chip[data-tpl]').forEach(b => b.addEventListener('click', () => insertTemplate(b.dataset.tpl)));


    /* ══════════ inicialização ══════════ */
    async function init() {
        setTheme(store.get('theme') || 'light');
        if (store.get('panel') === '0' || innerWidth < 861) panel.classList.add('hidden');
        try {
            await Promise.all([
                document.fonts.load('600 12px "Space Grotesk"'),
                document.fonts.load('500 12px "JetBrains Mono"'),
                document.fonts.load('400 11px "JetBrains Mono"'),
                document.fonts.load('italic 400 11px "JetBrains Mono"'),
                document.fonts.load('700 8.5px "JetBrains Mono"'),
                document.fonts.load('600 9.5px "JetBrains Mono"')
            ]);
        } catch (e) { }
        try { positions = JSON.parse(store.get('pos')) || {}; } catch (e) { positions = {}; }
        const shared = loadSharedCode();
        const saved = shared ?? store.get('code');
        src.value = saved ?? EXAMPLES[0].code;
        beforeState = snapState();
        const idx = EXAMPLES.findIndex(x => x.code === src.value);
        if (idx >= 0) $('examples').value = String(idx);
        renderHighlight();
        updateGutter();
        applyView();
        layoutSel.value = store.get('layout') || 'force';
        applySource(src.value, { resetLayout: !saved || !!shared, mode: layoutSel.value });
        fitView(true);
    }
    document.fonts.ready.then(init, init);

}
