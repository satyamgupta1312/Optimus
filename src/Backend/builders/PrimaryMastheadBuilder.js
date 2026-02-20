/**
 * PrimaryMastheadBuilder — Primary Masthead widget builder.
 *
 * Ported from:
 *   scripts/Primary_Masthead_Automation.gs → createPrimaryMastheadFromApproval()
 *   config/widgets/MastheadConfig.js → deployStrategies.PRIMARY
 *
 * Deploy flow:
 *   Step 1: Multimedia (optional — image/video/lottie background)
 *   Step 2: Primary Masthead Widget (masthead_primary)
 */

import { callApi, getNowStr, getFutureStr } from '../ApiClient';
import { SlugGenerator } from '../utils/SlugGenerator';
import { ENDPOINTS } from '../../config/apiConfig';

export class PrimaryMastheadBuilder {
    /**
     * @param {Object} widget - Canvas widget / header config
     * @param {string} widget.slug - Base slug
     * @param {string} widget.title - Heading
     * @param {string} widget.master_key - Category pane link (optional)
     * @param {*}      widget.background_media - Image file or URL
     * @param {string} widget.background_video - Video URL
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

    /** Check if multimedia background should be created. */
    hasMultimedia() {
        return !!(this.widget.background_media || this.widget.background_video);
    }

    /**
     * Determine multimedia type code.
     * 3 = image, 4 = video, 1 = lottie
     */
    getMultimediaType() {
        if (this.widget.background_video) return '4';
        return '3'; // Default: image
    }

    /**
     * Execute the full deploy.
     * @returns {Promise<{ slugs: Object, results: Object[] }>}
     */
    async deploy() {
        const results = [];

        const slugs = {
            multimedia: this.slugGen.get('_bg'),
            widget: this.slugGen.get('_pm_hp'),
        };

        // Step 1: Create Multimedia (optional)
        if (this.hasMultimedia()) {
            this.log(`[Primary Masthead] Creating Multimedia: ${slugs.multimedia}`);
            const mmPayload = {
                name: slugs.multimedia,
                multimedia_type: this.getMultimediaType(),
                aspect_ratio: this.widget.media_aspect_ratio || '1',
                transition_color: this.widget.transition_color || '#FFFFFF',
                accent_color: this.widget.accent_color || '#0000FF',
                text_color: this.widget.text_color || '#FFFFFF',
                icon_bg_color: this.widget.icon_bg_color || '#F0F0F0',
                is_multimedia_dark: this.widget.is_multimedia_dark ? 'True' : 'False',
            };

            // Attach media file
            if (this.widget.background_media instanceof File || this.widget.background_media instanceof Blob) {
                mmPayload.file_en = this.widget.background_media;
            }

            await callApi(ENDPOINTS.multimedia, mmPayload, { multipart: true });
            results.push({ step: 'multimedia', slug: slugs.multimedia, status: 'ok' });
        }

        // Step 2: Create Primary Masthead Widget
        this.log(`[Primary Masthead] Creating Widget: ${slugs.widget}`);
        const wPayload = {
            slug_name: slugs.widget,
            widget_type: 'masthead_primary',
            heading: this.widget.title || '',
            heading_en: this.widget.title || '',
            master_key: this.widget.master_key || '',
            media_aspect_ratio: this.widget.media_aspect_ratio || '1',
            start_time: this.dates.start,
            end_time: this.dates.end,
            filter_dict: '{}',
        };

        // Only include background_multimedia if we created one (avoid "invalid" error)
        if (this.hasMultimedia()) {
            wPayload.background_multimedia = slugs.multimedia;
        }

        await callApi(ENDPOINTS.widget, wPayload, { multipart: true });
        results.push({ step: 'widget', slug: slugs.widget, status: 'ok' });

        this.log('[Primary Masthead] Deploy complete');
        return { slugs, results };
    }
}
