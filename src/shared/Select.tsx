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
    /** classe CSS adicional */
    className?: string;
    /** desabilita o componente */
    disabled?: boolean;
}

/** Select custom moderno e premium com select nativo oculto para compatibilidade com engine. */
export function Select({ 
    id, 
    options, 
    placeholder, 
    className = 'select',
    disabled = false 
}: SelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const [selectedValue, setSelectedValue] = useState('');
    const triggerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const nativeSelectRef = useRef<HTMLSelectElement>(null);

    const selectedOption = options.find(o => o.value === selectedValue);
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

    // Sincroniza o estado local com o select nativo (controlado pelo engine)
    useEffect(() => {
        if (nativeSelectRef.current) {
            const handleNativeChange = () => {
                setSelectedValue(nativeSelectRef.current?.value || '');
            };
            
            nativeSelectRef.current.addEventListener('change', handleNativeChange);
            
            // Valor inicial
            setSelectedValue(nativeSelectRef.current?.value || '');
            
            return () => {
                nativeSelectRef.current?.removeEventListener('change', handleNativeChange);
            };
        }
    }, []);

    const handleTriggerClick = () => {
        if (!disabled) {
            setIsOpen(!isOpen);
            setFocusedIndex(-1);
        }
    };

    const handleOptionClick = (optionValue: string) => {
        setSelectedValue(optionValue);
        setIsOpen(false);
        
        // Sincroniza com o select nativo para o engine
        if (nativeSelectRef.current) {
            nativeSelectRef.current.value = optionValue;
            // Dispara o evento onchange manualmente para o engine
            const event = new Event('change', { bubbles: true });
            nativeSelectRef.current.dispatchEvent(event);
        }
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
            {/* Select nativo oculto para compatibilidade com engine */}
            <select
                ref={nativeSelectRef}
                id={id}
                className="select-native"
                style={{ display: 'none' }}
                tabIndex={-1}
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>

            {/* Trigger custom visível */}
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
                            className={`select-option ${focusedIndex === index ? 'focused' : ''} ${selectedValue === option.value ? 'selected' : ''}`}
                            onClick={() => handleOptionClick(option.value)}
                            role="option"
                            aria-selected={selectedValue === option.value}
                        >
                            {option.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
