import React from 'react';
import { useWidgetContext } from '../../context/WidgetContext';

const SingleProductRow = ({ widget }) => {
    const { navigateTo } = useWidgetContext();

    // Debug logging
    React.useEffect(() => {
        console.log('[SingleProductRow] Widget updated:', {
            id: widget.id,
            title: widget.title,
            productsCount: widget.products?.length || 0,
            products: widget.products
        });
    }, [widget.products, widget.id]);

    // Simple loading state: if no products, show skeleton placeholders
    const isLoading = !widget.products || widget.products.length === 0;

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
            <div className="flex justify-between items-center mb-4 px-4">
                <h3 style={{ color: widget.textColor || '#1e293b' }} className="font-bold text-xl leading-tight">
                    {widget.title}
                </h3>
                {/* Clickable View All button */}
                <button
                    onClick={handleViewAll}
                    className="text-sm font-semibold text-blue-600 hover:opacity-80 transition-opacity cursor-pointer"
                >
                    View All →
                </button>
            </div>

            {/* Products */}
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide pl-4">
                {isLoading ? (
                    // Skeleton placeholders (4 items)
                    Array.from({ length: 4 }).map((_, idx) => (
                        <div key={idx} className="shrink-0 w-[134px] animate-pulse">
                            <div className="w-full aspect-square bg-gray-200 rounded-lg mb-2" />
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-1" />
                            <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
                            <button className="w-full py-2 border-2 border-blue-600 text-blue-600 text-sm rounded-lg font-bold uppercase">
                                ADD
                            </button>
                        </div>
                    ))
                ) : (
                    widget.products.map((p) => (
                        <div key={p.id} className="shrink-0 w-[134px] relative">
                            {/* Discount Badge */}
                            <div className="absolute top-0 left-0 bg-yellow-300 text-black text-xs font-bold px-2 py-1 rounded-br-lg z-10" style={{
                                clipPath: 'polygon(0 0, 100% 0, 100% 70%, 90% 100%, 0 100%)'
                            }}>
                                21%<br />OFF
                            </div>

                            {/* Product Image */}
                            <div className="w-full aspect-square bg-white rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                                {p.image ? (
                                    <img src={p.image} alt={p.name} className="w-full h-full object-contain" />
                                ) : (
                                    <div className="text-gray-400 text-xs">No Image</div>
                                )}
                            </div>

                            {/* ADD button with light blue background */}
                            <button className="w-full py-2 border-2 border-blue-600 text-blue-600 bg-blue-50 text-sm rounded-lg font-bold uppercase mb-2 hover:bg-blue-100 transition-colors">
                                ADD
                            </button>

                            {/* Product Info */}
                            <div className="text-xs text-gray-500 mb-1">1 Unit</div>
                            <div className="font-medium text-sm text-gray-900 line-clamp-2 min-h-[2.5rem]">
                                {p.name}
                            </div>

                            {/* Price */}
                            <div className="flex items-center gap-2">
                                <span className="text-gray-900 font-bold text-lg">{p.price}</span>
                                <span className="text-gray-400 text-sm line-through">₹250</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default SingleProductRow;
