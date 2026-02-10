import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

/**
 * Validated Input Component
 * Shows validation status and error messages
 */
const ValidatedInput = ({
    label,
    name,
    type = 'text',
    value,
    onChange,
    onBlur,
    error,
    required = false,
    placeholder = '',
    helpText = '',
    className = '',
    ...props
}) => {
    const hasError = error && error.length > 0;
    const isValid = !hasError && value && value.length > 0;

    return (
        <div className={`group ${className}`}>
            {/* Label */}
            {label && (
                <label className={`block text-xs font-semibold mb-2 transition-colors ${hasError
                        ? 'text-red-600'
                        : isValid
                            ? 'text-green-600'
                            : 'text-slate-600 group-focus-within:text-blue-600'
                    }`}>
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}

            {/* Input Container */}
            <div className="relative">
                <input
                    type={type}
                    name={name}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    className={`
            w-full px-4 py-2.5 pr-10 rounded-lg text-sm transition-all duration-200
            ${hasError
                            ? 'border-2 border-red-500 bg-red-50 text-red-900 focus:ring-4 focus:ring-red-100'
                            : isValid
                                ? 'border-2 border-green-500 bg-white text-slate-800 focus:ring-4 focus:ring-green-100'
                                : 'border-2 border-slate-200 bg-white text-slate-800 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50'
                        }
            focus:outline-none
            placeholder:text-slate-400
          `}
                    {...props}
                />

                {/* Status Icon */}
                {(hasError || isValid) && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {hasError ? (
                            <AlertCircle size={18} className="text-red-500" />
                        ) : (
                            <CheckCircle size={18} className="text-green-500" />
                        )}
                    </div>
                )}
            </div>

            {/* Error Message */}
            {hasError && (
                <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1 animate-slideDown">
                    <AlertCircle size={12} />
                    {error}
                </p>
            )}

            {/* Help Text */}
            {!hasError && helpText && (
                <p className="text-xs text-slate-500 mt-1.5">{helpText}</p>
            )}
        </div>
    );
};

export default ValidatedInput;
