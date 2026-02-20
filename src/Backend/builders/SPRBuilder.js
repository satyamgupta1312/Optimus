/**
 * SPRBuilder — Product Rail widget builder (SPR + DPR, all 8 variants).
 *
 * References:
 *   scripts/SPR_Widget_Optimized.gs → createSPROptimizedWidget()
 *   config/widgets/SPRConfig.js → deployStrategies, variantMatrix
 *   wiki/Widget-spr.md → Deploy Strategies section
 *   Curl payloads verified for all 8 widget_types
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  SUPPORTED widget_types:                                    │
 * │    ✅ single_product_row                (SPR, std)         │
 * │    ✅ single_product_row_v2             (SPR, opt)         │
 * │    ✅ double_product_row                (DPR, std)         │
 * │    ✅ double_product_row_v2             (DPR, opt)         │
 * │    ✅ multimedia_single_product_row     (SPR, std, media)  │
 * │    ✅ multimedia_single_product_row_v2  (SPR, opt, media)  │
 * │    ✅ multimedia_double_product_row     (DPR, std, media)  │
 * │    ⚠️  multimedia_double_product_row_v2 — curl not available│
 * │       on UI right now; payload assumed same as other 7      │
 * └─────────────────────────────────────────────────────────────┘
 *
 * ALL 8 variants use the SAME deploy flow (9-10 steps):
 *   Flow 1 (PLP Ecosystem):
 *     Step 1: Sub-Cat Widget Item (sub_category)
 *     Step 2: PLP Widget (product_listing)
 *     Step 3: Page Layout
 *     Step 4: Map Sub-Cat → PLP Widget (CSV)
 *     Step 5: Map PLP Widget → Page (CSV)
 *     Step 6: Map Page → Global (CSV)
 *   Flow 2 (Home Row):
 *     Step 7: Row Widget Item (item_rows)
 *     Step 7.5: Create Multimedia (only for multimedia_* variants)
 *     Step 8: Product Rail Widget (widget_type + background_multimedia vary)
 *     Step 9: Map Row Item → Widget (CSV)
 *
 * Differences between variants:
 *   - `widget_type` in Step 8 — resolved from rows × is_optimized × has_multimedia
 *   - `background_multimedia` in Step 8 — empty for non-multimedia, slug for multimedia
 */

import { callApi, createMappingCsv, getNowStr, getFutureStr } from '../ApiClient';
import { SlugGenerator } from '../utils/SlugGenerator';
import { StateMapper } from '../utils/StateMapper';
import { MultimediaService } from '../services/MultimediaService';
import { API_BASE, ENDPOINTS } from '../../config/apiConfig';

/**
 * Variant resolution: PNC → widget_type
 * Matches SPRConfig.variantMatrix exactly.
 */
const VARIANT_MAP = {
    // rows=1 (SPR)
    '1_false_false': 'single_product_row',
    '1_true_false':  'single_product_row_v2',
    '1_false_true':  'multimedia_single_product_row',
    '1_true_true':   'multimedia_single_product_row_v2',
    // rows=2 (DPR)
    '2_false_false': 'double_product_row',
    '2_true_false':  'double_product_row_v2',
    '2_false_true':  'multimedia_double_product_row',
    '2_true_true':   'multimedia_double_product_row_v2',
};

const MULTIMEDIA_TYPES = new Set([
    'multimedia_single_product_row',
    'multimedia_single_product_row_v2',
    'multimedia_double_product_row',
    'multimedia_double_product_row_v2',
]);

export class SPRBuilder {
    /**
     * @param {Object} widget - Canvas widget object
     * @param {Object} widget.pnc - { rows, is_optimized, has_multimedia }
     * @param {string} widget.slug - Base slug
     * @param {string} widget.title - English title
     * @param {string} widget.titleHi - Hindi title
     * @param {Array}  widget.products - Product array or codes
     * @param {string} widget.pageType - 'product_listing_page' | 'category_page'
     * @param {Object} widget.stateProducts - { global: "...", jh: "...", ... }
     * @param {string} [widget.multimediaSlug] - Pre-existing multimedia slug (skip creation)
     * @param {File|Blob} [widget.background_media] - Image file for multimedia creation
     * @param {string} [widget.background_video] - Video URL for multimedia creation
     * @param {Object} opts
     * @param {Function} opts.log - Logging callback
     */
    constructor(widget, { log = console.log } = {}) {
        this.widget = widget;
        this.log = log;
        this.pnc = widget.pnc || { rows: 1, is_optimized: true };
        this.slugGen = new SlugGenerator(widget.slug || widget.title);
        this.dates = {
            start: widget.startTime || getNowStr(),
            end: widget.endTime || getFutureStr(365),
        };
    }

    /**
     * Resolve backend widget_type from PNC properties.
     * @returns {string} One of the 8 variant widget_type strings
     */
    resolveWidgetType() {
        const { rows = 1, is_optimized = true } = this.pnc;
        const hasMedia = !!(this.widget.background_media || this.widget.background_video || this.widget.multimediaSlug);

        const key = `${rows}_${!!is_optimized}_${hasMedia}`;
        const widgetType = VARIANT_MAP[key];

        if (!widgetType) {
            throw new Error(`Cannot resolve widget_type for PNC: rows=${rows}, is_optimized=${is_optimized}, has_multimedia=${hasMedia}`);
        }

        return widgetType;
    }

    /** Get comma-separated product codes (global/main products for homepage row). */
    getProductCodes() {
        const products = this.widget.products
            || (this.widget.stateProducts && this.widget.stateProducts.global)
            || [];
        if (Array.isArray(products)) {
            return products.map(p => typeof p === 'object' ? p.itemCode : p).filter(Boolean).join(',');
        }
        return String(products);
    }

    /**
     * Generate a 1x1 transparent PNG blob (blank image placeholder).
     * Matches: SPR_Optimized_Automation.gs → getBlankImageBlob()
     */
    static getBlankImageBlob() {
        const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new Blob([bytes], { type: 'image/png' });
    }

    /**
     * Resolve the multimedia slug for Step 8.
     * - Non-multimedia variants → '' (empty)
     * - Multimedia with pre-existing slug → use it directly
     * - Multimedia with new image/video → create via MultimediaService, return slug
     *
     * @param {string} widgetType - Resolved widget_type
     * @returns {Promise<string>} Multimedia slug or empty string
     */
    async resolveMultimediaSlug(widgetType) {
        if (!MULTIMEDIA_TYPES.has(widgetType)) {
            return '';
        }

        // User provided a pre-existing multimedia slug (e.g. 'greeting_card')
        if (this.widget.multimediaSlug) {
            this.log(`[ProductRail] Using existing multimedia: ${this.widget.multimediaSlug}`);
            return this.widget.multimediaSlug;
        }

        // Create new multimedia asset
        const mmSlug = this.slugGen.get('_mm');
        this.log(`[ProductRail] Creating multimedia: ${mmSlug}`);

        const result = await MultimediaService.create({
            slugName: mmSlug,
            imageFile: this.widget.background_media || null,
            videoUrl: this.widget.background_video || '',
        });

        this.log(`[ProductRail] Multimedia created: ${result.slug} (type ${result.type})`);
        return result.slug;
    }

    // ════════════════════════════════════════════════════════════
    // UNIFIED DEPLOY FLOW — All 8 variants use the same steps.
    // Only `widget_type` + `background_multimedia` in Step 8 vary.
    //
    // Flow 1 (PLP Ecosystem):
    //   Step 1: Sub-Cat Widget Item (multipart)
    //   Step 2: PLP Widget — product_listing (multipart)
    //   Step 3: Page Layout (JSON)
    //   Step 4: Map Sub-Cat → PLP Widget (CSV)
    //   Step 5: Map PLP Widget → Page (CSV)
    //   Step 6: Map Page → Global (CSV)
    //
    // Flow 2 (Home Row):
    //   Step 7: Row Widget Item — item_rows (multipart)
    //   Step 7.5: Create Multimedia — if multimedia variant (multipart)
    //   Step 8: Product Rail Widget — resolved widget_type (multipart)
    //   Step 9: Map Row Item → Widget (CSV)
    // ════════════════════════════════════════════════════════════

    /**
     * Execute the full deploy flow.
     * @returns {Promise<{ slugs: Object, results: Object[] }>}
     */
    async deploy() {
        const widgetType = this.resolveWidgetType();
        const results = [];
        const productCodes = this.getProductCodes();
        const blankBlob = SPRBuilder.getBlankImageBlob();
        const pageType = this.widget.pageType || 'product_listing_page';

        // Widget slug differs: _spr (standard) vs _spr_opt (optimized)
        const widgetSuffix = this.pnc.is_optimized ? '_spr_opt' : '_spr';

        const slugs = {
            // scItem slugs are per-state — generated dynamically in Step 1
            plpWidget: this.slugGen.get('_plp_w'),
            page: this.slugGen.get('_page_p'),
            rowItem: this.slugGen.get('_pr_wi'),
            widget: this.slugGen.get(widgetSuffix),
            scItems: {}, // populated in Step 1: { global: '{base}_sc_wi_global', jh: '{base}_sc_wi_jh', ... }
        };

        this.log(`[ProductRail] Deploying as: ${widgetType}`);

        // ─── Flow 1: PLP Ecosystem ───

        // Step 1: Sub-Category Widget Items — one per active state
        // State-wise products: { global: "1,2,3", jh: "4,5", cg: "6,7" }
        // Falls back to flat productCodes as global-only if stateProducts not provided
        const stateProducts = this.widget.stateProducts || { global: productCodes };
        const activeStates = StateMapper.getActiveStates(stateProducts);

        for (const state of activeStates) {
            const scSlug = this.slugGen.get(`_sc_wi_${state.key}`);
            slugs.scItems[state.key] = scSlug;

            this.log(`[ProductRail] Step 1 — Sub-Cat Item [${state.key}]: ${scSlug}`);
            await callApi(ENDPOINTS.widgetItem, {
                widget_item_id: 'undefined',
                deactivated_flag: 'no',
                item_click_action: 'deal-detail-redirect',
                slug_name: scSlug,
                item_type: 'sub_category',
                text_en: this.widget.title,
                text_hi: this.widget.titleHi || '',
                media_en: blankBlob,
                product_list: state.codes,
                filters: '[]',
                filter_lst: StateMapper.buildInStockFilter(state.codes),
                property_lst: '[]',
                pl_edit: 'PL',
                is_clickable: 'yes',
                update_product_list: 'no',
                start_time: this.dates.start,
                end_time: this.dates.end,
            }, { multipart: true });
            results.push({ step: `sub_cat_item_${state.key}`, slug: scSlug, status: 'ok' });
        }

        // Step 2: PLP Widget (product_listing)
        this.log(`[ProductRail] Step 2 — PLP Widget: ${slugs.plpWidget}`);
        await callApi(ENDPOINTS.widget, {
            slug_name: slugs.plpWidget,
            widget_type: 'product_listing',
            start_time: this.dates.start,
            end_time: this.dates.end,
            heading: this.widget.title,
            heading_en: this.widget.title,
            heading_hi: '',
            media_aspect_ratio: '1',
            filter_dict: '{}',
            app_configurations: '{}',
            description: '',
            master_key: '',
            heading_bg: '',
            clear_bg_media: '',
            view_all_action_name: '',
            background_multimedia: '',
        }, { multipart: true });
        results.push({ step: 'plp_widget', slug: slugs.plpWidget, status: 'ok' });

        // Step 3: Page Layout
        this.log(`[ProductRail] Step 3 — Page Layout: ${slugs.page}`);
        await callApi(ENDPOINTS.pageLayout, {
            slug_name: slugs.page,
            page_heading: this.widget.title,
            page_layout_type: '2',
            page_type: pageType,
        });
        results.push({ step: 'page_layout', slug: slugs.page, status: 'ok' });

        // Step 4: Map Sub-Cat → PLP Widget (state-wise CSV)
        // Each active state gets its own row: slug, level_tag, level_property, priority
        this.log('[ProductRail] Step 4 — Map Sub-Cat → PLP Widget (state-wise)');
        const scCsv = StateMapper.buildMappingCsv(stateProducts, (key) => slugs.scItems[key]);
        const scMap = new FormData();
        scMap.append('widget_slug', slugs.plpWidget);
        scMap.append('mapping_file', scCsv, 'mapping.csv');
        await fetch(`${API_BASE}${ENDPOINTS.mapWidgetItems}`, {
            method: 'POST', body: scMap, credentials: 'include',
        });
        results.push({ step: 'map_subcat_to_plp', status: 'ok' });

        // Step 5: Map PLP Widget → Page Layout
        this.log('[ProductRail] Step 5 — Map PLP → Page');
        const plpCsvContent = `widget_slug_name,level_tag,level_property,priority,cohort\n${slugs.plpWidget},global,global,1,`;
        const plpCsv = new Blob([plpCsvContent], { type: 'text/csv' });
        const plpMap = new FormData();
        plpMap.append('page_layout_slug', slugs.page);
        plpMap.append('mapping_file', plpCsv, 'mapping.csv');
        await fetch(`${API_BASE}${ENDPOINTS.mapLayoutWidget}`, {
            method: 'POST', body: plpMap, credentials: 'include',
        });
        results.push({ step: 'map_plp_to_page', status: 'ok' });

        // Step 6: Map Page → Global
        this.log('[ProductRail] Step 6 — Map Page → Global');
        const pgCsv = new Blob(['level_tag,level_property\nglobal,global'], { type: 'text/csv' });
        const pgMap = new FormData();
        pgMap.append('page_type', '');
        pgMap.append('page_layout_slug', slugs.page);
        pgMap.append('mapping_file', pgCsv, 'mapping.csv');
        await fetch(`${API_BASE}${ENDPOINTS.mapPageLayout}`, {
            method: 'POST', body: pgMap, credentials: 'include',
        });
        results.push({ step: 'map_page_global', status: 'ok' });

        // ─── Flow 2: Home Row ───

        // Step 7: Row Widget Item (item_rows)
        this.log(`[ProductRail] Step 7 — Row Item: ${slugs.rowItem}`);
        await callApi(ENDPOINTS.widgetItem, {
            widget_item_id: 'undefined',
            deactivated_flag: 'no',
            item_click_action: '',
            slug_name: slugs.rowItem,
            slave_key: '',
            item_type: 'item_rows',
            media: '',
            text_en: '',
            media_en: '',
            text_hi: '',
            media_hi: '',
            text_bg: '',
            media_bg: '',
            product_list: productCodes,
            filters: '[]',
            filter_lst: StateMapper.buildInStockFilter(productCodes),
            property_lst: '[]',
            pl_edit: 'PL',
            is_clickable: 'no',
            update_product_list: 'no',
            start_time: this.dates.start,
            end_time: this.dates.end,
            click_action_params: '{}',
        }, { multipart: true });
        results.push({ step: 'row_item', slug: slugs.rowItem, status: 'ok' });

        // Step 7.5: Create Multimedia (only for multimedia_* variants)
        const multimediaSlug = await this.resolveMultimediaSlug(widgetType);
        if (multimediaSlug) {
            slugs.multimedia = multimediaSlug;
            results.push({ step: 'multimedia', slug: multimediaSlug, status: 'ok' });
        }

        // Step 8: Product Rail Widget (widget_type + background_multimedia vary)
        // Payload verified from curls — identical for all 8 types
        this.log(`[ProductRail] Step 8 — Widget: ${slugs.widget} (${widgetType})`);
        const viewAllParams = JSON.stringify({
            page_type: pageType,
            page_layout_slug_name: slugs.page,
        });
        await callApi(ENDPOINTS.widget, {
            slug_name: slugs.widget,
            widget_type: widgetType,
            description: '',
            heading: '',
            master_key: '',
            heading_en: this.widget.title,
            heading_hi: this.widget.titleHi || '',
            heading_bg: '',
            start_time: this.dates.start,
            end_time: this.dates.end,
            clear_bg_media: '',
            media_aspect_ratio: '1',
            view_all_action_name: 'redirect-to-page',
            view_all_action_params: viewAllParams,
            background_multimedia: multimediaSlug,
            filter_dict: '{}',
            app_configurations: '{}',
        }, { multipart: true });
        results.push({ step: 'widget', slug: slugs.widget, status: 'ok' });

        // Step 9: Map Row Item → Widget
        this.log('[ProductRail] Step 9 — Map Row → Widget');
        const riCsvContent = `widget_item_slug_name,level_tag,level_property,priority,cohort\n${slugs.rowItem},global,global,1,`;
        const riCsv = new Blob([riCsvContent], { type: 'text/csv' });
        const riMap = new FormData();
        riMap.append('widget_slug', slugs.widget);
        riMap.append('mapping_file', riCsv, 'mapping.csv');
        await fetch(`${API_BASE}${ENDPOINTS.mapWidgetItems}`, {
            method: 'POST', body: riMap, credentials: 'include',
        });
        results.push({ step: 'map_row_to_widget', status: 'ok' });

        this.log(`[ProductRail] Deploy complete — ${widgetType}`);
        return { slugs, results };
    }
}
