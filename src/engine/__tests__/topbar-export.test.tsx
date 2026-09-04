// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import { TopBar } from '../../components/TopBar';

/* ══════════ menu de export: estado 100% React, abre/fecha ══════════ */

function click(el: Element) {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

describe('TopBar — menu de export', () => {
    let host: HTMLElement, root: Root;
    const $ = (sel: string) => host.querySelector(sel);

    it('menu fechado por padrão; clique abre com #exportMenu.visível', () => {
        host = document.createElement('div');
        document.body.append(host);
        root = createRoot(host);
        act(() => root.render(createElement(TopBar)));
        expect($('#exportMenu')).toBeNull();

        act(() => click($('#btnExport')!));
        const menu = $('#exportMenu');
        expect(menu).not.toBeNull();
        expect(menu!.classList.contains('open')).toBe(true); /* CSS exibe .menu.open */
        expect(menu!.querySelectorAll('button').length).toBe(3); /* mmd/svg/png */

        /* clique no botão de novo fecha */
        act(() => click($('#btnExport')!));
        expect($('#exportMenu')).toBeNull();

        /* clique fora fecha */
        act(() => click($('#btnExport')!));
        act(() => click(document.body));
        expect($('#exportMenu')).toBeNull();
    });
});
