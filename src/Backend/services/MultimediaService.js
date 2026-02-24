/**
 * MultimediaService — Create multimedia background assets for Mastheads.
 *
 * Ported from:
 *   scripts/Primary_Masthead_Automation.gs → multimedia creation step
 *   scripts/Secondary_Masthead_Automation.gs → multimedia creation step
 *   config/widgets/MastheadConfig.js → multimedia config
 *
 * Multimedia types:
 *   1 = Lottie animation
 *   3 = Image
 *   4 = Video
 */

import { callApi } from '../ApiClient';
import { ENDPOINTS } from '../../config/apiConfig';

export const MultimediaService = {
    /**
     * Detect multimedia type from file or URL.
     *
     * @param {Object} opts
     * @param {File|Blob|null} opts.imageFile
     * @param {string} opts.videoUrl
     * @returns {'3'|'4'|null} Type code or null if no media
     */
    detectType({ imageFile, videoUrl }) {
        if (videoUrl) return '4'; // Video
        if (imageFile) return '3'; // Image
        return null;
    },

    /**
     * Create a multimedia asset on the backend.
     *
     * @param {Object} opts
     * @param {string} opts.slugName - Multimedia slug (e.g. 'campaign_bg')
     * @param {File|Blob|null} opts.imageFile - Image to upload
     * @param {string} opts.videoUrl - Video URL (alternative to image)
     * @param {string} opts.aspectRatio - '1'|'2'|'3'|'4' (1:1, 4:3, 16:9, Full)
     * @param {string} opts.transitionColor - Hex color
     * @param {string} opts.accentColor - Hex color
     * @param {string} opts.textColor - Hex color
     * @param {string} opts.iconBgColor - Hex color
     * @param {boolean} opts.isDark - Is dark theme
     * @returns {Promise<{slug: string, type: string}>}
     */
    async create({
        slugName,
        imageFile = null,
        videoUrl = '',
        aspectRatio = '1',
        transitionColor = '#FFFFFF',
        accentColor = '#0000FF',
        textColor = '#FFFFFF',
        iconBgColor = '#F0F0F0',
        isDark = false,
    }) {
        const type = this.detectType({ imageFile, videoUrl });
        if (!type) throw new Error('No multimedia source provided (image or video required)');

        const payload = {
            name: slugName,
            multimedia_type: type,
            background_color: '',
            aspect_ratio: aspectRatio,
            transition_color: transitionColor,
            accent_color: accentColor,
            text_color: textColor,
            icon_bg_color: iconBgColor,
            is_multimedia_dark: isDark ? 'true' : 'false',
        };

        // Attach file if image
        if (imageFile) {
            payload.file_en = imageFile;
        }

        await callApi(ENDPOINTS.multimedia, payload, { multipart: true });

        return { slug: slugName, type };
    },
};
