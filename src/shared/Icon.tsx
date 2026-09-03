import { ICON_COMPONENTS, type IconName } from '../components/diagram/icons';

/**
 * Ícone inline em React — substitui a injeção via `[data-icon]` do engine.
 */
export interface IconProps {
    name: IconName;
    /** tamanho em px (padrão: 16) */
    size?: number;
}

export function Icon({ name, size = 16 }: IconProps) {
    const Cmp = ICON_COMPONENTS[name];
    return Cmp ? <Cmp size={size} /> : null;
}
