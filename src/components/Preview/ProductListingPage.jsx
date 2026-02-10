import React, { useEffect, useState } from 'react';
import { ArrowLeft, ShoppingCart, Search } from 'lucide-react';
import { useWidgetContext } from '../../context/WidgetContext';
import { fetchWidgetProductList } from '../../services/api';

const ProductListingPage = () => {
    const { viewData, navigateTo } = useWidgetContext();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);

    useEffect(() => {
        const loadProducts = async () => {
            // Support direct injection for Preview (Fix for Blink/Blank Page)
            if (viewData?.products && Array.isArray(viewData.products)) {
                setProducts(viewData.products);
                setLoading(false);
                return;
            }

            if (!viewData?.widgetId) return;

            setLoading(true);
            try {
                // Using the specific API with token
                const data = await fetchWidgetProductList(viewData.widgetId, viewData.itemId || '', page);

                // Assuming standard response structure. Adjust based on actual API response.
                // Based on standard Apnamart APIs, products are usually in results or data.products
                const newProducts = data?.results || data?.data?.products || [];

                if (page === 1) {
                    setProducts(newProducts);
                } else {
                    setProducts(prev => [...prev, ...newProducts]);
                }
            } catch (err) {
                console.error("Failed to load listing", err);
            } finally {
                setLoading(false);
            }
        };

        loadProducts();
    }, [viewData, page]);

    return (
        <div className="h-full bg-slate-50 flex flex-col">
            {/* Header */}
            <div className="bg-white px-4 py-3 shadow-sm flex items-center gap-3 sticky top-0 z-10">
                <button onClick={() => navigateTo('home')} className="text-slate-600">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1">
                    <h2 className="font-bold text-slate-800 text-sm">{viewData?.title || 'Products'}</h2>
                    <p className="text-xs text-slate-500">{products.length} items</p>
                </div>
                <Search size={20} className="text-slate-600" />
                <ShoppingCart size={20} className="text-slate-600" />
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-3">
                {loading && page === 1 ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-2 pb-20 px-2">
                        {products.map((product, idx) => {
                            // Calculate MRP/Discount logic to match SPR
                            const salePrice = parseFloat(product.selling_price || product.price || 0);
                            const mrp = parseFloat(product.mrp || 0) || (salePrice * 1.2);
                            const discount = mrp > salePrice ? Math.round(((mrp - salePrice) / mrp) * 100) : 0;

                            return (
                                <div key={idx} className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm flex flex-col">
                                    <div className="aspect-square bg-slate-50 rounded-md mb-2 overflow-hidden relative">
                                        {/* Discount Badge - Yellow match SPR */}
                                        {discount > 0 && (
                                            <div className="absolute top-0 left-0 bg-yellow-300 text-[9px] font-bold px-1.5 py-0.5 rounded-br-lg z-10">
                                                {discount}% OFF
                                            </div>
                                        )}
                                        <img
                                            src={product.image_url || product.primary_image || 'https://placehold.co/150'}
                                            alt={product.name}
                                            className="w-full h-full object-contain mix-blend-multiply"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center text-slate-300 text-xs">No Img</div>';
                                            }}
                                        />
                                    </div>
                                    <div className="flex-1 flex flex-col">
                                        <div className="font-medium text-[11px] text-slate-800 line-clamp-2 h-8 leading-tight mb-1">{product.name}</div>

                                        <div className="mt-auto">
                                            <div className="flex items-center gap-1 mb-2">
                                                <span className="text-slate-900 font-bold text-sm">₹{salePrice}</span>
                                                {mrp > salePrice && (
                                                    <span className="text-slate-400 text-[10px] line-through">₹{Math.round(mrp)}</span>
                                                )}
                                            </div>

                                            <button className="w-full py-1 border border-blue-600 text-blue-600 bg-white text-[10px] rounded font-bold uppercase hover:bg-blue-50 transition-colors">
                                                ADD
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {!loading && products.length === 0 && (
                    <div className="text-center py-10 text-slate-400 text-sm">No products found</div>
                )}
            </div>
        </div>
    );
};

export default ProductListingPage;
