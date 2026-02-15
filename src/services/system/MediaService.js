
/**
 * MediaService
 * Handles file uploads to the backend.
 * Currently tailored for Samaan API endpoints.
 */
export const MediaService = {
    /**
     * Upload a file to the server.
     * @param {File} file - The file object to upload.
     * @returns {Promise<string>} - The URL of the uploaded file.
     */
    async upload(file) {
        // Validation moved here from components
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
            throw new Error('Invalid file type');
        }

        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            throw new Error('File size must be less than 5MB');
        }

        // TODO: Replace with actual API call to /api/app/upload/
        // For now, simulating upload for local dev
        console.log('MediaService: Uploading file...', file.name);

        return new Promise((resolve) => {
            setTimeout(() => {
                // Return a fake URL for now, but this is where the backend response goes
                const fakeUrl = URL.createObjectURL(file);
                resolve(fakeUrl);
            }, 1000);
        });
    },

    /**
     * Validate a file before attempting upload.
     * @param {File} file 
     */
    validate(file) {
        if (!file) return { valid: false, error: 'No file provided' };
        if (file.size > 5 * 1024 * 1024) return { valid: false, error: 'File too large (Max 5MB)' };
        return { valid: true };
    }
};
