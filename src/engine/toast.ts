/* ══════════ toasts — isolado do engine (injeção só do próprio toast) ══════════ */

export function showToast(container: HTMLElement, msg: string, type = ''): void {
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.textContent = msg; /* textContent: sem HTML injetado */
    container.append(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => {
        t.classList.remove('show');
        setTimeout(() => t.remove(), 300);
    }, 2400);
}
