import { Button } from '../shared/Button';
import { Icon } from '../shared/Icon';

/** Painel de código (textarea + highlight + gutter + snippets). */
export function EditorPanel() {
    return (
        <aside id="panel">
            <div className="panel-head">
                <span className="panel-title">Editor Mermaid</span>
                <div className="actions">
                    <Button id="btnFormat" variant="sm">
                        <Icon name="wand" size={13} />
                        Formatar
                    </Button>
                    <Button
                        id="btnPanel"
                        variant="ghost"
                        modifier="icon-btn"
                        icon="panel"
                        title="Ocultar painel de código"
                        aria-label="Ocultar painel de código"
                    />
                </div>
            </div>

            <div className="code-wrap">
                <pre id="hl" aria-hidden="true">
                    <code id="hlcode" />
                </pre>
                <textarea
                    id="src"
                    spellCheck={false}
                    autoComplete="off"
                    wrap="off"
                    aria-label="Código Mermaid do diagrama"
                />
                <div id="gutter" aria-hidden="true">
                    <div id="gutterIn" />
                </div>
                <div id="snipMenu" role="listbox" aria-label="Snippets Mermaid" />
            </div>

            <div className="panel-foot" id="parseFoot">
                <span className="dot" id="parseDot" />
                <span id="parseText">pronto</span>
            </div>
        </aside>
    );
}
