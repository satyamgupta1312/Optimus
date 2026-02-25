import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, ShoppingCart } from 'lucide-react';
import { useWidgetContext } from '../../context/WidgetContext';
import { searchProductsBatch } from '../../services/CatalogService';

/* ─────────────────────────────────────────────────────────
   Expand-Page Widget Skeletons
   Each PLP widget type renders a pulse-animated skeleton
   that matches its real-world appearance in the app.
   ───────────────────────────────────────────────────────── */

/** Skeleton card for a single product (reused across types) */
const ProductSkeleton = ({ className = '' }) => (
    <div className={`flex-shrink-0 ${className}`}>
        <div className="aspect-square bg-slate-100 rounded-lg mb-1.5 animate-pulse" />
        <div className="h-2.5 bg-slate-100 rounded w-4/5 mb-1 animate-pulse" />
        <div className="h-2 bg-slate-100 rounded w-1/2 mb-1 animate-pulse" />
        <div className="h-5 bg-slate-100 rounded w-3/5 animate-pulse" />
    </div>
);

/** Section title bar for expand widgets */
const SectionTitle = ({ title, accent = 'violet' }) => (
    <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
            <div className={`w-1 h-4 rounded-full bg-${accent}-400`} />
            <span className="text-sm font-bold text-slate-800">{title}</span>
        </div>
        <span className="text-[10px] text-slate-400 font-medium">View All →</span>
    </div>
);

/** Carousel skeleton — horizontal scroll of image cards */
const CarouselSkeleton = ({ title }) => (
    <div className="mb-5">
        <SectionTitle title={title || 'Carousel'} accent="blue" />
        <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[42%] rounded-xl overflow-hidden">
                    <div className="aspect-[3/4] bg-gradient-to-br from-slate-100 to-slate-50 animate-pulse rounded-xl" />
                    <div className="mt-1.5">
                        <div className="h-2.5 bg-slate-100 rounded w-3/4 mb-1 animate-pulse" />
                        <div className="h-2 bg-slate-100 rounded w-1/2 animate-pulse" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

/** SPR skeleton — horizontal product rail (single row) */
const SPRSkeleton = ({ title }) => (
    <div className="mb-5">
        <SectionTitle title={title || 'Product Rail'} accent="emerald" />
        <div className="flex gap-2.5 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
                <ProductSkeleton key={i} className="w-[28%]" />
            ))}
        </div>
    </div>
);

/** DPR skeleton — 2-wide product grid (double row) */
const DPRSkeleton = ({ title }) => (
    <div className="mb-5">
        <SectionTitle title={title || 'Double Row'} accent="amber" />
        <div className="grid grid-cols-2 gap-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
                <ProductSkeleton key={i} />
            ))}
        </div>
    </div>
);

/** Multimedia SPR — banner area + product rail below */
const MultimediaSPRSkeleton = ({ title }) => (
    <div className="mb-5">
        <SectionTitle title={title || 'Multimedia Rail'} accent="rose" />
        <div className="aspect-[3/1] bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl mb-2.5 animate-pulse" />
        <div className="flex gap-2.5 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
                <ProductSkeleton key={i} className="w-[28%]" />
            ))}
        </div>
    </div>
);

/** Multimedia DPR — banner + 2-wide grid */
const MultimediaDPRSkeleton = ({ title }) => (
    <div className="mb-5">
        <SectionTitle title={title || 'MM Double Row'} accent="orange" />
        <div className="aspect-[3/1] bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl mb-2.5 animate-pulse" />
        <div className="grid grid-cols-2 gap-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
                <ProductSkeleton key={i} />
            ))}
        </div>
    </div>
);

/** Secondary Masthead skeleton — banner + pill nav */
const SMSkeleton = ({ title }) => (
    <div className="mb-5">
        <SectionTitle title={title || 'Secondary Masthead'} accent="purple" />
        <div className="aspect-[2.5/1] bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl mb-2 animate-pulse" />
        <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[22%]">
                    <div className="aspect-square bg-slate-100 rounded-lg animate-pulse" />
                </div>
            ))}
        </div>
    </div>
);

/**
 * Maps widget type → skeleton component.
 * Same type list as ExpandPageSection's PLP_WIDGET_TYPES.
 */
const SKELETON_MAP = {
    carousel: CarouselSkeleton,
    single_product_row: SPRSkeleton,
    single_product_row_v2: SPRSkeleton,
    multimedia_single_product_row: MultimediaSPRSkeleton,
    multimedia_single_product_row_v2: MultimediaSPRSkeleton,
    double_product_row: DPRSkeleton,
    double_product_row_v2: DPRSkeleton,
    multimedia_double_product_row_v2: MultimediaDPRSkeleton,
    masthead_secondary_carousal_hp: SMSkeleton,
    masthead_secondary_category_hp: SMSkeleton,
};

/* ─────────────────────────────────────────────────────────
   ProductListingPage — Main Component
   ───────────────────────────────────────────────────────── */

const ProductListingPage = ({ title, widgetId, itemId, products: initialProducts, plpWidgets = [] }) => {
    const { navigateTo } = useWidgetContext();
    const [products, setProducts] = useState(initialProducts || []);
    const [cartCount, setCartCount] = useState(0);
    const [loading, setLoading] = useState(!initialProducts);

    useEffect(() => {
        const loadProducts = async () => {
            setLoading(true);
            try {
                let itemCodes = [];
                if (initialProducts && initialProducts.length > 0) {
                    itemCodes = initialProducts.map(p => p.itemCode).filter(Boolean);
                } else if (widgetId) {
                    itemCodes = ['10009582', '10012598', '10020256', '10020257', '10009581', '10012597'];
                }

                if (itemCodes.length === 0) { setLoading(false); return; }

                const resultMap = await searchProductsBatch(itemCodes);

                const loadedProducts = itemCodes
                    .map(code => resultMap[code])
                    .filter(Boolean)
                    .map(product => ({
                        id: product.itemCode,
                        itemCode: product.itemCode,
                        name: product.name,
                        image: product.image,
                        price: product.price,
                        originalPrice: product.mrp || product.price,
                        discount: product.mrp > product.price
                            ? `${Math.round(((product.mrp - product.price) / product.mrp) * 100)}% OFF`
                            : '',
                        salePrice: product.price,
                    }));

                setProducts(loadedProducts.length > 0 ? loadedProducts : (initialProducts || []));
            } catch (error) {
                console.error('Failed to load products:', error);
                setProducts(initialProducts || []);
            } finally {
                setLoading(false);
            }
        };

        loadProducts();
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

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-3 py-4">
                {/* Product Grid */}
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
                    <div className="grid grid-cols-2 gap-3 px-1">
                        {products.map((product, idx) => {
                            const salePriceVar = product.salePrice || product.selling_price || product.price || '0';
                            const salePrice = parseFloat(salePriceVar.toString().replace(/[^0-9.]/g, '')) || 0;
                            const mrpVar = product.originalPrice || product.mrp || 0;
                            const mrp = parseFloat(mrpVar.toString().replace(/[^0-9.]/g, '')) || (salePrice * 1.2);
                            const discount = mrp > salePrice ? Math.round(((mrp - salePrice) / mrp) * 100) : 0;

                            return (
                                <div key={product.id || idx} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col">
                                    <div className="aspect-[2/2.24] bg-slate-50 rounded-lg mb-3 overflow-hidden relative">
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

                {/* ── Expand Page Widgets ── */}
                {plpWidgets.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-dashed border-slate-200">
                        <div className="flex items-center gap-1.5 mb-4">
                            <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                            <span className="text-[10px] font-bold text-violet-500 uppercase tracking-wider">
                                Expand Page Widgets ({plpWidgets.length})
                            </span>
                        </div>
                        {plpWidgets.map((w, i) => {
                            const SkeletonComp = SKELETON_MAP[w.type] || SPRSkeleton;
                            return <SkeletonComp key={w.id || i} title={w.title} />;
                        })}
                    </div>
                )}

                {/* Bottom spacer for cart button */}
                <div className="h-20" />
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
