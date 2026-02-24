/**
 * PrimaryMastheadBuilder — Primary Masthead widget builder.
 *
 * Ported from:
 *   scripts/Primary_Masthead_Automation.gs → createPrimaryMastheadFromApproval()
 *   config/widgets/MastheadConfig.js → deployStrategies.PRIMARY
 *
 * Deploy flow:
 *   Step 1: Multimedia (optional — image background, create OR update)
 *   Step 2: Primary Masthead Widget (create OR update)
 */

import { callApi, updateApi, getNowStr, getFutureStr } from '../ApiClient';
import { SlugGenerator } from '../utils/SlugGenerator';
import { ENDPOINTS } from '../../config/apiConfig';

const API_BASE = '/api/app';

/** Fetch existing multimedia ID by slug name (returns null if not found). */
async function getMultimediaId(slugName) {
    try {
        const res = await fetch(`${API_BASE}/multimedia/?search=${encodeURIComponent(slugName)}`, { credentials: 'include' });
        const data = await res.json();
        const results = data?.results || data;
        if (Array.isArray(results)) {
            const found = results.find(m => m.name === slugName);
            return found ? (found.id || found.pk) : null;
        }
        return null;
    } catch { return null; }
}

/** Fetch existing widget ID by slug_name (returns null if not found). */
async function getWidgetId(slugName) {
    try {
        const res = await fetch(`${API_BASE}/widget/?search=${encodeURIComponent(slugName)}`, { credentials: 'include' });
        const data = await res.json();
        const results = data?.results || data;
        if (Array.isArray(results)) {
            const found = results.find(w => w.slug_name === slugName);
            return found ? (found.id || found.pk) : null;
        }
        return null;
    } catch { return null; }
}

export class PrimaryMastheadBuilder {
    /**
     * @param {Object} widget - Canvas widget / header config
     * @param {string} widget.slug - Base slug
     * @param {string} widget.title - Heading
     * @param {string} widget.master_key - Category pane link (optional)
     * @param {*}      widget.background_media - Image file, Blob, or URL string
     * @param {string} widget.transition_color
     * @param {string} widget.accent_color
     * @param {string} widget.text_color
     * @param {string} widget.icon_bg_color
     * @param {boolean} widget.is_multimedia_dark
     * @param {string} widget.media_aspect_ratio - '1'|'2'|'3'|'4'
     * @param {Object} opts
     * @param {Function} opts.log
     */
    constructor(widget, { log = console.log } = {}) {
        this.widget = widget;
        this.log = log;
        this.slugGen = new SlugGenerator(widget.slug || 'primary_masthead');
        this.dates = {
            start: widget.start_time || getNowStr(),
            end: widget.end_time || getFutureStr(365),
        };
    }

    /** Check if multimedia background should be created. Only image/blob — no video URL. */
    hasMultimedia() {
        return !!(this.widget.background_media);
    }

    /**
     * Determine multimedia type code.
     * 3 = image, 1 = lottie
     */
    getMultimediaType() {
        return '3'; // image (Lottie not handled via this builder)
    }

    /**
     * Execute the full deploy (create-or-update).
     * @returns {Promise<{ slugs: Object, results: Object[] }>}
     */
    async deploy() {
        const results = [];

        const slugs = {
            multimedia: this.slugGen.get('_bg'),
            widget: this.slugGen.get('_pm_hp'),
        };

        // ── Step 1: Multimedia (create or update) ──
        if (this.hasMultimedia()) {
            const mmId = await getMultimediaId(slugs.multimedia);

            const colorPayload = {
                transition_color: this.widget.transition_color || '#FFFFFF',
                accent_color: this.widget.accent_color || '#0000FF',
                text_color: this.widget.text_color || '#FFFFFF',
                icon_bg_color: this.widget.icon_bg_color || '#F0F0F0',
                aspect_ratio: this.widget.media_aspect_ratio || '1',
                is_multimedia_dark: this.widget.is_multimedia_dark ? 'True' : 'False',
            };

            if (mmId) {
                this.log(`[Primary Masthead] Step 1 — Multimedia exists (${mmId}), Updating colors: ${slugs.multimedia}`);
                await updateApi(`${API_BASE}/multimedia/${mmId}/`, colorPayload);
            } else {
                this.log(`[Primary Masthead] Step 1 — Creating Multimedia: ${slugs.multimedia}`);
                const mmPayload = {
                    name: slugs.multimedia,
                    multimedia_type: this.getMultimediaType(),
                    ...colorPayload,
                };

                // Attach media file if it's a File/Blob
                if (this.widget.background_media instanceof File || this.widget.background_media instanceof Blob) {
                    mmPayload.file_en = this.widget.background_media;
                }

                await callApi(ENDPOINTS.multimedia, mmPayload, { multipart: true });
            }
            results.push({ step: 'multimedia', slug: slugs.multimedia, status: 'ok' });
        } else {
            // Even without a new background image, if multimedia already exists
            // update the colors (transition_color etc.) that the user changed
            const mmId = await getMultimediaId(slugs.multimedia);
            if (mmId) {
                this.log(`[Primary Masthead] Step 1 — No new image, updating colors on existing multimedia: ${slugs.multimedia}`);
                await updateApi(`${API_BASE}/multimedia/${mmId}/`, {
                    transition_color: this.widget.transition_color || '#FFFFFF',
                    accent_color: this.widget.accent_color || '#0000FF',
                    text_color: this.widget.text_color || '#FFFFFF',
                    icon_bg_color: this.widget.icon_bg_color || '#F0F0F0',
                    aspect_ratio: this.widget.media_aspect_ratio || '1',
                    is_multimedia_dark: this.widget.is_multimedia_dark ? 'True' : 'False',
                });
                results.push({ step: 'multimedia_colors', slug: slugs.multimedia, status: 'ok' });
            }
        }

        // ── Step 2: Primary Masthead Widget (create or update) ──
        const widgetId = await getWidgetId(slugs.widget);

        const wData = {
            heading: this.widget.title || '',
            heading_en: this.widget.title || '',
            master_key: this.widget.master_key || '',
            media_aspect_ratio: this.widget.media_aspect_ratio || '1',
            start_time: this.dates.start,
            end_time: this.dates.end,
        };

        if (widgetId) {
            this.log(`[Primary Masthead] Step 2 — Widget exists (${widgetId}), Updating: ${slugs.widget}`);
            await updateApi(`${API_BASE}/widget/${widgetId}/`, wData);
        } else {
            this.log(`[Primary Masthead] Step 2 — Creating Widget: ${slugs.widget}`);
            const wPayload = {
                slug_name: slugs.widget,
                widget_type: 'masthead_primary',
                filter_dict: '{}',
                ...wData,
            };
            // Only link background_multimedia if we have one
            if (this.hasMultimedia() || await getMultimediaId(slugs.multimedia)) {
                wPayload.background_multimedia = slugs.multimedia;
            }
            await callApi(ENDPOINTS.widget, wPayload, { multipart: true });
        }
        results.push({ step: 'widget', slug: slugs.widget, status: 'ok' });

        this.log('[Primary Masthead] Deploy complete');
        return { slugs, results };
    }
}
