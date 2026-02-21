import React, { useState, useMemo } from 'react';
import { Package, X, AlertCircle, Loader2 } from 'lucide-react';
import { useCatalog } from '../../hooks/useCatalog';
import { CATALOG_UI } from '../../config/Feature/ProductCatalogConfig';

/**
 * ProductListInput — Textarea for comma/newline-separated product codes.
 * After codes are added, shows product cards with image, name, brand, price.
 *
 * Props (InputRegistry interface):
 * - label, value (string[] or comma-string), onChange(string[])
 * - helperText, error, required, disabled
 * - minItems, maxItems
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
    const { getProduct, loading: catalogLoading } = useCatalog();

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

    const clearAll = () => onChange([]);

    const showFullCards = codes.length <= CATALOG_UI.maxFullCards;
    const cur = CATALOG_UI.currency;

    return (
        <div className="mb-3">
            <label className="block text-xs font-medium text-slate-500 mb-1">
                {label}
                {required && <span className="text-red-400 ml-1">*</span>}
            </label>

            {/* Product count badge + catalog loading */}
            {codes.length > 0 && (
                <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-medium border border-blue-100">
                        <Package size={10} />
                        {codes.length} product{codes.length !== 1 ? 's' : ''}
                        {maxItems && <span className="text-slate-400">/ {maxItems}</span>}
                    </span>
                    <div className="flex items-center gap-2">
                        {catalogLoading && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                                <Loader2 size={10} className="animate-spin" />
                                Loading catalog…
                            </span>
                        )}
                        <button
                            onClick={clearAll}
                            disabled={disabled}
                            className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                        >
                            Clear all
                        </button>
                    </div>
                </div>
            )}

            {/* Product cards (when count <= maxFullCards) */}
            {codes.length > 0 && showFullCards && (
                <div className="space-y-1.5 mb-2 max-h-72 overflow-y-auto pr-1">
                    {codes.map((code) => {
                        const product = getProduct(code);
                        return (
                            <div
                                key={code}
                                className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1.5 group hover:border-slate-300 transition-colors"
                            >
                                {/* Product image */}
                                {product?.imageUrl ? (
                                    <img
                                        src={product.imageUrl}
                                        alt={product.displayName}
                                        className="w-10 h-10 object-contain rounded-md bg-slate-50 shrink-0 border border-slate-100"
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                ) : (
                                    <div className="w-10 h-10 bg-slate-100 rounded-md flex items-center justify-center shrink-0">
                                        <Package size={16} className="text-slate-300" />
                                    </div>
                                )}

                                {/* Product info */}
                                <div className="flex-1 min-w-0">
                                    {product ? (
                                        <>
                                            <p className="text-xs font-medium text-slate-800 truncate leading-tight">
                                                {product.displayName}
                                            </p>
                                            <p className="text-[10px] text-slate-400 leading-tight">
                                                {product.brand}
                                            </p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="text-xs font-semibold text-emerald-600">
                                                    {cur}{product.price}
                                                </span>
                                                {product.mrp > product.price && (
                                                    <span className="text-[10px] text-slate-400 line-through">
                                                        {cur}{product.mrp}
                                                    </span>
                                                )}
                                                <span className="text-[10px] font-mono text-slate-400 ml-auto">
                                                    #{code}
                                                </span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex items-center gap-1">
                                            {catalogLoading ? (
                                                <span className="text-xs text-slate-400 italic">Loading…</span>
                                            ) : (
                                                <>
                                                    <AlertCircle size={10} className="text-amber-400" />
                                                    <span className="text-xs text-slate-500 italic">Unknown product</span>
                                                    <span className="text-[10px] font-mono text-slate-400 ml-1">#{code}</span>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Remove */}
                                {!disabled && (
                                    <button
                                        onClick={() => removeCode(code)}
                                        className="shrink-0 p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Compact chip view (when many products > maxFullCards) */}
            {codes.length > 0 && !showFullCards && (
                <div className="flex flex-wrap gap-1 mb-2 max-h-24 overflow-y-auto p-2 rounded-lg bg-slate-50 border border-slate-200">
                    {codes.slice(0, 50).map(code => {
                        const product = getProduct(code);
                        return (
                            <span
                                key={code}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700 text-xs font-mono"
                                title={product?.displayName || 'Unknown'}
                            >
                                {code}
                                {!disabled && (
                                    <button onClick={() => removeCode(code)} className="text-slate-400 hover:text-red-500">
                                        <X size={10} />
                                    </button>
                                )}
                            </span>
                        );
                    })}
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
