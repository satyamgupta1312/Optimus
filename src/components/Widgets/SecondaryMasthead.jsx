import React, { useEffect, useState } from 'react';
import { useWidgetContext } from '../../context/WidgetContext';

/**
 * SecondaryMasthead — Emulator preview.
 *
 * Design: Unified block — background banner extends visually
 * from the top through the carousel items below.
 * Carousel items show image ONLY (text is embedded in the image).
 */
const SecondaryMasthead = ({ widget }) => {
    const { navigateTo } = useWidgetContext();
    const [mediaUrl, setMediaUrl] = useState(null);

    // Canvas widget has background_media as URL string (auto-uploaded to local server)
    const bgMedia = widget.background_media;

    useEffect(() => {
        if (!bgMedia) { setMediaUrl(null); return; }
        if (bgMedia instanceof File || bgMedia instanceof Blob) {
            const url = URL.createObjectURL(bgMedia);
            setMediaUrl(url);
            return () => URL.revokeObjectURL(url);
        }
        if (typeof bgMedia === 'string') {
            setMediaUrl(bgMedia);
        }
    }, [bgMedia]);

    const carouselItems = widget.carouselItems || widget.items || [];
    const mediaNumber = parseFloat(widget.media_number || '2.5');
    const viewAllRedirect = !!widget.view_all_redirect;
    const viewAllPageType = widget.view_all_page_type || 'category_page';

    // Background style for the header section
    const getBgStyle = () => {
        if (mediaUrl) {
            return {
                backgroundImage: `url(${mediaUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
            };
        }
        return { backgroundColor: widget.background || '#0277FA' };
    };

    const handleBannerClick = () => {
        if (!viewAllRedirect) return;
        if (viewAllPageType === 'product_listing_page') {
            const globalCodes = widget.view_all_state_products?.global || '';
            const codes = globalCodes.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
            const viewAllExpand = widget.view_all_expand || {};
            navigateTo('listing', {
                title: widget.view_all_heading || 'View All',
                products: codes.map(code => ({ id: code, itemCode: code, name: `Product ${code}`, price: '₹0', image: '' })),
                plpWidgets: viewAllExpand.expandPage ? (viewAllExpand.plpWidgets || []) : [],
            });
        } else {
            navigateTo('category', {
                heading: widget.view_all_heading || 'View All',
                subCategories: widget.view_all_sub_categories || [],
            });
        }
    };

    return (
        <div className="flex flex-col overflow-hidden rounded-b-[2rem] -mt-1 shadow-lg">
            {/* ── Header background — clickable for View All ── */}
            <div
                className={`relative z-10 overflow-hidden ${viewAllRedirect ? 'cursor-pointer active:brightness-95' : ''}`}
                style={{ ...getBgStyle(), minHeight: '120px' }}
                onClick={handleBannerClick}
            >
                {viewAllRedirect && (
                    <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5">
                        <span className="text-[9px] text-white font-semibold">View All →</span>
                    </div>
                )}
            </div>

            {/* ── Carousel Items — same background extends ── */}
            {carouselItems.length > 0 && (
                <div
                    className="relative z-10 px-3 pt-0 pb-4"
                    style={getBgStyle()}
                >
                    <div
                        className="flex gap-2 overflow-x-auto scrollbar-hide"
                        style={{ scrollSnapType: 'x mandatory' }}
                    >
                        {carouselItems.map((item, idx) => {
                            // Resolve image URL
                            const imgSrc = typeof item.image === 'string'
                                ? item.image
                                : (item.image instanceof File || item.image instanceof Blob)
                                    ? URL.createObjectURL(item.image)
                                    : null;

                            const itemWidth = `${100 / mediaNumber}%`;

                            return (
                                <div
                                    key={idx}
                                    className="flex-shrink-0 cursor-pointer active:scale-95 transition-transform"
                                    style={{ width: itemWidth, scrollSnapAlign: 'start' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (item.pageType === 'product_listing_page') {
                                            // Extract product codes from stateProducts.global
                                            const globalCodes = item.stateProducts?.global || '';
                                            const codes = globalCodes.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
                                            const products = codes.map(code => ({
                                                id: code,
                                                itemCode: code,
                                                name: `Product ${code}`,
                                                price: '₹0',
                                                image: '',
                                            }));
                                            navigateTo('listing', {
                                                title: item.pageHeading || 'Product Listing',
                                                products,
                                                plpWidgets: item.expandPage ? (item.plpWidgets || []) : [],
                                            });
                                        } else {
                                            navigateTo('category', {
                                                heading: item.pageHeading || '',
                                                subCategories: item.subCategories || [],
                                            });
                                        }
                                    }}
                                >
                                    {/* Image only — no text over image */}
                                    <div className="rounded-xl overflow-hidden aspect-square bg-white/10">
                                        {imgSrc ? (
                                            <img
                                                src={imgSrc}
                                                alt={item.pageHeading || `Item ${idx + 1}`}
                                                className="w-full h-full object-cover"
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-white/20">
                                                <span className="text-[9px] text-white/60">No Image</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SecondaryMasthead;
