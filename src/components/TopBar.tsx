import { Button } from '../shared/Button';
import { Icon } from '../shared/Icon';
import { Select, type SelectOption } from '../shared/Select';

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

const EXPORT_FORMATS: { x: 'mmd' | 'svg' | 'png'; label: string; hint: string }[] = [
    { x: 'mmd', label: 'Código Mermaid', hint: 'arquivo .mmd para versionar' },
    { x: 'svg', label: 'SVG', hint: 'vetorial, editável em qualquer editor' },
    { x: 'png', label: 'PNG', hint: 'imagem rasterizada em 2×' },
];

export function TopBar() {
    return (
        <header id="topbar">
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

            <div className="spacer" />

            <div className="top-actions">
                <Select
                    id="typeSel"
                    aria-label="Tipo de diagrama para começar do zero"
                    placeholder="Tipo…"
                    options={DIAGRAM_TYPES}
                />
                <Select 
                    id="examples" 
                    aria-label="Exemplos de diagramas" 
                    options={EXAMPLES}
                />

                <span className="vsep" />

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

                <div className="menu-wrap">
                    <Button id="btnExport" variant="primary">
                        <Icon name="download" size={15} />
                        <span className="b-label">Exportar</span>
                        <Icon name="chevD" size={14} />
                    </Button>
                    <div id="exportMenu" className="menu">
                        {EXPORT_FORMATS.map(({ x, label, hint }) => (
                            <button key={x} data-x={x}>
                                {label} <small>{hint}</small>
                            </button>
                        ))}
                        <label className="menu-opt">
                            <input type="checkbox" id="optTransp" /> Fundo transparente
                        </label>
                    </div>
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
