'use strict';
const vscode = require('vscode');

const VIEW = 'meridian.viewer';

function getNonce() {
  let t = '';
  const p = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) t += p.charAt(Math.floor(Math.random() * p.length));
  return t;
}

class ErDocument {
  constructor(uri) { this.uri = uri; }
  dispose() {}
}

class ErProvider {
  constructor(context) {
    this.ctx = context;
    this.panels = new Map();   // uriKey -> WebviewPanel
    this.pending = new Map();  // uriKey -> resolve do Ctrl+S
  }

  async openCustomDocument(uri) { return new ErDocument(uri); }

  async resolveCustomEditor(document, panel) {
    const key = document.uri.toString();
    panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.ctx.extensionUri, 'media')]
    };
    panel.webview.html = this.buildHtml(panel.webview, document.uri);

    this.panels.set(key, panel);
    panel.onDidDispose(() => this.panels.delete(key));

    panel.webview.onDidReceiveMessage(m => this.onMessage(document, panel, m));

    // sincroniza edições feitas fora do preview (outro editor, git, etc.)
    const sub = vscode.workspace.onDidChangeTextDocument(e => {
      if (e.document.uri.toString() === key && e.contentChanges) this.push(panel, document.uri);
    });
    panel.onDidDispose(() => sub.dispose());
  }

  push(panel, uri) {
    vscode.workspace.openTextDocument(uri).then(td => {
      panel.webview.postMessage({ type: 'update', code: td.getText() });
    }, () => {});
  }

  async onMessage(document, panel, m) {
    const key = document.uri.toString();
    if (m.type === 'ready') {
      this.push(panel, document.uri);
    } else if (m.type === 'save') {
      const res = this.pending.get(key);
      if (res) { this.pending.delete(key); res(); }
      await this.write(document.uri, m.code);
      panel.webview.postMessage({ type: 'saved' });
    } else if (m.type === 'savePos') {
      this.ctx.workspaceState.update('meridian.pos:' + key, m.pos || {});
    } else if (m.type === 'prefs') {
      this.ctx.globalState.update('meridian.prefs', m.prefs || {});
    }
  }

  async write(uri, code) {
    try {
      const td = await vscode.workspace.openTextDocument(uri);
      if (td.getText() === code) return;
      const we = new vscode.WorkspaceEdit();
      we.replace(uri,
        new vscode.Range(td.positionAt(0), td.positionAt(td.getText().length)),
        code);
      await vscode.workspace.applyEdit(we);
      await td.save();
    } catch (e) {
      vscode.window.showErrorMessage('Meridian: falha ao salvar — ' + e.message);
    }
  }

  /* Ctrl+S do VS Code sobre o editor customizado */
  async saveCustomDocument(document, cancellation) {
    const key = document.uri.toString();
    const panel = this.panels.get(key);
    if (panel && !cancellation.isCancellationRequested) {
      await new Promise(res => {
        const to = setTimeout(() => { this.pending.delete(key); res(); }, 800);
        this.pending.set(key, () => { clearTimeout(to); this.pending.delete(key); res(); });
        panel.webview.postMessage({ type: 'requestSave' });
      });
    }
    const td = await vscode.workspace.openTextDocument(document.uri);
    await this.write(document.uri, td.getText());
  }

  async saveCustomDocumentAs(document, destUri, cancellation) {
    const td = await vscode.workspace.openTextDocument(document.uri);
    await this.write(destUri, td.getText());
  }

  async revertCustomDocument() { /* o preview lê do disco via push */ }

  async backupCustomDocument(document, context) {
    return { id: String(Date.now()), delete: () => {} };
  }

  buildHtml(webview, uri) {
    const css = webview.asWebviewUri(vscode.Uri.joinPath(this.ctx.extensionUri, 'media', 'app.css'));
    const js  = webview.asWebviewUri(vscode.Uri.joinPath(this.ctx.extensionUri, 'media', 'app.js'));
    const nonce = getNonce();

    const kind = vscode.window.activeColorTheme.kind;
    const isDark = kind === vscode.ColorThemeKind.Dark || kind === vscode.ColorThemeKind.HighContrast;

    let code = '';
    try { code = vscode.workspace.textDocuments.find(d => d.uri.toString() === uri.toString())?.getText() ?? ''; } catch (e) {}
    if (!code) {
      try { code = require('fs').readFileSync(uri.fsPath, 'utf8'); } catch (e) {}
    }

    const initial = {
      code,
      theme: isDark ? 'dark' : 'light',
      positions: this.ctx.workspaceState.get('meridian.pos:' + uri.toString()) || {},
      prefs: this.ctx.globalState.get('meridian.prefs') || {}
    };
    const json = JSON.stringify(initial).replace(/</g, '\\u003c');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline' https://fonts.googleapis.com; font-src ${webview.cspSource} https://fonts.gstatic.com; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} data: blob:; connect-src https://fonts.googleapis.com https://fonts.gstatic.com;">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">
<link href="${css}" rel="stylesheet">
<script nonce="${nonce}">window.__INITIAL__=${json};</script>
</head>
<body>
<header id="topbar">
  <div class="brand" aria-hidden="true">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2.5" y="2.5" width="9.5" height="7" rx="2"/>
      <rect x="12" y="14.5" width="9.5" height="7" rx="2"/>
      <path d="M7.2 9.5v2.3a2.7 2.7 0 0 0 2.7 2.7H12"/>
      <path d="M12 12.4v4.2"/>
    </svg>
    <span class="brand-name">Meridian</span>
    <span class="brand-tag">.mmd</span>
  </div>
  <div class="spacer"></div>
  <div class="top-actions">
    <div class="select">
      <select id="examples" aria-label="Exemplos">
        <option value="0">E-commerce</option>
        <option value="1">Blog</option>
        <option value="2">Streaming</option>
      </select>
      <span data-icon="chevD" data-size="14"></span>
    </div>
    <span class="vsep"></span>
    <button id="btnDocs" class="btn ghost icon-btn" data-icon="book" title="Documentação da linguagem ( ? )" aria-label="Documentação"></button>
    <button id="btnPanel" class="btn ghost icon-btn" data-icon="panel" title="Mostrar / ocultar código" aria-label="Painel de código"></button>
    <button id="btnCopy" class="btn ghost icon-btn" data-icon="copy" title="Copiar código" aria-label="Copiar código"></button>
    <div class="menu-wrap">
      <button id="btnExport" class="btn primary"><span data-icon="download" data-size="15"></span><span class="b-label">Exportar</span><span data-icon="chevD" data-size="14"></span></button>
      <div id="exportMenu" class="menu">
        <button data-x="svg">SVG <small>vetorial</small></button>
        <button data-x="png">PNG <small>rasterizado em 2×</small></button>
      </div>
    </div>
    <button id="btnTheme" class="btn ghost icon-btn" title="Alternar tema" aria-label="Alternar tema"></button>
  </div>
</header>
<main id="app">
  <aside id="panel">
    <div class="panel-head">
      <span class="panel-title">código mermaid</span>
      <div class="actions">
        <button id="btnFormat" class="btn sm"><span data-icon="wand" data-size="13"></span>Formatar</button>
        <button id="btnApply" class="btn sm primary">Salvar <span class="kbd">⏎</span></button>
      </div>
    </div>
    <div class="code-wrap">
      <pre id="hl" aria-hidden="true"><code id="hlcode"></code></pre>
      <textarea id="src" spellcheck="false" autocomplete="off" wrap="off" aria-label="Código Mermaid"></textarea>
    </div>
    <div class="panel-foot" id="parseFoot">
      <span class="dot" id="parseDot"></span><span id="parseText">pronto</span>
      <span id="saveState"></span>
    </div>
  </aside>
  <section id="stage">
    <div id="canvas">
      <svg id="scene">
        <g id="gEdges"></g>
        <g id="gTables"></g>
        <g id="gTop"></g>
        <g id="gGuides"></g>
      </svg>
      <div id="toolbar">
        <select id="layoutSel" class="tb-select" title="Modo de organização">
          <option value="force">Forças</option>
          <option value="layered">Camadas</option>
          <option value="compact">Compacta</option>
        </select>
        <button class="tb-btn" id="btnOrganize" data-icon="wand" title="Reorganizar (F)" aria-label="Reorganizar"></button>
        <span class="tb-sep"></span>
        <button class="tb-btn" id="btnZoomOut" data-icon="minus" title="Reduzir" aria-label="Reduzir"></button>
        <button class="tb-zoom" id="zoomLbl" title="Zoom 100%">100%</button>
        <button class="tb-btn" id="btnZoomIn" data-icon="plus" title="Ampliar" aria-label="Ampliar"></button>
        <span class="tb-sep"></span>
        <button class="tb-btn" id="btnFit" data-icon="fit" title="Enquadrar" aria-label="Enquadrar"></button>
      </div>
      <svg id="minimap" aria-label="Minimapa">
        <g id="mmContent"></g>
        <rect id="mmView" rx="3"/>
      </svg>
    </div>
    <footer id="statusbar">
      <span id="stats">—</span>
      <span class="hints">arraste as tabelas · role para zoom · F reorganiza · duplo clique enquadra</span>
    </footer>
  </section>
</main>
<div id="docsBackdrop"></div>
<aside id="docs" aria-label="Documentação">
  <div class="docs-head">
    <span class="panel-title">referência · erDiagram</span>
    <button id="btnDocsClose" class="btn ghost icon-btn" data-icon="x" title="Fechar (Esc)" aria-label="Fechar"></button>
  </div>
  <div class="docs-body">
    <section>
      <h4>Como funciona</h4>
      <p>Este editor grava direto no arquivo <code>.mmd</code> aberto — as alterações aparecem no Git e em qualquer outro editor aberto.</p>
      <pre class="d-code"><span class="kw">erDiagram</span>
    USUARIO ||--o{ PEDIDO : realiza

    USUARIO {
        int id PK
        string email UK
    }</pre>
    </section>
    <section>
      <h4>Anatomia de uma relação</h4>
      <pre class="d-code">&lt;A&gt; &lt;card1&gt;&lt;linha&gt;&lt;card2&gt; &lt;B&gt; : rótulo</pre>
      <p>Em <code>USUARIO ||--o{ PEDIDO</code>, os símbolos da ponta direita descrevem PEDIDO: <b>um USUARIO tem zero ou muitos PEDIDO</b>. Pé de galinha <code>{</code> = muitos · círculo <code>o</code> = zero · traço <code>|</code> = um. As etiquetas <b>1 · 0..1 · 1..N · 0..N</b> deixam a cardinalidade explícita.</p>
    </section>
    <section>
      <h4>Cardinalidades</h4>
      <div class="rel-row"><code>|o · o|</code><div class="mini" data-rel="zero_one -- zero_one"></div><span>zero ou um <b>0..1</b></span></div>
      <div class="rel-row"><code>||</code><div class="mini" data-rel="one -- one"></div><span>exatamente um <b>1</b></span></div>
      <div class="rel-row"><code>}o · o{</code><div class="mini" data-rel="zero_more -- zero_more"></div><span>zero ou muitos <b>0..N</b></span></div>
      <div class="rel-row"><code>}| · |{</code><div class="mini" data-rel="one_more -- one_more"></div><span>um ou muitos <b>1..N</b></span></div>
    </section>
    <section>
      <h4>Identificante × não-identificante</h4>
      <p><code>--</code> desenha linha <b>sólida</b> (identificante) e <code>..</code> desenha <b>tracejada</b> (não-identificante).</p>
      <div class="rel-row"><code>--</code><div class="mini" data-rel="one -- zero_more"></div><span>sólida · identificante</span></div>
      <div class="rel-row"><code>..</code><div class="mini" data-rel="one .. zero_more"></div><span>tracejada · não-identificante</span></div>
    </section>
    <section>
      <h4>Atributos</h4>
      <div class="keydef"><span class="pill pk">PK</span> chave primária</div>
      <div class="keydef"><span class="pill fk">FK</span> chave estrangeira</div>
      <div class="keydef"><span class="pill uk">UK</span> chave única</div>
      <p>Texto entre <b>aspas</b> vira comentário do campo. Passe o mouse sobre uma entidade para destacar as relações dela.</p>
    </section>
    <section>
      <h4>Organização automática</h4>
      <p><code>F</code> (ou a varinha) reorganiza no modo do seletor: <b>Forças</b> (grafo orgânico), <b>Camadas</b> (hierarquia pais → filhas) e <b>Compacta</b> (grade densa). As posições ficam salvas por arquivo.</p>
    </section>
    <section>
      <h4>Gabaritos</h4>
      <div class="chip-row">
        <button class="chip" data-tpl="ENTIDADE_A ||--|| ENTIDADE_B : relacionamento">1 — 1</button>
        <button class="chip" data-tpl="ENTIDADE_A ||--o{ ENTIDADE_B : relacionamento">1 — N</button>
        <button class="chip" data-tpl="ENTIDADE_A }o--|| ENTIDADE_B : relacionamento">N — 1</button>
        <button class="chip" data-tpl="ENTIDADE_A }o--o{ ENTIDADE_B : relacionamento">N — N</button>
        <button class="chip" data-tpl="ENTIDADE_A |o--o| ENTIDADE_B : relacionamento">0..1 — 0..1</button>
        <button class="chip" data-tpl="ENTIDADE_A ||..o{ ENTIDADE_B : relacionamento">1 — N · tracejada</button>
      </div>
    </section>
    <section>
      <h4>Atalhos</h4>
      <div class="sc-row"><span>Reorganizar</span><span class="keys"><span class="key">F</span></span></div>
      <div class="sc-row"><span>Salvar no arquivo</span><span class="keys"><span class="key">Ctrl</span><span class="key">S</span></span></div>
      <div class="sc-row"><span>Aplicar o código</span><span class="keys"><span class="key">Ctrl</span><span class="key">⏎</span></span></div>
      <div class="sc-row"><span>Enquadrar</span><span class="keys"><span class="key">duplo clique</span></span></div>
      <div class="sc-row"><span>Fechar painéis</span><span class="keys"><span class="key">Esc</span></span></div>
    </section>
  </div>
</aside>
<div id="toasts"></div>
<script nonce="${nonce}" src="${js}"></script>
</body>
</html>`;
  }
}

function activate(context) {
  const provider = new ErProvider(context);
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(VIEW, provider, {
      webviewOptions: { retainContextWhenHidden: true },
      supportsMultipleEditorsPerDocument: false
    }),
    vscode.commands.registerCommand('meridian.openPreview', async () => {
      const ae = vscode.window.activeTextEditor;
      if (!ae) return;
      await vscode.commands.executeCommand('vscode.openWith', ae.document.uri, VIEW, vscode.ViewColumn.Beside);
    }),
    // segue trocas de tema do VS Code (se o usuário não fixou um tema)
    vscode.window.onDidChangeActiveColorTheme(t => {
      const dark = t.kind === vscode.ColorThemeKind.Dark || t.kind === vscode.ColorThemeKind.HighContrast;
      const prefs = context.globalState.get('meridian.prefs') || {};
      if (prefs.theme) return; // usuário fixou manualmente
      for (const p of provider.panels.values())
        p.webview.postMessage({ type: 'theme', value: dark ? 'dark' : 'light' });
    })
  );
}

function deactivate() {}

module.exports = { activate, deactivate };