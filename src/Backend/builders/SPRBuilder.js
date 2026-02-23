/**
 * SPRBuilder — Product Rail widget builder (SPR + DPR, all 8 variants).
 *
 * References:
 *   scripts/SPR_Widget_Optimized.gs → createSPROptimizedWidget() (with Create/Update logic)
 *   config/widgets/SPRConfig.js → deployStrategies, variantMatrix
 *   wiki/Widget-spr.md → Deploy Strategies section
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  SUPPORTED widget_types:                                    │
 * │    ✅ single_product_row                (SPR, std)         │
 * │    ✅ single_product_row_v2             (SPR, opt)         │
 * │    ✅ double_product_row                (DPR, std)         │
 * │    ✅ double_product_row_v2             (DPR, opt)         │
 * │    ✅ multimedia_single_product_row     (SPR, std, media)  │
 * │    ✅ multimedia_single_product_row_v2  (SPR, opt, media)  │
 * │    ❌ multimedia_double_product_row     (DPR, std, media)  │  ← NOT AVAILABLE
 * │    ✅ multimedia_double_product_row_v2  (DPR, opt, media)  │
 * └─────────────────────────────────────────────────────────────┘
 *
 * ALL 8 variants use the SAME deploy flow (9-10 steps):
 *   Flow 1 (PLP Ecosystem):
 *     Step 1: Sub-Cat Widget Item (sub_category)        — CREATE or UPDATE
 *     Step 2: PLP Widget (product_listing)               — CREATE or UPDATE
 *     Step 3: Page Layout                                — CREATE or SKIP
 *     Step 4: Map Sub-Cat → PLP Widget (CSV)
 *     Step 5: Map PLP Widget → Page (CSV)
 *     Step 6: Map Page → Global (CSV)
 *   Flow 2 (Home Row):
 *     Step 7: Row Widget Item (item_rows)                — CREATE or UPDATE
 *     Step 7.5: Create Multimedia (only for multimedia_* variants)
 *     Step 8: Product Rail Widget (widget_type varies)   — CREATE or UPDATE
 *     Step 9: Map Row Item → Widget (CSV)
 *
 * Differences between variants:
 *   - `widget_type` in Step 8 — resolved from rows × is_optimized × has_multimedia
 *   - `background_multimedia` in Step 8 — empty for non-multimedia, slug for multimedia
 *
 * Create/Update Logic (ported from GS script):
 *   Before each CREATE, check if the slug already exists on the backend.
 *   If exists → UPDATE (PUT with only changed fields, skip media_en)
 *   If not    → CREATE (POST with all required fields)
 */

import {
    callApi, updateApi, createMappingCsv,
    getWidgetId, getWidgetItemId, getPageLayoutId,
    getNowStr, getFutureStr, getCsrfToken,
} from '../ApiClient';
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
    '1_true_false': 'single_product_row_v2',
    '1_false_true': 'multimedia_single_product_row',
    '1_true_true': 'multimedia_single_product_row_v2',
    // rows=2 (DPR)
    '2_false_false': 'double_product_row',
    '2_true_false': 'double_product_row_v2',
    '2_false_true': 'multimedia_double_product_row',
    '2_true_true': 'multimedia_double_product_row_v2',
};

const MULTIMEDIA_TYPES = new Set([
    'multimedia_single_product_row',
    'multimedia_single_product_row_v2',
    'multimedia_double_product_row',
    'multimedia_double_product_row_v2',
]);

/** Types not yet supported on the backend — deploy should be blocked */
const UNAVAILABLE_TYPES = new Set([
    'multimedia_double_product_row',
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

        if (UNAVAILABLE_TYPES.has(widgetType)) {
            throw new Error(`Widget type "${widgetType}" is not available yet. Multimedia Double Product Row is not supported on the backend.`);
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
     */
    async resolveMultimediaSlug(widgetType) {
        if (!MULTIMEDIA_TYPES.has(widgetType)) {
            return '';
        }

        if (this.widget.multimediaSlug) {
            this.log(`[ProductRail] Using existing multimedia: ${this.widget.multimediaSlug}`);
            return this.widget.multimediaSlug;
        }

        const mmSlug = this.slugGen.get('_mm');
        this.log(`[ProductRail] Creating multimedia: ${mmSlug}`);

        // Resolve background_media: may be a File object (direct upload) or a URL string (local server)
        let imageFile = this.widget.background_media || null;
        if (typeof imageFile === 'string' && imageFile.length > 0) {
            this.log(`[ProductRail] Fetching media from URL: ${imageFile}`);
            try {
                const res = await fetch(imageFile);
                if (!res.ok) throw new Error(`Media fetch failed: ${res.status}`);
                const blob = await res.blob();
                const ext = blob.type.split('/')[1] || 'jpg';
                imageFile = new File([blob], `background.${ext}`, { type: blob.type });
                this.log(`[ProductRail] Media resolved: ${blob.type} (${blob.size}B)`);
            } catch (e) {
                this.log(`[ProductRail] Warning — media fetch failed: ${e.message}`);
                imageFile = null;
            }
        }

        const result = await MultimediaService.create({
            slugName: mmSlug,
            imageFile,
            videoUrl: this.widget.background_video || '',
        });

        this.log(`[ProductRail] Multimedia created: ${result.slug} (type ${result.type})`);
        return result.slug;
    }

    // ════════════════════════════════════════════════════════════
    // UNIFIED DEPLOY FLOW — All 8 variants use the same steps.
    // Each step: Check if exists → UPDATE or CREATE
    //
    // Flow 1 (PLP Ecosystem):
    //   Step 1: Sub-Cat Widget Item (multipart)
    //   Step 2: PLP Widget — product_listing (multipart)
    //   Step 3: Page Layout (JSON)
    //   Step 4-6: Mapping CSVs
    //
    // Flow 2 (Home Row):
    //   Step 7: Row Widget Item — item_rows (multipart)
    //   Step 7.5: Create Multimedia (if multimedia variant)
    //   Step 8: Product Rail Widget — resolved widget_type (multipart)
    //   Step 9: Map Row Item → Widget (CSV)
    // ════════════════════════════════════════════════════════════

    /**
     * Execute the full deploy flow with Create/Update logic.
     * @returns {Promise<{ slugs: Object, results: Object[] }>}
     */
    async deploy() {
        const widgetType = this.resolveWidgetType();
        const results = [];
        const productCodes = this.getProductCodes();
        const blankBlob = SPRBuilder.getBlankImageBlob();
        const pageType = this.widget.pageType || 'product_listing_page';

        const widgetSuffix = this.pnc.is_optimized ? '_spr_opt' : '_spr';

        const slugs = {
            plpWidget: this.slugGen.get('_plp_w'),
            page: this.slugGen.get('_page_p'),
            widget: this.slugGen.get(widgetSuffix),
            scItems: {},
            rowItems: {},
        };

        this.log(`[ProductRail] Deploying as: ${widgetType} (Create/Update mode)`);

        // ─── Flow 1: PLP Ecosystem ───

        // Step 1: Sub-Category Widget Items — one per active state
        const stateProducts = this.widget.stateProducts || { global: productCodes };
        const activeStates = StateMapper.getActiveStates(stateProducts);

        for (const state of activeStates) {
            const scSlug = this.slugGen.get(`_sc_wi_${state.key}`);
            slugs.scItems[state.key] = scSlug;

            try {
                const existingId = await getWidgetItemId(scSlug);

                if (existingId) {
                    // UPDATE existing sub-cat item (skip media_en for JSON update)
                    this.log(`[ProductRail] Step 1 — SC Item [${state.key}] exists (${existingId}), Updating...`);
                    await updateApi(`/api/app/widget_item/${existingId}/`, {
                        slug_name: scSlug,
                        item_type: 'sub_category',
                        text_en: this.widget.title,
                        text_hi: this.widget.titleHi || '',
                        product_list: state.codes,
                        filter_lst: StateMapper.buildInStockFilter(state.codes),
                        start_time: this.dates.start,
                        end_time: this.dates.end,
                    });
                } else {
                    // CREATE new sub-cat item
                    this.log(`[ProductRail] Step 1 — SC Item [${state.key}] new, Creating: ${scSlug}`);
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
                }

                results.push({ step: `sub_cat_item_${state.key}`, slug: scSlug, status: 'ok' });
            } catch (e) {
                this.log(`[ProductRail] Step 1 — SC Item [${state.key}] failed: ${e.message}`);
                results.push({ step: `sub_cat_item_${state.key}`, slug: scSlug, status: 'failed', error: e.message });
            }
        }

        // Step 2: PLP Widget (product_listing) — Create or Update
        try {
            const plpId = await getWidgetId(slugs.plpWidget);

            if (plpId) {
                this.log(`[ProductRail] Step 2 — PLP Widget exists (${plpId}), Updating...`);
                await updateApi(`/api/app/widget/${plpId}/`, {
                    slug_name: slugs.plpWidget,
                    widget_type: 'product_listing',
                    start_time: this.dates.start,
                    end_time: this.dates.end,
                    heading: this.widget.title,
                    heading_en: this.widget.title,
                });
            } else {
                this.log(`[ProductRail] Step 2 — PLP Widget new, Creating: ${slugs.plpWidget}`);
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
            }

            results.push({ step: 'plp_widget', slug: slugs.plpWidget, status: 'ok' });
        } catch (e) {
            this.log(`[ProductRail] Step 2 — PLP Widget failed: ${e.message}`);
            results.push({ step: 'plp_widget', slug: slugs.plpWidget, status: 'failed', error: e.message });
        }

        // Step 3: Page Layout — Create or Skip (no update needed)
        try {
            const pageId = await getPageLayoutId(slugs.page);

            if (pageId) {
                this.log(`[ProductRail] Step 3 — Page Layout exists (${pageId}), Skipping Create...`);
            } else {
                this.log(`[ProductRail] Step 3 — Page Layout new, Creating: ${slugs.page}`);
                await callApi(ENDPOINTS.pageLayout, {
                    slug_name: slugs.page,
                    page_heading: this.widget.title,
                    page_layout_type: '2',
                    page_type: pageType,
                });
            }

            results.push({ step: 'page_layout', slug: slugs.page, status: 'ok' });
        } catch (e) {
            this.log(`[ProductRail] Step 3 — Page Layout failed: ${e.message}`);
            results.push({ step: 'page_layout', slug: slugs.page, status: 'failed', error: e.message });
        }

        // Step 4: Map Sub-Cat → PLP Widget (state-wise CSV)
        try {
            this.log('[ProductRail] Step 4 — Map Sub-Cat → PLP Widget');
            const scCsv = StateMapper.buildMappingCsv(stateProducts, (key) => slugs.scItems[key]);
            const scMap = new FormData();
            const csrfToken = getCsrfToken();
            if (csrfToken) scMap.append('csrfmiddlewaretoken', csrfToken);
            scMap.append('widget_slug', slugs.plpWidget);
            scMap.append('mapping_file', scCsv, 'mapping.csv');
            await fetch(`${API_BASE}${ENDPOINTS.mapWidgetItems}`, {
                method: 'POST', body: scMap, credentials: 'include',
                headers: { 'X-CSRFToken': csrfToken || '' },
            });
            results.push({ step: 'map_subcat_to_plp', status: 'ok' });
        } catch (e) {
            this.log(`[ProductRail] Step 4 — Mapping failed: ${e.message}`);
        }

        // Step 5: Map PLP Widget → Page Layout
        try {
            this.log('[ProductRail] Step 5 — Map PLP → Page');
            const plpCsv = new Blob([
                `widget_slug_name,level_tag,level_property,priority,cohort\n${slugs.plpWidget},global,global,1,`,
            ], { type: 'text/csv' });
            const plpMap = new FormData();
            const csrfToken5 = getCsrfToken();
            if (csrfToken5) plpMap.append('csrfmiddlewaretoken', csrfToken5);
            plpMap.append('page_layout_slug', slugs.page);
            plpMap.append('mapping_file', plpCsv, 'mapping.csv');
            await fetch(`${API_BASE}${ENDPOINTS.mapLayoutWidget}`, {
                method: 'POST', body: plpMap, credentials: 'include',
                headers: { 'X-CSRFToken': csrfToken5 || '' },
            });
            results.push({ step: 'map_plp_to_page', status: 'ok' });
        } catch (e) {
            this.log(`[ProductRail] Step 5 — Mapping failed: ${e.message}`);
        }

        // Step 6: Map Page → Global
        try {
            this.log('[ProductRail] Step 6 — Map Page → Global');
            const pgCsv = new Blob(['level_tag,level_property\nglobal,global'], { type: 'text/csv' });
            const pgMap = new FormData();
            const csrfToken6 = getCsrfToken();
            if (csrfToken6) pgMap.append('csrfmiddlewaretoken', csrfToken6);
            pgMap.append('page_type', '');
            pgMap.append('page_layout_slug', slugs.page);
            pgMap.append('mapping_file', pgCsv, 'mapping.csv');
            await fetch(`${API_BASE}${ENDPOINTS.mapPageLayout}`, {
                method: 'POST', body: pgMap, credentials: 'include',
                headers: { 'X-CSRFToken': csrfToken6 || '' },
            });
            results.push({ step: 'map_page_global', status: 'ok' });
        } catch (e) {
            this.log(`[ProductRail] Step 6 — Mapping failed: ${e.message}`);
        }

        // ─── Flow 2: Home Row ───

        // Step 7: Row Widget Items (item_rows) — one per active state, Create or Update
        for (const state of activeStates) {
            const riSlug = this.slugGen.get(`_pr_wi_${state.key}`);
            slugs.rowItems[state.key] = riSlug;

            try {
                const riId = await getWidgetItemId(riSlug);

                if (riId) {
                    this.log(`[ProductRail] Step 7 — Row Item [${state.key}] exists (${riId}), Updating...`);
                    await updateApi(`/api/app/widget_item/${riId}/`, {
                        slug_name: riSlug,
                        item_type: 'item_rows',
                        product_list: state.codes,
                        filter_lst: StateMapper.buildInStockFilter(state.codes),
                        start_time: this.dates.start,
                        end_time: this.dates.end,
                    });
                } else {
                    this.log(`[ProductRail] Step 7 — Row Item [${state.key}] new, Creating: ${riSlug}`);
                    await callApi(ENDPOINTS.widgetItem, {
                        widget_item_id: 'undefined',
                        deactivated_flag: 'no',
                        item_click_action: '',
                        slug_name: riSlug,
                        slave_key: '',
                        item_type: 'item_rows',
                        media: '',
                        text_en: '',
                        media_en: '',
                        text_hi: '',
                        media_hi: '',
                        text_bg: '',
                        media_bg: '',
                        product_list: state.codes,
                        filters: '[]',
                        filter_lst: StateMapper.buildInStockFilter(state.codes),
                        property_lst: '[]',
                        pl_edit: 'PL',
                        is_clickable: 'no',
                        update_product_list: 'no',
                        start_time: this.dates.start,
                        end_time: this.dates.end,
                        click_action_params: '{}',
                    }, { multipart: true });
                }

                results.push({ step: `row_item_${state.key}`, slug: riSlug, status: 'ok' });
            } catch (e) {
                this.log(`[ProductRail] Step 7 — Row Item [${state.key}] failed: ${e.message}`);
                results.push({ step: `row_item_${state.key}`, slug: riSlug, status: 'failed', error: e.message });
            }
        }

        // Step 7.5: Create Multimedia (only for multimedia_* variants)
        const multimediaSlug = await this.resolveMultimediaSlug(widgetType);
        if (multimediaSlug) {
            slugs.multimedia = multimediaSlug;
            results.push({ step: 'multimedia', slug: multimediaSlug, status: 'ok' });
        }

        // Step 8: Product Rail Widget — Create or Update
        // Payload identical for all 8 types — only widget_type + background_multimedia vary
        try {
            const viewAllParams = JSON.stringify({
                page_type: pageType,
                page_layout_slug_name: slugs.page,
            });

            const sprId = await getWidgetId(slugs.widget);

            if (sprId) {
                this.log(`[ProductRail] Step 8 — Widget exists (${sprId}), Updating...`);
                await updateApi(`/api/app/widget/${sprId}/`, {
                    slug_name: slugs.widget,
                    widget_type: widgetType,
                    heading: this.widget.title,
                    heading_en: this.widget.title,
                    heading_hi: this.widget.titleHi || '',
                    start_time: this.dates.start,
                    end_time: this.dates.end,
                    view_all_action_params: viewAllParams,
                });
            } else {
                this.log(`[ProductRail] Step 8 — Widget new, Creating: ${slugs.widget} (${widgetType})`);
                const widgetPayload = {
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
                    // Always send background_multimedia — Django requires it even as empty string
                    // For multimedia variants: pass the slug; for regular SPR/DPR: pass ''
                    background_multimedia: MULTIMEDIA_TYPES.has(widgetType) ? (multimediaSlug || '') : '',
                    filter_dict: '{}',
                    app_configurations: '{}',
                };
                await callApi(ENDPOINTS.widget, widgetPayload, { multipart: true });
            }

            results.push({ step: 'widget', slug: slugs.widget, status: 'ok' });
        } catch (e) {
            this.log(`[ProductRail] Step 8 — Widget failed: ${e.message}`);
            results.push({ step: 'widget', slug: slugs.widget, status: 'failed', error: e.message });
        }

        // Step 9: Map Row Items → Widget (state-wise)
        try {
            this.log('[ProductRail] Step 9 — Map Row → Widget (state-wise)');
            const riCsv = StateMapper.buildMappingCsv(stateProducts, (key) => slugs.rowItems[key]);
            const riMap = new FormData();
            const csrfToken9 = getCsrfToken();
            if (csrfToken9) riMap.append('csrfmiddlewaretoken', csrfToken9);
            riMap.append('widget_slug', slugs.widget);
            riMap.append('mapping_file', riCsv, 'mapping.csv');
            await fetch(`${API_BASE}${ENDPOINTS.mapWidgetItems}`, {
                method: 'POST', body: riMap, credentials: 'include',
                headers: { 'X-CSRFToken': csrfToken9 || '' },
            });
            results.push({ step: 'map_row_to_widget', status: 'ok' });
        } catch (e) {
            this.log(`[ProductRail] Step 9 — Mapping failed: ${e.message}`);
        }

        this.log(`[ProductRail] Deploy complete — ${widgetType}`);
        return { slugs, results };
    }
}
