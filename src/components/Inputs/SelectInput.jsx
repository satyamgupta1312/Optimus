import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * SelectInput — Styled dropdown with optional description per option.
 *
 * Props (InputRegistry interface):
 * - label, value, onChange(value)
 * - options: [{label, value, description?}] or string[]
 * - error, helperText, required, disabled
 */
const SelectInput = ({
    label,
    value,
    onChange,
    options = [],
    error,
    helperText,
    required,
    disabled,
    placeholder = 'Select an option...',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef(null);

    // Normalize options
    const normalizedOptions = options.map(opt =>
        typeof opt === 'string' ? { label: opt, value: opt } : opt
    );

    const selectedOption = normalizedOptions.find(o => o.value === value);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="mb-2" ref={ref}>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
                {label}
                {required && <span className="text-red-400 ml-1">*</span>}
            </label>

            <div className="relative">
                <button
                    type="button"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-[13px] text-left flex items-center justify-between transition-all
                        ${error
                            ? 'bg-red-50 border border-red-300 text-red-700'
                            : isOpen
                                ? 'bg-white border border-blue-500 text-slate-800 ring-2 ring-blue-500/20'
                                : 'bg-slate-50 border border-slate-200 text-slate-800 hover:border-slate-300'
                        }
                        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                    <span className={selectedOption ? 'text-slate-800' : 'text-slate-400'}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <ChevronDown
                        size={14}
                        className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                </button>

                {isOpen && (
                    <div className="absolute z-50 w-full mt-1 py-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {normalizedOptions.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full px-2.5 py-1.5 text-left text-[13px] transition-colors flex items-start gap-2
                                    ${opt.value === value
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'text-slate-700 hover:bg-slate-50'
                                    }`}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium">{opt.label}</div>
                                    {opt.description && (
                                        <div className="text-xs text-slate-400 mt-0.5">{opt.description}</div>
                                    )}
                                </div>
                                {opt.value === value && (
                                    <Check size={14} className="text-blue-600 mt-0.5 shrink-0" />
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
            {!error && helperText && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
        </div>
    );
};

export default SelectInput;
