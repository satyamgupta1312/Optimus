/**
 * CategoryGridBuilder — Category Grid widget builder (Collection Banner Stick mode).
 *
 * References:
 *   scripts/Category_Grid_Backend.gs → createCategoryGridFromApproval()
 *   src/Backend/builders/SPRBuilder.js  → same Create/Update flow pattern
 *   wiki/WIDGET-Collection-Banner.md §1 (Stick Mode)
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  Per Category Item (Phases 1–4):                               │
 * │    Step 1: Sub-Category Widget Items  (sub_category)  CREATE/UPDATE│
 * │    Step 2: PLP Widget                 (product_listing) CREATE/UPDATE│
 * │    Step 3: Page Layout                               CREATE/SKIP │
 * │    Step 4: Map Sub-Cats → PLP                                   │
 * │    Step 5: Map PLP → Page                                       │
 * │    Step 6: Map Page → Global                                    │
 * │    Step 7: Category Widget Item       (category)      CREATE/UPDATE│
 * │                                                                 │
 * │  Phase 2 (once, after all items):                               │
 * │    Step 8: Category Widget            (category)      CREATE/UPDATE│
 * │    Step 9: Map all Category Items → Widget                      │
 * └─────────────────────────────────────────────────────────────────┘
 */

import {
    callApi, updateApi, createMappingCsv,
    getWidgetItemId,
    getNowStr, getFutureStr, getCsrfToken,
} from '../ApiClient';
import { SlugGenerator } from '../utils/SlugGenerator';
import { StateMapper } from '../utils/StateMapper';
import { API_BASE, ENDPOINTS } from '../../config/apiConfig';

export class CategoryGridBuilder {
    /**
     * @param {Object} widget - Canvas widget
     * @param {string} widget.slug            Base slug
     * @param {string} widget.title           English title (heading_en for category widget)
     * @param {string} widget.titleHi         Hindi title
     * @param {Array}  widget.categoryItems   Category items with sub-categories
     * @param {string} widget.startTime / widget.start_time
     * @param {string} widget.endTime   / widget.end_time
     * @param {Object} opts
     * @param {Function} opts.log
     */
    constructor(widget, { log = console.log } = {}) {
        this.widget = widget;
        this.log = log;
        this.slugGen = new SlugGenerator(widget.slug || widget.title);
        // Normalize dates: DateTimeInput stores ISO (with T), backend needs 'YYYY-MM-DD HH:MM:SS'
        const rawStart = widget.startTime || widget.start_time || getNowStr();
        const rawEnd = widget.endTime || widget.end_time || getFutureStr(365);
        this.dates = {
            start: String(rawStart).replace('T', ' ').slice(0, 19),
            end: String(rawEnd).replace('T', ' ').slice(0, 19),
        };
        this.log(`[CatGrid] Dates: ${this.dates.start} → ${this.dates.end}`);
    }

    /** 1×1 transparent PNG — same as SPRBuilder.getBlankImageBlob() */
    static getBlankImageBlob() {
        const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new Blob([bytes], { type: 'image/png' });
    }

    /**
     * Resolve image for multipart upload:
     *   File/Blob → use directly
     *   URL string (/api/local/media/..., https://...) → fetch → File
     *   falsy / empty object → blank 1×1 PNG
     */
    async _resolveImage(src, fallbackName = 'image.png') {
        const blank = CategoryGridBuilder.getBlankImageBlob();
        if (!src) return blank;
        if (src instanceof File || src instanceof Blob) return src;
        if (typeof src === 'object') return blank; // serialized {} from File
        if (typeof src !== 'string' || src.length === 0) return blank;
        try {
            this.log(`[CatGrid]   Fetching image: ${src.substring(0, 60)}...`);
            const res = await fetch(src);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            const ext = blob.type.split('/')[1] || 'png';
            return new File([blob], `${fallbackName}.${ext}`, { type: blob.type });
        } catch (e) {
            this.log(`[CatGrid]   Image fetch failed (${e.message}), using blank`);
            return blank;
        }
    }

    /** Helper: POST mapping CSV to an endpoint */
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
        this.log(`[CatGrid]   Mapping POST ${endpoint} → ${res.status} ${body.substring(0, 200)}`);
        if (!res.ok) throw new Error(`Mapping failed: ${res.status} ${body.substring(0, 100)}`);
    }

    /**
     * Execute the full deploy.
     * @returns {Promise<{ slugs: Object, results: Object[] }>}
     */
    async deploy() {
        const results = [];
        const categoryItems = this.widget.categoryItems || [];
        const blankBlob = CategoryGridBuilder.getBlankImageBlob();

        const slugs = {
            widget: this.slugGen.get('_cm_hp'),
            items: [],
        };

        // ════════════════════════════════════════════════════
        // Phase 1 — Per Category Item Ecosystem
        // ════════════════════════════════════════════════════

        const catItemSlugs = []; // collect for Phase 2 mapping

        for (let i = 0; i < categoryItems.length; i++) {
            const item = categoryItems[i];
            const n = i + 1;
            const pageType = item.pageType || 'category_page';

            this.log(`[CatGrid] Phase 1 — Item ${n}: "${item.text}" (${pageType})`);

            const itemSlugs = {
                plp: this.slugGen.getIndexed(i, '_plp'),
                page: pageType === 'category_page'
                    ? this.slugGen.getIndexed(i, '_cat_page')
                    : this.slugGen.getIndexed(i, '_plp_page'),
                catItem: this.slugGen.getIndexed(i, '_cat_wi'),
            };
            slugs.items.push(itemSlugs);

            // ── Determine sub-categories list ──
            // PLP page → virtual single sub-cat from stateProducts
            // Category page → real subCategories[]
            let subCategories = [];
            if (pageType === 'product_listing_page') {
                subCategories = [{
                    name: item.text || '',
                    nameHi: item.textHi || '',
                    products: item.stateProducts || { global: '' },
                    image: item.image || null,
                }];
            } else {
                subCategories = item.subCategories || [];
            }

            // ── Step 1: Sub-Category Widget Items ──
            const allSubCatMappingRows = [];

            for (let j = 0; j < subCategories.length; j++) {
                const sub = subCategories[j];
                const activeStates = StateMapper.getActiveStates(sub.products || { global: '' });

                for (const state of activeStates) {
                    const scSlug = this.slugGen.getNestedStateful(i, j, state.key);
                    try {
                        const existingId = await getWidgetItemId(scSlug);

                        if (existingId) {
                            this.log(`[CatGrid]   SC [${state.key}] exists (${existingId}), Updating: ${scSlug}`);
                            await updateApi(`/api/app/widget_item/${existingId}/`, {
                                slug_name: scSlug,
                                item_type: 'sub_category',
                                text_en: sub.name || '',
                                text_hi: sub.nameHi || '',
                                product_list: state.codes,
                                filter_lst: StateMapper.buildInStockFilter(state.codes),
                                start_time: this.dates.start,
                                end_time: this.dates.end,
                            });
                        } else {
                            this.log(`[CatGrid]   SC [${state.key}] new, Creating: ${scSlug}`);
                            const scPayload = {
                                widget_item_id: 'undefined',
                                deactivated_flag: 'no',
                                item_click_action: 'null',  // GAS sends string 'null'
                                slug_name: scSlug,
                                slave_key: '',
                                item_type: 'sub_category',
                                media: '',
                                text_en: sub.name || '',
                                text_hi: sub.nameHi || '',
                                media_hi: '',
                                text_bg: '',
                                media_bg: '',
                                product_list: state.codes,
                                filters: '[]',
                                filter_lst: StateMapper.buildInStockFilter(state.codes),
                                property_lst: '[]',
                                pl_edit: 'PL',
                                is_clickable: 'yes',
                                update_product_list: 'no',
                                start_time: this.dates.start,
                                end_time: this.dates.end,
                                background_multimedia: '',
                                image_multimedia: '',
                                secondary_image_multimedia: '',
                                progress_bar: '',
                                offer_id: '',
                                click_action_params: '{}',
                            };
                            // Image: use uploaded file, fetch from URL, or blank placeholder
                            scPayload.media_en = await this._resolveImage(sub.image, `sc_${i}_${j}`);
                            await callApi(ENDPOINTS.widgetItem, scPayload, { multipart: true });
                        }

                        // Accumulate for Step 4 mapping
                        allSubCatMappingRows.push(
                            `${scSlug},${state.def.levelTag},${state.def.levelProperty},${allSubCatMappingRows.length + 1},`
                        );
                        results.push({ step: `item_${n}_sc_${j}_${state.key}`, slug: scSlug, status: 'ok' });
                    } catch (e) {
                        this.log(`[CatGrid]   SC [${state.key}] FAILED: ${e.message}`);
                        results.push({ step: `item_${n}_sc_${j}_${state.key}`, slug: scSlug, status: 'failed', error: e.message });
                    }
                }
            }

            // ── Step 2: PLP Widget (product_listing) — always CREATE ──
            // Note: GET /api/app/widget/ returns 405, so no update check
            try {
                this.log(`[CatGrid]   PLP Widget, Creating: ${itemSlugs.plp}`);
                await callApi(ENDPOINTS.widget, {
                    slug_name: itemSlugs.plp,
                    widget_type: 'product_listing',
                    description: '',
                    heading: '',
                    master_key: '',
                    heading_en: '',
                    heading_hi: '',
                    heading_bg: '',
                    start_time: this.dates.start,
                    end_time: this.dates.end,
                    clear_bg_media: '',
                    media_aspect_ratio: '1',
                    view_all_action_name: '',
                    background_multimedia: '',
                    filter_dict: '{}',
                    app_configurations: JSON.stringify({ show_sub_cat: true }),
                    configurations: '{}',
                    deactivated_flag: 'no',
                }, { multipart: true });
                results.push({ step: `item_${n}_plp`, slug: itemSlugs.plp, status: 'ok' });
            } catch (e) {
                this.log(`[CatGrid]   PLP Widget failed: ${e.message}`);
                results.push({ step: `item_${n}_plp`, slug: itemSlugs.plp, status: 'failed', error: e.message });
            }

            // ── Step 3: Page Layout — always CREATE ──
            // Note: GET /api/app/post_page_layout/ returns 405, so no update check
            try {
                this.log(`[CatGrid]   Page Layout, Creating: ${itemSlugs.page}`);
                await callApi(ENDPOINTS.pageLayout, {
                    slug_name: itemSlugs.page,
                    page_type: pageType,
                    page_heading: item.text || '',
                    page_layout_type: '2',
                });
                results.push({ step: `item_${n}_page`, slug: itemSlugs.page, status: 'ok' });
            } catch (e) {
                this.log(`[CatGrid]   Page Layout failed: ${e.message}`);
                results.push({ step: `item_${n}_page`, slug: itemSlugs.page, status: 'failed', error: e.message });
            }

            // ── Step 4: Map Sub-Cats → PLP Widget ──
            // Rebuild from subCategories directly so mapping always runs even if sub-cat creation failed
            try {
                const scMappingRows = [];
                for (let j = 0; j < subCategories.length; j++) {
                    const sub = subCategories[j];
                    const activeStates = StateMapper.getActiveStates(sub.products || { global: '' });
                    for (const state of activeStates) {
                        const scSlug = this.slugGen.getNestedStateful(i, j, state.key);
                        scMappingRows.push(`${scSlug},${state.def.levelTag},${state.def.levelProperty},${scMappingRows.length + 1},`);
                    }
                }
                this.log(`[CatGrid]   Step 4 — Sub-cat mapping rows: ${scMappingRows.length} for PLP ${itemSlugs.plp}`);
                if (scMappingRows.length > 0) {
                    const scContent = 'widget_item_slug_name,level_tag,level_property,priority,cohort\n' + scMappingRows.join('\n') + '\n';
                    this.log(`[CatGrid]   CSV:\n${scContent}`);
                    const scCsv = new Blob([scContent], { type: 'text/csv' });
                    await this._postMapping(ENDPOINTS.mapWidgetItems, { widget_slug: itemSlugs.plp }, scCsv);
                    results.push({ step: `item_${n}_map_sc_plp`, status: 'ok' });
                } else {
                    this.log(`[CatGrid]   Step 4 SKIPPED — no sub-cats to map (empty subCategories or products)`);
                }
            } catch (e) {
                this.log(`[CatGrid]   Step 4 Mapping FAILED: ${e.message}`);
            }

            // ── Step 5: Map PLP Widget → Page Layout ──
            try {
                this.log(`[CatGrid]   Step 5 — Map PLP → Page`);
                const plpContent = `widget_slug_name,level_tag,level_property,priority,cohort\n${itemSlugs.plp},global,global,1,\n`;
                this.log(`[CatGrid]   CSV:\n${plpContent}`);
                const plpCsv = new Blob([plpContent], { type: 'text/csv' });
                await this._postMapping(ENDPOINTS.mapLayoutWidget, { page_layout_slug: itemSlugs.page }, plpCsv);
                results.push({ step: `item_${n}_map_plp_page`, status: 'ok' });
            } catch (e) {
                this.log(`[CatGrid]   Step 5 Mapping failed: ${e.message}`);
            }

            // ── Step 6: Map Page → Global ──
            try {
                this.log(`[CatGrid]   Step 6 — Map Page → Global`);
                const pgCsv = new Blob(['level_tag,level_property\nglobal,global'], { type: 'text/csv' });
                await this._postMapping(ENDPOINTS.mapPageLayout, {
                    page_layout_slug: itemSlugs.page,
                    page_type: '',  // GAS script sends empty string, not the actual pageType
                }, pgCsv);
                results.push({ step: `item_${n}_map_page_global`, status: 'ok' });
            } catch (e) {
                this.log(`[CatGrid]   Step 6 Mapping failed: ${e.message}`);
            }

            // ── Step 7: Category Widget Item ──
            try {
                const clickParams = JSON.stringify({
                    page_type: pageType,
                    page_layout_slug_name: itemSlugs.page,
                });

                const existingCiId = await getWidgetItemId(itemSlugs.catItem);

                if (existingCiId) {
                    this.log(`[CatGrid]   Cat Item exists (${existingCiId}), Updating: ${itemSlugs.catItem}`);
                    await updateApi(`/api/app/widget_item/${existingCiId}/`, {
                        slug_name: itemSlugs.catItem,
                        item_type: 'category',
                        text_en: item.text || '',
                        text_hi: item.textHi || '',
                        click_action_params: clickParams,
                        start_time: this.dates.start,
                        end_time: this.dates.end,
                    });
                } else {
                    this.log(`[CatGrid]   Cat Item new, Creating: ${itemSlugs.catItem}`);
                    const ciPayload = {
                        widget_item_id: 'undefined',
                        deactivated_flag: 'no',
                        item_click_action: 'redirect-to-page',
                        slug_name: itemSlugs.catItem,
                        slave_key: '',
                        item_type: 'category',
                        media: '',
                        text_en: item.text || '',
                        text_hi: item.textHi || '',
                        media_hi: '',
                        text_bg: '',
                        media_bg: '',
                        product_list: '',
                        filters: '[]',
                        filter_lst: '[]',
                        property_lst: '[]',
                        pl_edit: 'PL',
                        is_clickable: 'yes',
                        update_product_list: 'no',
                        start_time: this.dates.start,
                        end_time: this.dates.end,
                        background_multimedia: '',
                        image_multimedia: '',
                        secondary_image_multimedia: '',
                        progress_bar: '',
                        offer_id: '',
                        click_action_params: clickParams,
                    };
                    // Image: use uploaded file, fetch from URL, or blank placeholder
                    ciPayload.media_en = await this._resolveImage(item.image, `cat_${i}`);
                    await callApi(ENDPOINTS.widgetItem, ciPayload, { multipart: true });
                }

                catItemSlugs.push({ slug: itemSlugs.catItem, levelTag: 'global', levelProperty: 'global' });
                results.push({ step: `item_${n}_cat_wi`, slug: itemSlugs.catItem, status: 'ok' });
            } catch (e) {
                this.log(`[CatGrid]   Cat Item failed: ${e.message}`);
                results.push({ step: `item_${n}_cat_wi`, slug: itemSlugs.catItem, status: 'failed', error: e.message });
            }
        }

        // ════════════════════════════════════════════════════
        // Phase 2 — Category Grid Widget + Final Mapping
        // ════════════════════════════════════════════════════

        // ── Step 8: Category Widget — always CREATE ──
        // Note: GET /api/app/widget/ returns 405, so no update check
        try {
            this.log(`[CatGrid] Phase 2 — Widget, Creating: ${slugs.widget}`);
            await callApi(ENDPOINTS.widget, {
                slug_name: slugs.widget,
                widget_type: 'category',
                description: '',
                heading: '',
                master_key: '',
                heading_en: this.widget.title || '',
                heading_hi: this.widget.titleHi || '',
                heading_bg: '',
                start_time: this.dates.start,
                end_time: this.dates.end,
                clear_bg_media: '',
                media_aspect_ratio: '1',
                view_all_action_name: '',
                background_multimedia: '',
                filter_dict: '{}',
                app_configurations: '{}',
            }, { multipart: true });
            results.push({ step: 'category_widget', slug: slugs.widget, status: 'ok' });
        } catch (e) {
            this.log(`[CatGrid] Phase 2 — Widget failed: ${e.message}`);
            results.push({ step: 'category_widget', slug: slugs.widget, status: 'failed', error: e.message });
        }

        // ── Step 9: Map Category Items → Widget ──
        if (catItemSlugs.length > 0) {
            try {
                this.log(`[CatGrid] Phase 2 — Step 9: Map ${catItemSlugs.length} items → Widget`);
                const ciHeader = 'widget_item_slug_name,level_tag,level_property,priority,cohort';
                const ciRows = catItemSlugs.map((ci, idx) =>
                    `${ci.slug},${ci.levelTag},${ci.levelProperty},${idx + 1},`
                );
                const ciContent = ciHeader + '\n' + ciRows.join('\n') + '\n';
                this.log(`[CatGrid]   CSV:\n${ciContent}`);
                const ciCsv = new Blob([ciContent], { type: 'text/csv' });
                await this._postMapping(ENDPOINTS.mapWidgetItems, { widget_slug: slugs.widget }, ciCsv);
                results.push({ step: 'map_items_to_widget', status: 'ok' });
            } catch (e) {
                this.log(`[CatGrid] Phase 2 — Step 9 Mapping failed: ${e.message}`);
            }
        }

        this.log('[CatGrid] Deploy complete');
        return { slugs, results };
    }
}
