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
        <div className="mb-2">
            <label className="block text-[11px] font-medium text-slate-500 mb-1.5">
                {label}
            </label>
            <div className="flex gap-2">
                {options.map((option) => {
                    const isSelected = value === (typeof option === 'object' ? option.value : option);
                    const displayLabel = typeof option === 'object' ? option.label : option;
                    const optionValue = typeof option === 'object' ? option.value : option;

                    return (
                        <button
                            key={optionValue}
                            type="button"
                            disabled={disabled}
                            onClick={() => onChange(optionValue)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all
                                ${isSelected
                                    ? 'bg-blue-600 text-white ring-2 ring-blue-500/30'
                                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-blue-300 hover:bg-blue-50'
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
