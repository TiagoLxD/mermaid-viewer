/**
 * Placeholder de ícone. O engine (mountEngine) varre todos os
 * `[data-icon]` do DOM e injeta o SVG correspondente via innerHTML.
 */
export interface IconProps {
    /** nome do ícone no dicionário ICONS do engine (ex.: "chevD", "wand") */
    name: string;
    /** tamanho em px (padrão do engine: 16) */
    size?: number;
}

export function Icon({ name, size = 16 }: IconProps) {
    return <span data-icon={name} data-size={size} />;
}
