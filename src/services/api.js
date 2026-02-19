import { API_BASE, BACKEND_ORIGIN, ACTIVE_ENV } from '../config/apiConfig';

console.log(`[api.js] Active env: ${ACTIVE_ENV}`);

export const GET_PAGE_SKELETON = `${API_BASE}/api/app/page_skeleton/v2/`;

export const fetchPageSkeleton = async () => {
    try {
        const response = await fetch(GET_PAGE_SKELETON);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching page skeleton:", error);
        return [];
    }
};

export const fetchWidgetProductList = async (widgetId, itemId, page = 1) => {
    try {
        const url = `${API_BASE}/api/app/get_paginated_widget_product_list/v2/?widget_id=${widgetId}&item_id=${itemId || ''}&cart_value=0.0&store_id=166&page_no=${page}&limit=20`;

        const response = await fetch(url, {
            headers: {
                'accept-encoding': 'gzip',
                'authorization': 'token 1b7f906aa9f5ff40d213e65f51bd312a58ab16ebbe284a47911a9ae35deaa402',
                'cache-control': 'no-cache',
                'connection': 'Keep-Alive',
                'content-type': 'application/json',
                'host': new URL(BACKEND_ORIGIN).host,
                'user-agent': 'Mozilla/5.0 (Linux; Android 16; sdk_gphone64_arm64 Build/BE2A.250530.026.D1; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/144.0.7559.59 Mobile Safari/537.36',
                'version': '3.10.1.0',
                'x-language': 'en'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching widget product list:", error);
        return null;
    }
};

export const fetchMediaBySlug = async (slug) => {
    try {
        // TODO: Replace with actual endpoint provided by user
        // Attempting to list widgets or use a potentially valid endpoint pattern
        const url = `${API_BASE}/api/app/widget/?slug_name=${slug}`;

        // For now, we'll just log and return a placeholder if we can't actually hit the DB without auth/endpoint
        // Or if the user expects us to implement the UI first
        console.log(`[API] Fetching media for slug: ${slug}`);

        // Simulating network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Return a mock result for verification until endpoint is confirmed
        return {
            success: true,
            url: "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=800&q=80",
            name: slug
        };

    } catch (error) {
        console.error("Error fetching media by slug:", error);
        return { success: false, error: error.message };
    }
};
