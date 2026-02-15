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
        <div className="mb-3">
            <label className="block text-xs font-medium text-slate-400 mb-1">
                {label}
                {required && <span className="text-red-400 ml-1">*</span>}
            </label>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
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

export default TextInput;
