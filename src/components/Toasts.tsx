import { useEffect, useState } from 'react';
import { subscribeToasts, type ToastItem } from '../engine/toast';

/** Renderiza os toasts publicados pelo engine via store (engine não cria DOM). */
export function Toasts() {
    const [items, setItems] = useState<ToastItem[]>([]);
    useEffect(() => subscribeToasts(setItems), []);
    return (
        <div id="toasts">
            {items.map((t) => (
                <div key={t.id} className={'toast ' + t.type + (t.show ? ' show' : '')}>
                    {t.msg}
                </div>
            ))}
        </div>
    );
}
