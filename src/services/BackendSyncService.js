import { API_BASE, ENDPOINTS, ACTIVE_ENV } from '../config/apiConfig';
import { RETRY_CONFIG, FETCHED_WIDGET_UPDATE_STRATEGY } from '../config/BackendFlow';

/**
 * Backend Sync Service — Deploys widgets to Django backend via REST API.
 * Ported from: scripts/SPR_Optimized_Automation.gs & SPR_Widget_Optimized.gs
 *
 * Each widget type follows a specific multi-step flow:
 *   SPR Optimized:  Page Layout → SubCat Item → PLP Widget → Row Item → SPR Widget → Mappings
 *   SPR Standard:   Page Layout → Item → Widget → Mappings
 *   Category Grid:  Items → Widget → Mappings
 *   Primary Masthead: Widget (single call)
 *   Secondary Masthead: Carousel Items → Widget → Mappings
 */

const API = {
    POST_WIDGET_ITEM: `${API_BASE}${ENDPOINTS.widgetItem}`,
    POST_WIDGET: `${API_BASE}${ENDPOINTS.widget}`,
    POST_PAGE_LAYOUT: `${API_BASE}${ENDPOINTS.pageLayout}`,
    POST_MULTIMEDIA: `${API_BASE}${ENDPOINTS.multimedia}`,
    MAP_WIDGET_ITEMS: `${API_BASE}${ENDPOINTS.mapWidgetItems}`,
    MAP_LAYOUT_WIDGET: `${API_BASE}${ENDPOINTS.mapLayoutWidget}`,
    MAP_PAGE_LAYOUT: `${API_BASE}${ENDPOINTS.mapPageLayout}`,
    PATCH_WIDGET: `${API_BASE}${ENDPOINTS.widget}`,
};

console.log(`[BackendSyncService] Active env: ${ACTIVE_ENV}`);

// ── Helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const fetchWithRetry = async (url, options = {}) => {
    const { maxRetries, baseDelayMs, backoffMultiplier, retryOnStatus } = RETRY_CONFIG;
    let lastResponse;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, { credentials: 'include', ...options });
            if (!retryOnStatus.includes(response.status) || attempt === maxRetries) {
                return response;
            }
            lastResponse = response;
            const delay = baseDelayMs * Math.pow(backoffMultiplier, attempt);
            console.warn(`[Sync] HTTP ${response.status} attempt ${attempt + 1}/${maxRetries}. Retry in ${delay}ms...`);
            await sleep(delay);
        } catch (err) {
            if (attempt === maxRetries) throw err;
            const delay = baseDelayMs * Math.pow(backoffMultiplier, attempt);
            console.warn(`[Sync] Network error attempt ${attempt + 1}. Retry in ${delay}ms...`);
            await sleep(delay);
        }
    }
    return lastResponse;
};

/** Format date → Django format: YYYY-MM-DD HH:MM:SS */
const formatDate = (dateInput) => {
    if (!dateInput) return null;
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateInput)) return dateInput;
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return null;
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

const defaultStartDate = () => formatDate(new Date());
const defaultEndDate = () => formatDate(new Date(Date.now() + 86400000 * 365)); // 1 year (matches GS script)

const generateSuffix = () => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${String(d.getFullYear()).slice(-2)}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};

const sanitizeSlug = (str) => (str || '').toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

/** Create a 1x1 transparent PNG blob (matches GS script's getBlankImageBlob) */
const blankImageBlob = () => {
    const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: 'image/png' });
};

/** Resolve background_media to a File object for upload.
 *  - File → use as-is
 *  - URL string (local server /api/local/media/) → fetch and convert to File
 *  - URL string (Google Drive lh3.googleusercontent.com) → fetch and convert to File
 *  - empty → null
 */
const resolveMediaFile = async (media, log) => {
    if (!media) return null;
    if (media instanceof File) return media;
    if (typeof media === 'string') {
        // Local server URL
        if (media.startsWith('/api/local/media/')) {
            try {
                log(`[Media] Fetching from local server: ${media}`);
                const res = await fetch(media);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const blob = await res.blob();
                const ext = media.split('.').pop() || 'jpg';
                return new File([blob], `background.${ext}`, { type: blob.type });
            } catch (err) {
                log(`[Media] Failed to fetch local file: ${err.message}`);
                return null;
            }
        }
        // Google Drive direct URL
        if (media.includes('googleusercontent.com') || media.includes('drive.google.com')) {
            try {
                log(`[Media] Fetching from Google Drive: ${media}`);
                const res = await fetch(media);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const blob = await res.blob();
                const ext = blob.type.split('/')[1] || 'jpg';
                return new File([blob], `background.${ext}`, { type: blob.type });
            } catch (err) {
                log(`[Media] Failed to fetch Drive file: ${err.message}`);
                return null;
            }
        }
    }
    return null;
};

/** Resolve backend widget_type from PNC properties (matches SPRConfig.variantMatrix) */
const VARIANT_MAP = {
    '1_false_false': 'single_product_row',
    '1_true_false':  'single_product_row_v2',
    '1_false_true':  'multimedia_single_product_row',
    '1_true_true':   'multimedia_single_product_row_v2',
    '2_false_false': 'double_product_row',
    '2_true_false':  'double_product_row_v2',
    '2_false_true':  'multimedia_double_product_row',
    '2_true_true':   'multimedia_double_product_row_v2',
};

const UNAVAILABLE_TYPES = new Set(['multimedia_double_product_row']);

const resolveWidgetType = (pnc) => {
    const rows = pnc?.rows || 1;
    const isOpt = !!pnc?.is_optimized;
    const hasMM = !!pnc?.has_multimedia;
    const key = `${rows}_${isOpt}_${hasMM}`;
    const wt = VARIANT_MAP[key];
    if (!wt) throw new Error(`Unknown PNC combo: rows=${rows}, opt=${isOpt}, mm=${hasMM}`);
    if (UNAVAILABLE_TYPES.has(wt)) throw new Error(`Widget type "${wt}" is not available yet.`);
    return wt;
};

/** Debug: log FormData contents */
const logFormData = (label, fd) => {
    const entries = {};
    for (const [k, v] of fd.entries()) entries[k] = v instanceof Blob ? `[Blob ${v.size}B]` : v;
    console.log(`[Sync] ${label} payload:`, entries);
};

/** POST helper — builds FormData, logs, sends, validates */
const postForm = async (url, fields, tokens, log, label) => {
    const fd = new FormData();
    fd.append('csrfmiddlewaretoken', tokens.csrftoken);
    for (const [key, value] of Object.entries(fields)) {
        if (value === undefined || value === null) continue;
        fd.append(key, value);
    }
    logFormData(label, fd);
    const res = await fetchWithRetry(url, {
        method: 'POST',
        body: fd,
        headers: { 'X-CSRFToken': tokens.csrftoken },
    });
    if (!res.ok) {
        const errText = await res.text();
        log(`[${label}] Django error (${res.status}): ${errText}`);
        throw new Error(`${label} failed (${res.status}): ${errText}`);
    }
    log(`[${label}] Success`);
    return res;
};

/** POST JSON helper — for page layout API */
const postJson = async (url, data, tokens, log, label) => {
    log(`[${label}] POST ${url}`);
    const res = await fetchWithRetry(url, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
            'X-CSRFToken': tokens.csrftoken,
            'Content-Type': 'application/json;charset=UTF-8',
        },
    });
    if (!res.ok) {
        const errText = await res.text();
        log(`[${label}] Django error (${res.status}): ${errText}`);
        throw new Error(`${label} failed (${res.status}): ${errText}`);
    }
    log(`[${label}] Success`);
    return res;
};

/** CSV file for mapping APIs — Django requires filename with .csv extension */
const csvBlob = (content) => new File([content], 'mapping.csv', { type: 'text/csv' });

/**
 * POST mapping helper — builds FormData exactly as Django mapping endpoints expect.
 * Matches wiki pattern: wiki/Feature-Mapping-Widget.md § Code Implementation
 *   fd.append(slugField, slugValue)
 *   fd.append('mapping_file', blob, 'mapping.csv')
 */
const postMapping = async (url, slugFields, csvContent, tokens, log, label) => {
    const fd = new FormData();
    for (const [key, value] of Object.entries(slugFields)) {
        fd.append(key, value);
    }
    fd.append('mapping_file', new Blob([csvContent], { type: 'text/csv' }), 'mapping.csv');
    log(`[${label}] POST ${url}`);
    log(`[${label}] CSV: ${csvContent}`);
    logFormData(label, fd);
    const res = await fetchWithRetry(url, {
        method: 'POST',
        body: fd,
        headers: { 'X-CSRFToken': tokens.csrftoken },
    });
    const resText = await res.text();
    if (!res.ok) {
        log(`[${label}] Django error (${res.status}): ${resText}`);
        throw new Error(`${label} failed (${res.status}): ${resText}`);
    }
    log(`[${label}] Success (${res.status}): ${resText.substring(0, 200)}`);
    return res;
};

// ── Main Service ─────────────────────────────────────────────────────────────

export const BackendSyncService = {

    async deployRequest(requestData, tokens) {
        const suffix = generateSuffix();
        const logs = [];
        const log = (msg) => { console.log(`[Sync] ${msg}`); logs.push(msg); };

        log('Starting Deployment...');
        log(`[deployRequest] headerWidgets: ${JSON.stringify(requestData.headerWidgets)}`);
        log(`[deployRequest] widgets count: ${(requestData.widgets || []).length}`);
        log(`[deployRequest] widget types: ${(requestData.widgets || []).map(w => w.type).join(', ')}`);

        try {
            // ── Header Widgets ──
            if (requestData.headerWidgets) {
                const hw = requestData.headerWidgets;
                if (hw.primaryMasthead && hw.primaryMasthead.enabled !== false) {
                    log('Processing Header: Primary Masthead');
                    await this.deployPrimaryMasthead(hw.primaryMasthead, suffix, tokens, log);
                }
                if (hw.secondaryMasthead && hw.secondaryMasthead.enabled !== false) {
                    log('Processing Header: Secondary Masthead');
                    await this.deploySecondaryMasthead(hw.secondaryMasthead, suffix, tokens, log);
                }
            }

            // ── Body Widgets ──
            const widgets = requestData.widgets || [];
            const results = [];

            for (const widget of widgets) {
                log(`Processing Widget: ${widget.type} — "${widget.title}"`);
                try {
                    // Fetched widget → PATCH
                    if (widget[FETCHED_WIDGET_UPDATE_STRATEGY.checkMarker]) {
                        log(`[Re-Deploy] Fetched widget → PATCH: ${widget.slug_name}`);
                        await this.updateWidget(widget, tokens, log);
                        results.push({ widget: widget.title || widget.type, status: 'updated', slug: widget.slug_name });

                    // Config-driven Product Rail (SPR / DPR — all 8 variants)
                    } else if (widget.type === 'product_rail') {
                        const pnc = widget.pnc || {};
                        const widgetType = resolveWidgetType(pnc);
                        log(`[product_rail] PNC → ${widgetType} (rows=${pnc.rows}, opt=${pnc.is_optimized}, mm=${pnc.has_multimedia})`);
                        if (pnc.is_optimized) {
                            await this.deploySPROptimized(widget, suffix, tokens, log, widgetType);
                        } else {
                            await this.deploySPRStandard(widget, suffix, tokens, log, widgetType);
                        }
                        results.push({ widget: widget.title || widget.type, status: 'ok' });

                    // SPR Optimized (legacy)
                    } else if (widget.type === 'Single Product Row Optimize') {
                        await this.deploySPROptimized(widget, suffix, tokens, log, 'single_product_row_v2');
                        results.push({ widget: widget.title || widget.type, status: 'ok' });

                    // SPR Standard (legacy)
                    } else if (widget.type === 'Single Product Row') {
                        await this.deploySPRStandard(widget, suffix, tokens, log, 'single_product_row');
                        results.push({ widget: widget.title || widget.type, status: 'ok' });

                    // Category Grid
                    } else if (widget.type === 'Category Grid') {
                        await this.deployCategoryGrid(widget, suffix, tokens, log);
                        results.push({ widget: widget.title || widget.type, status: 'ok' });

                    // Banner With Product Listing / CLP
                    } else if (widget.type === 'Product Listing Page (CLP)' || widget.type === 'Banner With Product Listing') {
                        await this.deployCLP(widget, suffix, tokens, log);
                        results.push({ widget: widget.title || widget.type, status: 'ok' });

                    } else {
                        log(`⚠ Skipping unsupported widget type: ${widget.type}`);
                        results.push({ widget: widget.title || widget.type, status: 'skipped' });
                    }
                } catch (widgetErr) {
                    log(`ERROR on "${widget.title}": ${widgetErr.message}`);
                    results.push({ widget: widget.title || widget.type, status: 'failed', error: widgetErr.message });
                }
            }

            const failedCount = results.filter(r => r.status === 'failed').length;
            return {
                success: failedCount === 0,
                results,
                logs,
                summary: `${results.length - failedCount}/${results.length} widget(s) deployed successfully.`,
            };
        } catch (error) {
            log(`Fatal Error: ${error.message}`);
            return { success: false, error: error.message, results: [], logs };
        }
    },

    // ── SPR Optimized (ported from SPR_Widget_Optimized.gs → createSPROptimizedWidget) ──
    async deploySPROptimized(widget, suffix, tokens, log, widgetType = 'single_product_row_v2') {
        const slugBase = sanitizeSlug(widget.slug_name || widget.slug || widget.title || 'spr_widget');
        const pnc = widget.pnc || {};

        // Resolve products — state-wise or flat
        const stateProducts = widget.stateProducts || {};
        const globalCodes = stateProducts.global
            ? stateProducts.global.split(/[,\s]+/).filter(Boolean).join(',')
            : (widget.products || []).map(p => p.itemCode || p).join(',');
        if (!globalCodes) throw new Error('No products — cannot deploy empty SPR widget.');

        const headingEn = widget.title || '';
        const headingHi = widget.titleHi || '';
        const startDate = formatDate(widget.startTime || widget.start_time) || defaultStartDate();
        const endDate = formatDate(widget.endTime || widget.end_time) || defaultEndDate();
        const blankImg = blankImageBlob();

        const slugs = {
            scItem: `${slugBase}_sc_wi_${suffix}`,
            plpWidget: `${slugBase}_plp_w_${suffix}`,
            page: `${slugBase}_page_p_${suffix}`,
            rowItem: `${slugBase}_pr_wi_${suffix}`,
            rowWidget: `${slugBase}_spr_opt_${suffix}`,
        };

        log(`[SPR Optimized] slugBase=${slugBase}, products=${globalCodes.substring(0, 50)}...`);

        // ── Step 0: Upload Multimedia (if has_multimedia + background_media exists) ──
        let multimediaSlug = widget.multimediaSlug || '';
        if (pnc.has_multimedia && widget.background_media) {
            const mediaFile = await resolveMediaFile(widget.background_media, log);
            if (mediaFile) {
                multimediaSlug = await this.uploadMultimedia(mediaFile, slugBase, suffix, tokens, log);
            }
        }

        // ── FLOW 1: PLP Listing Ecosystem ──

        // 1.1 Sub-Category Widget Item(s) — per state if stateProducts available
        const stateKeys = Object.keys(stateProducts).filter(k => stateProducts[k]?.trim());
        const hasStateProducts = stateKeys.length > 1; // more than just global

        if (hasStateProducts) {
            // Create one sub-category widget item per state
            const { STATE_DEFINITIONS } = await import('../config/widgets/MastheadConfig');
            const scMappingRows = ['widget_item_slug_name,level_tag,level_property,priority,cohort'];
            let priority = 1;

            for (const stateKey of stateKeys) {
                const stateDef = STATE_DEFINITIONS[stateKey] || { levelTag: 'global', levelProperty: 'global', slugSuffix: `_${stateKey}` };
                const stCodes = stateProducts[stateKey].split(/[,\s]+/).filter(Boolean).join(',');
                const scSlug = `${slugBase}_sc_wi${stateDef.slugSuffix}_${suffix}`;

                await postForm(API.POST_WIDGET_ITEM, {
                    widget_item_id: 'undefined', deactivated_flag: 'no', item_click_action: 'deal-detail-redirect',
                    slug_name: scSlug, item_type: 'sub_category',
                    text_en: headingEn, text_hi: headingHi, media_en: blankImg,
                    product_list: stCodes, filters: '[]',
                    filter_lst: JSON.stringify([{ condition: 'in_stk_item_codes', value: stCodes }]),
                    property_lst: '[]', pl_edit: 'PL', is_clickable: 'yes', update_product_list: 'no',
                    start_time: startDate, end_time: endDate,
                }, tokens, log, `SPR-Opt 1.1 SubCat (${stateDef.levelProperty})`);

                scMappingRows.push(`${scSlug},${stateDef.levelTag},${stateDef.levelProperty},${priority},`);
                priority++;
            }
            // Store for mapping step 1.4
            slugs._scMappingCsv = scMappingRows.join('\n');
        } else {
            // Single global sub-category (original behavior)
            await postForm(API.POST_WIDGET_ITEM, {
                widget_item_id: 'undefined', deactivated_flag: 'no', item_click_action: 'deal-detail-redirect',
                slug_name: slugs.scItem, item_type: 'sub_category',
                text_en: headingEn, text_hi: headingHi, media_en: blankImg,
                product_list: globalCodes, filters: '[]',
                filter_lst: JSON.stringify([{ condition: 'in_stk_item_codes', value: globalCodes }]),
                property_lst: '[]', pl_edit: 'PL', is_clickable: 'yes', update_product_list: 'no',
                start_time: startDate, end_time: endDate,
            }, tokens, log, 'SPR-Opt 1.1 SubCat Item');
        }

        // 1.2 PLP Widget
        await postForm(API.POST_WIDGET, {
            slug_name: slugs.plpWidget, widget_type: 'product_listing',
            start_time: startDate, end_time: endDate,
            heading: headingEn, heading_en: headingEn, heading_hi: headingHi,
            media_aspect_ratio: '1', filter_dict: '{}', app_configurations: '{}',
            description: '', master_key: '', heading_bg: '', clear_bg_media: '',
            view_all_action_name: '', background_multimedia: '',
        }, tokens, log, 'SPR-Opt 1.2 PLP Widget');

        // 1.3 Page Layout
        await postJson(API.POST_PAGE_LAYOUT, {
            slug_name: slugs.page, page_heading: headingEn,
            page_layout_type: '2', page_type: 'product_listing_page',
        }, tokens, log, 'SPR-Opt 1.3 Page Layout');

        // 1.4 Map PLP Widget → SubCat Item(s) (Layer 1)
        const scCsv = slugs._scMappingCsv
            || `widget_item_slug_name,level_tag,level_property,priority,cohort\n${slugs.scItem},global,global,1,`;
        await postMapping(API.MAP_WIDGET_ITEMS,
            { widget_slug: slugs.plpWidget },
            scCsv,
            tokens, log, 'SPR-Opt 1.4 Map Widget→Item');

        // 1.5 Map Page → PLP Widget (Layer 2)
        await postMapping(API.MAP_LAYOUT_WIDGET,
            { page_layout_slug: slugs.page },
            `widget_slug_name,level_tag,level_property,priority,cohort\n${slugs.plpWidget},global,global,1,`,
            tokens, log, 'SPR-Opt 1.5 Map Page→Widget');

        // 1.6 Map Global → Page (Layer 3)
        await postMapping(API.MAP_PAGE_LAYOUT,
            { page_type: 'product_listing_page', page_layout_slug: slugs.page },
            'level_tag,level_property\nglobal,global',
            tokens, log, 'SPR-Opt 1.6 Map Global→Page');

        // ── FLOW 2: Row Widget ──

        // 2.1 Row Widget Item(s) — per state if stateProducts available
        const rowMappingRows = ['widget_item_slug_name,level_tag,level_property,priority,cohort'];
        if (hasStateProducts) {
            const { STATE_DEFINITIONS: STATE_DEFS } = await import('../config/widgets/MastheadConfig');
            let riPriority = 1;
            for (const stateKey of stateKeys) {
                const stateDef = STATE_DEFS[stateKey] || { levelTag: 'global', levelProperty: 'global', slugSuffix: `_${stateKey}` };
                const stCodes = stateProducts[stateKey].split(/[,\s]+/).filter(Boolean).join(',');
                const riSlug = `${slugBase}_pr_wi${stateDef.slugSuffix}_${suffix}`;

                await postForm(API.POST_WIDGET_ITEM, {
                    widget_item_id: 'undefined', deactivated_flag: 'no', item_click_action: '',
                    slug_name: riSlug, slave_key: '',
                    item_type: 'item_rows', media: '', text_en: '', media_en: '', text_hi: '', media_hi: '', text_bg: '', media_bg: '',
                    product_list: stCodes, filters: '[]',
                    filter_lst: JSON.stringify([{ condition: 'in_stk_item_codes', value: stCodes }]),
                    property_lst: '[]', pl_edit: 'PL', is_clickable: 'no', update_product_list: 'no',
                    start_time: startDate, end_time: endDate, click_action_params: '{}',
                }, tokens, log, `SPR-Opt 2.1 Row Item (${stateDef.levelProperty})`);

                rowMappingRows.push(`${riSlug},${stateDef.levelTag},${stateDef.levelProperty},${riPriority},`);
                riPriority++;
            }
        } else {
            await postForm(API.POST_WIDGET_ITEM, {
                widget_item_id: 'undefined', deactivated_flag: 'no', item_click_action: '',
                slug_name: slugs.rowItem, slave_key: '',
                item_type: 'item_rows', media: '', text_en: '', media_en: '', text_hi: '', media_hi: '', text_bg: '', media_bg: '',
                product_list: globalCodes, filters: '[]',
                filter_lst: JSON.stringify([{ condition: 'in_stk_item_codes', value: globalCodes }]),
                property_lst: '[]', pl_edit: 'PL', is_clickable: 'no', update_product_list: 'no',
                start_time: startDate, end_time: endDate, click_action_params: '{}',
            }, tokens, log, 'SPR-Opt 2.1 Row Item');
            rowMappingRows.push(`${slugs.rowItem},global,global,1,`);
        }

        // 2.2 SPR/DPR Widget (widget_type from PNC resolution)
        const widgetFields = {
            slug_name: slugs.rowWidget, widget_type: widgetType,
            description: '', heading: '', master_key: '',
            heading_en: headingEn, heading_hi: headingHi, heading_bg: '',
            start_time: startDate, end_time: endDate, clear_bg_media: '',
            media_aspect_ratio: '1', view_all_action_name: 'redirect-to-page',
            view_all_action_params: JSON.stringify({ page_type: widget.pageType || 'product_listing_page', page_layout_slug_name: slugs.page }),
            filter_dict: '{}', app_configurations: '{}',
        };
        // Only include background_multimedia if we have a slug — empty causes Django error
        if (multimediaSlug) widgetFields.background_multimedia = multimediaSlug;
        await postForm(API.POST_WIDGET, widgetFields, tokens, log, `SPR-Opt 2.2 Widget (${widgetType})`);

        // 2.3 Map SPR Widget → Row Item(s) (Layer 1 — state-wise)
        await postMapping(API.MAP_WIDGET_ITEMS,
            { widget_slug: slugs.rowWidget },
            rowMappingRows.join('\n'),
            tokens, log, 'SPR-Opt 2.3 Map SPR→Row');

        log(`SPR Optimized Deployed! Final slug: ${slugs.rowWidget}`);
    },

    // ── SPR Standard (ported from SPR_Widget_Optimized.gs → createSPRStandardWidget) ──
    async deploySPRStandard(widget, suffix, tokens, log, widgetType = 'single_product_row') {
        const slugBase = sanitizeSlug(widget.slug_name || widget.slug || widget.title || 'spr_widget');
        const pnc = widget.pnc || {};

        // Resolve products — state-wise or flat
        const stateProducts = widget.stateProducts || {};
        const globalCodes = stateProducts.global
            ? stateProducts.global.split(/[,\s]+/).filter(Boolean).join(',')
            : (widget.products || []).map(p => p.itemCode || p).join(',');
        if (!globalCodes) throw new Error('No products — cannot deploy empty SPR widget.');

        const headingEn = widget.title || '';
        const headingHi = widget.titleHi || '';
        const startDate = formatDate(widget.startTime || widget.start_time) || defaultStartDate();
        const endDate = formatDate(widget.endTime || widget.end_time) || defaultEndDate();
        const blankImg = blankImageBlob();

        const slugs = {
            wi: `${slugBase}_wi_${suffix}`,
            w_spr: `${slugBase}_spr_${suffix}`,
            page: `${slugBase}_page_${suffix}`,
        };

        log(`[SPR Standard] slugBase=${slugBase}, products=${globalCodes.substring(0, 50)}...`);

        // ── Step 0: Upload Multimedia (if has_multimedia + background_media exists) ──
        let multimediaSlug = widget.multimediaSlug || '';
        if (pnc.has_multimedia && widget.background_media) {
            const mediaFile = await resolveMediaFile(widget.background_media, log);
            if (mediaFile) {
                multimediaSlug = await this.uploadMultimedia(mediaFile, slugBase, suffix, tokens, log);
            }
        }

        // 1. Page Layout
        await postJson(API.POST_PAGE_LAYOUT, {
            slug_name: slugs.page, page_heading: headingEn,
            page_layout_type: '2', page_type: 'product_listing_page',
        }, tokens, log, 'SPR-Std 1. Page Layout');

        // 2. Widget Item
        await postForm(API.POST_WIDGET_ITEM, {
            slug_name: slugs.wi, text_en: headingEn, text_hi: headingHi,
            product_list: globalCodes, item_type: 'item_rows', media_en: blankImg,
            widget_item_id: 'undefined', deactivated_flag: 'no', item_click_action: 'deal-detail-redirect',
            slave_key: '', media: '', text_bg: '', media_bg: '', filters: '[]',
            filter_lst: JSON.stringify([{ condition: 'in_stk_item_codes', value: globalCodes }]),
            property_lst: '[]', pl_edit: 'PL', is_clickable: 'no', update_product_list: 'no',
            start_time: startDate, end_time: endDate,
            image_multimedia: '', secondary_image_multimedia: '',
            progress_bar: '', offer_id: '', click_action_params: '{}',
        }, tokens, log, 'SPR-Std 2. Widget Item');

        // 3. Widget (widget_type from PNC resolution)
        const widgetFields = {
            slug_name: slugs.w_spr, widget_type: widgetType,
            heading_en: headingEn, heading_hi: headingHi,
            description: '', heading: '', master_key: '', heading_bg: '',
            start_time: startDate, end_time: endDate, clear_bg_media: '',
            media_aspect_ratio: '1', view_all_action_name: 'redirect-to-page',
            view_all_action_params: JSON.stringify({ page_type: widget.pageType || 'product_listing_page', page_layout_slug_name: slugs.page }),
            filter_dict: '{}', app_configurations: '{}',
        };
        if (multimediaSlug) widgetFields.background_multimedia = multimediaSlug;
        await postForm(API.POST_WIDGET, widgetFields, tokens, log, `SPR-Std 3. Widget (${widgetType})`);

        // 4. Map Widget → Item (Layer 1)
        await postMapping(API.MAP_WIDGET_ITEMS,
            { widget_slug: slugs.w_spr },
            `widget_item_slug_name,level_tag,level_property,priority,cohort\n${slugs.wi},global,global,1,`,
            tokens, log, 'SPR-Std 4. Map Widget→Item');

        // 5. Map Page → Widget (Layer 2)
        await postMapping(API.MAP_LAYOUT_WIDGET,
            { page_layout_slug: slugs.page },
            `widget_slug_name,level_tag,level_property,priority,cohort\n${slugs.w_spr},global,global,1,`,
            tokens, log, 'SPR-Std 5. Map Page→Widget');

        // 6. Map Global → Page (Layer 3)
        await postMapping(API.MAP_PAGE_LAYOUT,
            { page_type: 'product_listing_page', page_layout_slug: slugs.page },
            'level_tag,level_property\nglobal,global',
            tokens, log, 'SPR-Std 6. Map Global→Page');

        log(`SPR Standard Deployed! Final slug: ${slugs.w_spr}`);
    },

    // ── Upload Multimedia Background ──
    // POST /api/app/multimedia/ — creates multimedia record, returns slug for background_multimedia
    async uploadMultimedia(imageFile, slugBase, suffix, tokens, log) {
        const mmName = `${slugBase}_bg_${suffix}`;
        log(`[Multimedia] Uploading background: ${mmName}`);

        await postForm(API.POST_MULTIMEDIA, {
            name: mmName,
            multimedia_type: '3',          // 3 = image
            aspect_ratio: '1',
            file_en: imageFile,
            transition_color: '#FFFFFF',
            accent_color: '#0000FF',
            text_color: '#FFFFFF',
            icon_bg_color: '#F0F0F0',
            is_multimedia_dark: 'false',
        }, tokens, log, `Multimedia Upload (${mmName})`);

        return mmName;
    },

    // ── Primary Masthead ──
    async deployPrimaryMasthead(widget, suffix, tokens, log) {
        log(`[deployPrimaryMasthead] Input: ${JSON.stringify(widget)}`);

        const widgetSlug = widget.slug_name
            ? `${sanitizeSlug(widget.slug_name)}_pm_w_${suffix}`
            : `primary_masthead_${suffix}`;

        const startDate = formatDate(widget.start_time) || defaultStartDate();
        const endDate = formatDate(widget.end_time) || defaultEndDate();

        await postForm(API.POST_WIDGET, {
            slug_name: widgetSlug,
            widget_type: 'masthead_primary',
            heading: widget.title || widget.type || 'Primary Masthead',
            heading_en: widget.title || widget.type || 'Primary Masthead',
            heading_hi: widget.titleHi || '',
            description: '',
            master_key: widget.master_key || '',
            heading_bg: '',
            start_time: startDate,
            end_time: endDate,
            clear_bg_media: '',
            media_aspect_ratio: '1',
            background_multimedia: widget.background_multimedia_slug || '',
            filter_dict: '{}',
            app_configurations: '{}',
        }, tokens, log, 'Primary Masthead');
    },

    // ── Secondary Masthead ──
    async deploySecondaryMasthead(widget, suffix, tokens, log) {
        log(`[deploySecondaryMasthead] Input: ${JSON.stringify(widget)}`);
        const itemSlugs = [];
        const startDate = formatDate(widget.start_time) || defaultStartDate();
        const endDate = formatDate(widget.end_time) || defaultEndDate();

        // 1. Carousel Items
        for (const item of widget.items || []) {
            const itemSlug = `${sanitizeSlug(item.text || 'item')}_carousel_wi_${suffix}`;
            itemSlugs.push(itemSlug);

            const fields = {
                slug_name: itemSlug, item_type: 'carousel',
                text_en: item.text || '', text_hi: item.textHi || '',
                item_click_action: 'redirect-to-page',
                is_clickable: 'yes', start_time: startDate, end_time: endDate,
            };
            if (item.redirectLink) {
                fields.click_action_params = JSON.stringify({ page_type: 'category_page', page_layout_slug_name: item.redirectLink });
            }
            await postForm(API.POST_WIDGET_ITEM, fields, tokens, log, `SecMasthead Item: ${item.text}`);
        }

        // 2. Widget
        const widgetSlug = widget.slug_name
            ? `${sanitizeSlug(widget.slug_name)}_sm_w_${suffix}`
            : `secondary_masthead_${suffix}`;

        await postForm(API.POST_WIDGET, {
            slug_name: widgetSlug,
            widget_type: 'masthead_secondary_category_hp',
            heading: widget.title || '', heading_en: widget.title || '',
            heading_hi: widget.titleHi || '',
            media_aspect_ratio: widget.aspectRatio || '4',
            background_multimedia: (widget.background && !widget.background.startsWith('#')) ? widget.background : '',
            start_time: startDate, end_time: endDate,
            description: '', master_key: '', heading_bg: '', clear_bg_media: '',
            filter_dict: '{}', app_configurations: '{}',
        }, tokens, log, 'SecMasthead Widget');

        // 3. Map Items
        if (itemSlugs.length) {
            await this.mapItems(widgetSlug, itemSlugs, tokens, log);
        }
    },

    // ── Category Grid ──
    async deployCategoryGrid(widget, suffix, tokens, log) {
        log(`[deployCategoryGrid] Input: ${JSON.stringify(widget)}`);
        const itemSlugs = [];
        const startDate = formatDate(widget.startTime || widget.start_time) || defaultStartDate();
        const endDate = formatDate(widget.endTime || widget.end_time) || defaultEndDate();

        // 1. Items
        for (const item of widget.items || []) {
            const itemSlug = `${sanitizeSlug(item.text)}_sub_cat_wi_${suffix}`;
            itemSlugs.push(itemSlug);

            const fields = {
                widget_item_id: 'undefined', slug_name: itemSlug, item_type: 'sub_category',
                text_en: item.text, text_hi: item.textHi || '',
                product_list: item.leafIds || item.id || '',
                is_clickable: 'yes', start_time: startDate, end_time: endDate,
            };
            if (item.image instanceof File || item.image instanceof Blob) {
                fields.media_en = item.image;
            }
            await postForm(API.POST_WIDGET_ITEM, fields, tokens, log, `CatGrid Item: ${item.text}`);
        }

        // 2. Widget
        const widgetSlug = sanitizeSlug(widget.slug || widget.title) + `_plp_w_${suffix}`;
        await postForm(API.POST_WIDGET, {
            slug_name: widgetSlug, widget_type: 'product_listing',
            heading: widget.title, heading_en: widget.title, heading_hi: widget.titleHi || '',
            display_vertical: 'no', start_time: startDate, end_time: endDate,
            media_aspect_ratio: '1', description: '', master_key: '', heading_bg: '',
            clear_bg_media: '', background_multimedia: '', filter_dict: '{}', app_configurations: '{}',
        }, tokens, log, 'CatGrid Widget');

        // 3. Map
        await this.mapItems(widgetSlug, itemSlugs, tokens, log);
    },

    // ── CLP / Banner With Product Listing ──
    async deployCLP(widget, suffix, tokens, log) {
        log(`[deployCLP] Input: ${JSON.stringify(widget)}`);
        const baseSlug = sanitizeSlug(widget.slug || widget.title);
        const startDate = formatDate(widget.startTime || widget.start_time) || defaultStartDate();
        const endDate = formatDate(widget.endTime || widget.end_time) || defaultEndDate();

        const slugs = {
            wi_plp: `${baseSlug}_wi_plp_${suffix}`,
            w_plp: `${baseSlug}_w_plp_${suffix}`,
            page: `${baseSlug}_plp_${suffix}`,
        };

        // 1. Widget Item
        await postForm(API.POST_WIDGET_ITEM, {
            slug_name: slugs.wi_plp, item_type: 'sub_category',
            text_en: widget.title, product_list: widget.productIds || '',
            is_clickable: 'yes', start_time: startDate, end_time: endDate,
        }, tokens, log, 'CLP Widget Item');

        // 2. Widget
        await postForm(API.POST_WIDGET, {
            slug_name: slugs.w_plp, widget_type: 'product_listing',
            heading: widget.title, heading_en: widget.title,
            start_time: startDate, end_time: endDate,
            media_aspect_ratio: '1', description: '', master_key: '', heading_bg: '',
            clear_bg_media: '', background_multimedia: '', filter_dict: '{}', app_configurations: '{}',
        }, tokens, log, 'CLP Widget');

        // 3. Page Layout
        await postJson(API.POST_PAGE_LAYOUT, {
            slug_name: slugs.page, page_heading: widget.title,
            page_layout_type: '2', page_type: 'product_listing_page',
        }, tokens, log, 'CLP Page Layout');

        // 4. Mappings
        await this.mapItems(slugs.w_plp, [slugs.wi_plp], tokens, log);

        await postMapping(API.MAP_LAYOUT_WIDGET,
            { page_layout_slug: slugs.page },
            `widget_slug_name,level_tag,level_property,priority,cohort\n${slugs.w_plp},global,global,1,`,
            tokens, log, 'CLP Map Page→Widget');

        await postMapping(API.MAP_PAGE_LAYOUT,
            { page_type: 'product_listing_page', page_layout_slug: slugs.page },
            'level_tag,level_property\nglobal,global',
            tokens, log, 'CLP Map Global→Page');

        log('CLP Deployed!');
    },

    // ── Update existing (fetched) widget via PATCH ──
    async updateWidget(widget, tokens, log) {
        const slug = widget[FETCHED_WIDGET_UPDATE_STRATEGY.slugField] || widget.slug_name;
        if (!slug) throw new Error('Cannot update widget: slug_name is missing.');

        const widgetUrl = `${API.PATCH_WIDGET}${slug}/`;
        log(`[updateWidget] PATCH ${widgetUrl}`);

        const fd = new FormData();
        fd.append('csrfmiddlewaretoken', tokens.csrftoken);
        if (widget.title) fd.append('heading', widget.title);
        if (widget.start_time) fd.append('start_time', formatDate(widget.start_time) || widget.start_time);
        if (widget.end_time) fd.append('end_time', formatDate(widget.end_time) || widget.end_time);

        const res = await fetchWithRetry(widgetUrl, {
            method: 'PATCH',
            headers: { 'X-CSRFToken': tokens.csrftoken },
            body: fd,
        });

        if (!res.ok) {
            if (res.status === 405) {
                log(`[updateWidget] PATCH not supported for ${slug}, skipping.`);
                return;
            }
            const errText = await res.text();
            throw new Error(`PATCH failed for ${slug} (${res.status}): ${errText}`);
        }
        log(`[updateWidget] Updated ${slug}`);
    },

    // ── Map Items helper ──
    async mapItems(widgetSlug, itemSlugs, tokens, log) {
        log(`Mapping ${itemSlugs.length} items → ${widgetSlug}...`);
        const rows = ['widget_item_slug_name,level_tag,level_property,priority,cohort'];
        itemSlugs.forEach((slug, i) => rows.push(`${slug},global,global,${i + 1},`));

        await postMapping(API.MAP_WIDGET_ITEMS,
            { widget_slug: widgetSlug },
            rows.join('\n'),
            tokens, log, `Map Items → ${widgetSlug}`);
    },
};
