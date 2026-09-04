import { useEffect, useRef, useState } from 'react';
import { Button } from '../shared/Button';
import { Icon } from '../shared/Icon';
import { Select, type SelectOption } from '../shared/Select';
import { publishTransparent, requestExport, requestNew, requestOpenFile, type ExportFormat } from '../state/ui-bus';

type MenuId = 'export' | 'new' | null;

const DIAGRAM_TYPES: SelectOption[] = [
    { value: 'er', label: 'ER' },
    { value: 'flow', label: 'Flowchart' },
    { value: 'seq', label: 'Sequência' },
    { value: 'class', label: 'Classes' },
    { value: 'pie', label: 'Pizza' },
    { value: 'mindmap', label: 'Mindmap' },
    { value: 'c4', label: 'C4' },
];

const EXAMPLES: SelectOption[] = [
    { value: '0', label: 'E-commerce (ER)' },
    { value: '1', label: 'Fluxo de pedido' },
    { value: '2', label: 'Autenticação (seq.)' },
    { value: '3', label: 'Veículos (classes)' },
    { value: '4', label: 'Distribuição de tempo (pizza)' },
    { value: '5', label: 'Mapa mental' },
    { value: '6', label: 'Contexto C4' },
];

const EXPORT_FORMATS: { x: ExportFormat; label: string; hint: string }[] = [
    { x: 'mmd', label: 'Código Mermaid', hint: 'arquivo .mmd para versionar' },
    { x: 'svg', label: 'SVG', hint: 'vetorial, editável em qualquer editor' },
    { x: 'png', label: 'PNG', hint: 'imagem rasterizada em 2×' },
];

export function TopBar() {
    /* menus: estado 100% React; engine só recebe pedidos via bus */
    const [openMenu, setOpenMenu] = useState<MenuId>(null);
    const [transp, setTransp] = useState(false);
    const barRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        const close = (e: MouseEvent) => {
            if (barRef.current && !barRef.current.contains(e.target as Node)) setOpenMenu(null);
        };
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, []);

    const toggle = (id: Exclude<MenuId, null>) =>
        setOpenMenu((cur) => (cur === id ? null : id));
    const doExport = (x: ExportFormat) => { setOpenMenu(null); requestExport(x); };
    const doNew = (t: string) => { setOpenMenu(null); requestNew(t); };

    return (
        <header id="topbar" ref={barRef}>
            <div className="brand" aria-hidden="true">
                <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <rect x="2.5" y="2.5" width="9.5" height="7" rx="2" />
                    <rect x="12" y="14.5" width="9.5" height="7" rx="2" />
                    <path d="M7.2 9.5v2.3a2.7 2.7 0 0 0 2.7 2.7H12" />
                    <path d="M12 12.4v4.2" />
                </svg>
                <span className="brand-name">Meridian</span>
                <span className="brand-tag">diagramas entidade-relacionamento</span>
            </div>

            {/* ── grupo arquivo: novo / limpar / exemplos ── */}
            <div className="tb-group" role="toolbar" aria-label="Arquivo">
                <div className="menu-wrap">
                    <Button
                        id="btnNew"
                        variant="ghost"
                        aria-haspopup="menu"
                        aria-expanded={openMenu === 'new'}
                        onClick={() => toggle('new')}
                    >
                        <Icon name="filePlus" size={15} />
                        <span className="b-label">Novo</span>
                        <Icon name="chevD" size={13} className="chev" />
                    </Button>
                    {openMenu === 'new' && (
                        <div id="newMenu" className="menu open" role="menu">
                            <div className="menu-title">Criar novo diagrama</div>
                            {DIAGRAM_TYPES.map((t) => (
                                <button key={t.value} type="button" role="menuitem" onClick={() => doNew(t.value)}>
                                    {t.label}
                                </button>
                            ))}
                            <div className="menu-sep" role="separator" />
                            <button type="button" role="menuitem" className="danger" onClick={() => doNew('blank')}>
                                <Icon name="trash" size={14} /> Limpar tudo
                            </button>
                        </div>
                    )}
                </div>

                <Button id="btnOpen" variant="ghost" title="Abrir arquivo .mmd/.mermaid" onClick={() => { setOpenMenu(null); requestOpenFile(); }}>
                    <Icon name="upload" size={14} />
                    <span className="b-label">Abrir</span>
                </Button>

                <span className="vsep" />

                <Select
                    id="examples"
                    aria-label="Exemplos de diagramas"
                    options={EXAMPLES}
                />
            </div>

            <div className="spacer" />

            {/* ── grupo ações: ajuda, compartilhar, exportar, tema ── */}
            <div className="top-actions tb-group" role="toolbar" aria-label="Ações">
                <Button
                    id="btnDocs"
                    variant="ghost"
                    modifier="icon-btn"
                    icon="help"
                    title="Ajuda: documentação da linguagem ( ? )"
                    aria-label="Ajuda / documentação"
                />
                <Button
                    id="btnShare"
                    variant="ghost"
                    modifier="icon-btn"
                    icon="users"
                    title="Copiar link de compartilhamento do diagrama"
                    aria-label="Compartilhar"
                />

                <span className="vsep" />

                <div className="menu-wrap">
                    <Button
                        id="btnExport"
                        variant="primary"
                        aria-haspopup="menu"
                        aria-expanded={openMenu === 'export'}
                        onClick={(e) => { e.stopPropagation(); toggle('export'); }}
                    >
                        <Icon name="download" size={15} />
                        <span className="b-label">Exportar</span>
                        <Icon name="chevD" size={14} />
                    </Button>
                    {openMenu === 'export' && (
                        <div id="exportMenu" className="menu open">
                            {EXPORT_FORMATS.map(({ x, label, hint }) => (
                                <button key={x} type="button" onClick={() => doExport(x)}>
                                    {label} <small>{hint}</small>
                                </button>
                            ))}
                            <label className="menu-opt">
                                <input
                                    type="checkbox"
                                    checked={transp}
                                    onChange={(e) => { setTransp(e.target.checked); publishTransparent(e.target.checked); }}
                                />{' '}Fundo transparente
                            </label>
                        </div>
                    )}
                </div>

                <Button
                    id="btnTheme"
                    variant="ghost"
                    modifier="icon-btn"
                    title="Alternar tema"
                    aria-label="Alternar tema"
                >
                    <span className="i-sun"><Icon name="sun" /></span>
                    <span className="i-moon"><Icon name="moon" /></span>
                </Button>
            </div>
        </header>
    );
}
