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
     * Resolve image for multipart upload:
     *   File/Blob  → use directly
     *   URL string → fetch → File
     *   falsy / {} → blank 1×1 PNG
     */
    async _resolveImage(src, fallbackName = 'image.png') {
        const blank = SPRBuilder.getBlankImageBlob();
        if (!src) return blank;
        if (src instanceof File || src instanceof Blob) return src;
        if (typeof src === 'object') return blank;
        if (typeof src !== 'string' || src.length === 0) return blank;
        try {
            this.log(`[ProductRail]   Fetching image: ${src.substring(0, 60)}...`);
            const res = await fetch(src);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            const ext = blob.type.split('/')[1] || 'png';
            return new File([blob], `${fallbackName}.${ext}`, { type: blob.type });
        } catch (e) {
            this.log(`[ProductRail]   Image fetch failed (${e.message}), using blank`);
            return blank;
        }
    }

    /** Helper: POST mapping CSV */
    async _postMapping(endpoint, formFields, csvBlob, fileName = 'mapping.csv') {
        const fd = new FormData();
        const csrf = getCsrfToken();
        if (csrf) fd.append('csrfmiddlewaretoken', csrf);
        for (const [k, v] of Object.entries(formFields)) fd.append(k, v);
        fd.append('mapping_file', csvBlob, fileName);
        const res = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST', body: fd, credentials: 'include',
            headers: { 'X-CSRFToken': csrf || '' },
        });
        const body = await res.text().catch(() => '');
        this.log(`[ProductRail]   Mapping POST ${endpoint} → ${res.status} ${body.substring(0, 200)}`);
        if (!res.ok) throw new Error(`Mapping failed: ${res.status} ${body.substring(0, 100)}`);
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
            page: pageType === 'category_page' ? this.slugGen.get('_Cat_page') : this.slugGen.get('_page_p'),
            widget: this.slugGen.get(widgetSuffix),
            scItems: {},
            rowItems: {},
        };

        this.log(`[ProductRail] Deploying as: ${widgetType} (Create/Update mode)`);

        // ─── Flow 1: PLP Ecosystem ───
        // When expandPage is ON, skip Steps 1-4 (sub-cat, PLP widget, sub-cat mapping).
        // The expand page widgets (Step 4.5) will create their own widget+sub-cat ecosystem
        // and will be mapped directly to the page layout.
        const isExpandPage = !!(this.widget.expand_page?.expandPage);

        const allSubCatMappingRows = [];

        if (!isExpandPage) {
        // Step 1: Sub-Category Widget Items
        let subCategoriesList = [];
        if (pageType === 'category_page') {
            subCategoriesList = this.widget.subCategories || [];
        } else {
            const stateProducts = this.widget.stateProducts || { global: productCodes };
            subCategoriesList = [{ name: this.widget.title, nameHi: this.widget.titleHi, products: stateProducts }];
        }

        for (let j = 0; j < subCategoriesList.length; j++) {
            const sub = subCategoriesList[j];
            const activeStates = StateMapper.getActiveStates(sub.products || { global: '' });

            for (const state of activeStates) {
                // If it's a category page, include index j in the slug to prevent collisions
                const scSlug = pageType === 'category_page'
                    ? this.slugGen.getNestedStateful(0, j, state.key)
                    : this.slugGen.get(`_sc_wi_${state.key}`);

                // Track for Flow 2 (Home Row) code merging
                if (!slugs.scItems[state.key]) slugs.scItems[state.key] = [];
                slugs.scItems[state.key].push({ slug: scSlug, codes: state.codes });

                try {
                    const existingId = await getWidgetItemId(scSlug);

                    if (existingId) {
                        // UPDATE existing sub-cat item (skip media_en for JSON update)
                        this.log(`[ProductRail] Step 1 — SC Item [${state.key}] exists (${existingId}), Updating...`);
                        await updateApi(`/api/app/widget_item/${existingId}/`, {
                            slug_name: scSlug,
                            item_type: 'sub_category',
                            text_en: sub.name || this.widget.title || '',
                            text_hi: sub.nameHi || this.widget.titleHi || '',
                            product_list: state.codes,
                            filter_lst: StateMapper.buildInStockFilter(state.codes),
                            start_time: this.dates.start,
                            end_time: this.dates.end,
                        });
                    } else {
                        // CREATE new sub-cat item
                        this.log(`[ProductRail] Step 1 — SC Item [${state.key}] new, Creating: ${scSlug}`);

                        const scPayload = {
                            widget_item_id: 'undefined',
                            deactivated_flag: 'no',
                            item_click_action: 'deal-detail-redirect',
                            slug_name: scSlug,
                            item_type: 'sub_category',
                            text_en: sub.name || this.widget.title || '',
                            text_hi: sub.nameHi || this.widget.titleHi || '',
                            media_en: sub.image instanceof File || sub.image instanceof Blob ? sub.image : blankBlob,
                            product_list: state.codes,
                            filters: '[]',
                            filter_lst: StateMapper.buildInStockFilter(state.codes),
                            property_lst: '[]',
                            pl_edit: 'PL',
                            is_clickable: 'yes',
                            update_product_list: 'no',
                            start_time: this.dates.start,
                            end_time: this.dates.end,
                        };
                        await callApi(ENDPOINTS.widgetItem, scPayload, { multipart: true });
                    }

                    allSubCatMappingRows.push(
                        `${scSlug},${state.def?.levelTag || 'global'},${state.def?.levelProperty || 'global'},${allSubCatMappingRows.length + 1},`
                    );
                    results.push({ step: `sub_cat_item_${state.key}`, slug: scSlug, status: 'ok' });
                } catch (e) {
                    this.log(`[ProductRail] Step 1 — SC Item [${state.key}] failed: ${e.message}`);
                    results.push({ step: `sub_cat_item_${state.key}`, slug: scSlug, status: 'failed', error: e.message });
                }
            }
        } // End of subCategoriesList loop

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
        } else {
            this.log(`[ProductRail] Steps 1-2 SKIPPED — Expand Page is ON (PLP/sub-cat created by expand widgets)`);
        }

        // Step 3: Page Layout — Create or Skip (always needed, even for expand page)
        try {
            const pageId = await getPageLayoutId(slugs.page);

            if (pageId) {
                this.log(`[ProductRail] Step 3 — Page Layout exists (${pageId}), Skipping Create...`);
            } else {
                this.log(`[ProductRail] Step 3 — Page Layout new, Creating: ${slugs.page}`);
                try {
                    await callApi(ENDPOINTS.pageLayout, {
                        slug_name: slugs.page,
                        page_heading: this.widget.title,
                        page_layout_type: '2',
                        page_type: pageType,
                    });
                } catch (createErr) {
                    if (createErr.message?.includes('already exists') || createErr.message?.includes('exists')) {
                        this.log(`[ProductRail] Step 3 — Already exists, skipping...`);
                    } else {
                        throw createErr;
                    }
                }
            }

            results.push({ step: 'page_layout', slug: slugs.page, status: 'ok' });
        } catch (e) {
            this.log(`[ProductRail] Step 3 — Page Layout failed: ${e.message}`);
            results.push({ step: 'page_layout', slug: slugs.page, status: 'failed', error: e.message });
        }

        // Step 4: Map Sub-Cats → PLP Widget (skip when expandPage is ON)
        if (!isExpandPage) {
        try {
            this.log('[ProductRail] Step 4 — Map Sub-Cat → PLP Widget');
            const scHeader = 'widget_item_slug_name,level_tag,level_property,priority,cohort';
            const scCsv = new Blob([scHeader + '\n' + allSubCatMappingRows.join('\n')], { type: 'text/csv' });
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
        } else {
            this.log(`[ProductRail] Step 4 SKIPPED — Expand Page is ON`);
        }

        // Step 4.5: Expand Page — Create additional PLP widgets (if expandPage ON)
        // Handles 3 widget groups correctly:
        //   spr group     → sub_category items with stateProducts
        //   carousel group → carousel items with scrollItems (each has its own PLP ecosystem)
        //   masthead group → carousel items with carouselItems + multimedia background
        const expandPageData = this.widget.expand_page || {};
        const expandWidgetSlugs = [];

        if (expandPageData.expandPage && Array.isArray(expandPageData.plpWidgets)) {
            this.log(`[ProductRail] Step 4.5 — Creating ${expandPageData.plpWidgets.length} expand page widgets`);

            for (let k = 0; k < expandPageData.plpWidgets.length; k++) {
                const epw = expandPageData.plpWidgets[k];
                const epwSlug = this.slugGen.get(`_ep_${k + 1}`);

                // Resolve widget group from type
                const SPR_TYPES = new Set([
                    'single_product_row', 'single_product_row_v2',
                    'double_product_row', 'double_product_row_v2',
                    'multimedia_single_product_row', 'multimedia_single_product_row_v2',
                    'multimedia_double_product_row_v2',
                ]);
                const isSpr = SPR_TYPES.has(epw.type);
                const isCarousel = epw.type === 'carousel';
                const isMasthead = epw.type === 'masthead_secondary_category_hp';
                const isMultimediaSpr = epw.type.startsWith('multimedia_');

                try {
                    // ── Create/Update: Check if expand widget already exists ──
                    const existingEpwId = await getWidgetId(epwSlug);

                    // Resolve multimedia slug for multimedia SPR/DPR expand widgets
                    let epwMmSlug = '';
                    if (isMultimediaSpr && (epw.background_media || epw.background_video)) {
                        const mmSlug = `${epwSlug}_mm`;
                        this.log(`[ProductRail] EP ${k + 1}: Creating multimedia: ${mmSlug}`);
                        try {
                            let imageFile = epw.background_media || null;
                            if (typeof imageFile === 'string' && imageFile.length > 0) {
                                imageFile = await this._resolveImage(imageFile, `ep_${k + 1}_bg`);
                            }
                            await MultimediaService.create({
                                slugName: mmSlug,
                                imageFile: imageFile instanceof File || imageFile instanceof Blob ? imageFile : null,
                                videoUrl: epw.background_video || '',
                            });
                            epwMmSlug = mmSlug;
                        } catch (mmErr) {
                            this.log(`[ProductRail] EP ${k + 1} multimedia failed (may exist): ${mmErr.message}`);
                            epwMmSlug = mmSlug; // Use slug anyway — likely already exists
                        }
                    }

                    // Resolve multimedia for masthead expand widgets
                    let mastheadMmSlug = '';
                    if (isMasthead && (epw.background_media || epw.background_video)) {
                        mastheadMmSlug = `${epwSlug}_bg`;
                        this.log(`[ProductRail] EP ${k + 1}: Creating masthead multimedia: ${mastheadMmSlug}`);
                        try {
                            let bgFile = epw.background_media || null;
                            if (typeof bgFile === 'string' && bgFile.length > 0) {
                                bgFile = await this._resolveImage(bgFile, `ep_${k + 1}_masthead_bg`);
                            }
                            const mmPayload = {
                                name: mastheadMmSlug,
                                multimedia_type: epw.background_video ? '4' : '3',
                                aspect_ratio: '4',
                                transition_color: '#FFFFFF',
                                accent_color: '#0000FF',
                                text_color: '#FFFFFF',
                                icon_bg_color: '#F0F0F0',
                                is_multimedia_dark: 'False',
                            };
                            if (bgFile instanceof File || bgFile instanceof Blob) {
                                mmPayload.file_en = bgFile;
                            }
                            await callApi(ENDPOINTS.multimedia, mmPayload, { multipart: true });
                        } catch (mmErr) {
                            this.log(`[ProductRail] EP ${k + 1} masthead multimedia failed (may exist): ${mmErr.message}`);
                        }
                    }

                    // ── Widget Creation/Update ──
                    // SPR widgets get view_all (redirect-to-page), carousel/masthead don't
                    const epwPageSlugForVA = isSpr ? `${epwSlug}_page_p` : '';
                    const epwWidgetPayload = {
                        slug_name: epwSlug,
                        widget_type: isMasthead ? 'masthead_secondary_carousal_hp' : epw.type,
                        description: '',
                        heading: isSpr ? '' : (epw.title || ''),
                        master_key: '',
                        heading_en: (MULTIMEDIA_TYPES.has(epw.type)) ? '' : (epw.title || ''),
                        heading_hi: '',
                        heading_bg: '',
                        start_time: this.dates.start,
                        end_time: this.dates.end,
                        clear_bg_media: '',
                        media_aspect_ratio: isMasthead ? String(epw.media_number || '2.5') : isCarousel ? String(epw.media_number || '3.5') : '1',
                        view_all_action_name: isSpr ? 'redirect-to-page' : '',
                        view_all_action_params: isSpr ? JSON.stringify({ page_type: 'product_listing_page', page_layout_slug_name: epwPageSlugForVA }) : '',
                        background_multimedia: epwMmSlug || mastheadMmSlug || '',
                        filter_dict: '{}',
                        app_configurations: '{}',
                        configurations: '{}',
                        deactivated_flag: 'no',
                    };

                    if (existingEpwId) {
                        this.log(`[ProductRail] EP Widget ${k + 1} exists (${existingEpwId}), Updating: ${epwSlug}`);
                        await updateApi(`/api/app/widget/${existingEpwId}/`, epwWidgetPayload);
                    } else {
                        this.log(`[ProductRail] EP Widget ${k + 1} new, Creating: ${epwSlug} (${epw.type})`);
                        await callApi(ENDPOINTS.widget, epwWidgetPayload, { multipart: true });
                    }

                    // ══════════════════════════════════════════════════════
                    // GROUP: SPR/DPR — Full ecosystem:
                    //   1. sub_category items → PLP widget (for view_all page)
                    //   2. PLP widget + Page Layout + mappings
                    //   3. item_rows items → SPR expand widget
                    //   4. view_all_action_params on SPR widget → points to page
                    // ══════════════════════════════════════════════════════
                    if (isSpr) {
                        const epwStates = StateMapper.getActiveStates(epw.stateProducts || { global: '' });
                        const epwPlpSlug = `${epwSlug}_plp_w`;
                        const epwPageSlug = `${epwSlug}_page_p`;

                        // ── A. Sub-category items (for the PLP/view_all page) ──
                        const epwSubCatRows = [];
                        for (const state of epwStates) {
                            const epwScSlug = this.slugGen.get(`_ep_${k + 1}_sc_wi_${state.key}`);
                            try {
                                const existingScId = await getWidgetItemId(epwScSlug);
                                if (existingScId) {
                                    this.log(`[ProductRail] EP ${k + 1} SC [${state.key}] exists (${existingScId}), Updating...`);
                                    await updateApi(`/api/app/widget_item/${existingScId}/`, {
                                        slug_name: epwScSlug, item_type: 'sub_category',
                                        text_en: epw.title || '', text_hi: '',
                                        product_list: state.codes,
                                        filter_lst: StateMapper.buildInStockFilter(state.codes),
                                        start_time: this.dates.start, end_time: this.dates.end,
                                    });
                                } else {
                                    this.log(`[ProductRail] EP ${k + 1} SC [${state.key}] new, Creating: ${epwScSlug}`);
                                    await callApi(ENDPOINTS.widgetItem, {
                                        widget_item_id: 'undefined', deactivated_flag: 'no',
                                        item_click_action: 'deal-detail-redirect',
                                        slug_name: epwScSlug, slave_key: '', item_type: 'sub_category',
                                        media_en: blankBlob, text_en: epw.title || '', text_hi: '',
                                        media_hi: '', text_bg: '', media_bg: '',
                                        product_list: state.codes, filters: '[]',
                                        filter_lst: StateMapper.buildInStockFilter(state.codes),
                                        property_lst: '[]', pl_edit: 'PL', is_clickable: 'yes',
                                        update_product_list: 'no',
                                        start_time: this.dates.start, end_time: this.dates.end,
                                    }, { multipart: true });
                                }
                                epwSubCatRows.push(`${epwScSlug},${state.def?.levelTag || 'global'},${state.def?.levelProperty || 'global'},${epwSubCatRows.length + 1},`);
                                results.push({ step: `ep_${k + 1}_sc_${state.key}`, slug: epwScSlug, status: 'ok' });
                            } catch (e2) {
                                this.log(`[ProductRail] EP ${k + 1} sub-cat [${state.key}] failed: ${e2.message}`);
                            }
                        }

                        // ── B. PLP Widget (product_listing) for view_all ──
                        try {
                            const epwPlpId = await getWidgetId(epwPlpSlug);
                            if (epwPlpId) {
                                this.log(`[ProductRail] EP ${k + 1} PLP exists (${epwPlpId}), Updating...`);
                                await updateApi(`/api/app/widget/${epwPlpId}/`, {
                                    slug_name: epwPlpSlug, widget_type: 'product_listing',
                                    start_time: this.dates.start, end_time: this.dates.end,
                                    heading: epw.title || '', heading_en: epw.title || '',
                                });
                            } else {
                                this.log(`[ProductRail] EP ${k + 1} PLP new, Creating: ${epwPlpSlug}`);
                                await callApi(ENDPOINTS.widget, {
                                    slug_name: epwPlpSlug, widget_type: 'product_listing',
                                    description: '', heading: epw.title || '', master_key: '',
                                    heading_en: epw.title || '', heading_hi: '', heading_bg: '',
                                    start_time: this.dates.start, end_time: this.dates.end,
                                    clear_bg_media: '', media_aspect_ratio: '1',
                                    view_all_action_name: '', background_multimedia: '',
                                    filter_dict: '{}', app_configurations: '{}',
                                }, { multipart: true });
                            }
                            results.push({ step: `ep_${k + 1}_plp`, slug: epwPlpSlug, status: 'ok' });
                        } catch (e2) {
                            this.log(`[ProductRail] EP ${k + 1} PLP failed: ${e2.message}`);
                        }

                        // ── C. Page Layout for view_all ──
                        try {
                            const epwPageId = await getPageLayoutId(epwPageSlug);
                            if (epwPageId) {
                                this.log(`[ProductRail] EP ${k + 1} Page exists (${epwPageId}), Skipping...`);
                            } else {
                                this.log(`[ProductRail] EP ${k + 1} Page new, Creating: ${epwPageSlug}`);
                                await callApi(ENDPOINTS.pageLayout, {
                                    slug_name: epwPageSlug,
                                    page_heading: epw.title || '',
                                    page_layout_type: '2',
                                    page_type: 'product_listing_page',
                                });
                            }
                            results.push({ step: `ep_${k + 1}_page`, slug: epwPageSlug, status: 'ok' });
                        } catch (e2) {
                            this.log(`[ProductRail] EP ${k + 1} Page failed: ${e2.message}`);
                        }

                        // ── D. Map sub-cats → PLP widget ──
                        if (epwSubCatRows.length > 0) {
                            const csv = 'widget_item_slug_name,level_tag,level_property,priority,cohort\n' + epwSubCatRows.join('\n') + '\n';
                            await this._postMapping(ENDPOINTS.mapWidgetItems, { widget_slug: epwPlpSlug }, new Blob([csv], { type: 'text/csv' }));
                        }

                        // ── E. Map PLP → Page ──
                        try {
                            const plpPageCsv = `widget_slug_name,level_tag,level_property,priority,cohort\n${epwPlpSlug},global,global,1,\n`;
                            await this._postMapping(ENDPOINTS.mapLayoutWidget, { page_layout_slug: epwPageSlug }, new Blob([plpPageCsv], { type: 'text/csv' }));
                        } catch (e2) { this.log(`[ProductRail] EP ${k + 1} PLP→Page mapping failed: ${e2.message}`); }

                        // ── F. Map Page → Global ──
                        try {
                            const pgCsv = 'level_tag,level_property\nglobal,global\n';
                            await this._postMapping(ENDPOINTS.mapPageLayout, { page_layout_slug: epwPageSlug, page_type: 'product_listing_page' }, new Blob([pgCsv], { type: 'text/csv' }));
                        } catch (e2) { this.log(`[ProductRail] EP ${k + 1} Page→Global mapping failed: ${e2.message}`); }

                        // ── G. item_rows items (for the SPR expand widget itself) ──
                        const epwRowRows = [];
                        for (const state of epwStates) {
                            const epwRiSlug = this.slugGen.get(`_ep_${k + 1}_pr_wi_${state.key}`);
                            try {
                                const riId = await getWidgetItemId(epwRiSlug);
                                if (riId) {
                                    this.log(`[ProductRail] EP ${k + 1} Row [${state.key}] exists (${riId}), Updating...`);
                                    await updateApi(`/api/app/widget_item/${riId}/`, {
                                        slug_name: epwRiSlug, item_type: 'item_rows',
                                        product_list: state.codes,
                                        filter_lst: StateMapper.buildInStockFilter(state.codes),
                                        start_time: this.dates.start, end_time: this.dates.end,
                                    });
                                } else {
                                    this.log(`[ProductRail] EP ${k + 1} Row [${state.key}] new, Creating: ${epwRiSlug}`);
                                    await callApi(ENDPOINTS.widgetItem, {
                                        widget_item_id: 'undefined', deactivated_flag: 'no',
                                        item_click_action: '', slug_name: epwRiSlug, slave_key: '',
                                        item_type: 'item_rows', media: '', text_en: '', media_en: '',
                                        text_hi: '', media_hi: '', text_bg: '', media_bg: '',
                                        product_list: state.codes, filters: '[]',
                                        filter_lst: StateMapper.buildInStockFilter(state.codes),
                                        property_lst: '[]', pl_edit: 'PL', is_clickable: 'no',
                                        update_product_list: 'no',
                                        start_time: this.dates.start, end_time: this.dates.end,
                                        click_action_params: '{}',
                                    }, { multipart: true });
                                }
                                epwRowRows.push(`${epwRiSlug},${state.def?.levelTag || 'global'},${state.def?.levelProperty || 'global'},${epwRowRows.length + 1},`);
                                results.push({ step: `ep_${k + 1}_row_${state.key}`, slug: epwRiSlug, status: 'ok' });
                            } catch (e2) {
                                this.log(`[ProductRail] EP ${k + 1} Row [${state.key}] failed: ${e2.message}`);
                            }
                        }

                        // ── H. Map item_rows → SPR expand widget ──
                        if (epwRowRows.length > 0) {
                            const csv = 'widget_item_slug_name,level_tag,level_property,priority,cohort\n' + epwRowRows.join('\n') + '\n';
                            await this._postMapping(ENDPOINTS.mapWidgetItems, { widget_slug: epwSlug }, new Blob([csv], { type: 'text/csv' }));
                        }

                        // view_all_action_params already set during widget creation/update above
                    }

                    // ══════════════════════════════════════════════════════
                    // GROUP: Carousel — carousel items from scrollItems
                    // Each scroll item gets its own PLP ecosystem (sub-cat → PLP → page)
                    // then a carousel widget item pointing to that page
                    // ══════════════════════════════════════════════════════
                    if (isCarousel) {
                        const scrollItems = epw.scrollItems || [];
                        const carouselItemSlugs = [];

                        for (let ci = 0; ci < scrollItems.length; ci++) {
                            const scrollItem = scrollItems[ci];
                            const ciN = ci + 1;
                            const ciPlpSlug = `${epwSlug}_item_${ciN}_plp`;
                            const ciPageSlug = `${epwSlug}_item_${ciN}_plp_page`;
                            const ciItemSlug = `${epwSlug}_item_${ciN}_cl_wi`;

                            // Per-item sub-cat → PLP → page ecosystem
                            try {
                                // Sub-cat items
                                const ciStates = StateMapper.getActiveStates(scrollItem.stateProducts || { global: scrollItem.productIds || '' });
                                const ciScRows = [];
                                for (const state of ciStates) {
                                    const ciScSlug = `${epwSlug}_item_${ciN}_sc_wi_${state.key}`;
                                    try {
                                        const existingScId = await getWidgetItemId(ciScSlug);
                                        if (existingScId) {
                                            await updateApi(`/api/app/widget_item/${existingScId}/`, {
                                                slug_name: ciScSlug, item_type: 'sub_category',
                                                text_en: scrollItem.pageHeading || scrollItem.title || '',
                                                product_list: state.codes,
                                                filter_lst: StateMapper.buildInStockFilter(state.codes),
                                                start_time: this.dates.start, end_time: this.dates.end,
                                            });
                                        } else {
                                            const scPayload = {
                                                widget_item_id: 'undefined', deactivated_flag: 'no',
                                                item_click_action: 'deal-detail-redirect',
                                                slug_name: ciScSlug, slave_key: '', item_type: 'sub_category',
                                                text_en: scrollItem.pageHeading || scrollItem.title || '',
                                                text_hi: '', media_hi: '', text_bg: '', media_bg: '',
                                                product_list: state.codes, filters: '[]',
                                                filter_lst: StateMapper.buildInStockFilter(state.codes),
                                                property_lst: '[]', pl_edit: 'PL', is_clickable: 'yes',
                                                update_product_list: 'no',
                                                start_time: this.dates.start, end_time: this.dates.end,
                                            };
                                            scPayload.media_en = await this._resolveImage(scrollItem.image, `ep_${k}_ci_${ci}`);
                                            await callApi(ENDPOINTS.widgetItem, scPayload, { multipart: true });
                                        }
                                        ciScRows.push(`${ciScSlug},${state.def?.levelTag || 'global'},${state.def?.levelProperty || 'global'},${ciScRows.length + 1},`);
                                    } catch (e3) { this.log(`[ProductRail] EP ${k + 1} carousel item ${ciN} SC [${state.key}] failed: ${e3.message}`); }
                                }

                                // PLP widget for this carousel item
                                await callApi(ENDPOINTS.widget, {
                                    slug_name: ciPlpSlug, widget_type: 'product_listing',
                                    description: '', heading: '', master_key: '',
                                    heading_en: '', heading_hi: '', heading_bg: '',
                                    start_time: this.dates.start, end_time: this.dates.end,
                                    clear_bg_media: '', media_aspect_ratio: '1',
                                    view_all_action_name: '', background_multimedia: '',
                                    filter_dict: '{}', app_configurations: '{}',
                                    configurations: '{}', deactivated_flag: 'no',
                                }, { multipart: true });

                                // Page layout
                                await callApi(ENDPOINTS.pageLayout, {
                                    slug_name: ciPageSlug,
                                    page_type: 'product_listing_page',
                                    page_heading: scrollItem.pageHeading || scrollItem.title || '',
                                    page_layout_type: '2',
                                });

                                // Map sub-cats → PLP
                                if (ciScRows.length > 0) {
                                    const csv = 'widget_item_slug_name,level_tag,level_property,priority,cohort\n' + ciScRows.join('\n') + '\n';
                                    await this._postMapping(ENDPOINTS.mapWidgetItems, { widget_slug: ciPlpSlug }, new Blob([csv], { type: 'text/csv' }));
                                }

                                // Map PLP → Page
                                const plpCsv = `widget_slug_name,level_tag,level_property,priority,cohort\n${ciPlpSlug},global,global,1,\n`;
                                await this._postMapping(ENDPOINTS.mapLayoutWidget, { page_layout_slug: ciPageSlug }, new Blob([plpCsv], { type: 'text/csv' }));

                                // Map Page → Global
                                const pgCsv = 'level_tag,level_property\nglobal,global\n';
                                await this._postMapping(ENDPOINTS.mapPageLayout, { page_layout_slug: ciPageSlug, page_type: '' }, new Blob([pgCsv], { type: 'text/csv' }));

                                // Carousel widget item (redirect-to-page)
                                const clickParams = JSON.stringify({ page_type: 'product_listing_page', page_layout_slug_name: ciPageSlug });
                                const existingCiId = await getWidgetItemId(ciItemSlug);
                                if (existingCiId) {
                                    await updateApi(`/api/app/widget_item/${existingCiId}/`, {
                                        slug_name: ciItemSlug, item_type: 'carousel',
                                        click_action_params: clickParams,
                                        start_time: this.dates.start, end_time: this.dates.end,
                                    });
                                } else {
                                    const ciPayload = {
                                        widget_item_id: 'undefined', deactivated_flag: 'no',
                                        item_click_action: 'redirect-to-page',
                                        slug_name: ciItemSlug, slave_key: '', item_type: 'carousel',
                                        text_en: '', text_hi: '', media_hi: '', text_bg: '', media_bg: '',
                                        product_list: '', filters: '[]', filter_lst: '[]',
                                        property_lst: '[]', pl_edit: 'PL', is_clickable: 'yes',
                                        update_product_list: 'no',
                                        start_time: this.dates.start, end_time: this.dates.end,
                                        background_multimedia: '', image_multimedia: '',
                                        secondary_image_multimedia: '', progress_bar: '', offer_id: '',
                                        click_action_params: clickParams,
                                    };
                                    ciPayload.media_en = await this._resolveImage(scrollItem.image, `ep_${k}_cl_${ci}`);
                                    await callApi(ENDPOINTS.widgetItem, ciPayload, { multipart: true });
                                }
                                carouselItemSlugs.push(ciItemSlug);
                                results.push({ step: `ep_${k + 1}_carousel_item_${ciN}`, slug: ciItemSlug, status: 'ok' });
                            } catch (e2) {
                                this.log(`[ProductRail] EP ${k + 1} carousel item ${ciN} failed: ${e2.message}`);
                                results.push({ step: `ep_${k + 1}_carousel_item_${ciN}`, status: 'failed', error: e2.message });
                            }
                        }

                        // Map all carousel items → expand carousel widget
                        if (carouselItemSlugs.length > 0) {
                            const rows = carouselItemSlugs.map((slug, idx) => `${slug},global,global,${idx + 1},`);
                            const csv = 'widget_item_slug_name,level_tag,level_property,priority,cohort\n' + rows.join('\n') + '\n';
                            await this._postMapping(ENDPOINTS.mapWidgetItems, { widget_slug: epwSlug }, new Blob([csv], { type: 'text/csv' }));
                        }
                    }

                    // ══════════════════════════════════════════════════════
                    // GROUP: Masthead — carousel items from carouselItems
                    // Same as carousel group but uses carouselItems data
                    // ══════════════════════════════════════════════════════
                    if (isMasthead) {
                        const carouselItems = epw.carouselItems || [];
                        const mastheadItemSlugs = [];

                        for (let mi = 0; mi < carouselItems.length; mi++) {
                            const mItem = carouselItems[mi];
                            const miN = mi + 1;
                            const miPlpSlug = `${epwSlug}_item_${miN}_plp`;
                            const miPageSlug = mItem.pageType === 'category_page'
                                ? `${epwSlug}_item_${miN}_cat_page`
                                : `${epwSlug}_item_${miN}_plp_page`;
                            const miItemSlug = `${epwSlug}_item_${miN}_carousel`;
                            const miPageType = mItem.pageType || 'category_page';

                            try {
                                // Sub-categories (category_page → real subCategories, PLP → virtual single)
                                let subCategories = [];
                                if (miPageType === 'product_listing_page') {
                                    subCategories = [{ name: mItem.pageHeading || mItem.text || '', nameHi: '', products: mItem.stateProducts || { global: mItem.productIds || '' } }];
                                } else {
                                    subCategories = mItem.subCategories || [];
                                }

                                const miScRows = [];
                                for (let j = 0; j < subCategories.length; j++) {
                                    const sub = subCategories[j];
                                    const activeStates = StateMapper.getActiveStates(sub.products || { global: '' });
                                    for (const state of activeStates) {
                                        const miScSlug = miPageType === 'product_listing_page'
                                            ? `${epwSlug}_item_${miN}_sc_wi_${state.key}`
                                            : `${epwSlug}_item_${miN}_subcat_${j + 1}_${state.key}`;
                                        try {
                                            const existingScId = await getWidgetItemId(miScSlug);
                                            if (existingScId) {
                                                await updateApi(`/api/app/widget_item/${existingScId}/`, {
                                                    slug_name: miScSlug, item_type: 'sub_category',
                                                    text_en: sub.name || '', text_hi: sub.nameHi || '',
                                                    product_list: state.codes,
                                                    filter_lst: StateMapper.buildInStockFilter(state.codes),
                                                    start_time: this.dates.start, end_time: this.dates.end,
                                                });
                                            } else {
                                                const scPayload = {
                                                    widget_item_id: 'undefined', deactivated_flag: 'no',
                                                    item_click_action: miPageType === 'product_listing_page' ? 'deal-detail-redirect' : 'null',
                                                    slug_name: miScSlug, slave_key: '', item_type: 'sub_category',
                                                    text_en: sub.name || '', text_hi: sub.nameHi || '',
                                                    media_hi: '', text_bg: '', media_bg: '',
                                                    product_list: state.codes, filters: '[]',
                                                    filter_lst: StateMapper.buildInStockFilter(state.codes),
                                                    property_lst: '[]', pl_edit: 'PL', is_clickable: 'yes',
                                                    update_product_list: 'no',
                                                    start_time: this.dates.start, end_time: this.dates.end,
                                                };
                                                scPayload.media_en = await this._resolveImage(sub.image, `ep_${k}_mh_${mi}_${j}`);
                                                await callApi(ENDPOINTS.widgetItem, scPayload, { multipart: true });
                                            }
                                            miScRows.push(`${miScSlug},${state.def?.levelTag || 'global'},${state.def?.levelProperty || 'global'},${miScRows.length + 1},`);
                                        } catch (e3) { this.log(`[ProductRail] EP ${k + 1} masthead item ${miN} SC failed: ${e3.message}`); }
                                    }
                                }

                                // PLP widget
                                await callApi(ENDPOINTS.widget, {
                                    slug_name: miPlpSlug, widget_type: 'product_listing',
                                    description: '', heading: '', master_key: '',
                                    heading_en: '', heading_hi: '', heading_bg: '',
                                    start_time: this.dates.start, end_time: this.dates.end,
                                    clear_bg_media: '', media_aspect_ratio: '1',
                                    view_all_action_name: '', background_multimedia: '',
                                    filter_dict: '{}',
                                    app_configurations: JSON.stringify({ show_sub_cat: miPageType === 'category_page' }),
                                    configurations: '{}', deactivated_flag: 'no',
                                }, { multipart: true });

                                // Page layout
                                await callApi(ENDPOINTS.pageLayout, {
                                    slug_name: miPageSlug, page_type: miPageType,
                                    page_heading: mItem.pageHeading || mItem.text || '',
                                    page_layout_type: '2',
                                });

                                // Map sub-cats → PLP
                                if (miScRows.length > 0) {
                                    const csv = 'widget_item_slug_name,level_tag,level_property,priority,cohort\n' + miScRows.join('\n') + '\n';
                                    await this._postMapping(ENDPOINTS.mapWidgetItems, { widget_slug: miPlpSlug }, new Blob([csv], { type: 'text/csv' }));
                                }

                                // Map PLP → Page
                                const plpCsv = `widget_slug_name,level_tag,level_property,priority,cohort\n${miPlpSlug},global,global,1,\n`;
                                await this._postMapping(ENDPOINTS.mapLayoutWidget, { page_layout_slug: miPageSlug }, new Blob([plpCsv], { type: 'text/csv' }));

                                // Map Page → Global
                                const pgCsv = 'level_tag,level_property\nglobal,global\n';
                                await this._postMapping(ENDPOINTS.mapPageLayout, { page_layout_slug: miPageSlug, page_type: '' }, new Blob([pgCsv], { type: 'text/csv' }));

                                // Carousel widget item
                                const clickParams = JSON.stringify({ page_type: miPageType, page_layout_slug_name: miPageSlug });
                                const existingMiId = await getWidgetItemId(miItemSlug);
                                if (existingMiId) {
                                    await updateApi(`/api/app/widget_item/${existingMiId}/`, {
                                        slug_name: miItemSlug, item_type: 'carousel',
                                        click_action_params: clickParams,
                                        start_time: this.dates.start, end_time: this.dates.end,
                                    });
                                } else {
                                    const miPayload = {
                                        widget_item_id: 'undefined', deactivated_flag: 'no',
                                        item_click_action: 'redirect-to-page',
                                        slug_name: miItemSlug, slave_key: '', item_type: 'carousel',
                                        text_en: mItem.text || '', text_hi: mItem.textHi || '',
                                        media_hi: '', text_bg: '', media_bg: '',
                                        product_list: '', filters: '[]', filter_lst: '[]',
                                        property_lst: '[]', pl_edit: 'PL', is_clickable: 'yes',
                                        update_product_list: 'no',
                                        start_time: this.dates.start, end_time: this.dates.end,
                                        background_multimedia: '', image_multimedia: '',
                                        secondary_image_multimedia: '', progress_bar: '', offer_id: '',
                                        click_action_params: clickParams,
                                    };
                                    miPayload.media_en = await this._resolveImage(mItem.image, `ep_${k}_mh_item_${mi}`);
                                    await callApi(ENDPOINTS.widgetItem, miPayload, { multipart: true });
                                }
                                mastheadItemSlugs.push(miItemSlug);
                                results.push({ step: `ep_${k + 1}_masthead_item_${miN}`, slug: miItemSlug, status: 'ok' });
                            } catch (e2) {
                                this.log(`[ProductRail] EP ${k + 1} masthead item ${miN} failed: ${e2.message}`);
                                results.push({ step: `ep_${k + 1}_masthead_item_${miN}`, status: 'failed', error: e2.message });
                            }
                        }

                        // Map all masthead carousel items → expand masthead widget
                        if (mastheadItemSlugs.length > 0) {
                            const rows = mastheadItemSlugs.map((slug, idx) => `${slug},global,global,${idx + 1},`);
                            const csv = 'widget_item_slug_name,level_tag,level_property,priority,cohort\n' + rows.join('\n') + '\n';
                            await this._postMapping(ENDPOINTS.mapWidgetItems, { widget_slug: epwSlug }, new Blob([csv], { type: 'text/csv' }));
                        }
                    }

                    expandWidgetSlugs.push(epwSlug);
                    results.push({ step: `expand_widget_${k + 1}`, slug: epwSlug, status: 'ok' });
                } catch (e) {
                    this.log(`[ProductRail] EP Widget ${k + 1} failed: ${e.message}`);
                    results.push({ step: `expand_widget_${k + 1}`, slug: epwSlug, status: 'failed', error: e.message });
                }
            }
        }

        // Step 5: Map Widgets → Page Layout
        // When expandPage is ON: only expand widgets are mapped (no main PLP widget)
        // When expandPage is OFF: main PLP widget + any expand widgets are mapped
        try {
            this.log('[ProductRail] Step 5 — Map Widgets → Page');
            const allWidgetRows = [];
            if (!isExpandPage) {
                allWidgetRows.push(`${slugs.plpWidget},global,global,1,`);
            }
            expandWidgetSlugs.forEach((s, idx) => {
                allWidgetRows.push(`${s},global,global,${allWidgetRows.length + 1},`);
            });
            const plpCsv = new Blob([
                'widget_slug_name,level_tag,level_property,priority,cohort\n' + allWidgetRows.join('\n') + '\n',
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
            pgMap.append('page_type', pageType);
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
        // For category_page: use homeRowProducts field (separate from sub-cats)
        // For product_listing_page: use per-state codes merged from scItems

        let homeRowEntries; // [{ key, def, codes }]
        if (pageType === 'category_page') {
            homeRowEntries = StateMapper.getActiveStates(this.widget.homeRowProducts || { global: '' });
        } else if (isExpandPage) {
            // When expandPage is ON, scItems is empty (Steps 1-2 skipped).
            // Use stateProducts directly for home row items.
            homeRowEntries = StateMapper.getActiveStates(this.widget.stateProducts || { global: productCodes });
        } else {
            homeRowEntries = Object.entries(slugs.scItems).map(([key, subCats]) => {
                const codes = [...new Set(subCats.flatMap(sc => sc.codes ? sc.codes.split(',').map(c => c.trim()) : []))].filter(Boolean).join(',');
                return { key, codes };
            });
        }

        for (const { key: stateKey, codes: mergedCodes } of homeRowEntries) {

            const riSlug = this.slugGen.get(`_pr_wi_${stateKey}`);
            slugs.rowItems[stateKey] = riSlug;

            try {
                const riId = await getWidgetItemId(riSlug);

                if (riId) {
                    this.log(`[ProductRail] Step 7 — Row Item [${stateKey}] exists (${riId}), Updating...`);
                    await updateApi(`/api/app/widget_item/${riId}/`, {
                        slug_name: riSlug,
                        item_type: 'item_rows',
                        product_list: mergedCodes,
                        filter_lst: StateMapper.buildInStockFilter(mergedCodes),
                        start_time: this.dates.start,
                        end_time: this.dates.end,
                    });
                } else {
                    this.log(`[ProductRail] Step 7 — Row Item [${stateKey}] new, Creating: ${riSlug}`);
                    try {
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
                            product_list: mergedCodes,
                            filters: '[]',
                            filter_lst: StateMapper.buildInStockFilter(mergedCodes),
                            property_lst: '[]',
                            pl_edit: 'PL',
                            is_clickable: 'no',
                            update_product_list: 'no',
                            start_time: this.dates.start,
                            end_time: this.dates.end,
                            click_action_params: '{}',
                        }, { multipart: true });
                    } catch (createErr) {
                        if (createErr.message?.includes('already exists') || createErr.message?.includes('exists')) {
                            this.log(`[ProductRail] Step 7 — Already exists, retrying as UPDATE...`);
                            const retryId = await getWidgetItemId(riSlug);
                            if (retryId) {
                                await updateApi(`/api/app/widget_item/${retryId}/`, {
                                    slug_name: riSlug, item_type: 'item_rows',
                                    product_list: mergedCodes,
                                    filter_lst: StateMapper.buildInStockFilter(mergedCodes),
                                    start_time: this.dates.start, end_time: this.dates.end,
                                });
                            }
                        } else {
                            throw createErr;
                        }
                    }
                }

                results.push({ step: `row_item_${stateKey}`, slug: riSlug, status: 'ok' });
            } catch (e) {
                this.log(`[ProductRail] Step 7 — Row Item [${stateKey}] failed: ${e.message}`);
                results.push({ step: `row_item_${stateKey}`, slug: riSlug, status: 'failed', error: e.message });
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
                // Multimedia widgets: title only used in sub-cat item & PLP widget, not in the widget itself
                const isMultimedia = MULTIMEDIA_TYPES.has(widgetType);
                await updateApi(`/api/app/widget/${sprId}/`, {
                    slug_name: slugs.widget,
                    widget_type: widgetType,
                    heading: isMultimedia ? '' : this.widget.title,
                    heading_en: isMultimedia ? '' : this.widget.title,
                    heading_hi: isMultimedia ? '' : (this.widget.titleHi || ''),
                    start_time: this.dates.start,
                    end_time: this.dates.end,
                    view_all_action_params: viewAllParams,
                });
            } else {
                this.log(`[ProductRail] Step 8 — Widget new, Creating: ${slugs.widget} (${widgetType})`);
                // Multimedia widgets: title only used in sub-cat item & PLP widget, not in the widget itself
                const isMultimedia = MULTIMEDIA_TYPES.has(widgetType);
                const widgetPayload = {
                    slug_name: slugs.widget,
                    widget_type: widgetType,
                    description: '',
                    heading: '',
                    master_key: '',
                    heading_en: isMultimedia ? '' : this.widget.title,
                    heading_hi: isMultimedia ? '' : (this.widget.titleHi || ''),
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
                try {
                    await callApi(ENDPOINTS.widget, widgetPayload, { multipart: true });
                } catch (createErr) {
                    // If "already exists", retry as UPDATE
                    if (createErr.message?.includes('already exists') || createErr.message?.includes('exists')) {
                        this.log(`[ProductRail] Step 8 — Slug exists, retrying as UPDATE...`);
                        const retryId = await getWidgetId(slugs.widget);
                        if (retryId) {
                            await updateApi(`/api/app/widget/${retryId}/`, {
                                slug_name: slugs.widget,
                                widget_type: widgetType,
                                heading_en: isMultimedia ? '' : this.widget.title,
                                heading_hi: isMultimedia ? '' : (this.widget.titleHi || ''),
                                start_time: this.dates.start,
                                end_time: this.dates.end,
                                view_all_action_params: viewAllParams,
                            });
                        } else {
                            throw createErr;
                        }
                    } else {
                        throw createErr;
                    }
                }
            }

            results.push({ step: 'widget', slug: slugs.widget, status: 'ok' });
        } catch (e) {
            this.log(`[ProductRail] Step 8 — Widget failed: ${e.message}`);
            results.push({ step: 'widget', slug: slugs.widget, status: 'failed', error: e.message });
        }

        // Step 9: Map Row Items → Widget (state-wise)
        try {
            this.log('[ProductRail] Step 9 — Map Row → Widget (state-wise)');
            // Build mapping CSV from rowItems slugs directly (works for both page types)
            const riHeader = 'widget_item_slug_name,level_tag,level_property,priority,cohort';
            const stateDefs = StateMapper.getDefinitions();
            const riRows = Object.entries(slugs.rowItems).map(([stateKey, riSlug], idx) => {
                const stateDef = stateDefs[stateKey];
                const levelTag = stateDef?.levelTag || 'global';
                const levelProp = stateDef?.levelProperty || 'global';
                return `${riSlug},${levelTag},${levelProp},${idx + 1},`;
            });
            const riCsv = new Blob([riHeader + '\n' + riRows.join('\n')], { type: 'text/csv' });
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
