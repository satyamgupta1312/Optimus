import { fetchWidgetProductList } from './api';

// Backend Sync Service - Ports logic from python script to JS
// Endpoints relative to /api (proxied)

const API = {
    POST_WIDGET_ITEM: '/api/app/post_widget_item/',
    POST_WIDGET: '/api/app/widget/',
    POST_PAGE_LAYOUT: '/api/app/post_page_layout/',
    MAP_WIDGET_ITEMS: '/api/app/update_widget_widget_item_mapping/',
    MAP_LAYOUT_WIDGET: '/api/app/update_layout_widget_mapping/',
    MAP_PAGE_LAYOUT: '/api/app/update_page_page_layout_mapping/'
};

const getHeaders = (tokens) => ({
    'X-CSRFToken': tokens.csrftoken,
    'Content-Type': 'application/json'
});

const generateSuffix = () => {
    const now = new Date();
    return `${now.getFullYear().toString().substr(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
};

export const BackendSyncService = {

    async deployRequest(requestData, tokens) {
        const uniqueSuffix = generateSuffix();
        const logs = [];
        const log = (msg) => { console.log(`[Sync] ${msg}`); logs.push(msg); };

        log("Starting Deployment...");

        try {
            // Process Header Widgets
            if (requestData.headerWidgets) {
                const hw = requestData.headerWidgets;

                if (hw.primaryMasthead && hw.primaryMasthead.enabled !== false) {
                    log(`Processing Header: Primary Masthead`);
                    await this.deployPrimaryMasthead(hw.primaryMasthead, uniqueSuffix, tokens, log);
                }

                if (hw.secondaryMasthead && hw.secondaryMasthead.enabled !== false) {
                    log(`Processing Header: Secondary Masthead`);
                    await this.deploySecondaryMasthead(hw.secondaryMasthead, uniqueSuffix, tokens, log);
                }
            }

            // Process Body Widgets
            const widgets = requestData.widgets || [];
            for (const widget of widgets) {
                log(`Processing Widget: ${widget.type} - ${widget.title}`);

                if (widget.type === 'Category Grid') {
                    await this.deployCategoryGrid(widget, uniqueSuffix, tokens, log);
                }
                else if (widget.type === 'Product Listing Page (CLP)') {
                    await this.deployCLP(widget, uniqueSuffix, tokens, log);
                }
                else {
                    log(`Skipping unsupported body widget type: ${widget.type}`);
                    // Note: Primary/Secondary Mastheads used to be here, now in Header block
                }
            }

            return { success: true, logs };
        } catch (error) {
            log(`Error: ${error.message}`);
            return { success: false, error: error.message, logs };
        }
    },

    // Category Grid Deployment
    async deployCategoryGrid(widget, suffix, tokens, log) {
        const itemSlugs = [];
        const startDate = widget.startTime || new Date().toISOString();
        const endDate = widget.endTime || new Date(Date.now() + 86400000 * 30).toISOString();

        // 1. Create Items
        for (const item of widget.items || []) {
            const itemSlug = `${item.text.toLowerCase().replace(/ /g, '_')}_sub_cat_wi_${suffix}`;
            itemSlugs.push(itemSlug);

            log(`Creating Item: ${item.text} (${itemSlug})`);

            const formData = new FormData();
            formData.append('widget_item_id', 'undefined');
            formData.append('slug_name', itemSlug);
            formData.append('item_type', 'sub_category');
            formData.append('text_en', item.text);
            formData.append('text_hi', item.textHi || '');
            formData.append('product_list', item.leafIds || item.id || '');
            formData.append('is_clickable', 'yes');
            formData.append('start_time', startDate);
            formData.append('end_time', endDate);

            if (item.image instanceof File || item.image instanceof Blob) {
                formData.append('media_en', item.image);
            }

            const response = await fetch(API.POST_WIDGET_ITEM, {
                method: 'POST',
                headers: { 'X-CSRFToken': tokens.csrftoken },
                body: formData
            });
            if (!response.ok) throw new Error(`Failed to create item ${item.text}: ${await response.text()}`);
        }

        // 2. Create Widget
        const widgetSlug = widget.slug ? `${widget.slug}_plp_w_${suffix}` : `${widget.title.toLowerCase().replace(/ /g, '_')}_plp_w_${suffix}`;
        log(`Creating Widget: ${widget.title} (${widgetSlug})`);

        const widgetPayload = new FormData();
        widgetPayload.append('slug_name', widgetSlug);
        widgetPayload.append('widget_type', 'product_listing');
        widgetPayload.append('heading', widget.title);
        widgetPayload.append('heading_hi', widget.titleHi || '');
        widgetPayload.append('display_vertical', 'no');
        widgetPayload.append('start_time', startDate);
        widgetPayload.append('end_time', endDate);

        const wRes = await fetch(API.POST_WIDGET, { method: 'POST', body: widgetPayload, headers: { 'X-CSRFToken': tokens.csrftoken } });
        if (!wRes.ok) throw new Error(`Failed to create widget: ${await wRes.text()}`);

        // 3. Map
        await this.mapItems(widgetSlug, itemSlugs, tokens, log);
    },

    // Primary Masthead Deployment
    async deployPrimaryMasthead(widget, suffix, tokens, log) {
        const widgetSlug = widget.slug_name
            ? `${widget.slug_name}_pm_w_${suffix}`
            : `primary_masthead_${suffix}`; // Default fallback

        log(`Creating Primary Masthead: ${widgetSlug}`);

        const formData = new FormData();
        formData.append('slug_name', widgetSlug);
        formData.append('widget_type', 'masthead_primary');
        formData.append('heading', widget.title || '');
        formData.append('heading_hi', widget.titleHi || '');
        formData.append('master_key', widget.master_key || '');

        if (widget.background_multimedia_slug) {
            formData.append('background_multimedia', widget.background_multimedia_slug);
        } else if (widget.background && !widget.background.startsWith('#')) {
            // Assuming URL is passed as background if not hex
            formData.append('background_multimedia', widget.background);
        }

        formData.append('media_aspect_ratio', '1');
        formData.append('start_time', widget.start_time || new Date().toISOString());
        formData.append('end_time', widget.end_time || new Date(Date.now() + 86400000 * 30).toISOString());

        const response = await fetch(API.POST_WIDGET, {
            method: 'POST',
            body: formData,
            headers: { 'X-CSRFToken': tokens.csrftoken }
        });

        if (!response.ok) throw new Error(`Failed to create Primary Masthead: ${await response.text()}`);
        log("Primary Masthead Deployed!");
    },

    // Secondary Masthead Deployment
    async deploySecondaryMasthead(widget, suffix, tokens, log) {
        const itemSlugs = [];
        const startDate = widget.start_time || new Date().toISOString();
        const endDate = widget.end_time || new Date(Date.now() + 86400000 * 30).toISOString();

        // 1. Create Carousel Items
        for (const item of widget.items || []) {
            // Slug: item text + suffix
            const itemSlug = `${(item.text || 'item').toLowerCase().replace(/ /g, '_')}_carousel_wi_${suffix}`;
            itemSlugs.push(itemSlug);

            log(`Creating Carousel Item: ${item.text}`);

            const formData = new FormData();
            formData.append('slug_name', itemSlug);
            formData.append('item_type', 'carousel');
            formData.append('text_en', item.text || '');
            formData.append('text_hi', item.textHi || '');
            formData.append('item_click_action', 'redirect-to-page');

            if (item.redirectLink) {
                const params = JSON.stringify({ "page_type": "category_page", "page_layout_slug_name": item.redirectLink });
                formData.append('click_action_params', params);
            }

            formData.append('is_clickable', 'yes');
            formData.append('start_time', startDate);
            formData.append('end_time', endDate);

            // Image handling (URL or File)
            if (item.image && typeof item.image === 'string' && item.image.startsWith('http')) {
                // If we can't upload URL, we might skip media_en or use background_multimedia logic?
                // Script fetched blob. Here frontend can't fetch blob easily without proxy.
                // We'll skip media upload and assume user uses manual upload or we need a proxy service.
                // Or if it was a file upload (local).
            }

            const response = await fetch(API.POST_WIDGET_ITEM, {
                method: 'POST',
                headers: { 'X-CSRFToken': tokens.csrftoken },
                body: formData
            });
            if (!response.ok) throw new Error(`Failed item ${item.text}: ${await response.text()}`);
        }

        // 2. Create Widget
        const widgetSlug = widget.slug_name
            ? `${widget.slug_name}_sm_w_${suffix}`
            : `secondary_masthead_${suffix}`;

        log(`Creating Secondary Masthead: ${widgetSlug}`);

        const wData = new FormData();
        wData.append('slug_name', widgetSlug);
        wData.append('widget_type', 'masthead_secondary_category_hp');
        wData.append('heading', widget.title || '');
        wData.append('heading_hi', widget.titleHi || '');
        wData.append('media_aspect_ratio', widget.aspectRatio || '4');
        wData.append('background_multimedia', widget.background || '');
        wData.append('start_time', startDate);
        wData.append('end_time', endDate);

        const wRes = await fetch(API.POST_WIDGET, { method: 'POST', body: wData, headers: { 'X-CSRFToken': tokens.csrftoken } });
        if (!wRes.ok) throw new Error(`Failed Masthead Widget: ${await wRes.text()}`);

        // 3. Map Items
        await this.mapItems(widgetSlug, itemSlugs, tokens, log, true);
    },

    // CLP Deployment
    async deployCLP(widget, suffix, tokens, log) {
        const baseSlug = widget.slug || widget.title.toLowerCase().replace(/ /g, '_');
        const startDate = widget.startTime || new Date().toISOString();
        const endDate = widget.endTime || new Date(Date.now() + 86400000 * 30).toISOString();

        const names = {
            wi_plp: `${baseSlug}_wi_plp_${suffix}`,
            w_plp: `${baseSlug}_w_plp_${suffix}`,
            page: `${baseSlug}_plp_${suffix}`
        };

        log(`Creating CLP Flow for ${baseSlug}`);

        // 1. Create WI
        const wiData = new FormData();
        wiData.append('slug_name', names.wi_plp);
        wiData.append('item_type', 'sub_category');
        wiData.append('text_en', widget.title);
        wiData.append('product_list', widget.productIds || '');
        wiData.append('is_clickable', 'yes');
        wiData.append('start_time', startDate);
        wiData.append('end_time', endDate);

        const wiRes = await fetch(API.POST_WIDGET_ITEM, { method: 'POST', body: wiData, headers: { 'X-CSRFToken': tokens.csrftoken } });
        if (!wiRes.ok) throw new Error(`Failed WI PLP: ${await wiRes.text()}`);

        // 2. Create Widget (PLP)
        const wData = new FormData();
        wData.append('slug_name', names.w_plp);
        wData.append('widget_type', 'product_listing');
        wData.append('heading', widget.title);
        wData.append('start_time', startDate);
        wData.append('end_time', endDate);

        const wRes = await fetch(API.POST_WIDGET, { method: 'POST', body: wData, headers: { 'X-CSRFToken': tokens.csrftoken } });
        if (!wRes.ok) throw new Error(`Failed W PLP: ${await wRes.text()}`);

        // 3. Create Page Layout
        const pData = {
            "slug_name": names.page,
            "page_heading": widget.title,
            "page_layout_type": "2",
            "page_type": "product_listing_page"
        };
        const pRes = await fetch(API.POST_PAGE_LAYOUT, {
            method: 'POST',
            body: JSON.stringify(pData),
            headers: { 'X-CSRFToken': tokens.csrftoken, 'Content-Type': 'application/json' }
        });
        if (!pRes.ok) throw new Error(`Failed Page Layout: ${await pRes.text()}`);

        // 4. Mappings
        log("Mapping Components...");

        await this.mapItems(names.w_plp, [names.wi_plp], tokens, log);

        const wLayoutCsv = new Blob([`widget_slug_name,level_tag,level_property,priority,cohort\n${names.w_plp},global,global,1,`], { type: 'text/csv' });
        const wlFormData = new FormData();
        wlFormData.append('page_layout_slug', names.page);
        wlFormData.append('mapping_file', wLayoutCsv, 'mapping.csv');
        await fetch(API.MAP_LAYOUT_WIDGET, { method: 'POST', body: wlFormData, headers: { 'X-CSRFToken': tokens.csrftoken } });

        const pgCsv = new Blob([`level_tag,level_property\nglobal,global`], { type: 'text/csv' });
        const pgFormData = new FormData();
        pgFormData.append('page_layout_slug', names.page);
        pgFormData.append('page_type', 'product_listing_page');
        pgFormData.append('mapping_file', pgCsv, 'mapping.csv');
        await fetch(API.MAP_PAGE_LAYOUT, { method: 'POST', body: pgFormData, headers: { 'X-CSRFToken': tokens.csrftoken } });

        log("CLP Deployed Successfully!");
    },

    async mapItems(widgetSlug, itemSlugs, tokens, log, isMasthead = false) {
        log(`Mapping ${itemSlugs.length} items to ${widgetSlug}...`);
        const csvContent = ["widget_item_slug_name,level_tag,level_property,priority,cohort"];
        itemSlugs.forEach((slug, idx) => {
            csvContent.push(`${slug},global,global,${idx + 1},`);
        });
        const mappingCsv = new Blob([csvContent.join('\n')], { type: 'text/csv' });

        const mapFormData = new FormData();
        mapFormData.append('widget_slug', widgetSlug);
        mapFormData.append('mapping_file', mappingCsv, 'mapping.csv');

        const mRes = await fetch(API.MAP_WIDGET_ITEMS, {
            method: 'POST',
            body: mapFormData,
            headers: { 'X-CSRFToken': tokens.csrftoken }
        });
        if (!mRes.ok) throw new Error(`Failed to map items: ${await mRes.text()}`);
    }
};
