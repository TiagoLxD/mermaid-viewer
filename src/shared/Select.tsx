import type { SelectHTMLAttributes } from 'react';
import { Icon } from './Icon';

export interface SelectOption {
    value: string;
    label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    /** id é obrigatório: o engine lê os controles pelo id do DOM */
    id: string;
    options: SelectOption[];
    /** texto da opção neutra (ex.: "Tipo…") — renderiza com value="" */
    placeholder?: string;
}

/** Select estilizado com chevron, no padrão do app. */
export function Select({ id, options, placeholder, className, ...rest }: SelectProps) {
    return (
        <div className={className ?? 'select'}>
            <select id={id} {...rest}>
                {placeholder && <option value="">{placeholder}</option>}
                {options.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>
            <Icon name="chevD" size={14} />
        </div>
    );
}
