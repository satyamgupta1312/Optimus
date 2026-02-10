/**
 * Service for creating multimedia backgrounds (Image/Video/Lottie)
 * Used by Primary Masthead and other widgets
 */

// Use relative URL to leverage Vite proxy and avoid CORS issues in development
const MULTIMEDIA_API_URL = '/api/app/multimedia/';

export const MultimediaService = {
    /**
     * Create multimedia background
     * @param {Object} config - Multimedia configuration
     * @param {string} config.slug_name - Unique slug name
     * @param {string} config.type - 'image', 'video', or 'lottie'
     * @param {string} config.aspect_ratio - e.g. "1"
     * @param {string} config.transition_color - hex color
     * @param {string} config.accent_color - hex color
     * @param {string} config.text_color - hex color
     * @param {string} config.icon_bg_color - hex color
     * @param {boolean} config.is_dark - Dark theme flag
     * @param {File} [config.file] - Image or video file (not needed for lottie)
     */
    createMultimedia: async (config) => {
        console.log("[MultimediaService] Creating multimedia:", config);

        try {
            // Map type to multimedia_type code
            const typeMap = {
                'image': '3',
                'video': '2',  // Assuming video is type 2
                'lottie': '1'  // Assuming lottie is type 1
            };

            const formData = new FormData();
            formData.append('name', config.slug_name);
            formData.append('multimedia_type', typeMap[config.type] || '3');
            formData.append('background_color', '');  // Empty for image/video
            formData.append('aspect_ratio', config.aspect_ratio || '1');
            formData.append('transition_color', config.transition_color || '#FFFFFF');
            formData.append('accent_color', config.accent_color || '#0000FF');
            formData.append('text_color', config.text_color || '#000000');
            formData.append('icon_bg_color', config.icon_bg_color || '#F0F0F0');
            formData.append('is_multimedia_dark', config.is_dark ? 'true' : 'false');

            // Add file for image/video
            if (config.file && (config.type === 'image' || config.type === 'video')) {
                formData.append('file_en', config.file, config.file.name);
            }

            const response = await fetch(MULTIMEDIA_API_URL, {
                method: 'POST',
                body: formData,
                // Note: Don't set Content-Type header, browser will set it with boundary
                credentials: 'include'  // Include cookies for authentication
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Multimedia creation failed (${response.status}): ${errorText}`);
            }

            const result = await response.json();
            console.log("[MultimediaService] Success:", result);

            return {
                success: true,
                slug: config.slug_name,
                data: result
            };

        } catch (error) {
            console.error("[MultimediaService] Error:", error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Update existing multimedia (for video updates)
     */
    updateMultimedia: async (slug_name, config) => {
        console.log("[MultimediaService] Updating multimedia:", slug_name, config);

        try {
            const formData = new FormData();

            // Add file if provided
            if (config.file) {
                formData.append('file_en', config.file, config.file.name);
            }

            const response = await fetch(`${MULTIMEDIA_API_URL}${slug_name}/`, {
                method: 'PUT',
                body: formData,
                credentials: 'include'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Multimedia update failed (${response.status}): ${errorText}`);
            }

            const result = await response.json();
            console.log("[MultimediaService] Update success:", result);

            return {
                success: true,
                slug: slug_name,
                data: result
            };

        } catch (error) {
            console.error("[MultimediaService] Update error:", error);
            return {
                success: false,
                error: error.message
            };
        }
    }
};
