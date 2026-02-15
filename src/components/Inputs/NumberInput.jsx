import React from 'react';

/**
 * NumberInput — Numeric input with validation display.
 * Used for fields like oos_product_count, order constraints.
 */
const NumberInput = ({
    label,
    placeholder,
    helperText,
    value,
    onChange,
    error,
    required,
    disabled,
    min,
    max,
    step = 1,
}) => {
    return (
        <div className="mb-3">
            <label className="block text-xs font-medium text-slate-400 mb-1">
                {label}
                {required && <span className="text-red-400 ml-1">*</span>}
            </label>
            <input
                type="number"
                value={value ?? ''}
                onChange={(e) => {
                    const val = e.target.value === '' ? null : Number(e.target.value);
                    onChange(val);
                }}
                placeholder={placeholder}
                disabled={disabled}
                min={min}
                max={max}
                step={step}
                className={`w-full px-3 py-2 rounded-lg text-sm transition-all
                    ${error
                        ? 'bg-red-500/10 border border-red-500/50 text-red-300'
                        : 'bg-slate-800 border border-slate-700 text-slate-200 focus:border-blue-500'
                    }
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
            />
            {error && (
                <p className="mt-1 text-xs text-red-400">{error}</p>
            )}
            {!error && helperText && (
                <p className="mt-1 text-xs text-slate-500">{helperText}</p>
            )}
        </div>
    );
};

export default NumberInput;
