/**
 * CollectionBannerBuilder — Carousel / Collection Banner widget builder (scroll mode).
 *
 * Ported from:
 *   scripts/CLP_Automation.gs → createCLPWidget()
 *   config/widgets/CollectionBannerConfig.js → deployStrategies.SCROLL
 *
 * Deploy flow (bottom-up per item):
 *   Sub-Cat Item (per state) → PLP Widget → Page Layout → Carousel Item → Mappings
 *   Then: Carousel Widget → Map all carousel items
 */

import { callApi, createMappingCsv, getNowStr, getFutureStr, getCsrfToken } from '../ApiClient';
import { SlugGenerator } from '../utils/SlugGenerator';
import { StateMapper } from '../utils/StateMapper';
import { API_BASE, ENDPOINTS } from '../../config/apiConfig';

export class CollectionBannerBuilder {
    /**
     * @param {Object} widget - Canvas widget
     * @param {string} widget.slug - Base slug
     * @param {string} widget.title - English title
     * @param {string} widget.media_number - Visible items count (e.g. '3.5')
     * @param {Array}  widget.scrollItems - Carousel items
     * @param {Object} opts
     * @param {Function} opts.log
     */
    constructor(widget, { log = console.log } = {}) {
        this.widget = widget;
        this.log = log;
        this.slugGen = new SlugGenerator(widget.slug || widget.title);
        this.dates = {
            start: widget.start_time || widget.startTime || getNowStr(),
            end: widget.end_time || widget.endTime || getFutureStr(365),
        };
    }

    /**
     * Execute the full deploy.
     * @returns {Promise<{ slugs: Object, results: Object[] }>}
     */
    async deploy() {
        const results = [];
        const scrollItems = this.widget.scrollItems || [];
        const carouselItemSlugs = [];

        const slugs = {
            widget: this.slugGen.get('_Cl_w_HP'),
            itemEcosystems: [],
        };

        // ─── Per Carousel Item: Bottom-up Ecosystem ───

        for (let i = 0; i < scrollItems.length; i++) {
            const item = scrollItems[i];
            const n = i + 1;
            this.log(`[CB Scroll] Item ${n}: ${item.title || 'untitled'}`);

            // Determine product codes — from stateProducts.global or productIds
            const stateProducts = item.stateProducts || { global: item.productIds || '' };
            const globalProducts = stateProducts.global || item.productIds || '';

            const itemSlugs = {
                page: this.slugGen.getIndexed(i, '_Page_p'),
                plp: this.slugGen.getIndexed(i, '_plp_w'),
                carouselItem: this.slugGen.getIndexed(i, '_cl_wi'),
            };
            slugs.itemEcosystems.push(itemSlugs);

            // Step 1: Sub-Category Widget Item (per state)
            const activeStates = StateMapper.getActiveStates(stateProducts);
            const subCatMappingRows = [];

            for (const state of activeStates) {
                const scSlug = `${this.slugGen.getIndexed(i, '_sub_cat_wi')}_${state.key}`;
                this.log(`[CB Scroll]   Sub-Cat: ${scSlug}`);

                const scPayload = {
                    slug_name: scSlug,
                    item_type: 'sub_category',
                    text_en: item.title || '',
                    product_list: state.codes,
                    filter_lst: StateMapper.buildInStockFilter(state.codes),
                    deactivated_flag: 'no',
                    item_click_action: 'deal-detail-redirect',
                    is_clickable: 'yes',
                };
                await callApi(ENDPOINTS.widgetItem, scPayload, { multipart: true });

                subCatMappingRows.push(
                    `${scSlug},${state.def.levelTag},${state.def.levelProperty},${subCatMappingRows.length + 1},`
                );
                results.push({ step: `item_${n}_subcat_${state.key}`, slug: scSlug, status: 'ok' });
            }

            // Step 2: PLP Widget
            this.log(`[CB Scroll]   PLP Widget: ${itemSlugs.plp}`);
            await callApi(ENDPOINTS.widget, {
                slug_name: itemSlugs.plp,
                widget_type: 'product_listing',
                heading: item.title || '',
                heading_en: item.title || '',
                start_time: this.dates.start,
                end_time: this.dates.end,
            }, { multipart: true });
            results.push({ step: `item_${n}_plp`, slug: itemSlugs.plp, status: 'ok' });

            // Step 3: Page Layout
            this.log(`[CB Scroll]   Page Layout: ${itemSlugs.page}`);
            await callApi(ENDPOINTS.pageLayout, {
                slug_name: itemSlugs.page,
                page_type: item.pageType || 'product_listing_page',
                page_heading: item.title || '',
                page_layout_type: '2',
            });
            results.push({ step: `item_${n}_page`, slug: itemSlugs.page, status: 'ok' });

            // Map: Sub-Cat → PLP
            if (subCatMappingRows.length > 0) {
                const scHeader = 'widget_item_slug_name,level_tag,level_property,priority,cohort';
                const scCsv = new Blob([scHeader + '\n' + subCatMappingRows.join('\n')], { type: 'text/csv' });
                const scMap = new FormData();
                scMap.append('widget_slug', itemSlugs.plp);
                scMap.append('mapping_file', scCsv, 'mapping.csv');
                await fetch(`${API_BASE}${ENDPOINTS.mapWidgetItems}`, {
                    method: 'POST', body: scMap, credentials: 'include',
                    headers: { 'X-CSRFToken': getCsrfToken() || '' },
                });
            }

            // Map: PLP → Page
            const plpCsv = createMappingCsv('layout_widget', itemSlugs.plp);
            const plpMap = new FormData();
            plpMap.append('page_layout_slug', itemSlugs.page);
            plpMap.append('mapping_file', plpCsv, 'mapping.csv');
            await fetch(`${API_BASE}${ENDPOINTS.mapLayoutWidget}`, {
                method: 'POST', body: plpMap, credentials: 'include',
                headers: { 'X-CSRFToken': getCsrfToken() || '' },
            });

            // Map: Page → Global
            const pgCsv = createMappingCsv('global_page');
            const pgMap = new FormData();
            pgMap.append('page_layout_slug', itemSlugs.page);
            pgMap.append('page_type', item.pageType || 'product_listing_page');
            pgMap.append('mapping_file', pgCsv, 'mapping.csv');
            await fetch(`${API_BASE}${ENDPOINTS.mapPageLayout}`, {
                method: 'POST', body: pgMap, credentials: 'include',
                headers: { 'X-CSRFToken': getCsrfToken() || '' },
            });

            // Step 4: Carousel Widget Item
            this.log(`[CB Scroll]   Carousel Item: ${itemSlugs.carouselItem}`);
            const clickParams = JSON.stringify({
                page_type: item.pageType || 'product_listing_page',
                page_layout_slug_name: itemSlugs.page,
            });
            const ciPayload = {
                slug_name: itemSlugs.carouselItem,
                item_type: 'carousel',
                item_click_action: 'redirect-to-page',
                click_action_params: clickParams,
                is_clickable: 'yes',
            };
            if (item.image instanceof File || item.image instanceof Blob) {
                ciPayload.media_en = item.image;
            }
            await callApi(ENDPOINTS.widgetItem, ciPayload, { multipart: true });
            carouselItemSlugs.push(itemSlugs.carouselItem);
            results.push({ step: `item_${n}_carousel`, slug: itemSlugs.carouselItem, status: 'ok' });
        }

        // ─── Carousel Widget (parent container) ───

        this.log(`[CB Scroll] Creating Carousel Widget: ${slugs.widget}`);
        await callApi(ENDPOINTS.widget, {
            slug_name: slugs.widget,
            widget_type: 'carousel',
            media_number: this.widget.media_number || '3.5',
            start_time: this.dates.start,
            end_time: this.dates.end,
        }, { multipart: true });
        results.push({ step: 'carousel_widget', slug: slugs.widget, status: 'ok' });

        // Map: All Carousel Items → Carousel Widget
        if (carouselItemSlugs.length > 0) {
            this.log(`[CB Scroll] Mapping ${carouselItemSlugs.length} items → Widget`);
            const ciHeader = 'widget_item_slug_name,level_tag,level_property,priority,cohort';
            const ciRows = carouselItemSlugs.map((slug, idx) => `${slug},global,global,${idx + 1},`);
            const ciCsv = new Blob([ciHeader + '\n' + ciRows.join('\n')], { type: 'text/csv' });
            const ciMap = new FormData();
            ciMap.append('widget_slug', slugs.widget);
            ciMap.append('mapping_file', ciCsv, 'mapping.csv');
            await fetch(`${API_BASE}${ENDPOINTS.mapWidgetItems}`, {
                method: 'POST', body: ciMap, credentials: 'include',
                headers: { 'X-CSRFToken': getCsrfToken() || '' },
            });
            results.push({ step: 'map_items_to_carousel', status: 'ok' });
        }

        this.log('[CB Scroll] Deploy complete');
        return { slugs, results };
    }
}
