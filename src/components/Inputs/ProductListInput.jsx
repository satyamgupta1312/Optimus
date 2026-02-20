import React, { useState, useMemo } from 'react';
import { Package, X } from 'lucide-react';

/**
 * ProductListInput — Textarea for comma/newline-separated product codes.
 *
 * Props (InputRegistry interface):
 * - label, value (string[] or comma-string), onChange(string[])
 * - helperText, error, required
 * - minItems, maxItems, itemValidator
 */
const ProductListInput = ({
    label,
    value = [],
    onChange,
    helperText,
    error,
    required,
    disabled,
    minItems,
    maxItems,
}) => {
    const [rawText, setRawText] = useState('');

    // Normalize value to array
    const codes = useMemo(() => {
        if (Array.isArray(value)) return value;
        if (typeof value === 'string' && value.trim()) {
            return value.split(/[,\n\s]+/).filter(Boolean);
        }
        return [];
    }, [value]);

    const handleApply = () => {
        const parsed = rawText
            .split(/[,\n\s]+/)
            .map(s => s.trim())
            .filter(s => /^\d+$/.test(s));
        const unique = [...new Set([...codes, ...parsed])];
        onChange(unique);
        setRawText('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleApply();
        }
    };

    const removeCode = (code) => {
        onChange(codes.filter(c => c !== code));
    };

    const clearAll = () => {
        onChange([]);
    };

    return (
        <div className="mb-3">
            <label className="block text-xs font-medium text-slate-500 mb-1">
                {label}
                {required && <span className="text-red-400 ml-1">*</span>}
            </label>

            {/* Product count badge */}
            {codes.length > 0 && (
                <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-medium border border-blue-100">
                        <Package size={10} />
                        {codes.length} product{codes.length !== 1 ? 's' : ''}
                        {maxItems && <span className="text-slate-400">/ {maxItems}</span>}
                    </span>
                    <button
                        onClick={clearAll}
                        disabled={disabled}
                        className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                    >
                        Clear all
                    </button>
                </div>
            )}

            {/* Product code chips */}
            {codes.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2 max-h-24 overflow-y-auto p-2 rounded-lg bg-slate-50 border border-slate-200">
                    {codes.slice(0, 50).map(code => (
                        <span
                            key={code}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700 text-xs font-mono"
                        >
                            {code}
                            {!disabled && (
                                <button onClick={() => removeCode(code)} className="text-slate-400 hover:text-red-500">
                                    <X size={10} />
                                </button>
                            )}
                        </span>
                    ))}
                    {codes.length > 50 && (
                        <span className="text-xs text-slate-400">+{codes.length - 50} more</span>
                    )}
                </div>
            )}

            {/* Textarea input */}
            <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter item codes (comma or newline separated), press Enter to add"
                disabled={disabled}
                rows={3}
                className={`w-full px-3 py-2 rounded-lg text-sm font-mono transition-all resize-none
                    ${error
                        ? 'bg-red-50 border border-red-300 text-red-700 placeholder-red-300'
                        : 'bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white'
                    }
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
            />

            {rawText.trim() && (
                <button
                    onClick={handleApply}
                    className="mt-1 px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Add Products
                </button>
            )}

            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
            {!error && helperText && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
        </div>
    );
};

export default ProductListInput;
