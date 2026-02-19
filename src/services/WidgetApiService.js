// Real API Service for Widget Operations
// Based on the automation scripts provided
import { API_BASE, ENDPOINTS, ACTIVE_ENV } from '../config/apiConfig';

console.log(`[WidgetApiService] Active env: ${ACTIVE_ENV}`);

// Helper to get CSRF token from cookie
const getCsrfToken = () => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; csrftoken=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
};

// Helper to create CSV blob for mappings
const createMappingCsv = (type, slugName) => {
    let content = '';
    if (type === 'layout_widget') {
        content = `widget_slug_name,level_tag,level_property,priority,cohort\n${slugName},global,global,1,`;
    } else if (type === 'widget_item') {
        content = `widget_item_slug_name,level_tag,level_property,priority,cohort\n${slugName},global,global,1,`;
    } else if (type === 'global_page') {
        content = 'level_tag,level_property\nglobal,global';
    }
    return new Blob([content], { type: 'text/csv' });
};

// Get current date/time strings
const getNowStr = () => {
    const now = new Date();
    return now.toISOString().slice(0, 19).replace('T', ' ');
};

const getFutureStr = (days = 365) => {
    const future = new Date();
    future.setDate(future.getDate() + days);
    return future.toISOString().slice(0, 19).replace('T', ' ');
};

// Main API call function with retry logic
const callApi = async (url, payload, isMultipart = false) => {
    const csrfToken = getCsrfToken();

    const options = {
        method: 'POST',
        credentials: 'include',
        headers: {
            'X-CSRFToken': csrfToken || '',
        }
    };

    if (isMultipart) {
        // For multipart/form-data, let browser set Content-Type with boundary
        const formData = new FormData();
        Object.keys(payload).forEach(key => {
            formData.append(key, payload[key]);
        });
        options.body = formData;
    } else {
        // For JSON
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(payload);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`API Error ${response.status}: ${text.substring(0, 200)}`);
    }

    return response;
};

// Create a Single Product Row widget
export const createSingleProductRow = async (widget) => {
    const slugBase = widget.slugName || `spr_${Date.now()}`;

    try {
        // Step 1: Create Page Layout
        const pageSlug = `${slugBase}_page`;
        await callApi(`${API_BASE}${ENDPOINTS.pageLayout}`, {
            slug_name: pageSlug,
            page_heading: widget.title,
            page_layout_type: '2',
            page_type: 'product_listing_page'
        });

        // Step 2: Create Widget Item
        const wiSlug = `${slugBase}_wi`;
        const wiPayload = {
            slug_name: wiSlug,
            text_en: widget.title,
            text_hi: widget.titleHi || '',
            product_list: widget.products.map(p => p.itemCode).join(','),
            item_type: 'item_rows',
            media_en: new Blob(), // Empty blob
            widget_item_id: 'undefined',
            deactivated_flag: 'no',
            item_click_action: 'deal-detail-redirect',
            filter_lst: JSON.stringify([{
                condition: 'in_stk_item_codes',
                value: widget.products.map(p => p.itemCode).join(',')
            }]),
            start_time: getNowStr(),
            end_time: widget.endDate || getFutureStr(),
            is_clickable: 'no',
            update_product_list: 'no',
            filters: '[]',
            property_lst: '[]',
            pl_edit: 'PL',
            slave_key: '',
            media: '',
            text_bg: '',
            media_bg: '',
            background_multimedia: '',
            image_multimedia: '',
            secondary_image_multimedia: '',
            progress_bar: '',
            offer_id: '',
            click_action_params: '{}'
        };
        await callApi(`${API_BASE}${ENDPOINTS.widgetItem}`, wiPayload, true);

        // Step 3: Create Widget
        const widgetSlug = `${slugBase}_spr`;
        const widgetPayload = {
            slug_name: widgetSlug,
            widget_type: 'single_product_row_v2',
            heading_en: widget.title,
            heading_hi: widget.titleHi || '',
            view_all_action_name: 'redirect-to-page',
            view_all_action_params: JSON.stringify({
                page_type: 'product_listing_page',
                page_layout_slug_name: pageSlug
            }),
            start_time: getNowStr(),
            end_time: widget.endDate || getFutureStr(),
            description: '',
            heading: '',
            master_key: '',
            heading_bg: '',
            clear_bg_media: '',
            media_aspect_ratio: '1',
            background_multimedia: '',
            filter_dict: '{}',
            app_configurations: '{}'
        };
        await callApi(`${API_BASE}${ENDPOINTS.widget}`, widgetPayload, true);

        // Step 4: Map Widget Item to Widget
        const csvWI = createMappingCsv('widget_item', wiSlug);
        await callApi(`${API_BASE}${ENDPOINTS.mapWidgetItems}`, {
            widget_slug: widgetSlug,
            mapping_file: csvWI
        }, true);

        // Step 5: Map Widget to Page Layout
        const csvLayout = createMappingCsv('layout_widget', widgetSlug);
        await callApi(`${API_BASE}${ENDPOINTS.mapLayoutWidget}`, {
            page_layout_slug: pageSlug,
            mapping_file: csvLayout
        }, true);

        // Step 6: Map Page to Global
        const csvPage = createMappingCsv('global_page', '');
        await callApi(`${API_BASE}${ENDPOINTS.mapPageLayout}`, {
            page_layout_slug: pageSlug,
            page_type: '',
            mapping_file: csvPage
        }, true);

        console.log('[API] Successfully created Single Product Row:', widgetSlug);
        return { success: true, widgetSlug };

    } catch (error) {
        console.error('[API] Failed to create widget:', error);
        throw error;
    }
};

// Publish all widgets (for Submit/Approve actions)
export const publishWidgets = async (widgets) => {
    console.log('[API] Publishing widgets to samaan.apnamart.in...');

    const results = [];
    for (const widget of widgets) {
        try {
            if (widget.type === 'single_product_row_optimized') {
                const result = await createSingleProductRow(widget);
                results.push(result);
            }
            // Add other widget types here as needed
        } catch (error) {
            console.error('[API] Failed to publish widget:', widget.id, error);
            results.push({ success: false, error: error.message });
        }
    }

    return results;
};
