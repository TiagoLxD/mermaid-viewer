import { useEffect, useState } from 'react';
import { subscribeHighlight } from '../../state/ui-bus';

/** Highlight do código Mermaid (HTML pronto publicado pelo engine). */
export function Highlight() {
    const [html, setHtml] = useState('');
    useEffect(() => subscribeHighlight(setHtml), []);
    return <code id="hlcode" dangerouslySetInnerHTML={{ __html: html }} />;
}
