/* ══════════ highlight do editor — puro (texto → HTML) ══════════ */

const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const REL_HL = /^(\s*)([A-Za-z_][\w.\-]*)(\s*)((?:\|o|\|\||\}o|\}\|)(?:--|\.\.|==)(?:o\||\|\||o\{|\|\{))(\s*)([A-Za-z_][\w.\-]*)(\s*:\s*)(.*)$/;
const OPEN_HL = /^(\s*)([A-Za-z_][\w.\-]*)(\s*\{)(\s*)$/;
const CLOSE_HL = /^(\s*)(\}+\s*)$/;
const ATTR_HL = /^(\s*)([\w().<>[\],\-]+)(\s+)([A-Za-z_]\w*)(\s*)(.*)$/;
const SOLO_HL = /^(\s*)([A-Za-z_][\w.\-]*)\s*$/;

function hlRest(rest: string): string {
    let out = '';
    for (const p of rest.split(/("[^"]*")/g)) {
        if (p.startsWith('"')) out += `<span class="c-cm">${esc(p)}</span>`;
        else out += esc(p).replace(/\b(PK|FK|UK)\b/g, '<span class="c-key">$1</span>');
    }
    return out;
}

/** Gera o HTML do highlight (para o <code id="hlcode">). */
export function highlightMermaid(source: string): string {
    let inBlock = false;
    const out: string[] = [];
    for (const raw of source.split('\n')) {
        const line = raw.replace(/;\s*$/, ''), t = line.trim();
        let h: string | null = null, m: RegExpMatchArray | null;
        if (t.startsWith('%%')) h = `<span class="c-cm">${esc(line)}</span>`;
        else if (/^(erDiagram|pieDiagram|mindmap|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment)\b/.test(t)) h = `<span class="c-kw">${esc(line)}</span>`;
        else if ((m = line.match(REL_HL)))
            h = `${esc(m[1])}<span class="c-en">${esc(m[2])}</span><span class="c-card">${esc(m[3])}</span><span class="c-card">${esc(m[4])}</span><span class="c-card">${esc(m[5])}</span><span class="c-en">${esc(m[6])}</span><span class="c-col">${esc(m[7])}</span><span class="c-lb">${esc(m[8])}</span>`;
        else if ((m = line.match(OPEN_HL))) { h = `${esc(m[1])}<span class="c-en">${esc(m[2])}</span><span class="c-br">${esc(m[3])}</span>`; inBlock = true; }
        else if ((m = line.match(CLOSE_HL))) { h = `${esc(m[1])}<span class="c-br">${esc(m[2])}</span>`; if (inBlock) inBlock = false; }
        else if (inBlock && (m = line.match(ATTR_HL)))
            h = `${esc(m[1])}<span class="c-ty">${esc(m[2])}</span>${esc(m[3])}<span class="c-en">${esc(m[4])}</span>${esc(m[5])}${hlRest(m[6])}`;
        else if ((m = line.match(SOLO_HL))) h = `${esc(m[1])}<span class="c-en">${esc(m[2])}</span>`;
        out.push(h ?? esc(line));
    }
    return out.join('\n') + '\n';
}
