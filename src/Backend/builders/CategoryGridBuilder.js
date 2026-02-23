/**
 * CategoryGridBuilder — Category Grid widget builder (stick mode).
 *
 * Ported from:
 *   scripts/Category_Grid_Backend.gs → createCategoryGridFromApproval()
 *   config/widgets/CollectionBannerConfig.js → deployStrategies.STICK
 *
 * 2-Phase deploy:
 *   Phase 1 (per category item): Sub-Cats (per state) → PLP Widget → Page → Cat Item + Mappings
 *   Phase 2: Category Grid Widget → Map all cat items
 */

import { callApi, createMappingCsv, getNowStr, getFutureStr, getCsrfToken } from '../ApiClient';
import { SlugGenerator } from '../utils/SlugGenerator';
import { StateMapper } from '../utils/StateMapper';
import { API_BASE, ENDPOINTS } from '../../config/apiConfig';

export class CategoryGridBuilder {
    /**
     * @param {Object} widget - Canvas widget
     * @param {string} widget.slug - Base slug
     * @param {string} widget.title - English title
     * @param {string} widget.titleHi - Hindi title
     * @param {Array}  widget.categoryItems - Category items with sub-categories
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
     * Execute the full 2-phase deploy.
     * @returns {Promise<{ slugs: Object, results: Object[] }>}
     */
    async deploy() {
        const results = [];
        const categoryItems = this.widget.categoryItems || [];
        const catItemSlugs = [];

        const slugs = {
            widget: this.slugGen.get('_cm_hp'),
            itemEcosystems: [],
        };

        // ═══ Phase 1: Per Category Item Ecosystem ═══

        for (let i = 0; i < categoryItems.length; i++) {
            const item = categoryItems[i];
            const n = i + 1;
            this.log(`[CatGrid] Phase 1 — Category Item ${n}: ${item.text || 'untitled'}`);

            const itemSlugs = {
                page: this.slugGen.getIndexed(i, '_page'),
                plp: this.slugGen.getIndexed(i, '_plp'),
                catItem: this.slugGen.getIndexed(i, '_cat_wi'),
            };
            slugs.itemEcosystems.push(itemSlugs);

            // Step 1: Sub-Category Widget Items (per sub-cat × per state)
            const subCategories = item.subCategories || [];
            const allSubCatMappingRows = [];

            for (let j = 0; j < subCategories.length; j++) {
                const sub = subCategories[j];
                const products = sub.products || { global: '' };
                const activeStates = StateMapper.getActiveStates(products);

                for (const state of activeStates) {
                    const scSlug = this.slugGen.getNestedStateful(i, j, state.key);
                    this.log(`[CatGrid]   Sub-Cat: ${scSlug}`);

                    const scPayload = {
                        slug_name: scSlug,
                        item_type: 'sub_category',
                        text_en: sub.name || '',
                        text_hi: sub.nameHi || '',
                        product_list: state.codes,
                        filter_lst: StateMapper.buildInStockFilter(state.codes),
                        filters: '[]',
                        property_lst: '[]',
                        pl_edit: 'PL',
                        deactivated_flag: 'no',
                        is_clickable: 'yes',
                    };

                    // Attach sub-category image if present
                    if (sub.image instanceof File || sub.image instanceof Blob) {
                        scPayload.media_en = sub.image;
                    }

                    await callApi(ENDPOINTS.widgetItem, scPayload, { multipart: true });

                    allSubCatMappingRows.push(
                        `${scSlug},${state.def.levelTag},${state.def.levelProperty},${allSubCatMappingRows.length + 1},`
                    );
                    results.push({ step: `item_${n}_subcat_${j + 1}_${state.key}`, slug: scSlug, status: 'ok' });
                }
            }

            // Step 2: PLP Widget (per category)
            this.log(`[CatGrid]   PLP Widget: ${itemSlugs.plp}`);
            await callApi(ENDPOINTS.widget, {
                slug_name: itemSlugs.plp,
                widget_type: 'product_listing',
                heading: '',
                start_time: this.dates.start,
                end_time: this.dates.end,
                app_configurations: JSON.stringify({ show_sub_cat: true }),
                filter_dict: '{}',
                deactivated_flag: 'no',
            }, { multipart: true });
            results.push({ step: `item_${n}_plp`, slug: itemSlugs.plp, status: 'ok' });

            // Step 3: Page Layout
            this.log(`[CatGrid]   Page Layout: ${itemSlugs.page}`);
            await callApi(ENDPOINTS.pageLayout, {
                slug_name: itemSlugs.page,
                page_type: item.pageType || 'category_page',
                page_heading: item.pageHeading || item.text || '',
                page_layout_type: '2',
            });
            results.push({ step: `item_${n}_page`, slug: itemSlugs.page, status: 'ok' });

            // Map: Sub-Cats → PLP
            if (allSubCatMappingRows.length > 0) {
                this.log(`[CatGrid]   Mapping ${allSubCatMappingRows.length} sub-cats → PLP`);
                const scHeader = 'widget_item_slug_name,level_tag,level_property,priority,cohort';
                const scCsv = new Blob([scHeader + '\n' + allSubCatMappingRows.join('\n')], { type: 'text/csv' });
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
            pgMap.append('page_type', item.pageType || 'category_page');
            pgMap.append('mapping_file', pgCsv, 'mapping.csv');
            await fetch(`${API_BASE}${ENDPOINTS.mapPageLayout}`, {
                method: 'POST', body: pgMap, credentials: 'include',
                headers: { 'X-CSRFToken': getCsrfToken() || '' },
            });

            // Step 4: Category Widget Item
            this.log(`[CatGrid]   Category Item: ${itemSlugs.catItem}`);
            const clickParams = JSON.stringify({
                page_type: item.pageType || 'category_page',
                page_layout_slug_name: itemSlugs.page,
            });
            const ciPayload = {
                slug_name: itemSlugs.catItem,
                item_type: 'category',
                text_en: item.text || '',
                text_hi: item.textHi || '',
                item_click_action: 'redirect-to-page',
                click_action_params: clickParams,
                is_clickable: 'yes',
                deactivated_flag: 'no',
            };
            if (item.image instanceof File || item.image instanceof Blob) {
                ciPayload.media_en = item.image;
            }
            await callApi(ENDPOINTS.widgetItem, ciPayload, { multipart: true });
            catItemSlugs.push(itemSlugs.catItem);
            results.push({ step: `item_${n}_cat_wi`, slug: itemSlugs.catItem, status: 'ok' });
        }

        // ═══ Phase 2: Category Grid Widget + Final Mapping ═══

        // Step 5: Category Grid Widget
        this.log(`[CatGrid] Phase 2 — Creating Category Widget: ${slugs.widget}`);
        await callApi(ENDPOINTS.widget, {
            slug_name: slugs.widget,
            widget_type: 'category',
            heading_en: this.widget.title || '',
            heading_hi: this.widget.titleHi || '',
            start_time: this.dates.start,
            end_time: this.dates.end,
            media_aspect_ratio: '1',
            filter_dict: '{}',
        }, { multipart: true });
        results.push({ step: 'category_widget', slug: slugs.widget, status: 'ok' });

        // Map: All Category Items → Category Widget
        if (catItemSlugs.length > 0) {
            this.log(`[CatGrid] Phase 2 — Mapping ${catItemSlugs.length} items → Widget`);
            const ciHeader = 'widget_item_slug_name,level_tag,level_property,priority,cohort';
            const ciRows = catItemSlugs.map((slug, idx) => `${slug},global,global,${idx + 1},`);
            const ciCsv = new Blob([ciHeader + '\n' + ciRows.join('\n')], { type: 'text/csv' });
            const ciMap = new FormData();
            ciMap.append('widget_slug', slugs.widget);
            ciMap.append('mapping_file', ciCsv, 'mapping.csv');
            await fetch(`${API_BASE}${ENDPOINTS.mapWidgetItems}`, {
                method: 'POST', body: ciMap, credentials: 'include',
                headers: { 'X-CSRFToken': getCsrfToken() || '' },
            });
            results.push({ step: 'map_items_to_widget', status: 'ok' });
        }

        this.log('[CatGrid] Deploy complete');
        return { slugs, results };
    }
}
