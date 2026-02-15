import React from 'react';

/**
 * PillSelector — Renders selectable pills for enum-like options.
 * Used for properties like `rows` (options: [1, 2]).
 */
const PillSelector = ({
    label,
    options = [],
    value,
    onChange,
    helperText,
    disabled,
}) => {
    return (
        <div className="mb-3">
            <label className="block text-xs font-medium text-slate-400 mb-2">
                {label}
            </label>
            <div className="flex gap-2">
                {options.map((option) => {
                    const isSelected = value === option;
                    const displayLabel = typeof option === 'object' ? option.label : option;
                    const optionValue = typeof option === 'object' ? option.value : option;

                    return (
                        <button
                            key={optionValue}
                            type="button"
                            disabled={disabled}
                            onClick={() => onChange(optionValue)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all
                                ${isSelected
                                    ? 'bg-blue-600 text-white ring-2 ring-blue-500/30'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-500'
                                }
                                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                            {displayLabel}
                        </button>
                    );
                })}
            </div>
            {helperText && (
                <p className="mt-1 text-xs text-slate-500">{helperText}</p>
            )}
        </div>
    );
};

export default PillSelector;
