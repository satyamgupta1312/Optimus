
import { SPRConfig } from '../../config/widgets/SPRConfig';

/**
 * ProductRailBuilder
 * 
 * Responsible for constructing the backend payloads for the Product Rail widget.
 * It reads the widget configuration and generates the appropriate JSON structures
 * for the legacy API (Widget Items, Page Layouts, Mappings).
 */
export class ProductRailBuilder {
    constructor(widget) {
        this.widget = widget;
        this.config = SPRConfig;
        this.slugBase = widget.slug || widget.title.toLowerCase().replace(/ /g, '_');
    }

    /**
     * Main build method that returns the full payload strategy
     */
    build() {
        const { is_optimized } = this.widget.pnc || this.config.initialState.pnc;

        if (is_optimized) {
            return this._buildOptimizedPayload();
        }
        return this._buildStandardPayload();
    }

    /**
     * Build Payload for Optimized Variant (Flow 1 + Flow 2)
     */
    _buildOptimizedPayload() {
        const itemCodes = this._getProductCodes();
        const dates = this._getDates();

        // Define deterministic slugs
        const slugs = {
            scItem: `${this.slugBase}_sc_wi`,
            plpWidget: `${this.slugBase}_plp_w`,
            page: `${this.slugBase}_page_p`,
            rowItem: `${this.slugBase}_pr_wi`,
            rowWidget: `${this.slugBase}_spr_opt`
        };

        return {
            type: 'OPTIMIZED_SPR',
            description: 'Optimized Single Product Row with PLP Ecosystem',
            slugs,
            payloads: [
                // 1. Sub Category Item (For PLP View)
                {
                    endpoint: '/api/app/post_widget_item/',
                    type: 'multipart',
                    data: {
                        slug_name: slugs.scItem,
                        item_type: 'sub_category',
                        text_en: this.widget.title,
                        text_hi: this.widget.titleHi || '',
                        product_list: itemCodes,
                        filter_lst: JSON.stringify([{ "condition": "in_stk_item_codes", "value": itemCodes }]),
                        start_time: dates.start,
                        end_time: dates.end
                    }
                },
                // 2. PLP Widget
                {
                    endpoint: '/api/app/widget/',
                    type: 'multipart',
                    data: {
                        slug_name: slugs.plpWidget,
                        widget_type: 'product_listing',
                        heading: this.widget.title,
                        start_time: dates.start,
                        end_time: dates.end
                    }
                },
                // 3. Page Layout
                {
                    endpoint: '/api/app/post_page_layout/',
                    type: 'json',
                    data: {
                        slug_name: slugs.page,
                        page_heading: this.widget.title,
                        page_layout_type: "2",
                        page_type: "product_listing_page"
                    }
                },
                // 4. Mappings (PLP -> SubCat, Page -> PLP)
                {
                    action: 'map_widget_item',
                    widget_slug: slugs.plpWidget,
                    item_slug: slugs.scItem
                },
                {
                    action: 'map_layout_widget',
                    layout_slug: slugs.page,
                    widget_slug: slugs.plpWidget
                },
                // 5. Row Item (For Home View)
                {
                    endpoint: '/api/app/post_widget_item/',
                    type: 'multipart',
                    data: {
                        slug_name: slugs.rowItem,
                        item_type: 'item_rows',
                        product_list: itemCodes,
                        filter_lst: JSON.stringify([{ "condition": "in_stk_item_codes", "value": itemCodes }]),
                        start_time: dates.start,
                        end_time: dates.end
                    }
                },
                // 6. SPR Widget (The actual rail)
                {
                    endpoint: '/api/app/widget/',
                    type: 'multipart',
                    data: {
                        slug_name: slugs.rowWidget,
                        widget_type: 'single_product_row_v2', // V2 is crucial for optimization
                        heading_en: this.widget.title,
                        heading_hi: this.widget.titleHi || '',
                        view_all_action_name: 'redirect-to-page',
                        view_all_action_params: JSON.stringify({
                            page_type: "product_listing_page",
                            page_layout_slug_name: slugs.page
                        }),
                        start_time: dates.start,
                        end_time: dates.end,
                        background_multimedia: this.widget.pnc?.has_multimedia ? (this.widget.background_media || this.widget.backgroundMultimedia || '') : ''
                    }
                },
                // 7. Map SPR -> Row Item
                {
                    action: 'map_widget_item',
                    widget_slug: slugs.rowWidget,
                    item_slug: slugs.rowItem
                }
            ]
        };
    }

    /**
     * Build Payload for Standard Variant
     */
    _buildStandardPayload() {
        const itemCodes = this._getProductCodes();
        const dates = this._getDates();

        const slugs = {
            wi: `${this.slugBase}_wi`,
            w_spr: `${this.slugBase}_spr`,
            page: `${this.slugBase}_page`
        };

        return {
            type: 'STANDARD_SPR',
            description: 'Standard Single Product Row',
            slugs,
            payloads: [
                // 1. Page Layout (View All)
                {
                    endpoint: '/api/app/post_page_layout/',
                    type: 'json',
                    data: {
                        slug_name: slugs.page,
                        page_heading: this.widget.title,
                        page_type: "product_listing_page"
                    }
                },
                // 2. Widget Item
                {
                    endpoint: '/api/app/post_widget_item/',
                    type: 'multipart',
                    data: {
                        slug_name: slugs.wi,
                        item_type: 'item_rows',
                        product_list: itemCodes,
                        filter_lst: JSON.stringify([{ "condition": "in_stk_item_codes", "value": itemCodes }]),
                        image_multimedia: this.widget.pnc?.has_multimedia ? (this.widget.background_media || this.widget.backgroundMultimedia || '') : '',
                        start_time: dates.start,
                        end_time: dates.end
                    }
                },
                // 3. Widget
                {
                    endpoint: '/api/app/widget/',
                    type: 'multipart',
                    data: {
                        slug_name: slugs.w_spr,
                        widget_type: 'single_product_row', // Original type
                        heading_en: this.widget.title,
                        view_all_action_name: 'redirect-to-page',
                        view_all_action_params: JSON.stringify({
                            page_type: "product_listing_page",
                            page_layout_slug_name: slugs.page
                        }),
                        start_time: dates.start,
                        end_time: dates.end
                    }
                },
                // 4. Mappings
                {
                    action: 'map_widget_item',
                    widget_slug: slugs.w_spr,
                    item_slug: slugs.wi
                },
                {
                    action: 'map_layout_widget',
                    layout_slug: slugs.page,
                    widget_slug: slugs.w_spr
                }
            ]
        };
    }

    _getProductCodes() {
        return (this.widget.products || []).map(p => p.itemCode).filter(Boolean).join(',');
    }

    _getDates() {
        return {
            start: this.widget.startTime || new Date().toISOString().slice(0, 19).replace('T', ' '),
            end: this.widget.endTime || '2030-12-31 23:59:59'
        };
    }
}
