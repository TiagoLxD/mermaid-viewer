import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Icon } from './Icon';

export interface SelectOption {
    value: string;
    label: string;
}

export interface SelectProps {
    /** id é obrigatório: o engine lê os controles pelo id do DOM */
    id: string;
    options: SelectOption[];
    /** texto da opção neutra (ex.: "Tipo…") — renderiza com value="" */
    placeholder?: string;
    /** valor selecionado */
    value?: string;
    /** callback quando o valor muda */
    onChange?: (value: string) => void;
    /** classe CSS adicional */
    className?: string;
    /** desabilita o componente */
    disabled?: boolean;
}

/** Select custom moderno e premium sem usar tag select nativa. */
export function Select({ 
    id, 
    options, 
    placeholder, 
    value, 
    onChange, 
    className = 'select',
    disabled = false 
}: SelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const triggerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(o => o.value === value);
    const displayValue = selectedOption?.label || placeholder || '';

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                triggerRef.current && 
                !triggerRef.current.contains(event.target as Node) &&
                dropdownRef.current && 
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleTriggerClick = () => {
        if (!disabled) {
            setIsOpen(!isOpen);
            setFocusedIndex(-1);
        }
    };

    const handleOptionClick = (optionValue: string) => {
        onChange?.(optionValue);
        setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (disabled) return;

        switch (event.key) {
            case 'Enter':
            case ' ':
                event.preventDefault();
                if (isOpen && focusedIndex >= 0) {
                    handleOptionClick(options[focusedIndex].value);
                } else {
                    setIsOpen(!isOpen);
                }
                break;
            case 'Escape':
                event.preventDefault();
                setIsOpen(false);
                break;
            case 'ArrowDown':
                event.preventDefault();
                if (!isOpen) {
                    setIsOpen(true);
                    setFocusedIndex(0);
                } else {
                    setFocusedIndex(prev => 
                        prev < options.length - 1 ? prev + 1 : prev
                    );
                }
                break;
            case 'ArrowUp':
                event.preventDefault();
                if (isOpen) {
                    setFocusedIndex(prev => (prev > 0 ? prev - 1 : -1));
                }
                break;
            case 'Tab':
                setIsOpen(false);
                break;
        }
    };

    return (
        <div className={className}>
            <div
                ref={triggerRef}
                className="select-trigger"
                onClick={handleTriggerClick}
                onKeyDown={handleKeyDown}
                tabIndex={disabled ? -1 : 0}
                role="combobox"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-labelledby={id}
            >
                <span className="select-value">{displayValue}</span>
                <Icon 
                    name="chevD" 
                    size={14} 
                    className={`select-chevron ${isOpen ? 'open' : ''}`} 
                />
            </div>
            
            {isOpen && (
                <div
                    ref={dropdownRef}
                    className="select-dropdown"
                    role="listbox"
                    aria-labelledby={id}
                >
                    {options.map((option, index) => (
                        <div
                            key={option.value}
                            className={`select-option ${focusedIndex === index ? 'focused' : ''} ${value === option.value ? 'selected' : ''}`}
                            onClick={() => handleOptionClick(option.value)}
                            role="option"
                            aria-selected={value === option.value}
                        >
                            {option.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
