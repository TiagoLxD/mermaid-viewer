import { Button } from '../shared/Button';
import { Icon } from '../shared/Icon';
import { Gutter } from './editor/Gutter';
import { Highlight } from './editor/Highlight';
import { SnippetMenu } from './editor/SnippetMenu';

/** Painel de código (textarea + highlight + gutter + snippets). */
export function EditorPanel({ width }: { width: number }) {
    return (
        <aside id="panel" style={{ width }}>
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
                    <Highlight />
                </pre>
                <textarea
                    id="src"
                    spellCheck={false}
                    autoComplete="off"
                    wrap="off"
                    aria-label="Código Mermaid do diagrama"
                />
                <div id="gutter" aria-hidden="true">
                    <Gutter />
                </div>
                <SnippetMenu />
            </div>

            <div className="panel-foot" id="parseFoot">
                <span className="dot" id="parseDot" />
                <span id="parseText">pronto</span>
            </div>
        </aside>
    );
}
