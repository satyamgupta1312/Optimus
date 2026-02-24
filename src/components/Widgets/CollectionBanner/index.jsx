import React from 'react';
import Scroll from './Scroll';
import Stick from './Stick';

/**
 * CollectionBanner — Unified widget entry point.
 *
 * Wiki: WIDGET-Collection-Banner.md §2 (Display Mode Toggle)
 *
 * Modes:
 *   stick  → Stick.jsx  — 4-column static category grid
 *   scroll → Scroll.jsx — horizontal swipeable carousel banners
 *
 * Detection priority:
 *   1. widget.displayMode === 'stick'         (from form/config)
 *   2. widget.type === 'Category Grid'        (from WidgetGenerator)
 *   3. widget.widgetType === 'category'       (from mock/live API data)
 *   4. widget.widget_type === 'category'      (from backend response)
 *   5. widget.categoryItems exists            (from form builder)
 *   6. widget.items has .text property        (legacy category items from API)
 *   → Otherwise: Scroll mode
 */
const CollectionBanner = ({ widget }) => {
    const isStick =
        widget.pnc?.displayMode === 'stick' ||  // config-driven form (CollectionBannerConfig)
        widget.displayMode === 'stick' ||         // direct (legacy)
        widget.type === 'Category Grid' ||
        widget.widgetType === 'category' ||
        widget.widget_type === 'category' ||
        (Array.isArray(widget.categoryItems) && widget.categoryItems.length > 0) ||
        (Array.isArray(widget.items) && widget.items.length > 0 && widget.items[0].text != null);

    return isStick ? <Stick widget={widget} /> : <Scroll widget={widget} />;
};

export default CollectionBanner;
