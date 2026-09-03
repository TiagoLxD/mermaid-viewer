import { Button } from '../shared/Button';

/** Código de exemplo com highlight simples (<span class="kw">…</span>). */
function Code({ html }: { html: string }) {
    return <pre className="d-code" dangerouslySetInnerHTML={{ __html: html }} />;
}

const TABS = [
    { tab: 'geral', label: 'Geral' },
    { tab: 'er', label: 'ER' },
    { tab: 'flow', label: 'Fluxo' },
    { tab: 'seq', label: 'Sequência' },
    { tab: 'class', label: 'Classes' },
    { tab: 'pie', label: 'Pizza' },
    { tab: 'mindmap', label: 'Mindmap' },
    { tab: 'c4', label: 'C4' },
] as const;

/** Documentação da linguagem Mermaid (drawer lateral). */
export function DocsPanel() {
    return (
        <>
            <div id="docsBackdrop" />
            <aside id="docs" aria-label="Documentação da linguagem Mermaid ER">
                <div className="docs-head">
                    <span className="panel-title">referência · linguagem</span>
                    <Button
                        id="btnDocsClose"
                        variant="ghost"
                        modifier="icon-btn"
                        icon="x"
                        title="Fechar (Esc)"
                        aria-label="Fechar documentação"
                    />
                </div>

                <div id="docsTabs" role="tablist" aria-label="Tipo de diagrama">
                    {TABS.map(({ tab, label }) => (
                        <button
                            key={tab}
                            type="button"
                            className={`dt-tab${tab === 'geral' ? ' on' : ''}`}
                            data-tab={tab}
                            role="tab"
                            aria-selected={tab === 'geral'}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className="docs-body">
                    {/* ── geral ── */}
                    <section data-tab="geral">
                        <h4>Como funciona</h4>
                        <p>
                            O Meridian entende <b>sete tipos de diagrama</b> Mermaid. A primeira linha do código
                            define o tipo: <code>erDiagram</code>, <code>flowchart</code>,
                            <code>sequenceDiagram</code>,<code>classDiagram</code>, <code>pieDiagram</code>,{' '}
                            <code>mindmap</code> ou <code>C4Context</code>. Use o seletor <b>“Tipo…”</b> no topo
                            para começar com um exemplo de partida de cada tipo.
                        </p>
                    </section>

                    {/* ── er ── */}
                    <section data-tab="er">
                        <h4>Diagrama ER</h4>
                        <p>
                            Cada linha descreve uma <b>relação</b> entre duas entidades; cada bloco{' '}
                            <code>{'ENTIDADE { … }'}</code> lista os <b>atributos</b>. O diagrama é redesenhado
                            automaticamente conforme o código é digitado.
                        </p>
                        <Code
                            html={
                                '<span class="kw">erDiagram</span>\n        USUARIO ||--o{ PEDIDO : realiza\n\n        USUARIO {\n            int id PK\n            string email UK\n        }'
                            }
                        />
                    </section>

                    <section data-tab="er">
                        <h4>Anatomia de uma relação</h4>
                        <pre className="d-code">
                            {'&lt;entidade-A&gt; &lt;card1&gt;&lt;linha&gt;&lt;card2&gt; &lt;entidade-B&gt; : rótulo'}
                        </pre>
                        <p>
                            Em <code>{'USUARIO ||--o{ PEDIDO'}</code>, os símbolos da <b>ponta direita</b>{' '}
                            descrevem PEDIDO: <b>um USUARIO se relaciona com zero ou muitos PEDIDO</b>.
                        </p>
                        <p>
                            Leitura dos símbolos: pé de galinha <code>{'{'}</code> = muitos · círculo{' '}
                            <code>o</code> = zero · traço<code>|</code> = um. As etiquetas{' '}
                            <b>1 · 0..1 · 1..N · 0..N</b> próximas a cada ponta mostram a cardinalidade por
                            extenso, e o rótulo (<code>: realiza</code>) fica no meio da linha.
                        </p>
                    </section>

                    <section data-tab="er">
                        <h4>Cardinalidades</h4>
                        <div className="rel-row">
                            <code>|o · o|</code>
                            <div className="mini" data-rel="zero_one -- zero_one" />
                            <span>
                                zero ou um <b>0..1</b>
                            </span>
                        </div>
                        <div className="rel-row">
                            <code>||</code>
                            <div className="mini" data-rel="one -- one" />
                            <span>
                                exatamente um <b>1</b>
                            </span>
                        </div>
                        <div className="rel-row">
                            <code>{'}o · o{'}</code>
                            <div className="mini" data-rel="zero_more -- zero_more" />
                            <span>
                                zero ou muitos <b>0..N</b>
                            </span>
                        </div>
                        <div className="rel-row">
                            <code>{'}| · |{'}</code>
                            <div className="mini" data-rel="one_more -- one_more" />
                            <span>
                                um ou muitos <b>1..N</b>
                            </span>
                        </div>
                    </section>

                    <section data-tab="er">
                        <h4>Identificante × não-identificante</h4>
                        <p>
                            A <b>linha</b> entre as cardinalidades define o traço do vínculo:{' '}
                            <code>--</code> desenha linha<b>sólida</b> (identificante — o filho não existe sem o
                            pai) e <code>..</code> desenha linha<b>tracejada</b> (não-identificante — o filho
                            existe de forma independente).
                        </p>
                        <div className="rel-row">
                            <code>--</code>
                            <div className="mini" data-rel="one -- zero_more" />
                            <span>sólida · identificante</span>
                        </div>
                        <div className="rel-row">
                            <code>..</code>
                            <div className="mini" data-rel="one .. zero_more" />
                            <span>tracejada · não-identificante</span>
                        </div>
                    </section>

                    <section data-tab="er">
                        <h4>Atributos</h4>
                        <Code
                            html={
                                'USUARIO {\n        int id PK\n        string email UK\n        string telefone "opcional"\n    }'
                            }
                        />
                        <div className="keydef">
                            <span className="pill pk">PK</span> chave primária — destacada no diagrama
                        </div>
                        <div className="keydef">
                            <span className="pill fk">FK</span> chave estrangeira
                        </div>
                        <div className="keydef">
                            <span className="pill uk">UK</span> chave única
                        </div>
                        <p>
                            Texto entre <b>aspas</b> vira comentário do campo (exibido ao pairar o mouse sobre o
                            nome). Dica: passe o mouse sobre uma entidade para destacar todas as relações dela.
                        </p>
                    </section>

                    <section data-tab="er">
                        <h4>Inserir gabarito de relação</h4>
                        <p>Clique para inserir no código, na posição do cursor:</p>
                        <div className="chip-row">
                            <button
                                type="button"
                                className="chip"
                                data-tpl="ENTIDADE_A ||--|| ENTIDADE_B : relacionamento"
                            >
                                1 — 1
                            </button>
                            <button
                                type="button"
                                className="chip"
                                data-tpl="ENTIDADE_A ||--o{ ENTIDADE_B : relacionamento"
                            >
                                1 — N
                            </button>
                            <button
                                type="button"
                                className="chip"
                                data-tpl="ENTIDADE_A }o--|| ENTIDADE_B : relacionamento"
                            >
                                N — 1
                            </button>
                            <button
                                type="button"
                                className="chip"
                                data-tpl="ENTIDADE_A }o--o{ ENTIDADE_B : relacionamento"
                            >
                                N — N
                            </button>
                            <button
                                type="button"
                                className="chip"
                                data-tpl="ENTIDADE_A |o--o| ENTIDADE_B : relacionamento"
                            >
                                0..1 — 0..1
                            </button>
                            <button
                                type="button"
                                className="chip"
                                data-tpl="ENTIDADE_A ||..o{ ENTIDADE_B : relacionamento"
                            >
                                1 — N · tracejada
                            </button>
                        </div>
                    </section>

                    {/* ── flow ── */}
                    <section data-tab="flow">
                        <h4>Flowchart</h4>
                        <p>
                            Fluxos com <code>flowchart TD</code>. Cada nó tem um <b>id</b> e um formato:{' '}
                            <code>[texto]</code> retângulo, <code>(texto)</code> estádio (início/fim) e{' '}
                            <code>{'{'}texto{'}'}</code> losango (decisão). Setas <code>--&gt;</code> ligam os
                            nós; <code>-.-&gt;</code> deixa tracejada;<code>|texto|</code> entre as pontas coloca
                            um rótulo na seta.
                        </p>
                        <Code
                            html={
                                '<span class="kw">flowchart TD</span>\n        Inicio[Carrinho] --&gt; E{Estoque?}\n        E --&gt;|sim| PG[Pagar]\n        E -.&gt;|não| CA[Aguardar]\n        PG --&gt; Fim[(Enviado)]'
                            }
                        />
                    </section>

                    {/* ── seq ── */}
                    <section data-tab="seq">
                        <h4>Diagrama de sequência</h4>
                        <p>
                            Com <code>sequenceDiagram</code>, declare os participantes com{' '}
                            <code>participant</code> (ou<code>actor</code>, opcionalmente com{' '}
                            <code>as Apelido</code>). Mensagens ligam dois participantes:{' '}
                            <code>-&gt;&gt;</code> chamada sólida e <code>--&gt;&gt;</code> resposta tracejada,
                            sempre no formato <code>A -&gt;&gt; B : texto</code>. A ordem das linhas define a
                            ordem vertical das mensagens.
                        </p>
                        <Code
                            html={
                                '<span class="kw">sequenceDiagram</span>\n        participant U as Usuário\n        participant A as API\n        U -&gt;&gt; A: login(email, senha)\n        A --&gt;&gt; U: token JWT'
                            }
                        />
                    </section>

                    {/* ── class ── */}
                    <section data-tab="class">
                        <h4>Diagrama de classes</h4>
                        <p>
                            Com <code>classDiagram</code>, relações entre classes usam setas próprias:{' '}
                            <code>&lt;|--</code> herança, <code>*--</code> composição, <code>o--</code>{' '}
                            agregação, <code>--&gt;</code> dependência e <code>..</code> ligação tracejada. Blocos{' '}
                            <code>{'{'} …{'}'}</code> listam os membros (uma linha por membro).
                        </p>
                        <Code
                            html={
                                '<span class="kw">classDiagram</span>\n        Veiculo &lt;|-- Carro\n        Veiculo *-- Motor\n\n        class Carro {\n            +int portas\n            +abrirPortaMalas()\n        }'
                            }
                        />
                    </section>

                    {/* ── pie ── */}
                    <section data-tab="pie">
                        <h4>Diagrama de pizza</h4>
                        <p>
                            Com <code>pieDiagram</code>, cada fatia é uma linha <code>"Rótulo" : valor</code>. A
                            porcentagem aparece dentro da fatia; passe o mouse para ver o valor bruto. Título
                            opcional com<code>title …</code>.
                        </p>
                        <Code
                            html={
                                '<span class="kw">pieDiagram</span>\n        title Meu título\n        "Vendas" : 40\n        "Suporte" : 25\n        "Infra" : 15'
                            }
                        />
                    </section>

                    {/* ── mindmap ── */}
                    <section data-tab="mindmap">
                        <h4>Mapa mental</h4>
                        <p>
                            Com <code>mindmap</code>, a hierarquia é definida pela <b>indentação</b> (2 espaços
                            por nível). Os ramos saem alternando os lados da raiz, sem cruzar, com curvas e uma{' '}
                            <b>cor por ramo que muda a cada nível</b>. Linhas <code>::icon(…)</code> são
                            ignoradas. <b>Clique num nó</b> (no selo +/−) para recolher ou expandir o ramo dele.
                        </p>
                        <Code
                            html={
                                '<span class="kw">mindmap</span>\n        root((Tema))\n            Ramo A\n                Folha\n            Ramo B'
                            }
                        />
                    </section>

                    {/* ── c4 ── */}
                    <section data-tab="c4">
                        <h4>Modelo C4</h4>
                        <p>
                            Com <code>C4Context</code> (ou <code>C4Container</code>, <code>C4Component</code>,{' '}
                            <code>C4Dynamic</code>), declare atores e sistemas:{' '}
                            <code>Person(id, "Nome", "descrição")</code>, <code>System(id, "Nome", "descrição")</code>,
                            <code>SystemDb</code>, <code>SystemQueue</code>,{' '}
                            <code>Container(id, "Nome", "tech", "descrição")</code>, <code>Component</code>. O
                            sufixo<code>_Ext</code> marca elementos externos (borda tracejada). Relações:
                            <code>Rel(a, b, "descrição", "tecnologia")</code>.
                        </p>
                        <Code
                            html={
                                '<span class="kw">C4Context</span>\n        Person(user, "Cliente", "Usa o app")\n        System(app, "Aplicação", "Core do produto")\n        SystemDb(db, "Banco", "PostgreSQL")\n        Rel(user, app, "Usa", "HTTPS")\n        Rel(app, db, "Persiste", "SQL")'
                            }
                        />
                    </section>

                    {/* ── atalhos ── */}
                    <section data-tab="geral">
                        <h4>Atalhos</h4>
                        <div className="sc-row">
                            <span>Reorganizar o diagrama</span>
                            <span className="keys">
                                <span className="key">F</span>
                            </span>
                        </div>
                        <div className="sc-row">
                            <span>Modo prévia (travar tabelas)</span>
                            <span className="keys">
                                <span className="key">P</span>
                            </span>
                        </div>
                        <div className="sc-row">
                            <span>Aplicar o código</span>
                            <span className="keys">
                                <span className="key">Ctrl</span>
                                <span className="key">⏎</span>
                            </span>
                        </div>
                        <div className="sc-row">
                            <span>Enquadrar tudo</span>
                            <span className="keys">
                                <span className="key">duplo clique</span>
                            </span>
                        </div>
                        <div className="sc-row">
                            <span>Esta documentação</span>
                            <span className="keys">
                                <span className="key">?</span>
                            </span>
                        </div>
                        <div className="sc-row">
                            <span>Fechar painéis</span>
                            <span className="keys">
                                <span className="key">Esc</span>
                            </span>
                        </div>
                    </section>
                </div>
            </aside>
        </>
    );
}
