/**
 * SecondaryMastheadBuilder — Secondary Masthead (3-phase complex ecosystem).
 *
 * Ported from:
 *   scripts/Secondary_Masthead_Automation.gs → createSecondaryMastheadFromApproval()
 *   scripts/Secondary_Masthead_Backend.gs (same logic)
 *   config/widgets/MastheadConfig.js → deployStrategies.SECONDARY
 *
 * 3-Phase deploy:
 *   Phase 1: Multimedia (optional) + SM Widget
 *   Phase 2: Per carousel item → Page Layout → PLP Widget → Sub-Cats (per state) → Carousel Item + Mappings
 *   Phase 3: Map all carousel items → SM Widget
 */

import { callApi, createMappingCsv, getNowStr, getFutureStr } from '../ApiClient';
import { SlugGenerator } from '../utils/SlugGenerator';
import { StateMapper } from '../utils/StateMapper';
import { API_BASE, ENDPOINTS } from '../../config/apiConfig';

export class SecondaryMastheadBuilder {
    /**
     * @param {Object} widget - Canvas widget / header config
     * @param {string} widget.slug - Base slug
     * @param {*}      widget.background_media
     * @param {string} widget.background_video
     * @param {string} widget.media_aspect_ratio
     * @param {Array}  widget.carouselItems - Carousel items
     * @param {Object} opts
     * @param {Function} opts.log
     */
    constructor(widget, { log = console.log } = {}) {
        this.widget = widget;
        this.log = log;
        this.slugGen = new SlugGenerator(widget.slug || 'secondary_masthead');
        this.dates = {
            start: widget.start_time || getNowStr(),
            end: widget.end_time || getFutureStr(365),
        };
    }

    hasMultimedia() {
        return !!(this.widget.background_media || this.widget.background_video);
    }

    getMultimediaType() {
        if (this.widget.background_video) return '4';
        return '3';
    }

    /**
     * Execute the full 3-phase deploy.
     * @returns {Promise<{ slugs: Object, results: Object[] }>}
     */
    async deploy() {
        const results = [];
        const carouselItems = this.widget.carouselItems || [];

        const slugs = {
            multimedia: this.slugGen.get('_bg'),
            widget: this.slugGen.get('_sm_hp'),
            carouselItemSlugs: [],
        };

        // ═══ Phase 1: Parent Containers ═══

        // Step 1: Multimedia (optional)
        if (this.hasMultimedia()) {
            this.log(`[SM] Phase 1 — Creating Multimedia: ${slugs.multimedia}`);
            const mmPayload = {
                name: slugs.multimedia,
                multimedia_type: this.getMultimediaType(),
                aspect_ratio: this.widget.media_aspect_ratio || '4',
                transition_color: this.widget.transition_color || '#FFFFFF',
                accent_color: this.widget.accent_color || '#0000FF',
                text_color: this.widget.text_color || '#FFFFFF',
                icon_bg_color: this.widget.icon_bg_color || '#F0F0F0',
                is_multimedia_dark: this.widget.is_multimedia_dark ? 'True' : 'False',
            };
            if (this.widget.background_media instanceof File || this.widget.background_media instanceof Blob) {
                mmPayload.file_en = this.widget.background_media;
            }
            await callApi(ENDPOINTS.multimedia, mmPayload, { multipart: true });
            results.push({ step: 'multimedia', slug: slugs.multimedia, status: 'ok' });
        }

        // Step 2: SM Widget
        this.log(`[SM] Phase 1 — Creating SM Widget: ${slugs.widget}`);
        const smPayload = {
            slug_name: slugs.widget,
            widget_type: 'masthead_secondary_category_hp',
            heading: '',
            media_aspect_ratio: this.widget.media_aspect_ratio || '4',
            start_time: this.dates.start,
            end_time: this.dates.end,
            filter_dict: '{}',
        };
        if (this.hasMultimedia()) {
            smPayload.background_multimedia = slugs.multimedia;
        }
        await callApi(ENDPOINTS.widget, smPayload, { multipart: true });
        results.push({ step: 'sm_widget', slug: slugs.widget, status: 'ok' });

        // ═══ Phase 2: Per Carousel Item Ecosystem ═══

        for (let i = 0; i < carouselItems.length; i++) {
            const item = carouselItems[i];
            const n = i + 1;
            this.log(`[SM] Phase 2 — Processing Carousel Item ${n}: ${item.text || 'untitled'}`);

            const itemSlugs = {
                page: this.slugGen.getIndexed(i, '_page'),
                plp: this.slugGen.getIndexed(i, '_plp'),
                carousel: this.slugGen.getIndexed(i, '_carousel'),
            };

            // Step 3: Page Layout (per item)
            this.log(`[SM]   Creating Page: ${itemSlugs.page}`);
            await callApi(ENDPOINTS.pageLayout, {
                slug_name: itemSlugs.page,
                page_type: item.pageType || 'category_page',
                page_heading: item.pageHeading || item.text || '',
                page_layout_type: '2',
            });
            results.push({ step: `item_${n}_page`, slug: itemSlugs.page, status: 'ok' });

            // Step 4: PLP Widget (per item)
            this.log(`[SM]   Creating PLP Widget: ${itemSlugs.plp}`);
            await callApi(ENDPOINTS.widget, {
                slug_name: itemSlugs.plp,
                widget_type: 'product_listing',
                start_time: this.dates.start,
                end_time: this.dates.end,
                app_configurations: JSON.stringify({ show_sub_cat: true }),
            }, { multipart: true });
            results.push({ step: `item_${n}_plp`, slug: itemSlugs.plp, status: 'ok' });

            // Step 5: Sub-Category Widget Items (per sub-cat × per state)
            const subCategories = item.subCategories || [];
            const allSubCatMappingRows = [];

            for (let j = 0; j < subCategories.length; j++) {
                const sub = subCategories[j];
                const products = sub.products || { global: '' };
                const activeStates = StateMapper.getActiveStates(products);

                for (const state of activeStates) {
                    const scSlug = this.slugGen.getNestedStateful(i, j, state.key);
                    this.log(`[SM]   Creating Sub-Cat: ${scSlug}`);

                    await callApi(ENDPOINTS.widgetItem, {
                        slug_name: scSlug,
                        item_type: 'sub_category',
                        text_en: sub.name || sub.text || '',
                        product_list: state.codes,
                        filter_lst: StateMapper.buildInStockFilter(state.codes),
                        deactivated_flag: 'no',
                        is_clickable: 'yes',
                        pl_edit: 'PL',
                    }, { multipart: true });

                    allSubCatMappingRows.push(
                        `${scSlug},${state.def.levelTag},${state.def.levelProperty},${allSubCatMappingRows.length + 1},`
                    );
                    results.push({ step: `item_${n}_subcat_${j + 1}_${state.key}`, slug: scSlug, status: 'ok' });
                }
            }

            // Map: Sub-Cats → PLP Widget
            if (allSubCatMappingRows.length > 0) {
                this.log(`[SM]   Mapping ${allSubCatMappingRows.length} sub-cats → ${itemSlugs.plp}`);
                const scHeader = 'widget_item_slug_name,level_tag,level_property,priority,cohort';
                const scCsv = new Blob([scHeader + '\n' + allSubCatMappingRows.join('\n')], { type: 'text/csv' });
                const scMap = new FormData();
                scMap.append('widget_slug', itemSlugs.plp);
                scMap.append('mapping_file', scCsv, 'mapping.csv');
                await fetch(`${API_BASE}${ENDPOINTS.mapWidgetItems}`, {
                    method: 'POST', body: scMap, credentials: 'include',
                });
            }

            // Map: PLP Widget → Page Layout
            this.log(`[SM]   Mapping PLP → Page`);
            const plpCsv = createMappingCsv('layout_widget', itemSlugs.plp);
            const plpMap = new FormData();
            plpMap.append('page_layout_slug', itemSlugs.page);
            plpMap.append('mapping_file', plpCsv, 'mapping.csv');
            await fetch(`${API_BASE}${ENDPOINTS.mapLayoutWidget}`, {
                method: 'POST', body: plpMap, credentials: 'include',
            });

            // Map: Page → Global Registry
            this.log(`[SM]   Mapping Page → Global`);
            const pgCsv = createMappingCsv('global_page');
            const pgMap = new FormData();
            pgMap.append('page_layout_slug', itemSlugs.page);
            pgMap.append('page_type', item.pageType || 'category_page');
            pgMap.append('mapping_file', pgCsv, 'mapping.csv');
            await fetch(`${API_BASE}${ENDPOINTS.mapPageLayout}`, {
                method: 'POST', body: pgMap, credentials: 'include',
            });

            // Step 6: Carousel Widget Item
            this.log(`[SM]   Creating Carousel Item: ${itemSlugs.carousel}`);
            const clickParams = JSON.stringify({
                page_type: item.pageType || 'category_page',
                page_layout_slug_name: itemSlugs.page,
            });
            const ciPayload = {
                slug_name: itemSlugs.carousel,
                item_type: 'carousel',
                text_en: item.text || '',
                text_hi: item.textHi || '',
                item_click_action: 'redirect-to-page',
                click_action_params: clickParams,
                is_clickable: 'yes',
                deactivated_flag: 'no',
                start_time: this.dates.start,
                end_time: this.dates.end,
            };
            if (item.image instanceof File || item.image instanceof Blob) {
                ciPayload.media_en = item.image;
            }
            await callApi(ENDPOINTS.widgetItem, ciPayload, { multipart: true });
            slugs.carouselItemSlugs.push(itemSlugs.carousel);
            results.push({ step: `item_${n}_carousel`, slug: itemSlugs.carousel, status: 'ok' });
        }

        // ═══ Phase 3: Map Carousel Items → SM Widget ═══

        if (slugs.carouselItemSlugs.length > 0) {
            this.log(`[SM] Phase 3 — Mapping ${slugs.carouselItemSlugs.length} carousel items → SM Widget`);
            const ciHeader = 'widget_item_slug_name,level_tag,level_property,priority,cohort';
            const ciRows = slugs.carouselItemSlugs.map((slug, idx) =>
                `${slug},global,global,${idx + 1},`
            );
            const ciCsv = new Blob([ciHeader + '\n' + ciRows.join('\n')], { type: 'text/csv' });
            const ciMap = new FormData();
            ciMap.append('widget_slug', slugs.widget);
            ciMap.append('mapping_file', ciCsv, 'mapping.csv');
            await fetch(`${API_BASE}${ENDPOINTS.mapWidgetItems}`, {
                method: 'POST', body: ciMap, credentials: 'include',
            });
            results.push({ step: 'map_carousel_to_sm', status: 'ok' });
        }

        this.log('[SM] Deploy complete');
        return { slugs, results };
    }
}
