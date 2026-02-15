
import React from 'react';

/**
 * atomic Product Card
 * Renders a single product based on the variant (Optimized vs Standard).
 */
const ProductCard = ({ product, variant = 'standard', onAdd }) => {
    const isOptimized = variant === 'optimized';

    // Safe accessors
    const name = product.name || 'Unknown Product';
    const price = product.price || '₹0';
    const image = product.image || 'https://placehold.co/150';
    const mrp = product.mrp || null;

    if (isOptimized) {
        // Optimized Variant: Smaller, denser, lighter DOM
        return (
            <div className="shrink-0 w-[92px] bg-white rounded-lg shadow-sm border border-slate-100 p-2 relative flex flex-col">
                <div className="w-full aspect-square bg-slate-50 rounded-md mb-2 relative overflow-hidden">
                    <img
                        src={image}
                        alt={name}
                        loading="lazy"
                        className="w-full h-full object-contain mix-blend-multiply"
                    />
                </div>
                <div className="font-medium text-[11px] text-slate-800 line-clamp-2 h-8 leading-tight mb-1">
                    {name}
                </div>
                <div className="flex items-center gap-1 mb-2 mt-auto">
                    <span className="text-slate-900 font-bold text-sm">{price}</span>
                    {mrp && <span className="text-slate-400 text-[10px] line-through">{mrp}</span>}
                </div>
                <button
                    onClick={() => onAdd(product)}
                    className="w-full py-1 border border-blue-600 text-blue-600 bg-white text-[10px] rounded font-bold uppercase hover:bg-blue-50 transition-colors"
                >
                    ADD
                </button>
            </div>
        );
    }

    // Standard Variant: Larger, more spacious
    return (
        <div className="shrink-0 w-[134px] relative flex flex-col">
            <div className="w-full aspect-square bg-white rounded-lg mb-2 flex items-center justify-center overflow-hidden border border-slate-100">
                <img
                    src={image}
                    alt={name}
                    loading="lazy"
                    className="w-full h-full object-contain"
                />
            </div>
            <button
                onClick={() => onAdd(product)}
                className="w-full py-2 border-2 border-blue-600 text-blue-600 bg-blue-50 text-sm rounded-lg font-bold uppercase mb-2 hover:bg-blue-100 transition-colors"
            >
                ADD
            </button>
            <div className="text-xs text-gray-500 mb-1">1 Unit</div>
            <div className="font-medium text-sm text-gray-900 line-clamp-2 min-h-[2.5rem]">
                {name}
            </div>
            <div className="flex items-center gap-2 mt-1">
                <span className="text-gray-900 font-bold text-lg">{price}</span>
                {mrp && <span className="text-gray-400 text-sm line-through">{mrp}</span>}
            </div>
        </div>
    );
};

export default ProductCard;
