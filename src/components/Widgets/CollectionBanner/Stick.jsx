import React, { useMemo } from 'react';
import { useWidgetContext } from '../../../context/WidgetContext';
import { useCatalog } from '../../../hooks/useCatalog';

/**
 * Stick.jsx — Collection Banner Stick Mode (Category Grid)
 *
 * Flat 4-column grid matching real API structure.
 * On click:
 *   category_page          → navigateTo('category', { heading, subCategories })
 *   product_listing_page   → navigateTo('listing', { title, products })   (same as SPR)
 */
const Stick = ({ widget }) => {
    const { navigateTo } = useWidgetContext();
    const { getProduct } = useCatalog();

    const resolveImg = (src) => {
        if (!src) return null;
        // File/Blob → create temporary URL (current session only)
        if (src instanceof File || src instanceof Blob) return URL.createObjectURL(src);
        // After JSON serialization, File objects become {} — reject empty objects
        if (typeof src === 'object') return null;
        // Must be a string from here
        if (typeof src !== 'string' || src.length === 0) return null;
        // Google Drive share URL → thumbnail
        if (src.includes('/d/')) {
            const m = src.match(/\/d\/([^/]+)/);
            if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w200`;
        }
        // Any valid URL: blob:, /api/local/media/, https://, etc.
        return src;
    };

    /** Resolve item codes to product objects (same as SPR) */
    const resolveProducts = (codes) => {
        if (!codes) return [];
        const codeList = Array.isArray(codes)
            ? codes
            : String(codes).split(/[,\n\s]+/).filter(Boolean);
        return codeList.map((code) => {
            const c = String(code).trim();
            if (!c) return null;
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
            return {
                id: c,
                name: `Product #${c}`,
                selling_price: 0,
                mrp: 0,
                image_url: 'https://placehold.co/150',
                quantity_text: '1 pc',
                discount_percentage: 0,
            };
        }).filter(Boolean);
    };

    const handleClick = (item) => {
        if (item.pageType === 'product_listing_page') {
            // PLP → resolve products from stateProducts.global and navigate to listing
            const rawCodes = item.stateProducts?.global || '';
            const products = resolveProducts(rawCodes);
            navigateTo('listing', {
                title: item.text || 'Product Listing',
                products,
            });
        } else {
            // Category page → navigate to category view with sub-categories
            navigateTo('category', {
                heading: item.text || '',
                subCategories: item.subCategories || [],
            });
        }
    };

    const items = widget.categoryItems || widget.items || [];
    const heading = widget.title || widget.heading || '';

    return (
        <div className="w-full bg-white">
            {heading ? (
                <div className="px-4 pt-4 pb-2">
                    <h3 className="font-bold text-[#1e293b] text-[15px] leading-tight">
                        {heading}
                    </h3>
                </div>
            ) : null}

            {items.length > 0 ? (
                <div className="grid grid-cols-4 gap-y-4 gap-x-2 px-3 pb-4">
                    {items.map((item, idx) => {
                        const imgSrc = resolveImg(item.image) || item.url || null;
                        const isPlp = item.pageType === 'product_listing_page';

                        return (
                            <div
                                key={item.id || idx}
                                className="flex flex-col items-center gap-1.5 cursor-pointer transition-opacity hover:opacity-80 active:scale-95"
                                onClick={() => handleClick(item)}
                            >
                                <div className="w-full aspect-square bg-[#f4f8f6] rounded-xl overflow-hidden border border-[#e8ede9] flex items-center justify-center relative">
                                    {imgSrc ? (
                                        <img
                                            src={imgSrc}
                                            alt={item.text}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                if (item.driveFileId && !e.target.dataset.retried) {
                                                    e.target.dataset.retried = 'true';
                                                    e.target.src = `https://lh3.googleusercontent.com/d/${item.driveFileId}`;
                                                } else {
                                                    e.target.style.display = 'none';
                                                }
                                            }}
                                        />
                                    ) : (
                                        <span className="text-slate-300 text-[9px] text-center px-1">
                                            {isPlp ? '🛒' : 'No Img'}
                                        </span>
                                    )}
                                    {isPlp && (
                                        <span className="absolute bottom-0.5 right-0.5 text-[7px] bg-blue-500 text-white px-1 py-0.5 rounded-sm font-bold leading-none">
                                            PLP
                                        </span>
                                    )}
                                </div>
                                <span className="text-[10px] text-center leading-[1.2] text-slate-700 font-medium line-clamp-2 w-full px-0.5">
                                    {item.text || 'Category'}
                                </span>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="px-3 pb-4">
                    <div className="w-full h-24 flex items-center justify-center text-slate-400 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-xs">
                        Add category items to see preview
                    </div>
                </div>
            )}
        </div>
    );
};

export default Stick;
