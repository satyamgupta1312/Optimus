import React, { useCallback } from 'react';
import { useWidgetContext } from '../../../context/WidgetContext';
import { SPRConfig } from '../../../config/widgets/SPRConfig';
import { SPRService } from './SPRService';

/**
 * SingleProductRow — Unified Product Rail Renderer
 *
 * Handles ALL 8 product rail variants:
 *   SPR (rows=1): standard, optimized, multimedia, multimedia-optimized
 *   DPR (rows=2): standard, optimized, multimedia, multimedia-optimized
 *
 * Features:
 * - Single-row (SPR) and double-row (DPR) grid layouts
 * - Skeleton loading (empty products)
 * - Discount badges (standard: ribbon, optimized: inline tag)
 * - Multimedia background overlay
 * - Optimized compact cards (92px) vs Standard cards (134px)
 * - Subtitle support
 *
 * Config:  SPRConfig.js
 * Backend: SPRService.js
 */
const SingleProductRow = ({ widget }) => {
    const { navigateTo, updateWidget } = useWidgetContext();

    // Extract PNC with defaults from SPRConfig
    const pnc = { ...SPRConfig.initialState.pnc, ...(widget.pnc || {}) };

    const isOptimized = pnc.is_optimized;
    const isDoubleRow = pnc.rows === 2;
    const hasMultimedia = pnc.has_multimedia;
    const products = widget.products || [];
    const isLoading = products.length === 0;

    // Resolved backend widget_type (e.g. 'single_product_row_v2')
    const resolvedType = SPRService.resolveVariant(widget);

    const handleViewAll = () => {
        navigateTo('listing', {
            widgetId: widget.id,
            itemId: widget.itemId,
            title: widget.title || 'Products',
            products,
            resolvedType,
        });
    };

    const handleAdd = useCallback((product) => {
        // Update widget products with quantity increment
        const updated = products.map((p) =>
            p.id === product.id ? { ...p, qty: (p.qty || 0) + 1 } : p
        );
        updateWidget(widget.id, { products: updated });
    }, [products, widget.id, updateWidget]);

    // Card component based on variant
    const Card = isOptimized ? CompactCard : StandardCard;

    return (
        <div
            style={{ backgroundColor: widget.background || '#fff' }}
            className="relative w-full mb-4"
        >
            {/* Multimedia Background Layer */}
            {hasMultimedia && widget.backgroundMultimedia && (
                <div className="absolute inset-0 z-0">
                    <img
                        src={`/assets/${widget.backgroundMultimedia}.jpg`}
                        alt=""
                        className="w-full h-full object-cover opacity-20"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-white/80 to-white/95" />
                </div>
            )}

            {/* Content Layer */}
            <div className="relative z-10 py-3">
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

                {/* Subtitle */}
                {widget.subtitle && (
                    <p
                        style={{ color: widget.textColor || '#1e293b' }}
                        className="text-sm opacity-80 mb-3 px-4"
                    >
                        {widget.subtitle}
                    </p>
                )}

                {/* Product Slider / Grid */}
                <div
                    className={[
                        'overflow-x-auto pb-3 px-4 scrollbar-hide snap-x',
                        isDoubleRow
                            ? `grid grid-rows-2 grid-flow-col gap-3`
                            : `flex ${isOptimized ? 'gap-3' : 'gap-4'}`,
                    ].join(' ')}
                >
                    {isLoading ? (
                        <SkeletonCards count={isDoubleRow ? 8 : 4} compact={isOptimized} />
                    ) : (
                        products.map((p) => (
                            <Card key={p.id} product={p} onAdd={handleAdd} />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

/* ── Skeleton Loading ── */
const SkeletonCards = ({ count = 4, compact = false }) => (
    <>
        {Array.from({ length: count }).map((_, idx) => (
            <div
                key={idx}
                className={`shrink-0 animate-pulse ${compact ? 'w-[92px]' : 'w-[134px]'}`}
            >
                <div className="w-full aspect-square bg-gray-200 rounded-lg mb-2" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-1" />
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
                <div className={`w-full ${compact ? 'py-1' : 'py-2'} border-2 border-gray-200 rounded-lg`} />
            </div>
        ))}
    </>
);

/* ── Standard Card (134px) — full-size with ribbon discount badge ── */
const StandardCard = ({ product: p, onAdd }) => (
    <div className="shrink-0 w-[134px] relative flex flex-col">
        {/* Discount Ribbon */}
        {p.discount && (
            <div
                className="absolute top-0 left-0 bg-yellow-300 text-black text-xs font-bold px-2 py-1 rounded-br-lg z-10"
                style={{ clipPath: 'polygon(0 0, 100% 0, 100% 70%, 90% 100%, 0 100%)' }}
            >
                {p.discount}%<br />OFF
            </div>
        )}

        <div className="w-full aspect-square bg-white rounded-lg mb-2 flex items-center justify-center overflow-hidden border border-slate-100">
            {p.image ? (
                <img src={p.image} alt={p.name} loading="lazy" className="w-full h-full object-contain" />
            ) : (
                <div className="text-gray-400 text-xs">No Image</div>
            )}
        </div>

        <button
            onClick={() => onAdd(p)}
            className="w-full py-2 border-2 border-blue-600 text-blue-600 bg-blue-50 text-sm rounded-lg font-bold uppercase mb-2 hover:bg-blue-100 transition-colors"
        >
            ADD
        </button>

        <div className="text-xs text-gray-500 mb-1">1 Unit</div>
        <div className="font-medium text-sm text-gray-900 line-clamp-2 min-h-[2.5rem]">{p.name}</div>
        <div className="flex items-center gap-2 mt-1">
            <span className="text-gray-900 font-bold text-lg">{p.price}</span>
            {p.mrp && <span className="text-gray-400 text-sm line-through">{p.mrp}</span>}
        </div>
    </div>
);

/* ── Compact Card (92px) — optimized with inline discount tag ── */
const CompactCard = ({ product: p, onAdd }) => (
    <div className="shrink-0 w-[92px] bg-white rounded-lg shadow-sm border border-slate-100 p-2 relative flex flex-col">
        {/* Discount Tag */}
        {p.discount && (
            <div className="absolute top-0 left-0 bg-yellow-300 text-[9px] font-bold px-1.5 py-0.5 rounded-br-lg z-10">
                {p.discount}% OFF
            </div>
        )}

        <div className="w-full aspect-square bg-slate-50 rounded-md mb-2 overflow-hidden">
            {p.image ? (
                <img src={p.image} alt={p.name} loading="lazy" className="w-full h-full object-contain mix-blend-multiply" />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">No Img</div>
            )}
        </div>

        <div className="font-medium text-[11px] text-slate-800 line-clamp-2 h-8 leading-tight mb-1">{p.name}</div>

        <div className="flex items-center gap-1 mb-2 mt-auto">
            <span className="text-slate-900 font-bold text-sm">{p.price}</span>
            {p.mrp && <span className="text-slate-400 text-[10px] line-through">{p.mrp}</span>}
        </div>

        <button
            onClick={() => onAdd(p)}
            className="w-full py-1 border border-blue-600 text-blue-600 bg-white text-[10px] rounded font-bold uppercase hover:bg-blue-50 transition-colors"
        >
            ADD
        </button>
    </div>
);

export default SingleProductRow;
