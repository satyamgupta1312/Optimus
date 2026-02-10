import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, ShoppingCart } from 'lucide-react';
import { useWidgetContext } from '../../context/WidgetContext';
import { searchProduct } from '../../services/CatalogService';

const ProductListingPage = ({ title, widgetId, itemId, products: initialProducts }) => {
    const { navigateTo } = useWidgetContext();
    const [products, setProducts] = useState(initialProducts || []);
    const [cartCount, setCartCount] = useState(0);
    const [loading, setLoading] = useState(!initialProducts);

    useEffect(() => {
        // If we don't have initial products, fetch them
        if (!initialProducts && widgetId) {
            // For demo purposes, we'll use the catalog to show some products
            // In production, this would call the API endpoint from the cURL
            const loadProducts = async () => {
                try {
                    // Simulate loading some products from catalog
                    const sampleItemCodes = ['10009582', '10012598', '10020256', '10020257', '10009581', '10012597'];
                    const loadedProducts = [];

                    for (const itemCode of sampleItemCodes) {
                        const product = await searchProduct(itemCode);
                        if (product) {
                            loadedProducts.push({
                                id: product.itemCode,
                                itemCode: product.itemCode,
                                name: product.name,
                                image: product.image,
                                price: product.price,
                                originalPrice: '₹250',
                                discount: '21%',
                                previouslyBought: Math.random() > 0.5,
                                salePrice: Math.random() > 0.5 ? `₹${Math.floor(parseInt(product.price.replace('₹', '')) * 0.9)}` : null
                            });
                        }
                    }

                    setProducts(loadedProducts);
                    setLoading(false);
                } catch (error) {
                    console.error('Failed to load products:', error);
                    setLoading(false);
                }
            };

            loadProducts();
        }
    }, [widgetId, initialProducts]);

    const handleBack = () => {
        navigateTo('home');
    };

    const handleAddToCart = (product) => {
        setCartCount(prev => prev + 1);
        console.log('Added to cart:', product);
    };

    return (
        <div className="h-full bg-white flex flex-col">
            {/* Header */}
            <div className="sticky top-0 bg-white px-4 py-3 flex items-center justify-between z-10 shadow-sm">
                <button onClick={handleBack} className="p-1 -ml-1 hover:bg-slate-50 rounded-full transition-colors text-slate-800">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-lg font-bold flex-1 text-center text-slate-900">{title || 'Rice Mela'}</h1>
                <button className="p-1 -mr-1 hover:bg-slate-50 rounded-full transition-colors text-slate-800">
                    <Search size={22} />
                </button>
            </div>

            {/* Product Grid */}
            <div className="flex-1 overflow-y-auto px-3 py-4">
                {loading ? (
                    <div className="grid grid-cols-3 gap-2">
                        {Array.from({ length: 9 }).map((_, idx) => (
                            <div key={idx} className="animate-pulse">
                                <div className="aspect-square bg-gray-200 rounded-lg mb-2" />
                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-1" />
                                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
                                <div className="h-8 bg-gray-200 rounded" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 pb-20 px-4">
                        {products.map((product, idx) => {
                            // Calculate MRP/Discount logic
                            const salePriceVar = product.salePrice || product.selling_price || product.price || '0';
                            const salePrice = parseFloat(salePriceVar.toString().replace(/[^0-9.]/g, '')) || 0;

                            const mrpVar = product.originalPrice || product.mrp || 0;
                            const mrp = parseFloat(mrpVar.toString().replace(/[^0-9.]/g, '')) || (salePrice * 1.2);

                            const discount = mrp > salePrice ? Math.round(((mrp - salePrice) / mrp) * 100) : 0;

                            return (
                                <div key={product.id || idx} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col">
                                    <div className="aspect-[2/2.24] bg-slate-50 rounded-lg mb-3 overflow-hidden relative">
                                        {/* Discount Badge */}
                                        {(discount > 0 || product.discount) && (
                                            <div className="absolute top-0 left-0 bg-[#FFD700] text-black text-[10px] font-extrabold px-2 py-1 z-10 rounded-br-lg">
                                                {product.discount || `${discount}% OFF`}
                                            </div>
                                        )}
                                        <img
                                            src={product.image || product.image_url || 'https://placehold.co/150'}
                                            alt={product.name}
                                            className="w-full h-full object-contain mix-blend-multiply"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center text-slate-300 text-xs">No Img</div>';
                                            }}
                                        />
                                    </div>
                                    <div className="flex-1 flex flex-col">
                                        <div className="text-[10px] text-slate-500 mb-1 font-medium">1 kg</div>
                                        <div className="font-bold text-sm text-slate-900 line-clamp-2 h-10 leading-tight mb-2">
                                            {product.name}
                                        </div>

                                        <div className="mt-auto">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="text-slate-900 font-extrabold text-lg">₹{salePrice}</span>
                                                {mrp > salePrice && (
                                                    <span className="text-slate-400 text-xs line-through">₹{Math.round(mrp)}</span>
                                                )}
                                            </div>

                                            <button
                                                onClick={() => handleAddToCart(product)}
                                                className="w-full py-2 bg-[#F0F6FF] text-blue-600 text-xs font-bold rounded-lg uppercase hover:bg-blue-100 transition-colors"
                                            >
                                                ADD
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Floating Cart Button */}
            {cartCount > 0 && (
                <div className="sticky bottom-4 px-4">
                    <button className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold flex items-center justify-between px-6 shadow-lg hover:bg-blue-700 transition-colors">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                                <img src="/placeholder-product.png" alt="" className="w-6 h-6" />
                            </div>
                            <span>{cartCount} Items</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span>View Cart</span>
                            <ShoppingCart size={20} />
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
};

export default ProductListingPage;
