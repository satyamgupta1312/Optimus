import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Search, ShoppingCart } from 'lucide-react';
import { useWidgetContext } from '../../context/WidgetContext';
import { searchProductsBatch } from '../../services/CatalogService';

/* ─────────────────────────────────────────────────────────
   Expand-Page Widget — Live Product Renderers
   Each PLP widget type renders actual product data from
   the widget's stateProducts (global bucket).
   ───────────────────────────────────────────────────────── */

/** Section title bar for expand widgets — View All is clickable */
const SectionTitle = ({ title, accent = 'violet', onViewAll }) => (
    <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
            <div className={`w-1 h-4 rounded-full bg-${accent}-400`} />
            <span className="text-sm font-bold text-slate-800">{title}</span>
        </div>
        {onViewAll ? (
            <button
                onClick={(e) => { e.stopPropagation(); onViewAll(); }}
                className="text-[10px] text-blue-500 font-semibold hover:text-blue-700 transition-colors"
            >
                View All →
            </button>
        ) : (
            <span className="text-[10px] text-slate-400 font-medium">View All →</span>
        )}
    </div>
);

/** Skeleton card for loading state */
const ProductSkeleton = ({ className = '' }) => (
    <div className={`flex-shrink-0 ${className}`}>
        <div className="aspect-square bg-slate-100 rounded-lg mb-1.5 animate-pulse" />
        <div className="h-2.5 bg-slate-100 rounded w-4/5 mb-1 animate-pulse" />
        <div className="h-2 bg-slate-100 rounded w-1/2 mb-1 animate-pulse" />
        <div className="h-5 bg-slate-100 rounded w-3/5 animate-pulse" />
    </div>
);

/** Single product card for expand widgets — with ADD button */
const ExpandProductCard = ({ product, compact = false }) => {
    const price = parseFloat(String(product.price || '0').replace(/[^0-9.]/g, '')) || 0;
    const mrp = parseFloat(String(product.mrp || '0').replace(/[^0-9.]/g, '')) || 0;
    const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
    const [added, setAdded] = useState(false);

    const handleAdd = (e) => {
        e.stopPropagation();
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
    };

    return (
        <div className={`flex-shrink-0 ${compact ? 'w-[90px]' : 'w-[110px]'} relative flex flex-col`}>
            {discount > 0 && (
                <div className="absolute top-0 left-0 bg-yellow-300 text-black text-[8px] font-bold px-1 py-0.5 rounded-br-lg z-10">
                    {discount}% OFF
                </div>
            )}
            <div className="aspect-square bg-white rounded-lg mb-1 overflow-hidden border border-slate-100">
                {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-contain" loading="lazy" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 text-[9px]">No Img</div>
                )}
            </div>
            <div className="text-[10px] text-slate-700 font-medium line-clamp-2 h-7 leading-tight mb-0.5 flex-1">
                {product.name || `Item #${product.itemCode}`}
            </div>
            <div className="flex items-center gap-1 mb-1">
                <span className="text-slate-900 font-bold text-xs">₹{price}</span>
                {mrp > price && <span className="text-slate-400 text-[9px] line-through">₹{mrp}</span>}
            </div>
            <button
                onClick={handleAdd}
                className={`w-full py-1 text-[10px] font-bold rounded-md uppercase transition-all ${
                    added ? 'bg-green-100 text-green-600' : 'bg-[#F0F6FF] text-blue-600 hover:bg-blue-100'
                }`}
            >
                {added ? '✓' : 'ADD'}
            </button>
        </div>
    );
};

/**
 * Resolve image src — handles File objects, URL strings, and null.
 * File/Blob → objectURL, string → pass-through, null → null.
 */
const resolveImageSrc = (media) => {
    if (!media) return null;
    if (media instanceof File || media instanceof Blob) return URL.createObjectURL(media);
    if (typeof media === 'string' && media.length > 0) return media;
    return null;
};

/**
 * ExpandWidgetPreview — renders the correct layout for each widget type.
 *
 * SPR/DPR types  → stateProducts → product codes → catalog lookup → product cards
 * Carousel type  → scrollItems → banner images (no product lookup)
 * Masthead type  → carouselItems → banner slides with background media
 */
const ExpandWidgetPreview = ({ widget }) => {
    const { navigateTo } = useWidgetContext();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    const type = widget.type || '';
    const title = widget.title || 'Widget';

    // Carousel and Masthead use items, not stateProducts
    const isCarousel = type === 'carousel';
    const isMasthead = type.includes('masthead_secondary') || type === 'masthead_secondary_category_hp';
    const isItemBased = isCarousel || isMasthead;

    // Extract product codes from stateProducts.global (only for SPR/DPR)
    const codes = useMemo(() => {
        if (isItemBased) return [];
        const sp = widget.stateProducts || {};
        const globalStr = sp.global || '';
        if (!globalStr.trim()) return [];
        return globalStr.split(/[\s,]+/).map(c => c.trim()).filter(Boolean);
    }, [widget.stateProducts, isItemBased]);

    useEffect(() => {
        // Item-based widgets don't need product lookup
        if (isItemBased) { setLoading(false); return; }
        if (codes.length === 0) { setLoading(false); return; }

        let cancelled = false;
        (async () => {
            try {
                const resultMap = await searchProductsBatch(codes);
                if (cancelled) return;
                const resolved = codes.map(code => {
                    const cat = resultMap[code];
                    if (cat) return { itemCode: code, name: cat.name, image: cat.image, price: cat.price, mrp: cat.mrp };
                    return { itemCode: code, name: `Item #${code}`, image: '', price: 0, mrp: 0 };
                });
                setProducts(resolved);
            } catch (e) {
                console.error('[ExpandWidgetPreview] Failed to load products:', e);
                setProducts(codes.map(c => ({ itemCode: c, name: `Item #${c}`, image: '', price: 0, mrp: 0 })));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [codes, isItemBased]);

    // Navigate to full listing page for this expand widget
    const handleViewAll = () => {
        navigateTo('listing', {
            title: widget.title || 'Products',
            products: products.map(p => ({
                id: p.itemCode,
                itemCode: p.itemCode,
                name: p.name,
                image: p.image,
                price: p.price,
                originalPrice: p.mrp,
                salePrice: p.price,
            })),
            plpWidgets: [],
        });
    };

    // ── Carousel type — render scrollItems as banner images ──
    if (isCarousel) {
        const scrollItems = widget.scrollItems || [];

        const handleCarouselItemClick = (item) => {
            if (item.pageType === 'product_listing_page') {
                const sp = item.stateProducts || {};
                const globalStr = sp.global || '';
                const codes = globalStr.split(/[\s,]+/).map(c => c.trim()).filter(Boolean);
                navigateTo('listing', {
                    title: item.pageHeading || item.title || 'Product Listing',
                    products: codes.map(c => ({ itemCode: c, name: `Item #${c}`, image: '', price: 0, mrp: 0 })),
                    plpWidgets: item.expandPage ? (item.plpWidgets || []) : [],
                });
            } else if (item.pageType === 'category_page') {
                navigateTo('category', {
                    heading: item.pageHeading || item.title || '',
                    subCategories: item.subCategories || [],
                });
            }
        };

        if (scrollItems.length === 0) {
            return (
                <div className="mb-5">
                    <SectionTitle title={title} accent="blue" />
                    <div className="text-xs text-slate-400 text-center py-4">No carousel items added</div>
                </div>
            );
        }
        return (
            <div className="mb-5">
                <SectionTitle title={title} accent="blue" />
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                    {scrollItems.map((item, i) => {
                        const imgSrc = resolveImageSrc(item.image);
                        const mediaNum = parseFloat(widget.media_number) || 3.5;
                        const itemWidth = `${Math.round(100 / mediaNum)}%`;
                        return (
                            <div
                                key={item.id || i}
                                style={{ width: itemWidth }}
                                className="flex-shrink-0 rounded-xl overflow-hidden border border-slate-100 shadow-sm cursor-pointer active:scale-95 transition-transform"
                                onClick={() => handleCarouselItemClick(item)}
                            >
                                <div className="aspect-[16/9] bg-slate-50 overflow-hidden">
                                    {imgSrc ? (
                                        <img src={imgSrc} alt={item.pageHeading || item.title || `Banner ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100">
                                            <span className="text-[10px] text-slate-400">No Image</span>
                                        </div>
                                    )}
                                </div>
                                {item.pageHeading && (
                                    <div className="px-2 py-1.5 bg-white">
                                        <div className="text-[10px] text-slate-600 font-medium line-clamp-1">{item.pageHeading}</div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // ── Secondary Masthead type — render carouselItems as banner slides ──
    if (isMasthead) {
        const carouselItems = widget.carouselItems || [];
        const bgSrc = resolveImageSrc(widget.background_media);

        const handleMastheadItemClick = (item) => {
            if (item.pageType === 'product_listing_page') {
                const sp = item.stateProducts || {};
                const globalStr = sp.global || '';
                const codes = globalStr.split(/[\s,]+/).map(c => c.trim()).filter(Boolean);
                navigateTo('listing', {
                    title: item.pageHeading || item.text || 'Product Listing',
                    products: codes.map(c => ({ itemCode: c, name: `Item #${c}`, image: '', price: 0, mrp: 0 })),
                    plpWidgets: item.expandPage ? (item.plpWidgets || []) : [],
                });
            } else if (item.pageType === 'category_page') {
                navigateTo('category', {
                    heading: item.pageHeading || item.text || '',
                    subCategories: item.subCategories || [],
                });
            }
        };

        return (
            <div className="mb-5">
                <SectionTitle title={title} accent="purple" />
                {/* Background media */}
                <div className="aspect-[2.5/1] rounded-xl mb-2 overflow-hidden">
                    {bgSrc ? (
                        <img src={bgSrc} alt="Background" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-r from-purple-50 to-violet-50 flex items-center justify-center">
                            <span className="text-xs text-violet-400 font-medium">Secondary Masthead Banner</span>
                        </div>
                    )}
                </div>
                {/* Carousel items */}
                {carouselItems.length > 0 ? (
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                        {carouselItems.map((item, i) => {
                            const itemImg = resolveImageSrc(item.image);
                            return (
                                <div
                                    key={item.id || i}
                                    className="flex-shrink-0 w-[30%] rounded-lg overflow-hidden border border-slate-100 cursor-pointer active:scale-95 transition-transform"
                                    onClick={() => handleMastheadItemClick(item)}
                                >
                                    <div className="aspect-square bg-slate-50 overflow-hidden">
                                        {itemImg ? (
                                            <img src={itemImg} alt={item.text || `Item ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-violet-50">
                                                <span className="text-[9px] text-violet-300">No Img</span>
                                            </div>
                                        )}
                                    </div>
                                    {item.text && (
                                        <div className="px-1.5 py-1 bg-white">
                                            <div className="text-[9px] text-slate-600 font-medium line-clamp-1">{item.text}</div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-xs text-slate-400 text-center py-2">No carousel items added</div>
                )}
            </div>
        );
    }

    // ── SPR / DPR / Multimedia variants — product-based rendering ──

    // Loading state — show skeletons
    if (loading) {
        const isDouble = type.includes('double');
        return (
            <div className="mb-5">
                <SectionTitle title={title} accent={type.includes('multimedia') ? 'rose' : 'emerald'} onViewAll={products.length > 0 ? handleViewAll : undefined} />
                {type.includes('multimedia') && (
                    <div className="aspect-[3/1] bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl mb-2.5 animate-pulse" />
                )}
                <div className={isDouble ? 'grid grid-cols-2 gap-2.5' : 'flex gap-2.5 overflow-hidden'}>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <ProductSkeleton key={i} className={isDouble ? '' : 'w-[28%]'} />
                    ))}
                </div>
            </div>
        );
    }

    // No products
    if (products.length === 0) {
        return (
            <div className="mb-5">
                <SectionTitle title={title} accent="slate" />
                <div className="text-xs text-slate-400 text-center py-4">No products configured</div>
            </div>
        );
    }

    // Render product rows
    const isMultimedia = type.includes('multimedia');
    const isDouble = type.includes('double');
    const accent = isMultimedia ? (isDouble ? 'orange' : 'rose') : (isDouble ? 'amber' : 'emerald');

    return (
        <div className="mb-5">
            <SectionTitle title={title} accent={accent} onViewAll={handleViewAll} />
            {isMultimedia && (
                <div className={`aspect-[3/1] bg-gradient-to-r ${isDouble ? 'from-orange-50 to-amber-50' : 'from-rose-50 to-pink-50'} rounded-xl mb-2.5 flex items-center justify-center`}>
                    <span className="text-xs text-slate-400 font-medium">Multimedia Background</span>
                </div>
            )}
            <div className={isDouble ? 'grid grid-cols-2 gap-2.5' : 'flex gap-2.5 overflow-x-auto scrollbar-hide'}>
                {products.slice(0, isDouble ? 6 : 8).map((p, i) => (
                    <ExpandProductCard key={i} product={p} compact={isDouble} />
                ))}
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────────────────
   ProductListingPage — Main Component
   ───────────────────────────────────────────────────────── */

const ProductListingPage = ({ title, widgetId, itemId, products: initialProducts, plpWidgets = [] }) => {
    const { navigateTo } = useWidgetContext();
    const [products, setProducts] = useState(initialProducts || []);
    const [cartCount, setCartCount] = useState(0);
    // When initialProducts is null (expand page mode), skip loading entirely
    const [loading, setLoading] = useState(initialProducts ? !initialProducts : false);

    useEffect(() => {
        // Skip loading when initialProducts is null (expand page mode — no products to show)
        if (initialProducts === null || initialProducts === undefined) {
            setLoading(false);
            return;
        }

        const loadProducts = async () => {
            setLoading(true);
            try {
                let itemCodes = [];
                if (initialProducts && initialProducts.length > 0) {
                    itemCodes = initialProducts.map(p => p.itemCode).filter(Boolean);
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
                {/* Product Grid — only shown when products exist (hidden in expand-page mode) */}
                {products.length > 0 && (
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

                {/* ── Expand Page Widgets — Live Preview ── */}
                {plpWidgets.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-dashed border-slate-200">
                        <div className="flex items-center gap-1.5 mb-4">
                            <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                            <span className="text-[10px] font-bold text-violet-500 uppercase tracking-wider">
                                Expand Page Widgets ({plpWidgets.length})
                            </span>
                        </div>
                        {plpWidgets.map((w, i) => (
                            <ExpandWidgetPreview key={w.id || i} widget={w} />
                        ))}
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
