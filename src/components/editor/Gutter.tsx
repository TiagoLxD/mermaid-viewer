import { useEffect, useState } from 'react';
import { subscribeGutter, type GutterState } from '../../state/ui-bus';

/** Numeração de linhas do editor (estado publicado pelo engine via bus). */
export function Gutter() {
    const [st, setSt] = useState<GutterState>({ count: 0, cur: -1, scrollTop: 0 });
    useEffect(() => subscribeGutter(setSt), []);
    const lines = Array.from({ length: st.count }, (_, i) => i + 1);
    return (
        <div id="gutterIn" style={{ transform: `translateY(${-st.scrollTop}px)` }}>
            {lines.map((n) => (
                <span key={n} className={n - 1 === st.cur ? 'cur' : ''}>{n}</span>
            ))}
        </div>
    );
}
