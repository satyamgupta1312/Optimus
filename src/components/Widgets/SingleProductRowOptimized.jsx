import React from 'react';
import { useWidgetContext } from '../../context/WidgetContext';

const SingleProductRowOptimized = ({ widget }) => {
    const { navigateTo } = useWidgetContext();

    // Debug logging
    React.useEffect(() => {
        console.log('[SingleProductRowOptimized] Widget updated:', {
            id: widget.id,
            title: widget.title,
            productsCount: widget.products?.length || 0,
            products: widget.products
        });
    }, [widget.products, widget.id]);

    const handleViewAll = () => {
        // Navigate to product listing page with widget's products
        navigateTo('listing', {
            widgetId: widget.id || 5573,
            itemId: widget.itemId || 8747,
            title: widget.title,
            products: widget.products || []
        });
    };

    return (
        <div style={{ backgroundColor: widget.background || '#fff' }} className="py-2 mb-6">
            {/* Header */}
            <div className="flex justify-between items-end mb-3 px-4">
                <h3 style={{ color: widget.textColor || '#1e293b' }} className="font-bold text-lg leading-tight">
                    {widget.title}
                </h3>
                {/* Always visible clickable View All button */}
                <button
                    onClick={handleViewAll}
                    className="text-xs font-bold text-blue-600 cursor-pointer hover:underline"
                >
                    View All →
                </button>
            </div>
            {widget.subtitle && <p className="text-sm opacity-80 mb-4 px-4" style={{ color: widget.textColor || '#1e293b' }}>{widget.subtitle}</p>}

            {/* Products */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide pl-4">
                {widget.products && widget.products.map((p) => (
                    <div key={p.id} className="shrink-0 w-[92px] bg-white rounded-lg shadow-sm border border-slate-100 p-2 relative">
                        {/* Discount Tag */}
                        <div className="absolute top-0 left-0 bg-yellow-300 text-[9px] font-bold px-1.5 py-0.5 rounded-br-lg z-10">
                            21% OFF
                        </div>

                        <div className="w-full aspect-square bg-slate-50 rounded-md mb-2 relative overflow-hidden">
                            {p.image ? (
                                <img
                                    src={p.image}
                                    alt={p.name}
                                    className="w-full h-full object-contain mix-blend-multiply"
                                    onError={(e) => {
                                        console.error('[Image] Failed to load:', p.image, 'for product:', p.name);
                                        e.target.style.display = 'none';
                                        e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center text-slate-300 text-xs">No Img</div>';
                                    }}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">No Img</div>
                            )}
                        </div>

                        <div className="font-medium text-[11px] text-slate-800 line-clamp-2 h-8 leading-tight mb-1">{p.name}</div>

                        <div className="flex items-center gap-1 mb-2">
                            <span className="text-slate-900 font-bold text-sm">{p.price}</span>
                            <span className="text-slate-400 text-[10px] line-through">₹250</span>
                        </div>

                        {/* Add Button - Outlined */}
                        <button className="w-full py-1 border border-blue-600 text-blue-600 bg-white text-[10px] rounded font-bold uppercase hover:bg-blue-50 transition-colors">
                            ADD
                        </button>
                    </div>
                ))}

                {(!widget.products || widget.products.length === 0) && (
                    <div className="w-full h-20 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-xs text-slate-400">
                        No products
                    </div>
                )}
            </div>
        </div>
    );
};

export default SingleProductRowOptimized;
