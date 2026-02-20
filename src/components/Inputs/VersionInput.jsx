import React from 'react';

/**
 * VersionInput — Specialized text input for app version strings (e.g. "2.4.7").
 * Validates semver-like format. Used for min/max app version configs.
 */
const VersionInput = ({
    label,
    placeholder,
    helperText,
    value = '',
    onChange,
    error,
    required,
    disabled,
}) => {
    const isValidVersion = value && /^\d+(\.\d+)*$/.test(value);

    return (
        <div className="mb-3">
            <label className="block text-xs font-medium text-slate-500 mb-1">
                {label}
                {required && <span className="text-red-400 ml-1">*</span>}
            </label>
            <div className="relative">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder || 'e.g. 2.4.7'}
                    disabled={disabled}
                    className={`w-full px-3 py-2 pr-8 rounded-lg text-sm transition-all font-mono
                        ${error
                            ? 'bg-red-50 border border-red-300 text-red-700 placeholder-red-300'
                            : 'bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white'
                        }
                        focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                />
                {value && (
                    <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs
                        ${isValidVersion ? 'text-green-500' : 'text-red-500'}`}>
                        {isValidVersion ? '✓' : '✗'}
                    </span>
                )}
            </div>
            {error && (
                <p className="mt-1 text-xs text-red-500">{error}</p>
            )}
            {!error && helperText && (
                <p className="mt-1 text-xs text-slate-500">{helperText}</p>
            )}
        </div>
    );
};

export default VersionInput;
