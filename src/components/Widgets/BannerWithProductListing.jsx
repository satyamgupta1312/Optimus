import React from 'react';
import { useWidgetContext } from '../../context/WidgetContext';
import { useCatalog } from '../../hooks/useCatalog';

/**
 * BannerWithProductListing — Collection Banner Scroll Mode (Carousel)
 *
 * Renders a horizontally-scrollable banner carousel.
 * Widget heading shown above (from widget.title).
 * Each scroll item has: image, pageHeading, pageType, stateProducts.
 * On click navigates to PLP (product_listing_page) or category page.
 *
 * Data:
 *   widget.title         — Section heading (e.g. "Fresh Deals")
 *   widget.scrollItems[] — List of carousel banner items
 *   widget.media_number  — Items visible (e.g. 1.2 = 1 full + peek)
 */
const BannerWithProductListing = ({ widget }) => {
    const { navigateTo } = useWidgetContext();
    const { getProduct } = useCatalog();

    const resolveProducts = (stateProducts) => {
        const rawCodes = stateProducts?.global || '';
        const codes = String(rawCodes).split(/[,\n\s]+/).filter(Boolean);
        return codes.map(code => {
            const c = String(code).trim();
            const cat = getProduct(c);
            if (cat) {
                return {
                    id: c,
                    name: cat.displayName,
                    selling_price: cat.price,
                    mrp: cat.mrp > cat.price ? cat.mrp : cat.price * 1.2,
                    image_url: cat.imageUrl || 'https://placehold.co/150',
                    quantity_text: '1 pc',
                    discount_percentage: cat.mrp > cat.price
                        ? Math.round(((cat.mrp - cat.price) / cat.mrp) * 100)
                        : 0,
                };
            }
            return { id: c, name: `Product #${c}`, selling_price: 0, mrp: 0, image_url: 'https://placehold.co/150', quantity_text: '1 pc', discount_percentage: 0 };
        }).filter(Boolean);
    };

    const handleItemClick = (item) => {
        if (item.pageType === 'product_listing_page') {
            const products = resolveProducts(item.stateProducts);
            navigateTo('listing', {
                title: item.pageHeading || item.title || 'Product Listing',
                products,
            });
        } else {
            navigateTo('category', {
                heading: item.pageHeading || item.title || '',
                subCategories: item.subCategories || [],
            });
        }
    };

    const resolveImg = (src) => {
        if (!src) return null;
        if (src instanceof File || src instanceof Blob) return URL.createObjectURL(src);
        if (typeof src === 'object') return null;
        if (typeof src !== 'string' || src.length === 0) return null;
        if (src.includes('/d/')) {
            const m = src.match(/\/d\/([^/]+)/);
            if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w400`;
        }
        return src;
    };

    const items = widget.scrollItems || widget.items || [];
    const heading = widget.title || widget.heading || '';
    // media_number controls how many items are visible (e.g. 1.2 = 1 full + peek)
    const mediaNum = parseFloat(widget.media_number) || 1.2;
    const itemWidthPct = `${(100 / mediaNum).toFixed(1)}%`;

    // Single-item fallback (legacy widget.image mode)
    if (items.length === 0 && widget.image) {
        return (
            <div className="w-full">
                {heading && (
                    <div className="px-4 pt-4 pb-2">
                        <h3 className="font-bold text-[#1e293b] text-[15px] leading-tight">{heading}</h3>
                    </div>
                )}
                <div
                    className="w-full relative overflow-hidden cursor-pointer active:scale-95 transition-transform"
                    style={{ aspectRatio: `${widget.aspectRatio || 2}/1` }}
                    onClick={() => navigateTo('listing', { title: heading, products: [] })}
                >
                    <img src={widget.image} alt={heading} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
            </div>
        );
    }

    return (
        <div className="w-full bg-white">
            {/* Section heading — from widget.title, not item.title */}
            {heading && (
                <div className="px-4 pt-4 pb-2">
                    <h3 className="font-bold text-[#1e293b] text-[15px] leading-tight">{heading}</h3>
                </div>
            )}

            {items.length > 0 ? (
                <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-2 px-3 pb-4"
                    style={{ scrollbarWidth: 'none' }}>
                    {items.map((item, idx) => {
                        const imgSrc = resolveImg(item.image);
                        return (
                            <div
                                key={idx}
                                className="shrink-0 snap-start cursor-pointer active:scale-95 transition-transform"
                                style={{ width: itemWidthPct }}
                                onClick={() => handleItemClick(item)}
                            >
                                <div className="w-full rounded-xl overflow-hidden bg-slate-100 relative"
                                    style={{ aspectRatio: '2/1' }}>
                                    {imgSrc ? (
                                        <img src={imgSrc} alt={item.pageHeading || item.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    ) : (
                                        <div className="flex items-center justify-center w-full h-full text-slate-400 text-xs">No Image</div>
                                    )}
                                    {item.pageType === 'product_listing_page' && (
                                        <span className="absolute bottom-1 right-1 text-[7px] bg-blue-500 text-white px-1 py-0.5 rounded-sm font-bold">PLP</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="px-3 pb-4">
                    <div className="w-full h-28 flex items-center justify-center text-slate-400 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-xs">
                        Add carousel items to see preview
                    </div>
                </div>
            )}
        </div>
    );
};

export default BannerWithProductListing;
