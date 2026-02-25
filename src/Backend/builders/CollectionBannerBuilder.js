/**
 * CollectionBannerBuilder — Carousel / Collection Banner widget builder (scroll mode).
 *
 * Curl references (exact field match):
 *   Carousel Widget Item: POST /api/app/post_widget_item/  item_type=carousel
 *   Carousel Widget:      POST /api/app/widget/            widget_type=carousel
 *
 * Deploy flow (bottom-up, same pattern as CategoryGridBuilder):
 * ┌─ Per scroll item ──────────────────────────────────────────┐
 * │  Step 1: Sub-Cat Widget Items (per state)                  │
 * │  Step 2: PLP Widget  (product_listing)  CREATE             │
 * │  Step 3: Page Layout                    CREATE             │
 * │  Step 4: Map Sub-Cats → PLP Widget                         │
 * │  Step 5: Map PLP Widget → Page Layout                      │
 * │  Step 6: Map Page Layout → Global  (page_type: '')         │
 * │  Step 7: Carousel Widget Item  (carousel, redirect-to-page)│
 * └────────────────────────────────────────────────────────────┘
 * Phase 2:
 *   Step 8: Carousel Widget  (widget_type=carousel)
 *   Step 9: Map all Carousel Items → Carousel Widget
 */

import {
    callApi, updateApi, getWidgetItemId,
    getNowStr, getFutureStr, getCsrfToken,
} from '../ApiClient';
import { SlugGenerator } from '../utils/SlugGenerator';
import { StateMapper } from '../utils/StateMapper';
import { API_BASE, ENDPOINTS } from '../../config/apiConfig';

export class CollectionBannerBuilder {
    /**
     * @param {Object} widget
     * @param {string} widget.slug            Base slug
     * @param {string} widget.title           English heading
     * @param {string} widget.titleHi         Hindi heading
     * @param {string} widget.media_number    Aspect ratio (e.g. '2.2')
     * @param {Array}  widget.scrollItems     Carousel banner items
     * @param {string} widget.startTime / widget.start_time
     * @param {string} widget.endTime   / widget.end_time
     * @param {Object} opts
     * @param {Function} opts.log
     */
    constructor(widget, { log = console.log } = {}) {
        this.widget = widget;
        this.log = log;
        this.slugGen = new SlugGenerator(widget.slug || widget.title);
        const rawStart = widget.startTime || widget.start_time || getNowStr();
        const rawEnd = widget.endTime || widget.end_time || getFutureStr(365);
        this.dates = {
            start: String(rawStart).replace('T', ' ').slice(0, 19),
            end: String(rawEnd).replace('T', ' ').slice(0, 19),
        };
        this.log(`[CBScroll] Dates: ${this.dates.start} → ${this.dates.end}`);
    }

    /**
     * Sub-category slug resolver — matches SPR pattern:
     *   PLP page  → {base}_item_{i+1}_sc_wi_{stateKey}
     *   Cat page  → {base}_item_{i+1}_subcat_{j+1}_{stateKey}
     */
    _scSlug(itemIndex, subIndex, stateKey, pageType) {
        if (pageType === 'product_listing_page') {
            return this.slugGen.getIndexed(itemIndex, `_sc_wi_${stateKey}`);
        }
        return this.slugGen.getNestedStateful(itemIndex, subIndex, stateKey);
    }

    /** 1×1 transparent PNG fallback */
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
        const blank = CollectionBannerBuilder.getBlankImageBlob();
        if (!src) return blank;
        if (src instanceof File || src instanceof Blob) return src;
        if (typeof src === 'object') return blank;
        if (typeof src !== 'string' || src.length === 0) return blank;
        try {
            this.log(`[CBScroll]   Fetching image: ${src.substring(0, 60)}...`);
            const res = await fetch(src);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            const ext = blob.type.split('/')[1] || 'png';
            return new File([blob], `${fallbackName}.${ext}`, { type: blob.type });
        } catch (e) {
            this.log(`[CBScroll]   Image fetch failed (${e.message}), using blank`);
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
        this.log(`[CBScroll]   Mapping POST ${endpoint} → ${res.status} ${body.substring(0, 200)}`);
        if (!res.ok) throw new Error(`Mapping failed: ${res.status} ${body.substring(0, 100)}`);
    }

    /**
     * Execute the full deploy.
     * @returns {Promise<{ slugs: Object, results: Object[] }>}
     */
    async deploy() {
        const results = [];
        const scrollItems = this.widget.scrollItems || this.widget.items || [];

        const slugs = {
            widget: this.slugGen.get('_cl_w_hp'),
            items: [],
        };

        const carouselItemSlugs = []; // collect for Phase 2 mapping

        // ════════════════════════════════════════════════════
        // Phase 1 — Per Carousel Item Ecosystem
        // ════════════════════════════════════════════════════

        for (let i = 0; i < scrollItems.length; i++) {
            const item = scrollItems[i];
            const n = i + 1;
            const pageType = item.pageType || 'product_listing_page';

            this.log(`[CBScroll] Phase 1 — Item ${n}: "${item.pageHeading || item.title}" (${pageType})`);

            const itemSlugs = {
                plp: this.slugGen.getIndexed(i, '_plp'),
                page: pageType === 'category_page'
                    ? this.slugGen.getIndexed(i, '_cat_page')
                    : this.slugGen.getIndexed(i, '_plp_page'),
                clItem: this.slugGen.getIndexed(i, '_cl_wi'),
            };
            slugs.items.push(itemSlugs);

            // Determine sub-categories
            // PLP page → virtual single sub-cat from stateProducts
            // Category page → real subCategories[]
            let subCategories = [];
            if (pageType === 'product_listing_page') {
                const stateProducts = item.stateProducts || { global: item.productIds || '' };
                subCategories = [{
                    name: item.pageHeading || item.title || '',
                    nameHi: '',
                    products: stateProducts,
                    image: item.image || null,
                }];
            } else {
                subCategories = item.subCategories || [];
            }

            // ── Step 1: Sub-Category Widget Items ──
            for (let j = 0; j < subCategories.length; j++) {
                const sub = subCategories[j];
                const activeStates = StateMapper.getActiveStates(sub.products || { global: '' });

                for (const state of activeStates) {
                    // SPR slug pattern: PLP → _sc_wi_{key}, Cat → _subcat_{j+1}_{key}
                    const scSlug = this._scSlug(i, j, state.key, pageType);
                    try {
                        const existingId = await getWidgetItemId(scSlug);
                        if (existingId) {
                            this.log(`[CBScroll]   SC [${state.key}] exists (${existingId}), Updating: ${scSlug}`);
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
                            this.log(`[CBScroll]   SC [${state.key}] new, Creating: ${scSlug}`);
                            const scPayload = {
                                widget_item_id: 'undefined',
                                deactivated_flag: 'no',
                                item_click_action: pageType === 'product_listing_page' ? 'deal-detail-redirect' : 'null',
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
                            scPayload.media_en = await this._resolveImage(sub.image, `sc_${i}_${j}`);
                            await callApi(ENDPOINTS.widgetItem, scPayload, { multipart: true });
                        }
                        results.push({ step: `item_${n}_sc_${j}_${state.key}`, slug: scSlug, status: 'ok' });
                    } catch (e) {
                        this.log(`[CBScroll]   SC [${state.key}] FAILED: ${e.message}`);
                        results.push({ step: `item_${n}_sc_${j}_${state.key}`, slug: scSlug, status: 'failed', error: e.message });
                    }
                }
            }

            // ── Step 2: PLP Widget ──
            try {
                this.log(`[CBScroll]   PLP Widget, Creating: ${itemSlugs.plp}`);
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
                this.log(`[CBScroll]   PLP Widget FAILED: ${e.message}`);
                results.push({ step: `item_${n}_plp`, slug: itemSlugs.plp, status: 'failed', error: e.message });
            }

            // ── Step 3: Page Layout ──
            try {
                this.log(`[CBScroll]   Page Layout, Creating: ${itemSlugs.page}`);
                await callApi(ENDPOINTS.pageLayout, {
                    slug_name: itemSlugs.page,
                    page_type: pageType,
                    page_heading: item.pageHeading || item.title || '',
                    page_layout_type: '2',
                });
                results.push({ step: `item_${n}_page`, slug: itemSlugs.page, status: 'ok' });
            } catch (e) {
                this.log(`[CBScroll]   Page Layout FAILED: ${e.message}`);
                results.push({ step: `item_${n}_page`, slug: itemSlugs.page, status: 'failed', error: e.message });
            }

            // ── Step 4: Map Sub-Cats → PLP Widget ──
            // Rebuild rows from subCategories directly (resilient to Step 1 failures)
            try {
                const scMappingRows = [];
                for (let j = 0; j < subCategories.length; j++) {
                    const sub = subCategories[j];
                    const activeStates = StateMapper.getActiveStates(sub.products || { global: '' });
                    for (const state of activeStates) {
                        // MUST match Step 1 slug logic exactly
                        const scSlug = this._scSlug(i, j, state.key, pageType);
                        scMappingRows.push(`${scSlug},${state.def.levelTag},${state.def.levelProperty},${scMappingRows.length + 1},`);
                    }
                }
                this.log(`[CBScroll]   Step 4 — Sub-cat mapping rows: ${scMappingRows.length} for PLP ${itemSlugs.plp}`);
                if (scMappingRows.length > 0) {
                    const csv = 'widget_item_slug_name,level_tag,level_property,priority,cohort\n' + scMappingRows.join('\n') + '\n';
                    await this._postMapping(ENDPOINTS.mapWidgetItems, { widget_slug: itemSlugs.plp }, new Blob([csv], { type: 'text/csv' }));
                    results.push({ step: `item_${n}_map_sc_plp`, status: 'ok' });
                }
            } catch (e) {
                this.log(`[CBScroll]   Step 4 Mapping FAILED: ${e.message}`);
            }

            // ── Step 4.5: Expand Page Widgets (if item has expandPage ON) ──
            const expandWidgetSlugs = [];
            if (item.expandPage && Array.isArray(item.plpWidgets) && item.plpWidgets.length > 0) {
                this.log(`[CBScroll]   Step 4.5 — Creating ${item.plpWidgets.length} expand page widgets`);

                for (let k = 0; k < item.plpWidgets.length; k++) {
                    const epw = item.plpWidgets[k];
                    const epwSlug = `${this.widget.slug}_item_${n}_ep_${k + 1}`;

                    try {
                        await callApi(ENDPOINTS.widget, {
                            slug_name: epwSlug,
                            widget_type: epw.type,
                            description: '',
                            heading: epw.title || '',
                            master_key: '',
                            heading_en: epw.title || '',
                            heading_hi: '',
                            heading_bg: '',
                            start_time: this.dates.start,
                            end_time: this.dates.end,
                            clear_bg_media: '',
                            media_aspect_ratio: '1',
                            view_all_action_name: '',
                            background_multimedia: '',
                            filter_dict: '{}',
                            app_configurations: '{}',
                            configurations: '{}',
                            deactivated_flag: 'no',
                        }, { multipart: true });

                        // Sub-cat items for expand widget
                        const epwStates = StateMapper.getActiveStates(epw.stateProducts || { global: '' });
                        const epwScRows = [];
                        for (const state of epwStates) {
                            const epwScSlug = `${this.widget.slug}_item_${n}_ep_${k + 1}_sc_wi_${state.key}`;
                            try {
                                await callApi(ENDPOINTS.widgetItem, {
                                    widget_item_id: 'undefined',
                                    deactivated_flag: 'no',
                                    item_click_action: 'deal-detail-redirect',
                                    slug_name: epwScSlug,
                                    slave_key: '',
                                    item_type: 'sub_category',
                                    media: '',
                                    text_en: epw.title || '',
                                    text_hi: '',
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
                                }, { multipart: true });
                                epwScRows.push(`${epwScSlug},${state.def?.levelTag || 'global'},${state.def?.levelProperty || 'global'},${epwScRows.length + 1},`);
                            } catch (e2) { this.log(`[CBScroll] EP ${k + 1} sub-cat [${state.key}] failed: ${e2.message}`); }
                        }

                        // Map sub-cats → expand widget
                        if (epwScRows.length > 0) {
                            const epwCsv = 'widget_item_slug_name,level_tag,level_property,priority,cohort\n' + epwScRows.join('\n') + '\n';
                            await this._postMapping(ENDPOINTS.mapWidgetItems, { widget_slug: epwSlug }, new Blob([epwCsv], { type: 'text/csv' }));
                        }

                        expandWidgetSlugs.push(epwSlug);
                        results.push({ step: `item_${n}_ep_${k + 1}`, slug: epwSlug, status: 'ok' });
                    } catch (e) {
                        this.log(`[CBScroll] EP Widget ${k + 1} failed: ${e.message}`);
                    }
                }
            }

            // ── Step 5: Map PLP Widget + Expand Widgets → Page Layout ──
            try {
                this.log(`[CBScroll]   Step 5 — Map PLP (+ ${expandWidgetSlugs.length} expand) → Page`);
                const allWidgetRows = [
                    `${itemSlugs.plp},global,global,1,`,
                    ...expandWidgetSlugs.map((s, idx) => `${s},global,global,${idx + 2},`),
                ];
                const csv = 'widget_slug_name,level_tag,level_property,priority,cohort\n' + allWidgetRows.join('\n') + '\n';
                await this._postMapping(ENDPOINTS.mapLayoutWidget, { page_layout_slug: itemSlugs.page }, new Blob([csv], { type: 'text/csv' }));
                results.push({ step: `item_${n}_map_plp_page`, status: 'ok' });
            } catch (e) {
                this.log(`[CBScroll]   Step 5 Mapping FAILED: ${e.message}`);
            }

            // ── Step 6: Map Page Layout → Global ──
            try {
                this.log(`[CBScroll]   Step 6 — Map Page → Global`);
                const csv = 'level_tag,level_property\nglobal,global\n';
                await this._postMapping(ENDPOINTS.mapPageLayout, {
                    page_layout_slug: itemSlugs.page,
                    page_type: '',   // GAS: always empty string
                }, new Blob([csv], { type: 'text/csv' }));
                results.push({ step: `item_${n}_map_page_global`, status: 'ok' });
            } catch (e) {
                this.log(`[CBScroll]   Step 6 Mapping FAILED: ${e.message}`);
            }

            // ── Step 7: Carousel Widget Item ──
            try {
                const clickParams = JSON.stringify({
                    page_type: pageType,
                    page_layout_slug_name: itemSlugs.page,
                });

                const existingId = await getWidgetItemId(itemSlugs.clItem);
                if (existingId) {
                    this.log(`[CBScroll]   CL Item exists (${existingId}), Updating: ${itemSlugs.clItem}`);
                    await updateApi(`/api/app/widget_item/${existingId}/`, {
                        slug_name: itemSlugs.clItem,
                        item_type: 'carousel',
                        click_action_params: clickParams,
                        start_time: this.dates.start,
                        end_time: this.dates.end,
                    });
                } else {
                    this.log(`[CBScroll]   CL Item new, Creating: ${itemSlugs.clItem}`);
                    const ciPayload = {
                        widget_item_id: 'undefined',
                        deactivated_flag: 'no',
                        item_click_action: 'redirect-to-page',
                        slug_name: itemSlugs.clItem,
                        slave_key: '',
                        item_type: 'carousel',
                        media: '',
                        text_en: '',      // intentionally empty per curl
                        text_hi: '',
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
                    ciPayload.media_en = await this._resolveImage(item.image, `cl_item_${i}`);
                    await callApi(ENDPOINTS.widgetItem, ciPayload, { multipart: true });
                }
                carouselItemSlugs.push(itemSlugs.clItem);
                results.push({ step: `item_${n}_cl_wi`, slug: itemSlugs.clItem, status: 'ok' });
            } catch (e) {
                this.log(`[CBScroll]   CL Item FAILED: ${e.message}`);
                results.push({ step: `item_${n}_cl_wi`, slug: itemSlugs.clItem, status: 'failed', error: e.message });
            }
        }

        // ════════════════════════════════════════════════════
        // Phase 2 — Carousel Widget + Final Mapping
        // ════════════════════════════════════════════════════

        // ── Step 8: Carousel Widget ──
        try {
            this.log(`[CBScroll] Phase 2 — Creating Carousel Widget: ${slugs.widget}`);
            await callApi(ENDPOINTS.widget, {
                slug_name: slugs.widget,
                widget_type: 'carousel',
                description: '',
                heading: '',
                master_key: '',
                heading_en: this.widget.title || '',
                heading_hi: this.widget.titleHi || '',
                heading_bg: '',
                start_time: this.dates.start,
                end_time: this.dates.end,
                clear_bg_media: '',
                media_aspect_ratio: String(this.widget.media_number || '2.2'),
                view_all_action_name: '',
                background_multimedia: '',
                filter_dict: '{}',
                app_configurations: '{}',
            }, { multipart: true });
            results.push({ step: 'carousel_widget', slug: slugs.widget, status: 'ok' });
        } catch (e) {
            this.log(`[CBScroll] Phase 2 — Widget FAILED: ${e.message}`);
            results.push({ step: 'carousel_widget', slug: slugs.widget, status: 'failed', error: e.message });
        }

        // ── Step 9: Map Carousel Items → Widget ──
        if (carouselItemSlugs.length > 0) {
            try {
                this.log(`[CBScroll] Phase 2 — Step 9: Map ${carouselItemSlugs.length} items → Widget`);
                const rows = carouselItemSlugs.map((slug, idx) => `${slug},global,global,${idx + 1},`);
                const csv = 'widget_item_slug_name,level_tag,level_property,priority,cohort\n' + rows.join('\n') + '\n';
                this.log(`[CBScroll]   CSV:\n${csv}`);
                await this._postMapping(ENDPOINTS.mapWidgetItems, { widget_slug: slugs.widget }, new Blob([csv], { type: 'text/csv' }));
                results.push({ step: 'map_items_to_carousel', status: 'ok' });
            } catch (e) {
                this.log(`[CBScroll] Phase 2 — Step 9 Mapping FAILED: ${e.message}`);
            }
        }

        this.log('[CBScroll] Deploy complete');
        return { slugs, results };
    }
}
