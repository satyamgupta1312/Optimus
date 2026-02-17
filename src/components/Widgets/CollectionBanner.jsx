import React from 'react';
import BannerWithProductListing from './BannerWithProductListing';
import CategoryGrid from './CategoryGrid';

/**
 * CollectionBanner — Unified widget that renders either:
 *   - Scroll mode  → BannerWithProductListing (carousel banners)
 *   - Stick mode   → CategoryGrid (4-column static grid)
 *
 * The mode is determined by `widget.displayMode`:
 *   - 'scroll' (default) → carousel
 *   - 'stick'            → category grid
 */
const CollectionBanner = ({ widget }) => {
    const isScrollMode = (widget.displayMode || 'scroll') === 'scroll';

    if (isScrollMode) {
        return <BannerWithProductListing widget={widget} />;
    }

    return <CategoryGrid widget={widget} />;
};

export default CollectionBanner;
