import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconProps } from './Icon';

type Variant = 'ghost' | 'primary' | 'sm';
type Modifier = 'icon-btn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    /** classe base "btn" + variantes */
    variant?: Variant | readonly Variant[];
    /** modificadores extras (ex.: "icon-btn") */
    modifier?: Modifier | readonly Modifier[];
    /** ícone injetado pelo engine (atalho para <Icon/>) */
    icon?: IconProps['name'];
    iconSize?: IconProps['size'];
    children?: ReactNode;
}

const list = (v?: string | readonly string[]) =>
    v ? (Array.isArray(v) ? v.join(' ') : v) : '';

export function Button({
    variant,
    modifier,
    icon,
    iconSize,
    children,
    className,
    type = 'button',
    ...rest
}: ButtonProps) {
    return (
        <button
            type={type}
            className={['btn', list(variant), list(modifier), className]
                .filter(Boolean)
                .join(' ')}
            {...rest}
        >
            {icon && <Icon name={icon} size={iconSize} />}
            {children}
        </button>
    );
}
