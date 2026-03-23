import React from 'react';

/**
 * TextInput — Config-driven text input with validation display.
 *
 * Props (all from field config):
 * - label, placeholder, helperText
 * - value, onChange
 * - error (string | null)
 * - required, minLength, maxLength, pattern (passed via {...validation})
 */
const TextInput = ({
    label,
    placeholder,
    helperText,
    value = '',
    onChange,
    error,
    required,
    disabled,
}) => {
    return (
        <div className="mb-2">
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
                {label}
                {required && <span className="text-red-400 ml-1">*</span>}
            </label>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className={`w-full px-2.5 py-1.5 rounded-lg text-[13px] transition-all
                    ${error
                        ? 'bg-red-50 border border-red-300 text-red-700 placeholder-red-300'
                        : 'bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white'
                    }
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
            />
            {error && (
                <p className="mt-1 text-xs text-red-500">{error}</p>
            )}
            {!error && helperText && (
                <p className="mt-1 text-xs text-slate-500">{helperText}</p>
            )}
        </div>
    );
};

export default TextInput;
