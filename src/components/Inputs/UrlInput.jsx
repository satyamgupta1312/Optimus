import React from 'react';

/**
 * UrlInput — Specialized text input for URLs with validation display.
 * Shows a link preview indicator when a valid URL is entered.
 */
const UrlInput = ({
    label,
    placeholder,
    helperText,
    value = '',
    onChange,
    error,
    required,
    disabled,
}) => {
    const isValidUrl = value && /^https?:\/\/.+/.test(value);

    return (
        <div className="mb-3">
            <label className="block text-xs font-medium text-slate-400 mb-1">
                {label}
                {required && <span className="text-red-400 ml-1">*</span>}
            </label>
            <div className="relative">
                <input
                    type="url"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder || 'https://...'}
                    disabled={disabled}
                    className={`w-full px-3 py-2 pr-8 rounded-lg text-sm transition-all
                        ${error
                            ? 'bg-red-500/10 border border-red-500/50 text-red-300'
                            : 'bg-slate-800 border border-slate-700 text-slate-200 focus:border-blue-500'
                        }
                        focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                />
                {isValidUrl && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-green-400 text-xs">✓</span>
                )}
            </div>
            {error && (
                <p className="mt-1 text-xs text-red-400">{error}</p>
            )}
            {!error && helperText && (
                <p className="mt-1 text-xs text-slate-500">{helperText}</p>
            )}
        </div>
    );
};

export default UrlInput;
