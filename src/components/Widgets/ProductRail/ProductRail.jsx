
import React from 'react';
import { useWidgetContext } from '../../../context/WidgetContext';
import ProductCard from './ProductCard';
import { ProductRailConfig } from '../../../config/widgets/ProductRailConfig';

/**
 * ProductRail Container
 * 
 * Renders the full widget based on configuration.
 * Handles:
 * 1. Multimedia Background
 * 2. Grid/Row Layout (rows=1 vs rows=2)
 * 3. Variant Composition (optimized vs standard)
 */
const ProductRail = ({ widget }) => {
    const { navigateTo } = useWidgetContext();

    // extract Props with defaults from Config
    const pnc = { ...ProductRailConfig.initialState.pnc, ...(widget.pnc || {}) };

    // Derived State
    const isOptimized = pnc.is_optimized;
    const isDoubleRow = pnc.rows === 2;
    const hasMultimedia = pnc.has_multimedia;
    const products = widget.products || [];

    // Actions
    const handleViewAll = () => {
        navigateTo('listing', {
            title: widget.title || 'Products',
            products: products
        });
    };

    const handleAdd = (product) => {
        console.log('Add to cart:', product);
        // Dispatch 'add_to_cart' event or call context
    };

    // Render Logic
    return (
        <div className="relative w-full mb-4">

            {/* 1. Multimedia Background Layer */}
            {hasMultimedia && widget.backgroundMultimedia && (
                <div className="absolute inset-0 z-0">
                    <img
                        src={`/assets/${widget.backgroundMultimedia}.jpg`} // Mock path for now
                        alt="bg"
                        className="w-full h-full object-cover opacity-20"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-white/80 to-white/95" />
                </div>
            )}

            {/* 2. Content Layer */}
            <div className="relative z-10 py-4">

                {/* Header */}
                <div className="flex justify-between items-end mb-3 px-4">
                    <h3
                        style={{ color: widget.textColor || '#1e293b' }}
                        className={`font-bold leading-tight ${isOptimized ? 'text-lg' : 'text-xl'}`}
                    >
                        {widget.title}
                    </h3>
                    <button
                        onClick={handleViewAll}
                        className="text-xs font-bold text-blue-600 cursor-pointer hover:underline"
                    >
                        View All →
                    </button>
                </div>

                {/* Product Grid/Slider */}
                <div
                    className={`
                        flex overflow-x-auto pb-4 px-4 scrollbar-hide snap-x
                        ${isDoubleRow ? 'grid grid-rows-2 grid-flow-col gap-y-4' : ''}
                        gap-3
                    `}
                >
                    {products.length > 0 ? (
                        products.map(p => (
                            <ProductCard
                                key={p.id}
                                product={p}
                                variant={isOptimized ? 'optimized' : 'standard'}
                                onAdd={handleAdd}
                            />
                        ))
                    ) : (
                        <div className="w-full h-20 flex items-center justify-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-lg">
                            No Products Configured
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductRail;
