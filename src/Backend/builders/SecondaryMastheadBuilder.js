/**
 * SecondaryMastheadBuilder — Secondary Masthead (3-phase complex ecosystem).
 *
 * Aligned with CollectionBannerBuilder flow:
 *   Phase 1: Multimedia (bg) + SM Widget
 *   Phase 2: Per carousel item:
 *     Step 1: Sub-Cat Widget Items (per state) — CREATE or UPDATE
 *     Step 2: PLP Widget (product_listing)     — CREATE
 *     Step 3: Page Layout                      — CREATE
 *     Step 4: Map Sub-Cats → PLP Widget
 *     Step 5: Map PLP Widget → Page Layout
 *     Step 6: Map Page Layout → Global
 *     Step 7: Carousel Widget Item             — CREATE or UPDATE
 *   Phase 3: Map all Carousel Items → SM Widget
 *
 * Aspect ratio: hardcoded from image/video width/height (removed from config).
 */

import {
    callApi, updateApi, getWidgetId, getWidgetItemId,
    getNowStr, getFutureStr, getCsrfToken,
} from '../ApiClient';
import { SlugGenerator } from '../utils/SlugGenerator';
import { StateMapper } from '../utils/StateMapper';
import { API_BASE, ENDPOINTS } from '../../config/apiConfig';

export class SecondaryMastheadBuilder {
    /**
     * @param {Object} widget - Canvas widget data
     * @param {string} widget.slug
     * @param {*}      widget.background_media - File, Blob, or URL string
     * @param {string} widget.background_video
     * @param {Array}  widget.carouselItems
     * @param {Object} opts
     * @param {Function} opts.log
     */
    constructor(widget, { log = console.log } = {}) {
        this.widget = widget;
        this.log = log;
        this.slugGen = new SlugGenerator(widget.slug || 'secondary_masthead');
        const rawStart = widget.startTime || widget.start_time || getNowStr();
        const rawEnd = widget.endTime || widget.end_time || getFutureStr(365);
        this.dates = {
            start: String(rawStart).replace('T', ' ').slice(0, 19),
            end: String(rawEnd).replace('T', ' ').slice(0, 19),
        };
        this.log(`[SM] Dates: ${this.dates.start} → ${this.dates.end}`);
    }

    hasMultimedia() {
        return !!(this.widget.background_media || this.widget.background_video);
    }

    getMultimediaType() {
        if (this.widget.background_video) return '4'; // Video
        return '3'; // Image
    }

    /**
     * Sub-category slug resolver — same as CollectionBannerBuilder:
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
     * Resolve image for multipart upload (same as CollectionBannerBuilder):
     *   File/Blob  → use directly
     *   URL string → fetch → File
     *   falsy / {} → blank 1×1 PNG
     */
    async _resolveImage(src, fallbackName = 'image.png') {
        const blank = SecondaryMastheadBuilder.getBlankImageBlob();
        if (!src) return blank;
        if (src instanceof File || src instanceof Blob) return src;
        if (typeof src === 'object') return blank;
        if (typeof src !== 'string' || src.length === 0) return blank;
        try {
            this.log(`[SM]   Fetching image: ${src.substring(0, 60)}...`);
            const res = await fetch(src);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            const ext = blob.type.split('/')[1] || 'png';
            return new File([blob], `${fallbackName}.${ext}`, { type: blob.type });
        } catch (e) {
            this.log(`[SM]   Image fetch failed (${e.message}), using blank`);
            return blank;
        }
    }

    /**
     * Compute aspect ratio from background image/video dimensions.
     * Used for MULTIMEDIA only (not for SM widget).
     * Returns API string: '1' (~1:1), '2' (~4:3), '3' (~16:9), '4' (other)
     */
    async _computeAspectRatio() {
        const media = this.widget.background_media;
        if (!media) return '4';
        try {
            const src = (media instanceof File || media instanceof Blob)
                ? URL.createObjectURL(media)
                : (typeof media === 'string' ? media : null);
            if (!src) return '4';

            const result = await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    if (media instanceof File || media instanceof Blob) URL.revokeObjectURL(src);
                    resolve({ width: img.naturalWidth, height: img.naturalHeight });
                };
                img.onerror = () => {
                    if (media instanceof File || media instanceof Blob) URL.revokeObjectURL(src);
                    reject(new Error('Not an image'));
                };
                img.src = src;
            });

            const ratio = result.width / result.height;
            this.log(`[SM] Image dimensions: ${result.width}×${result.height} (ratio: ${ratio.toFixed(2)})`);
            if (Math.abs(ratio - 1.0) < 0.15) return '1';
            if (Math.abs(ratio - 1.33) < 0.15) return '2';
            if (Math.abs(ratio - 1.78) < 0.15) return '3';
            return '4';
        } catch (e) {
            this.log(`[SM] Aspect ratio detection failed (${e.message}), defaulting to '4'`);
            return '4';
        }
    }

    /** Helper: POST mapping CSV (same as CollectionBannerBuilder) */
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
        this.log(`[SM]   Mapping POST ${endpoint} → ${res.status} ${body.substring(0, 200)}`);
        if (!res.ok) throw new Error(`Mapping failed: ${res.status} ${body.substring(0, 100)}`);
    }

    /**
     * Execute the full 3-phase deploy.
     * @returns {Promise<{ slugs: Object, results: Object[] }>}
     */
    async deploy() {
        const results = [];
        const carouselItems = this.widget.carouselItems || [];

        // Slug logic (same as Primary Masthead):
        //   widget slug    = user's slug directly
        //   multimedia slug = user's slug + '_bg'
        const baseSlug = this.widget.slug || 'secondary_masthead';
        const slugs = {
            multimedia: `${baseSlug}_bg`,
            widget: baseSlug,
            carouselItemSlugs: [],
        };

        // Hardcode aspect ratio from image dimensions
        const aspectRatio = await this._computeAspectRatio();
        this.log(`[SM] Computed aspect ratio: ${aspectRatio}`);

        // ═══════════════════════════════════════════════════
        // Phase 1: Multimedia (optional) + SM Widget
        // ═══════════════════════════════════════════════════

        // Multimedia aspect ratio — auto-computed from image dimensions
        const multimediaAspectRatio = await this._computeAspectRatio();
        this.log(`[SM] Multimedia aspect ratio (from image): ${multimediaAspectRatio}`);

        // Carousel media-number — user-configurable (maps to media_aspect_ratio on SM widget)
        const carouselMediaNumber = String(this.widget.media_number || '2.5');
        this.log(`[SM] Carousel media-number: ${carouselMediaNumber}`);

        // view_all_action_params will be set AFTER Phase 2 (when pages exist)
        const viewAllRedirect = !!this.widget.view_all_redirect;
        const viewAllPageType = this.widget.view_all_page_type || 'category_page';

        // Step 1: Multimedia Background (optional)
        if (this.hasMultimedia()) {
            this.log(`[SM] Phase 1 — Creating Multimedia: ${slugs.multimedia}`);

            // Resolve background_media: URL string → fetch → File
            let bgFile = this.widget.background_media || null;
            if (typeof bgFile === 'string' && bgFile.length > 0) {
                bgFile = await this._resolveImage(bgFile, 'bg_media');
            }

            const mmPayload = {
                name: slugs.multimedia,
                multimedia_type: this.getMultimediaType(),
                aspect_ratio: multimediaAspectRatio,   // auto-computed from image
                transition_color: this.widget.transition_color || '#FFFFFF',
                accent_color: this.widget.accent_color || '#0000FF',
                text_color: this.widget.text_color || '#FFFFFF',
                icon_bg_color: this.widget.icon_bg_color || '#F0F0F0',
                is_multimedia_dark: this.widget.is_multimedia_dark ? 'True' : 'False',
            };
            if (bgFile instanceof File || bgFile instanceof Blob) {
                mmPayload.file_en = bgFile;
            }

            try {
                await callApi(ENDPOINTS.multimedia, mmPayload, { multipart: true });
                results.push({ step: 'multimedia', slug: slugs.multimedia, status: 'ok' });
            } catch (e) {
                this.log(`[SM] Multimedia FAILED (may already exist): ${e.message}`);
                results.push({ step: 'multimedia', slug: slugs.multimedia, status: 'skipped', error: e.message });
            }
        }

        // Step 2a: If View All redirect ON → create VA Page Layout FIRST
        //          (API validates page_layout_slug_name exists in view_all_action_params)
        let preVaPageSlug = '';
        if (viewAllRedirect) {
            preVaPageSlug = viewAllPageType === 'category_page'
                ? `${baseSlug}_va_cat_page`
                : `${baseSlug}_va_plp_page`;
            try {
                this.log(`[SM] Phase 1 — Pre-creating VA Page Layout: ${preVaPageSlug}`);
                await callApi(ENDPOINTS.pageLayout, {
                    slug_name: preVaPageSlug,
                    page_type: viewAllPageType,
                    page_heading: this.widget.view_all_heading || this.widget.slug || '',
                    page_layout_type: '2',
                });
                results.push({ step: 'va_page_pre', slug: preVaPageSlug, status: 'ok' });
            } catch (e) {
                this.log(`[SM] VA Page pre-creation failed: ${e.message}`);
            }
        }

        // Step 2b: SM Widget
        this.log(`[SM] Phase 1 — Creating SM Widget: ${slugs.widget}`);
        const smPayload = {
            slug_name: slugs.widget,
            widget_type: 'masthead_secondary_carousal_hp',
            description: '',
            heading: '',
            master_key: this.widget.master_key || '',
            heading_en: '',
            heading_hi: '',
            heading_bg: '',
            media_aspect_ratio: carouselMediaNumber,
            start_time: this.dates.start,
            end_time: this.dates.end,
            clear_bg_media: '',
            filter_dict: '{}',
            app_configurations: '{}',
            configurations: '{}',
            deactivated_flag: 'no',
        };
        if (viewAllRedirect && preVaPageSlug) {
            smPayload.view_all_action_name = 'redirect-to-page';
            smPayload.view_all_action_params = JSON.stringify({
                page_type: viewAllPageType,
                page_layout_slug_name: preVaPageSlug,
            });
        } else {
            smPayload.view_all_action_name = '';
            smPayload.view_all_action_params = '';
        }
        if (this.hasMultimedia()) {
            smPayload.background_multimedia = slugs.multimedia;
        }
        try {
            await callApi(ENDPOINTS.widget, smPayload, { multipart: true });
            results.push({ step: 'sm_widget', slug: slugs.widget, status: 'ok' });
        } catch (e) {
            this.log(`[SM] SM Widget FAILED: ${e.message}`);
            results.push({ step: 'sm_widget', slug: slugs.widget, status: 'failed', error: e.message });
        }

        // ═══════════════════════════════════════════════════
        // Phase 1.5: View All Page Ecosystem (only when redirect ON)
        // Creates its own sub-cat + PLP + Page for the SM banner tap
        // ═══════════════════════════════════════════════════

        let viewAllPageSlug = '';
        if (viewAllRedirect) {
            this.log(`[SM] Phase 1.5 — View All page ecosystem (${viewAllPageType})`);

            const vaPlpSlug = `${baseSlug}_va_plp`;
            const vaPageSlug = viewAllPageType === 'category_page'
                ? `${baseSlug}_va_cat_page`
                : `${baseSlug}_va_plp_page`;
            viewAllPageSlug = vaPageSlug;

            // Build sub-categories list
            let vaSubCategories = [];
            if (viewAllPageType === 'product_listing_page') {
                const stateProducts = this.widget.view_all_state_products || { global: '' };
                vaSubCategories = [{ name: this.widget.slug || 'view_all', nameHi: '', products: stateProducts }];
            } else {
                vaSubCategories = this.widget.view_all_sub_categories || [];
            }

            const vaSubCatMappingRows = [];
            for (let j = 0; j < vaSubCategories.length; j++) {
                const sub = vaSubCategories[j];
                const activeStates = StateMapper.getActiveStates(sub.products || { global: '' });
                for (const state of activeStates) {
                    const scSlug = viewAllPageType === 'category_page'
                        ? `${baseSlug}_va_subcat_${j + 1}_${state.key}`
                        : `${baseSlug}_va_sc_wi_${state.key}`;
                    try {
                        const existingId = await getWidgetItemId(scSlug);
                        if (existingId) {
                            await updateApi(`/api/app/widget_item/${existingId}/`, {
                                slug_name: scSlug, item_type: 'sub_category',
                                text_en: sub.name || '', text_hi: sub.nameHi || '',
                                product_list: state.codes,
                                filter_lst: StateMapper.buildInStockFilter(state.codes),
                                start_time: this.dates.start, end_time: this.dates.end,
                            });
                        } else {
                            await callApi(ENDPOINTS.widgetItem, {
                                widget_item_id: 'undefined', deactivated_flag: 'no',
                                item_click_action: 'deal-detail-redirect',
                                slug_name: scSlug, item_type: 'sub_category',
                                text_en: sub.name || '', text_hi: sub.nameHi || '',
                                media_en: await this._resolveImage(sub.image || null, `va_sc_${j}`),
                                product_list: state.codes,
                                filters: '[]', filter_lst: StateMapper.buildInStockFilter(state.codes),
                                property_lst: '[]', pl_edit: 'PL', is_clickable: 'yes',
                                update_product_list: 'no',
                                start_time: this.dates.start, end_time: this.dates.end,
                            }, { multipart: true });
                        }
                        vaSubCatMappingRows.push(`${scSlug},${state.def?.levelTag || 'global'},${state.def?.levelProperty || 'global'},${vaSubCatMappingRows.length + 1},`);
                        results.push({ step: `va_sc_${j}_${state.key}`, slug: scSlug, status: 'ok' });
                    } catch (e) {
                        this.log(`[SM] VA Sub-cat [${state.key}] failed: ${e.message}`);
                    }
                }
            }

            // PLP Widget for view_all (same payload as Phase 2 Step 2)
            try {
                this.log(`[SM] VA PLP Widget, Creating: ${vaPlpSlug}`);
                await callApi(ENDPOINTS.widget, {
                    slug_name: vaPlpSlug,
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
                results.push({ step: 'va_plp_widget', slug: vaPlpSlug, status: 'ok' });
            } catch (e) { this.log(`[SM] VA PLP Widget failed: ${e.message}`); }

            // VA Page Layout already created in Phase 1 (Step 2a) — skip here

            // Mapping: sub-cats → PLP (same as Phase 2 Step 4)
            if (vaSubCatMappingRows.length > 0) {
                try {
                    const csv = 'widget_item_slug_name,level_tag,level_property,priority,cohort\n' + vaSubCatMappingRows.join('\n') + '\n';
                    await this._postMapping(ENDPOINTS.mapWidgetItems, { widget_slug: vaPlpSlug }, new Blob([csv], { type: 'text/csv' }));
                } catch (e) { this.log(`[SM] VA sub-cat→PLP mapping failed: ${e.message}`); }
            }

            // ── Expand Page Widgets (additional widgets on VA PLP page) ──
            // Handles spr (stateProducts), carousel (scrollItems), masthead (carouselItems)
            // with Create/Update logic and correct media_en field.
            const vaExpand = this.widget.view_all_expand || {};
            const vaPlpWidgets = vaExpand.expandPage ? (vaExpand.plpWidgets || []) : [];
            const vaExpandWidgetSlugs = [];
            const blank = SecondaryMastheadBuilder.getBlankImageBlob();
            for (let k = 0; k < vaPlpWidgets.length; k++) {
                const epw = vaPlpWidgets[k];
                const epwSlug = `${baseSlug}_va_ep_${k + 1}`;
                const isSprType = !['carousel', 'masthead_secondary_category_hp'].includes(epw.type);
                try {
                    // Create/Update widget
                    const existingEpwId = await getWidgetId(epwSlug).catch(() => null);
                    if (existingEpwId) {
                        this.log(`[SM] VA EP ${k + 1} exists (${existingEpwId}), Updating: ${epwSlug}`);
                        await updateApi(`/api/app/widget/${existingEpwId}/`, {
                            slug_name: epwSlug, widget_type: epw.type,
                            heading: epw.title || '', heading_en: epw.title || '',
                            start_time: this.dates.start, end_time: this.dates.end,
                        });
                    } else {
                        await callApi(ENDPOINTS.widget, {
                            slug_name: epwSlug, widget_type: epw.type,
                            description: '', heading: epw.title || '', master_key: '',
                            heading_en: epw.title || '', heading_hi: '', heading_bg: '',
                            start_time: this.dates.start, end_time: this.dates.end,
                            clear_bg_media: '',
                            media_aspect_ratio: epw.type === 'carousel' ? String(epw.media_number || '3.5') : epw.type === 'masthead_secondary_category_hp' ? String(epw.media_number || '2.5') : '1',
                            view_all_action_name: '', background_multimedia: '',
                            filter_dict: '{}', app_configurations: '{}',
                            configurations: '{}', deactivated_flag: 'no',
                        }, { multipart: true });
                    }

                    // SPR/DPR group: sub-cat items with stateProducts
                    if (isSprType) {
                        const epwStates = StateMapper.getActiveStates(epw.stateProducts || { global: '' });
                        const epwSubCatRows = [];
                        for (const state of epwStates) {
                            const epwScSlug = `${baseSlug}_va_ep_${k + 1}_sc_wi_${state.key}`;
                            try {
                                const existingScId = await getWidgetItemId(epwScSlug);
                                if (existingScId) {
                                    await updateApi(`/api/app/widget_item/${existingScId}/`, {
                                        slug_name: epwScSlug, item_type: 'sub_category',
                                        text_en: epw.title || '', product_list: state.codes,
                                        filter_lst: StateMapper.buildInStockFilter(state.codes),
                                        start_time: this.dates.start, end_time: this.dates.end,
                                    });
                                } else {
                                    await callApi(ENDPOINTS.widgetItem, {
                                        widget_item_id: 'undefined', deactivated_flag: 'no',
                                        item_click_action: 'deal-detail-redirect',
                                        slug_name: epwScSlug, slave_key: '', item_type: 'sub_category',
                                        media_en: blank, text_en: epw.title || '', text_hi: '',
                                        media_hi: '', text_bg: '', media_bg: '',
                                        product_list: state.codes,
                                        filters: '[]', filter_lst: StateMapper.buildInStockFilter(state.codes),
                                        property_lst: '[]', pl_edit: 'PL', is_clickable: 'yes',
                                        update_product_list: 'no',
                                        start_time: this.dates.start, end_time: this.dates.end,
                                    }, { multipart: true });
                                }
                                epwSubCatRows.push(`${epwScSlug},${state.def?.levelTag || 'global'},${state.def?.levelProperty || 'global'},${epwSubCatRows.length + 1},`);
                            } catch (e2) { this.log(`[SM] VA expand widget sub-cat failed: ${e2.message}`); }
                        }
                        if (epwSubCatRows.length > 0) {
                            const epwCsv = 'widget_item_slug_name,level_tag,level_property,priority,cohort\n' + epwSubCatRows.join('\n') + '\n';
                            await this._postMapping(ENDPOINTS.mapWidgetItems, { widget_slug: epwSlug }, new Blob([epwCsv], { type: 'text/csv' })).catch(() => { });
                        }
                    }

                    // Carousel group: carousel items from scrollItems
                    if (epw.type === 'carousel' && Array.isArray(epw.scrollItems)) {
                        const ciSlugs = [];
                        for (let ci = 0; ci < epw.scrollItems.length; ci++) {
                            const si = epw.scrollItems[ci];
                            const ciPlp = `${epwSlug}_item_${ci + 1}_plp`;
                            const ciPage = `${epwSlug}_item_${ci + 1}_plp_page`;
                            const ciItem = `${epwSlug}_item_${ci + 1}_cl_wi`;
                            try {
                                const siStates = StateMapper.getActiveStates(si.stateProducts || { global: si.productIds || '' });
                                const siScRows = [];
                                for (const state of siStates) {
                                    const siScSlug = `${epwSlug}_item_${ci + 1}_sc_wi_${state.key}`;
                                    const exId = await getWidgetItemId(siScSlug).catch(() => null);
                                    if (exId) { await updateApi(`/api/app/widget_item/${exId}/`, { slug_name: siScSlug, item_type: 'sub_category', text_en: si.pageHeading || '', product_list: state.codes, filter_lst: StateMapper.buildInStockFilter(state.codes), start_time: this.dates.start, end_time: this.dates.end }); }
                                    else { const p = { widget_item_id: 'undefined', deactivated_flag: 'no', item_click_action: 'deal-detail-redirect', slug_name: siScSlug, item_type: 'sub_category', text_en: si.pageHeading || '', text_hi: '', media_hi: '', text_bg: '', media_bg: '', product_list: state.codes, filters: '[]', filter_lst: StateMapper.buildInStockFilter(state.codes), property_lst: '[]', pl_edit: 'PL', is_clickable: 'yes', update_product_list: 'no', start_time: this.dates.start, end_time: this.dates.end }; p.media_en = await this._resolveImage(si.image, `va_ep_${k}_ci_${ci}`); await callApi(ENDPOINTS.widgetItem, p, { multipart: true }); }
                                    siScRows.push(`${siScSlug},${state.def?.levelTag || 'global'},${state.def?.levelProperty || 'global'},${siScRows.length + 1},`);
                                }
                                await callApi(ENDPOINTS.widget, { slug_name: ciPlp, widget_type: 'product_listing', description: '', heading: '', master_key: '', heading_en: '', heading_hi: '', heading_bg: '', start_time: this.dates.start, end_time: this.dates.end, clear_bg_media: '', media_aspect_ratio: '1', view_all_action_name: '', background_multimedia: '', filter_dict: '{}', app_configurations: '{}', configurations: '{}', deactivated_flag: 'no' }, { multipart: true });
                                await callApi(ENDPOINTS.pageLayout, { slug_name: ciPage, page_type: 'product_listing_page', page_heading: si.pageHeading || '', page_layout_type: '2' });
                                if (siScRows.length > 0) await this._postMapping(ENDPOINTS.mapWidgetItems, { widget_slug: ciPlp }, new Blob(['widget_item_slug_name,level_tag,level_property,priority,cohort\n' + siScRows.join('\n') + '\n'], { type: 'text/csv' }));
                                await this._postMapping(ENDPOINTS.mapLayoutWidget, { page_layout_slug: ciPage }, new Blob([`widget_slug_name,level_tag,level_property,priority,cohort\n${ciPlp},global,global,1,\n`], { type: 'text/csv' }));
                                await this._postMapping(ENDPOINTS.mapPageLayout, { page_layout_slug: ciPage, page_type: '' }, new Blob(['level_tag,level_property\nglobal,global\n'], { type: 'text/csv' }));
                                const cp = JSON.stringify({ page_type: 'product_listing_page', page_layout_slug_name: ciPage });
                                const exCi = await getWidgetItemId(ciItem).catch(() => null);
                                if (exCi) { await updateApi(`/api/app/widget_item/${exCi}/`, { slug_name: ciItem, item_type: 'carousel', click_action_params: cp, start_time: this.dates.start, end_time: this.dates.end }); }
                                else { const p = { widget_item_id: 'undefined', deactivated_flag: 'no', item_click_action: 'redirect-to-page', slug_name: ciItem, item_type: 'carousel', text_en: '', text_hi: '', media_hi: '', text_bg: '', media_bg: '', product_list: '', filters: '[]', filter_lst: '[]', property_lst: '[]', pl_edit: 'PL', is_clickable: 'yes', update_product_list: 'no', start_time: this.dates.start, end_time: this.dates.end, background_multimedia: '', image_multimedia: '', secondary_image_multimedia: '', progress_bar: '', offer_id: '', click_action_params: cp }; p.media_en = await this._resolveImage(si.image, `va_ep_${k}_cl_${ci}`); await callApi(ENDPOINTS.widgetItem, p, { multipart: true }); }
                                ciSlugs.push(ciItem);
                            } catch (e3) { this.log(`[SM] VA EP ${k + 1} carousel item ${ci + 1} failed: ${e3.message}`); }
                        }
                        if (ciSlugs.length > 0) {
                            const rows = ciSlugs.map((s, idx) => `${s},global,global,${idx + 1},`);
                            await this._postMapping(ENDPOINTS.mapWidgetItems, { widget_slug: epwSlug }, new Blob(['widget_item_slug_name,level_tag,level_property,priority,cohort\n' + rows.join('\n') + '\n'], { type: 'text/csv' })).catch(() => { });
                        }
                    }

                    vaExpandWidgetSlugs.push(epwSlug);
                    results.push({ step: `va_expand_widget_${k + 1}`, slug: epwSlug, status: 'ok' });
                } catch (e) { this.log(`[SM] VA expand widget ${k + 1} failed: ${e.message}`); }
            }

            // Mapping: PLP + expand widgets → Page Layout (same as Phase 2 Step 5)
            {
                const allVaWidgetRows = [
                    `${vaPlpSlug},global,global,1,`,
                    ...vaExpandWidgetSlugs.map((s, idx) => `${s},global,global,${idx + 2},`),
                ];
                try {
                    const csv = 'widget_slug_name,level_tag,level_property,priority,cohort\n' + allVaWidgetRows.join('\n') + '\n';
                    await this._postMapping(ENDPOINTS.mapLayoutWidget, { page_layout_slug: vaPageSlug }, new Blob([csv], { type: 'text/csv' }));
                } catch (e) { this.log(`[SM] VA PLP→Page mapping failed: ${e.message}`); }
            }

            // Mapping: Page → Global (same as Phase 2 Step 6)
            try {
                const csv = 'level_tag,level_property\nglobal,global\n';
                await this._postMapping(ENDPOINTS.mapPageLayout, {
                    page_layout_slug: vaPageSlug,
                    page_type: '',
                }, new Blob([csv], { type: 'text/csv' }));
            } catch (e) { this.log(`[SM] VA Page→Global mapping failed: ${e.message}`); }

            this.log(`[SM] Phase 1.5 done — view_all page: ${viewAllPageSlug}`);
        }

        // ═══════════════════════════════════════════════════
        // Phase 2: Per Carousel Item Ecosystem
        // (Same flow as CollectionBannerBuilder)
        // ═══════════════════════════════════════════════════

        for (let i = 0; i < carouselItems.length; i++) {
            const item = carouselItems[i];
            const n = i + 1;
            const pageType = item.pageType || 'category_page';

            this.log(`[SM] Phase 2 — Item ${n}: "${item.text || item.pageHeading || 'untitled'}" (${pageType})`);

            const itemSlugs = {
                plp: this.slugGen.getIndexed(i, '_plp'),
                page: pageType === 'category_page'
                    ? this.slugGen.getIndexed(i, '_cat_page')
                    : this.slugGen.getIndexed(i, '_plp_page'),
                carousel: this.slugGen.getIndexed(i, '_carousel'),
            };

            // Determine sub-categories (same as CollectionBannerBuilder)
            // PLP page → virtual single sub-cat from stateProducts
            // Category page → real subCategories[]
            let subCategories = [];
            if (pageType === 'product_listing_page') {
                const stateProducts = item.stateProducts || { global: item.productIds || '' };
                subCategories = [{
                    name: item.pageHeading || item.text || '',
                    nameHi: item.textHi || '',
                    products: stateProducts,
                    image: item.image || null,
                }];
            } else {
                subCategories = item.subCategories || [];
            }

            // ── Step 1: Sub-Category Widget Items (CREATE or UPDATE) ──
            for (let j = 0; j < subCategories.length; j++) {
                const sub = subCategories[j];
                const activeStates = StateMapper.getActiveStates(sub.products || { global: '' });

                for (const state of activeStates) {
                    const scSlug = this._scSlug(i, j, state.key, pageType);
                    try {
                        const existingId = await getWidgetItemId(scSlug);
                        if (existingId) {
                            this.log(`[SM]   SC [${state.key}] exists (${existingId}), Updating: ${scSlug}`);
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
                            this.log(`[SM]   SC [${state.key}] new, Creating: ${scSlug}`);
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
                        this.log(`[SM]   SC [${state.key}] FAILED: ${e.message}`);
                        results.push({ step: `item_${n}_sc_${j}_${state.key}`, slug: scSlug, status: 'failed', error: e.message });
                    }
                }
            }

            // ── Step 2: PLP Widget ──
            try {
                this.log(`[SM]   PLP Widget, Creating: ${itemSlugs.plp}`);
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
                this.log(`[SM]   PLP Widget FAILED: ${e.message}`);
                results.push({ step: `item_${n}_plp`, slug: itemSlugs.plp, status: 'failed', error: e.message });
            }

            // ── Step 3: Page Layout ──
            try {
                this.log(`[SM]   Page Layout, Creating: ${itemSlugs.page}`);
                await callApi(ENDPOINTS.pageLayout, {
                    slug_name: itemSlugs.page,
                    page_type: pageType,
                    page_heading: item.pageHeading || item.text || '',
                    page_layout_type: '2',
                });
                results.push({ step: `item_${n}_page`, slug: itemSlugs.page, status: 'ok' });
            } catch (e) {
                this.log(`[SM]   Page Layout FAILED: ${e.message}`);
                results.push({ step: `item_${n}_page`, slug: itemSlugs.page, status: 'failed', error: e.message });
            }

            // ── Step 4: Map Sub-Cats → PLP Widget ──
            try {
                const scMappingRows = [];
                for (let j = 0; j < subCategories.length; j++) {
                    const sub = subCategories[j];
                    const activeStates = StateMapper.getActiveStates(sub.products || { global: '' });
                    for (const state of activeStates) {
                        const scSlug = this._scSlug(i, j, state.key, pageType);
                        scMappingRows.push(`${scSlug},${state.def.levelTag},${state.def.levelProperty},${scMappingRows.length + 1},`);
                    }
                }
                this.log(`[SM]   Step 4 — Sub-cat mapping rows: ${scMappingRows.length} for PLP ${itemSlugs.plp}`);
                if (scMappingRows.length > 0) {
                    const csv = 'widget_item_slug_name,level_tag,level_property,priority,cohort\n' + scMappingRows.join('\n') + '\n';
                    await this._postMapping(ENDPOINTS.mapWidgetItems, { widget_slug: itemSlugs.plp }, new Blob([csv], { type: 'text/csv' }));
                    results.push({ step: `item_${n}_map_sc_plp`, status: 'ok' });
                }
            } catch (e) {
                this.log(`[SM]   Step 4 Mapping FAILED: ${e.message}`);
            }

            // ── Step 5: Map PLP Widget → Page Layout ──
            try {
                this.log(`[SM]   Step 5 — Map PLP → Page`);
                const csv = `widget_slug_name,level_tag,level_property,priority,cohort\n${itemSlugs.plp},global,global,1,\n`;
                await this._postMapping(ENDPOINTS.mapLayoutWidget, { page_layout_slug: itemSlugs.page }, new Blob([csv], { type: 'text/csv' }));
                results.push({ step: `item_${n}_map_plp_page`, status: 'ok' });
            } catch (e) {
                this.log(`[SM]   Step 5 Mapping FAILED: ${e.message}`);
            }

            // ── Step 6: Map Page Layout → Global ──
            try {
                this.log(`[SM]   Step 6 — Map Page → Global`);
                const csv = 'level_tag,level_property\nglobal,global\n';
                await this._postMapping(ENDPOINTS.mapPageLayout, {
                    page_layout_slug: itemSlugs.page,
                    page_type: '',   // always empty string (same as CollectionBannerBuilder)
                }, new Blob([csv], { type: 'text/csv' }));
                results.push({ step: `item_${n}_map_page_global`, status: 'ok' });
            } catch (e) {
                this.log(`[SM]   Step 6 Mapping FAILED: ${e.message}`);
            }

            // ── Step 7: Carousel Widget Item (CREATE or UPDATE) ──
            try {
                const clickParams = JSON.stringify({
                    page_type: pageType,
                    page_layout_slug_name: itemSlugs.page,
                });

                const existingId = await getWidgetItemId(itemSlugs.carousel);
                if (existingId) {
                    this.log(`[SM]   CL Item exists (${existingId}), Updating: ${itemSlugs.carousel}`);
                    await updateApi(`/api/app/widget_item/${existingId}/`, {
                        slug_name: itemSlugs.carousel,
                        item_type: 'carousel',
                        click_action_params: clickParams,
                        start_time: this.dates.start,
                        end_time: this.dates.end,
                    });
                } else {
                    this.log(`[SM]   CL Item new, Creating: ${itemSlugs.carousel}`);
                    const ciPayload = {
                        widget_item_id: 'undefined',
                        deactivated_flag: 'no',
                        item_click_action: 'redirect-to-page',
                        slug_name: itemSlugs.carousel,
                        slave_key: '',
                        item_type: 'carousel',
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
                    ciPayload.media_en = await this._resolveImage(item.image, `cl_item_${i}`);
                    await callApi(ENDPOINTS.widgetItem, ciPayload, { multipart: true });
                }
                slugs.carouselItemSlugs.push(itemSlugs.carousel);
                results.push({ step: `item_${n}_carousel`, slug: itemSlugs.carousel, status: 'ok' });
            } catch (e) {
                this.log(`[SM]   CL Item FAILED: ${e.message}`);
                results.push({ step: `item_${n}_carousel`, slug: itemSlugs.carousel, status: 'failed', error: e.message });
            }
        }

        // ═══════════════════════════════════════════════════
        // Phase 3: Map Carousel Items → SM Widget
        // ═══════════════════════════════════════════════════

        if (slugs.carouselItemSlugs.length > 0) {
            try {
                this.log(`[SM] Phase 3 — Mapping ${slugs.carouselItemSlugs.length} carousel items → SM Widget`);
                const rows = slugs.carouselItemSlugs.map((slug, idx) => `${slug},global,global,${idx + 1},`);
                const csv = 'widget_item_slug_name,level_tag,level_property,priority,cohort\n' + rows.join('\n') + '\n';
                this.log(`[SM]   CSV:\n${csv}`);
                await this._postMapping(ENDPOINTS.mapWidgetItems, { widget_slug: slugs.widget }, new Blob([csv], { type: 'text/csv' }));
                results.push({ step: 'map_carousel_to_sm', status: 'ok' });
            } catch (e) {
                this.log(`[SM] Phase 3 — Mapping FAILED: ${e.message}`);
            }
        }

        this.log('[SM] Deploy complete');
        return { slugs, results };
    }
}
