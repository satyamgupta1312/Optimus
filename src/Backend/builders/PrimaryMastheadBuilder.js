/**
 * PrimaryMastheadBuilder — Primary Masthead widget builder.
 *
 * Slug logic:
 *   Widget slug     = exactly what user enters in "Slug Name" field (widget.slug)
 *   Multimedia slug = widget.slug + '_bg' (hardcoded)
 *
 * Deploy flow:
 *   Step 1: Multimedia background (create via MultimediaService)
 *   Step 2: Primary Masthead Widget (create; if slug exists → retry with _1, _2, ...)
 *           background_multimedia = multimedia slug
 */

import { callApi, getNowStr, getFutureStr } from '../ApiClient';
import { MultimediaService } from '../services/MultimediaService';
import { ENDPOINTS } from '../../config/apiConfig';

export class PrimaryMastheadBuilder {
    constructor(widget, { log = console.log } = {}) {
        this.widget = widget;
        this.log = log;
        this.dates = {
            start: widget.start_time || getNowStr(),
            end: widget.end_time || getFutureStr(365),
        };
    }

    /** Check if multimedia background should be created. */
    hasMultimedia() {
        return !!(this.widget.background_media);
    }

    /**
     * Resolve background_media to a File/Blob for upload.
     * Handles: File objects (direct), URL strings (fetch → Blob).
     */
    async resolveMediaFile() {
        const media = this.widget.background_media;
        if (!media) return null;

        if (media instanceof File || media instanceof Blob) return media;

        if (typeof media === 'string' && media.length > 0) {
            try {
                this.log(`[Primary Masthead] Fetching media from: ${media}`);
                const resp = await fetch(media, { credentials: 'include' });
                const blob = await resp.blob();
                const ext = blob.type.split('/')[1] || 'webp';
                return new File([blob], `bg_media.${ext}`, { type: blob.type });
            } catch (err) {
                this.log(`[Primary Masthead] Warning: could not fetch media: ${err.message}`);
                return null;
            }
        }
        return null;
    }

    async deploy() {
        const results = [];

        // Slug logic: widget slug = user's slug_name, multimedia slug = slug + _bg
        const userSlug = this.widget.slug || this.widget.slug_name || 'primary_masthead';
        const slugs = {
            widget: userSlug,
            multimedia: userSlug + '_bg',
        };

        this.log(`[Primary Masthead] Slugs → widget: ${slugs.widget}, multimedia: ${slugs.multimedia}`);

        // ── Step 1: Multimedia background (create via MultimediaService) ──
        if (this.hasMultimedia()) {
            try {
                const imageFile = await this.resolveMediaFile();
                if (imageFile) {
                    this.log(`[Primary Masthead] Step 1 — Creating Multimedia: ${slugs.multimedia}`);
                    await MultimediaService.create({
                        slugName: slugs.multimedia,
                        imageFile,
                        aspectRatio: '1',
                        transitionColor: this.widget.transition_color || '#FFFFFF',
                        accentColor: this.widget.accent_color || '#0000FF',
                        textColor: this.widget.text_color || '#FFFFFF',
                        iconBgColor: this.widget.icon_bg_color || '#F0F0F0',
                        isDark: !!this.widget.is_multimedia_dark,
                    });
                    results.push({ step: 'multimedia', slug: slugs.multimedia, status: 'ok' });
                } else {
                    this.log('[Primary Masthead] Step 1 — No valid media file, skipping');
                    results.push({ step: 'multimedia', slug: slugs.multimedia, status: 'skipped' });
                }
            } catch (e) {
                // If multimedia slug already exists, that's OK — widget will link to existing one
                if (e.message && e.message.includes('already exists')) {
                    this.log(`[Primary Masthead] Step 1 — Multimedia already exists: ${slugs.multimedia}, continuing...`);
                    results.push({ step: 'multimedia', slug: slugs.multimedia, status: 'exists' });
                } else {
                    this.log(`[Primary Masthead] Step 1 — Multimedia failed: ${e.message}`);
                    results.push({ step: 'multimedia', slug: slugs.multimedia, status: 'failed', error: e.message });
                }
            }
        }

        // ── Step 2: Primary Masthead Widget (create; slug collision → _1, _2, ...) ──
        try {
            const baseSlug = slugs.widget;
            let currentSlug = baseSlug;
            let created = false;

            for (let attempt = 0; attempt <= 10; attempt++) {
                if (attempt > 0) currentSlug = `${baseSlug}_${attempt}`;

                this.log(`[Primary Masthead] Step 2 — Creating Widget: ${currentSlug}`);
                const wPayload = {
                    slug_name: currentSlug,
                    widget_type: 'masthead_primary',
                    description: '',
                    heading: this.widget.title || '',
                    heading_en: this.widget.title || '',
                    heading_hi: '',
                    heading_bg: '',
                    master_key: this.widget.master_key || '',
                    media_aspect_ratio: '1',
                    start_time: this.dates.start,
                    end_time: this.dates.end,
                    clear_bg_media: '',
                    view_all_action_name: '',
                    view_all_action_params: '',
                    background_multimedia: this.hasMultimedia() ? slugs.multimedia : '',
                    filter_dict: '{}',
                    app_configurations: '{}',
                };

                try {
                    await callApi(ENDPOINTS.widget, wPayload, { multipart: true });
                    slugs.widget = currentSlug;
                    created = true;
                    this.log(`[Primary Masthead] Step 2 — Widget created: ${currentSlug}`);
                    break;
                } catch (createErr) {
                    if (createErr.message.includes('slug name already exists')) {
                        this.log(`[Primary Masthead] Step 2 — Slug "${currentSlug}" taken, trying next...`);
                        continue;
                    }
                    throw createErr;
                }
            }

            if (!created) {
                throw new Error(`All slugs from ${baseSlug} to ${baseSlug}_10 taken`);
            }
            results.push({ step: 'widget', slug: slugs.widget, status: 'ok' });
        } catch (e) {
            this.log(`[Primary Masthead] Step 2 — Widget failed: ${e.message}`);
            results.push({ step: 'widget', slug: slugs.widget, status: 'failed', error: e.message });
        }

        this.log('[Primary Masthead] Deploy complete');
        return { slugs, results };
    }
}
