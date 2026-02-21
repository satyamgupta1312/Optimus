import React, { useMemo } from 'react';
import { useWidgetContext } from '../../context/WidgetContext';
import { useCatalog } from '../../hooks/useCatalog';

/**
 * BannerWithProductListing
 *
 * Carousel/banner widget that navigates to a Product Listing Page on click.
 * On click, resolves item codes from `widget.products` using the Google Sheet
 * catalog via `useCatalog`, then navigates to the PLP view with real product data.
 *
 * Widget fields used:
 *   widget.products   — string[] of item codes (set via ProductListInput in sidebar)
 *   widget.items      — ScrollItem[] (each has item.productIds / item.stateProducts)
 *   widget.title      — Page heading
 *   widget.image      — Banner image
 *   widget.aspectRatio
 *
 * Catalog: src/hooks/useCatalog.js → ProductCatalogConfig.js
 * Wiki:    wiki/DATA-Catalog-Integration.md
 */
const BannerWithProductListing = ({ widget }) => {
    const { navigateTo } = useWidgetContext();
    const { getProduct } = useCatalog();

    /** Resolve a list of item code strings to product objects for PLP */
    const resolveProducts = (codes) => {
        if (!codes || !codes.length) return [];
        return codes
            .map(code => {
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
                // Unknown code — show placeholder
                return {
                    id: c,
                    name: `Product #${c}`,
                    selling_price: 0,
                    mrp: 0,
                    image_url: 'https://placehold.co/150',
                    quantity_text: '1 pc',
                    discount_percentage: 0,
                };
            })
            .filter(Boolean);
    };

    const handleClick = () => {
        // Priority 1: widget.products is a string[] of item codes (from ProductListInput)
        const rawCodes = widget.products || [];
        const products = resolveProducts(
            Array.isArray(rawCodes) ? rawCodes : String(rawCodes).split(/[,\n\s]+/).filter(Boolean)
        );
        navigateTo('listing', {
            title: widget.title || 'Product Listing',
            products,
        });
    };

    return (
        <div
            onClick={handleClick}
            className="w-full relative overflow-hidden rounded-lg shadow-sm cursor-pointer active:scale-95 transition-transform"
        >
            {/* Banner Image */}
            <div
                className="w-full bg-slate-200 relative"
                style={{ aspectRatio: widget.aspectRatio ? `${widget.aspectRatio}/1` : '2/1' }}
            >
                {widget.image ? (
                    <img
                        src={widget.image}
                        alt={widget.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                    />
                ) : (
                    <div className="flex items-center justify-center w-full h-full text-slate-400">
                        No Image
                    </div>
                )}
            </div>
        </div>
    );
};

export default BannerWithProductListing;
