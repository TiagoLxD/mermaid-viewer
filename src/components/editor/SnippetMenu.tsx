import { useEffect, useRef, useState } from 'react';
import { subscribeAc, type AcMenuState } from '../../state/ui-bus';

/** Menu de snippets/autocomplete (estado publicado pelo engine; aceitação
    volta por `meridian:ac-accept` — o engine decide o que fazer com o item). */
export function SnippetMenu() {
    const [st, setSt] = useState<AcMenuState>({ open: false, items: [], sel: 0, x: 0, y: 0 });
    const selRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => subscribeAc(setSt), []);
    useEffect(() => {
        selRef.current?.scrollIntoView({ block: 'nearest' });
    }, [st.sel, st.open]);
    if (!st.open) return <div id="snipMenu" role="listbox" aria-label="Snippets Mermaid" />;
    return (
        <div
            id="snipMenu"
            role="listbox"
            aria-label="Snippets Mermaid"
            className="open"
            style={{ left: st.x + 'px', top: st.y + 'px' }}
        >
            {st.items.map((it: { label: string; desc: string; item: any }, i: number) => (
                <div
                    key={it.label}
                    ref={i === st.sel ? selRef : undefined}
                    className={'snip-item' + (i === st.sel ? ' on' : '')}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        window.dispatchEvent(new CustomEvent('meridian:ac-accept', { detail: it.item }));
                    }}
                >
                    <span className="cmd">{it.label}</span>
                    <span className="desc">{it.desc}</span>
                </div>
            ))}
        </div>
    );
}
