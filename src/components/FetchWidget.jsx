import React, { useState } from 'react';

/**
 * Fetch Widget Component
 * Allows users to fetch widgets from the database by slug name
 */
export default function FetchWidget({ onWidgetFetched }) {
    const [slugName, setSlugName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFetch = async () => {
        if (!slugName.trim()) {
            setError('Please enter a slug name');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Try fetching as a widget first (Standard Endpoint)
            let widgetResponse = await fetch(
                `/api/app/widget/?slug_name=${encodeURIComponent(slugName.trim())}`
            );

            // If standard endpoint fails, try the alternative "get_widget" endpoint (User suggested)
            if (!widgetResponse.ok && widgetResponse.status === 404) {
                console.log("Standard widget endpoint 404, trying get_widget...");
                widgetResponse = await fetch(
                    `/api/app/get_widget/?slug_name=${encodeURIComponent(slugName.trim())}`
                );
            }

            if (widgetResponse.ok) {
                const widgetData = await widgetResponse.json();

                // Determine widget type and format data
                const formattedWidget = formatWidgetData(widgetData);
                onWidgetFetched(formattedWidget);
                setSlugName('');
                return;
            }

            // If not found as widget, try as widget item (Standard Endpoint)
            let itemResponse = await fetch(
                `/api/app/widget_item/?slug_name=${encodeURIComponent(slugName.trim())}`
            );

            // If standard endpoint fails, try the alternative "get_widget_item" endpoint (User suggested)
            if (!itemResponse.ok && itemResponse.status === 404) {
                console.log("Standard widget_item endpoint 404, trying get_widget_item...");
                itemResponse = await fetch(
                    `/api/app/get_widget_item/?widget_item_slug_name=${encodeURIComponent(slugName.trim())}`
                );
            }

            if (itemResponse.ok) {
                const itemData = await itemResponse.json();
                const formattedItem = formatWidgetItemData(itemData);
                onWidgetFetched(formattedItem);
                setSlugName('');
                return;
            }

            setError('Widget not found with slug: ' + slugName);
        } catch (err) {
            setError('Failed to fetch widget: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatWidgetData = (data) => {
        const widgetType = data.widget_type;

        // Map ALL API widget types to internal types
        const typeMap = {
            'carousel': 'Banner With Product Listing',
            'single_product_row': 'Single Product Row',
            'single_product_row_v2': 'Single Product Row Optimize',
            'product_listing': 'Product Listing Page (CLP)',
            'masthead_secondary_category_hp': 'Secondary Masthead',
            'category': 'Category Grid',
        };

        return {
            // Core identity
            type: typeMap[widgetType] || widgetType,
            slug: data.slug_name || '',

            // Headings
            title: data.heading_en || data.heading || 'Fetched Widget',
            titleHi: data.heading_hi || '',
            titleBg: data.heading_bg || '',
            description: data.description || '',

            // Timing
            startTime: data.start_time || '',
            endTime: data.end_time || '',

            // Visual
            aspectRatio: data.media_aspect_ratio || '1',
            image: data.image || '',
            backgroundMultimedia: data.background_multimedia || '',
            clearBgMedia: data.clear_bg_media || '',

            // Navigation & Actions
            masterKey: data.master_key || '',
            viewAllActionName: data.view_all_action_name || '',
            viewAllActionParams: data.view_all_action_params || '',

            // Configuration
            filterDict: data.filter_dict || '{}',
            appConfigurations: data.app_configurations || '{}',
            configurations: data.configurations || '{}',
            deactivatedFlag: data.deactivated_flag || 'no',

            // Data (items/products will come from widget_items mapping)
            products: [],
            items: data.items || [],

            // Metadata
            _fetched: true,
            _rawData: data
        };
    };

    const formatWidgetItemData = (data) => {
        // Map item_type to a displayable widget type for the canvas
        const itemTypeMap = {
            'carousel': 'Banner With Product Listing',
            'sub_category': 'Product Listing Page (CLP)',
            'item_rows': 'Single Product Row Optimize',
        };

        return {
            // Core identity
            type: itemTypeMap[data.item_type] || 'Widget Item',
            itemType: data.item_type || '',
            slug: data.slug_name || '',

            // Text content
            title: data.text_en || 'Fetched Widget Item',
            text: data.text_en || '',
            titleHi: data.text_hi || '',
            textHi: data.text_hi || '',
            textBg: data.text_bg || '',

            // Media
            image: data.media_en || '',
            mediaEn: data.media_en || '',
            mediaHi: data.media_hi || '',
            mediaBg: data.media_bg || '',
            media: data.media || '',

            // Products
            productIds: data.product_list || '',
            products: data.product_list
                ? data.product_list.split(',').map(code => ({
                    id: crypto.randomUUID(),
                    itemCode: code.trim(),
                    name: `Product ${code.trim()}`,
                    price: '₹-',
                    image: ''
                }))
                : [],

            // Click & Navigation
            itemClickAction: data.item_click_action || '',
            clickActionParams: data.click_action_params || '{}',
            isClickable: data.is_clickable || 'no',
            slaveKey: data.slave_key || '',

            // Filters & Properties
            filters: data.filters || '[]',
            filterLst: data.filter_lst || '[]',
            propertyLst: data.property_lst || '[]',
            plEdit: data.pl_edit || 'PL',
            updateProductList: data.update_product_list || 'no',

            // Timing
            startTime: data.start_time || '',
            endTime: data.end_time || '',

            // Status
            deactivatedFlag: data.deactivated_flag || 'no',

            // Multimedia
            backgroundMultimedia: data.background_multimedia || '',
            imageMultimedia: data.image_multimedia || '',
            secondaryImageMultimedia: data.secondary_image_multimedia || '',

            // Misc
            progressBar: data.progress_bar || '',
            offerId: data.offer_id || '',

            // Metadata
            _fetched: true,
            _rawData: data
        };
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
                🔍 Fetch Widget from Database
            </h3>

            <div className="flex gap-2">
                <input
                    type="text"
                    value={slugName}
                    onChange={(e) => setSlugName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleFetch()}
                    placeholder="Enter widget slug name..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                />
                <button
                    onClick={handleFetch}
                    disabled={loading || !slugName.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                    {loading ? 'Fetching...' : 'Fetch'}
                </button>
            </div>

            {error && (
                <div className="mt-2 text-sm text-red-600">
                    ⚠️ {error}
                </div>
            )}

            <div className="mt-2 text-xs text-gray-500">
                Enter the slug name of any widget or widget item to fetch and preview it
            </div>
        </div>
    );
}
