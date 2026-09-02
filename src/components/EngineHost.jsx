import { useEffect } from 'react';
import { mountEngine } from '../engine/engine.js';


export default function EngineHost() {
    useEffect(() => { mountEngine(); }, []);
    return (
        <>

            <header id="topbar">
                <div className="brand" aria-hidden="true">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
                        strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2.5" y="2.5" width="9.5" height="7" rx="2" />
                        <rect x="12" y="14.5" width="9.5" height="7" rx="2" />
                        <path d="M7.2 9.5v2.3a2.7 2.7 0 0 0 2.7 2.7H12" />
                        <path d="M12 12.4v4.2" />
                    </svg>
                    <span className="brand-name">Meridian</span>
                    <span className="brand-tag">diagramas entidade-relacionamento</span>
                </div>
                <div className="spacer" />
                <div className="top-actions">
                    <div className="select">
                        <select id="typeSel" aria-label="Tipo de diagrama para começar do zero">
                            <option value="">Tipo…</option>
                            <option value="er">Novo · ER</option>
                            <option value="flow">Novo · Flowchart</option>
                            <option value="seq">Novo · Sequência</option>
                            <option value="class">Novo · Classes</option>
                        </select>
                        <span data-icon="chevD" data-size="14" />
                    </div>
                    <div className="select">
                        <select id="examples" aria-label="Exemplos de diagramas">
                            <option value="0">E-commerce (ER)</option>
                            <option value="1">Fluxo de pedido</option>
                            <option value="2">Autenticação (seq.)</option>
                            <option value="3">Veículos (classes)</option>
                        </select>
                        <span data-icon="chevD" data-size="14" />
                    </div>
                    <span className="vsep" />
                    <button id="btnDocs" className="btn ghost icon-btn" data-icon="help" title="Ajuda: documentação da linguagem ( ? )"
                        aria-label="Ajuda / documentação"></button>
                    <button id="btnShare" className="btn ghost icon-btn" data-icon="users" title="Copiar link de compartilhamento do diagrama"
                        aria-label="Compartilhar"></button>
                    <div className="menu-wrap">
                        <button id="btnExport" className="btn primary"><span data-icon="download" data-size="15" /><span
                            className="b-label">Exportar</span><span data-icon="chevD" data-size="14" /></button>
                        <div id="exportMenu" className="menu">
                            <button data-x="mmd">Código Mermaid <small>arquivo .mmd para versionar</small></button>
                            <button data-x="svg">SVG <small>vetorial, editável em qualquer editor</small></button>
                            <button data-x="png">PNG <small>imagem rasterizada em 2×</small></button>
                            <label className="menu-opt"><input type="checkbox" id="optTransp" /> Fundo transparente</label>
                        </div>
                    </div>
                    <button id="btnTheme" className="btn ghost icon-btn" title="Alternar tema" aria-label="Alternar tema"></button>
                </div>
            </header>

            <main id="app">
                <aside id="panel">
                    <div className="panel-head">
                        <span className="panel-title">Editor Mermaid</span>
                        <div className="actions">
                            <button id="btnFormat" className="btn sm"><span data-icon="wand" data-size="13" />Formatar</button>
                            <button id="btnPanel" className="btn ghost icon-btn" data-icon="panel" title="Ocultar painel de código"
                                aria-label="Ocultar painel de código"></button>
                        </div>
                    </div>
                    <div className="code-wrap">
                        <pre id="hl" aria-hidden="true"><code id="hlcode"></code></pre>
                        <textarea id="src" spellCheck={false} autoComplete="off" wrap="off"
                            aria-label="Código Mermaid do diagrama"></textarea>
                        <div id="gutter" aria-hidden="true"><div id="gutterIn" /></div>
                        <div id="snipMenu" role="listbox" aria-label="Snippets Mermaid" />
                    </div>
                    <div className="panel-foot" id="parseFoot">
                        <span className="dot" id="parseDot" /><span id="parseText">pronto</span>
                    </div>
                </aside>
                <div id="panelResize" title="Arraste para redimensionar o painel de código" />

                <section id="stage">
                    <div id="canvas">
                        <button id="btnShowCode" className="btn ghost icon-btn" data-icon="panel"
                            title="Mostrar painel de código" aria-label="Mostrar painel de código"></button>
                        <svg id="scene">
                            <g id="gEdges"></g>
                            <g id="gTables"></g>
                            <g id="gTop"></g>
                            <g id="gGuides"></g>
                        </svg>
                        <div id="toolbar">
                            <select id="layoutSel" className="tb-select" title="Modo de organização automática">
                                <option value="layered">Hierárquico</option>
                                <option value="force">Orgânico</option>
                                <option value="compact">Compacta</option>
                            </select>
                            <button className="tb-btn" id="btnOrganize" data-icon="wand" title="Reorganizar no modo selecionado (F)"
                                aria-label="Reorganizar"></button>
                            <span className="tb-sep" />
                            <button className="tb-btn" id="btnZoomOut" data-icon="minus" title="Reduzir zoom"
                                aria-label="Reduzir zoom"></button>
                            <button className="tb-zoom" id="zoomLbl" title="Restaurar zoom para 100%">100%</button>
                            <button className="tb-btn" id="btnZoomIn" data-icon="plus" title="Ampliar zoom"
                                aria-label="Ampliar zoom"></button>
                            <span className="tb-sep" />
                            <button className="tb-btn" id="btnPreview" data-icon="unlock" title="Modo prévia: navegue sem mover tabelas (P)"
                                aria-label="Modo prévia" aria-pressed="false"></button>
                            <button className="tb-btn" id="btnFit" data-icon="fit" title="Enquadrar diagrama"
                                aria-label="Enquadrar"></button>
                        </div>
                        <svg id="minimap" aria-label="Minimapa">
                            <g id="mmContent"></g>
                            <rect id="mmView" rx="3" />
                        </svg>
                    </div>
                    <footer id="statusbar">
                        <span id="stats">—</span>
                        <span className="hints">arraste as tabelas · role para zoom · F reorganiza · duplo clique enquadra · ? abre
                            a documentação</span>
                    </footer>
                </section>
            </main>

            {/* ══════ documentação da linguagem ══════ */}
            <div id="docsBackdrop" />
            <aside id="docs" aria-label="Documentação da linguagem Mermaid ER">
                <div className="docs-head">
                    <span className="panel-title">referência · linguagem</span>
                    <button id="btnDocsClose" className="btn ghost icon-btn" data-icon="x" title="Fechar (Esc)"
                        aria-label="Fechar documentação"></button>
                </div>
                <div id="docsTabs" role="tablist" aria-label="Tipo de diagrama">
                    <button className="dt-tab on" data-tab="geral" role="tab" aria-selected="true">Geral</button>
                    <button className="dt-tab" data-tab="er" role="tab" aria-selected="false">ER</button>
                    <button className="dt-tab" data-tab="flow" role="tab" aria-selected="false">Fluxo</button>
                    <button className="dt-tab" data-tab="seq" role="tab" aria-selected="false">Sequência</button>
                    <button className="dt-tab" data-tab="class" role="tab" aria-selected="false">Classes</button>
                </div>
                <div className="docs-body">

                    <section data-tab="geral">
                        <h4>Como funciona</h4>
                        <p>O Meridian entende <b>quatro tipos de diagrama</b> Mermaid. A primeira linha do código define o
                            tipo: <code>erDiagram</code>, <code>flowchart</code>, <code>sequenceDiagram</code> ou
                            <code>classDiagram</code>. Use o seletor <b>“Tipo…”</b> no topo para começar um esqueleto em branco.</p>
                    </section>

                    <section data-tab="er">
                        <h4>Diagrama ER</h4>
                        <p>Cada linha descreve uma <b>relação</b> entre duas entidades; cada bloco <code>{'ENTIDADE { … }'}</code>
                            lista os <b>atributos</b>. O diagrama é redesenhado automaticamente conforme o código é digitado.
                        </p>
                        <pre className="d-code" dangerouslySetInnerHTML={{ __html: "<span className=\"kw\">erDiagram</span>\n        USUARIO ||--o{ PEDIDO : realiza\n\n        USUARIO {\n            int id PK\n            string email UK\n        }" }}></pre>
                    </section>

                    <section data-tab="er">
                        <h4>Anatomia de uma relação</h4>
                        <pre
                            className="d-code">&lt;entidade-A&gt; &lt;card1&gt;&lt;linha&gt;&lt;card2&gt; &lt;entidade-B&gt; : rótulo</pre>
                        <p>Em <code>{'USUARIO ||--o{ PEDIDO'}</code>, os símbolos da <b>ponta direita</b> descrevem PEDIDO: <b>um
                            USUARIO se relaciona com zero ou muitos PEDIDO</b>.</p>
                        <p>Leitura dos símbolos: pé de galinha <code>{'{'}</code> = muitos · círculo <code>o</code> = zero · traço
                            <code>|</code> = um. As etiquetas <b>1 · 0..1 · 1..N · 0..N</b> próximas a cada ponta mostram a
                            cardinalidade por extenso, e o rótulo (<code>: realiza</code>) fica no meio da linha.</p>
                    </section>

                    <section data-tab="er">
                        <h4>Cardinalidades</h4>
                        <div className="rel-row"><code>|o · o|</code>
                            <div className="mini" data-rel="zero_one -- zero_one" /><span>zero ou um <b>0..1</b></span>
                        </div>
                        <div className="rel-row"><code>||</code>
                            <div className="mini" data-rel="one -- one" /><span>exatamente um <b>1</b></span>
                        </div>
                        <div className="rel-row"><code>{'}o · o{'}</code>
                            <div className="mini" data-rel="zero_more -- zero_more" /><span>zero ou muitos <b>0..N</b></span>
                        </div>
                        <div className="rel-row"><code>{'}| · |{'}</code>
                            <div className="mini" data-rel="one_more -- one_more" /><span>um ou muitos <b>1..N</b></span>
                        </div>
                    </section>

                    <section data-tab="er">
                        <h4>Identificante × não-identificante</h4>
                        <p>A <b>linha</b> entre as cardinalidades define o traço do vínculo: <code>--</code> desenha linha
                            <b>sólida</b> (identificante — o filho não existe sem o pai) e <code>..</code> desenha linha
                            <b>tracejada</b> (não-identificante — o filho existe de forma independente).</p>
                        <div className="rel-row"><code>--</code>
                            <div className="mini" data-rel="one -- zero_more" /><span>sólida · identificante</span>
                        </div>
                        <div className="rel-row"><code>..</code>
                            <div className="mini" data-rel="one .. zero_more" /><span>tracejada · não-identificante</span>
                        </div>
                    </section>

                    <section data-tab="er">
                        <h4>Atributos</h4>
                        <pre className="d-code" dangerouslySetInnerHTML={{ __html: "USUARIO {\n        int id PK\n        string email UK\n        string telefone \"opcional\"\n    }" }}></pre>
                        <div className="keydef"><span className="pill pk">PK</span> chave primária — destacada no diagrama</div>
                        <div className="keydef"><span className="pill fk">FK</span> chave estrangeira</div>
                        <div className="keydef"><span className="pill uk">UK</span> chave única</div>
                        <p>Texto entre <b>aspas</b> vira comentário do campo (exibido ao pairar o mouse sobre o nome). Dica:
                            passe o mouse sobre uma entidade para destacar todas as relações dela.</p>
                    </section>

                    <section data-tab="er">
                        <h4>Inserir gabarito de relação</h4>
                        <p>Clique para inserir no código, na posição do cursor:</p>
                        <div className="chip-row">
                            <button className="chip" data-tpl="ENTIDADE_A ||--|| ENTIDADE_B : relacionamento">1 — 1</button>
                            <button className="chip" data-tpl="ENTIDADE_A ||--o{ ENTIDADE_B : relacionamento">1 — N</button>
                            <button className="chip" data-tpl="ENTIDADE_A }o--|| ENTIDADE_B : relacionamento">N — 1</button>
                            <button className="chip" data-tpl="ENTIDADE_A }o--o{ ENTIDADE_B : relacionamento">N — N</button>
                            <button className="chip" data-tpl="ENTIDADE_A |o--o| ENTIDADE_B : relacionamento">0..1 — 0..1</button>
                            <button className="chip" data-tpl="ENTIDADE_A ||..o{ ENTIDADE_B : relacionamento">1 — N ·
                                tracejada</button>
                        </div>
                    </section>

                    <section data-tab="flow">
                        <h4>Flowchart</h4>
                        <p>Fluxos com <code>flowchart TD</code>. Cada nó tem um <b>id</b> e um formato: <code>[texto]</code>
                            retângulo, <code>(texto)</code> estádio (início/fim) e <code>{'{'}texto{'}'}</code> losango
                            (decisão). Setas <code>--&gt;</code> ligam os nós; <code>-.-&gt;</code> deixa tracejada;
                            <code>|texto|</code> entre as pontas coloca um rótulo na seta.</p>
                        <pre className="d-code" dangerouslySetInnerHTML={{ __html: "<span className=\"kw\">flowchart TD</span>\n        Inicio[Carrinho] --&gt; E{Estoque?}\n        E --&gt;|sim| PG[Pagar]\n        E -.&gt;|não| CA[Aguardar]\n        PG --&gt; Fim[(Enviado)]" }}></pre>
                    </section>

                    <section data-tab="seq">
                        <h4>Diagrama de sequência</h4>
                        <p>Com <code>sequenceDiagram</code>, declare os participantes com <code>participant</code> (ou
                            <code>actor</code>, opcionalmente com <code>as Apelido</code>). Mensagens ligam dois
                            participantes: <code>-&gt;&gt;</code> chamada sólida e <code>--&gt;&gt;</code> resposta
                            tracejada, sempre no formato <code>A -&gt;&gt; B : texto</code>. A ordem das linhas define a
                            ordem vertical das mensagens.</p>
                        <pre className="d-code" dangerouslySetInnerHTML={{ __html: "<span className=\"kw\">sequenceDiagram</span>\n        participant U as Usuário\n        participant A as API\n        U -&gt;&gt; A: login(email, senha)\n        A --&gt;&gt; U: token JWT" }}></pre>
                    </section>

                    <section data-tab="class">
                        <h4>Diagrama de classes</h4>
                        <p>Com <code>classDiagram</code>, relações entre classes usam setas próprias: <code>&lt;|--</code>
                            herança, <code>*--</code> composição, <code>o--</code> agregação, <code>--&gt;</code>
                            dependência e <code>..</code> ligação tracejada. Blocos <code>{'{'} …{'}'}</code> listam os
                            membros (uma linha por membro).</p>
                        <pre className="d-code" dangerouslySetInnerHTML={{ __html: "<span className=\"kw\">classDiagram</span>\n        Veiculo &lt;|-- Carro\n        Veiculo *-- Motor\n\n        class Carro {\n            +int portas\n            +abrirPortaMalas()\n        }" }}></pre>
                    </section>

                    <section data-tab="geral">
                        <h4>Atalhos</h4>
                        <div className="sc-row"><span>Reorganizar o diagrama</span><span className="keys"><span
                            className="key">F</span></span></div>
                        <div className="sc-row"><span>Modo prévia (travar tabelas)</span><span className="keys"><span
                            className="key">P</span></span></div>
                        <div className="sc-row"><span>Aplicar o código</span><span className="keys"><span className="key">Ctrl</span><span
                            className="key">⏎</span></span></div>
                        <div className="sc-row"><span>Enquadrar tudo</span><span className="keys"><span className="key">duplo
                            clique</span></span></div>
                        <div className="sc-row"><span>Esta documentação</span><span className="keys"><span className="key">?</span></span>
                        </div>
                        <div className="sc-row"><span>Fechar painéis</span><span className="keys"><span className="key">Esc</span></span>
                        </div>
                    </section>

                </div>
            </aside>

            <div id="toasts" />

        </>
    );
}
