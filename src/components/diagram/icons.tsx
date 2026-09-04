/* ══════════ Ícones — componentes React inline (traço 24×24) ══════════ */

export interface IconSvgProps {
    size?: number;
    className?: string;
}

const S = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
};

function Svg({ size = 16, className, children }: IconSvgProps & { children: React.ReactNode }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" {...S} aria-hidden="true" className={className}>
            {children}
        </svg>
    );
}

export function IconCopy(p: IconSvgProps) {
    return (
        <Svg {...p}>
            <rect x="9" y="9" width="12" height="12" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </Svg>
    );
}

export function IconUsers(p: IconSvgProps) {
    return (
        <Svg {...p}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </Svg>
    );
}

export function IconDownload(p: IconSvgProps) {
    return (
        <Svg {...p}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="m7 10 5 5 5-5" />
            <path d="M12 15V3" />
        </Svg>
    );
}

export function IconChevronDown(p: IconSvgProps) {
    return (
        <Svg {...p}>
            <path d="m6 9 6 6 6-6" />
        </Svg>
    );
}

export function IconSun(p: IconSvgProps) {
    return (
        <Svg {...p}>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </Svg>
    );
}

export function IconMoon(p: IconSvgProps) {
    return (
        <Svg {...p}>
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </Svg>
    );
}

export function IconPanel(p: IconSvgProps) {
    return (
        <Svg {...p}>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 3v18" />
        </Svg>
    );
}

export function IconWand(p: IconSvgProps) {
    return (
        <Svg {...p}>
            <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
            <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
        </Svg>
    );
}

export function IconMinus(p: IconSvgProps) {
    return (
        <Svg {...p}>
            <path d="M5 12h14" />
        </Svg>
    );
}

export function IconPlus(p: IconSvgProps) {
    return (
        <Svg {...p}>
            <path d="M12 5v14M5 12h14" />
        </Svg>
    );
}

export function IconFit(p: IconSvgProps) {
    return (
        <Svg {...p}>
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
        </Svg>
    );
}

export function IconLock(p: IconSvgProps) {
    return (
        <Svg {...p}>
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </Svg>
    );
}

export function IconUnlock(p: IconSvgProps) {
    return (
        <Svg {...p}>
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 9.9-1" />
        </Svg>
    );
}

export function IconBook(p: IconSvgProps) {
    return (
        <Svg {...p}>
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </Svg>
    );
}

export function IconHelp(p: IconSvgProps) {
    return (
        <Svg {...p}>
            <circle cx="12" cy="12" r="10" />
            <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
        </Svg>
    );
}

export function IconX(p: IconSvgProps) {
    return (
        <Svg {...p}>
            <path d="M18 6 6 18M6 6l12 12" />
        </Svg>
    );
}

/* nomes usados pela API legada (data-icon) mapeados para componentes */
export const ICON_COMPONENTS = {
    copy: IconCopy,
    users: IconUsers,
    download: IconDownload,
    chevD: IconChevronDown,
    sun: IconSun,
    moon: IconMoon,
    panel: IconPanel,
    wand: IconWand,
    minus: IconMinus,
    plus: IconPlus,
    fit: IconFit,
    lock: IconLock,
    unlock: IconUnlock,
    book: IconBook,
    help: IconHelp,
    x: IconX,
} as const;

export type IconName = keyof typeof ICON_COMPONENTS;
