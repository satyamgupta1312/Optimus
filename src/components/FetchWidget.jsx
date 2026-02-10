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
            // Try fetching as a widget first
            const widgetResponse = await fetch(
                `https://samaan.apnamart.in/api/app/widget/?slug_name=${encodeURIComponent(slugName.trim())}`
            );

            if (widgetResponse.ok) {
                const widgetData = await widgetResponse.json();

                // Determine widget type and format data
                const formattedWidget = formatWidgetData(widgetData);
                onWidgetFetched(formattedWidget);
                setSlugName('');
                return;
            }

            // If not found as widget, try as widget item
            const itemResponse = await fetch(
                `https://samaan.apnamart.in/api/app/widget_item/?slug_name=${encodeURIComponent(slugName.trim())}`
            );

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

        // Map API widget type to our internal types
        const typeMap = {
            'carousel': 'Banner With Product Listing',
            'single_product_row': 'Single Product Row',
            'single_product_row_v2': 'Single Product Row Optimize',
            'product_listing': 'Product Listing Page (CLP)'
        };

        return {
            type: typeMap[widgetType] || widgetType,
            title: data.heading_en || data.heading || 'Fetched Widget',
            titleHi: data.heading_hi || '',
            slug: data.slug_name,
            aspectRatio: data.media_aspect_ratio || '1',
            products: [], // Will be populated from widget items
            image: '', // Will be populated from widget items
            _fetched: true,
            _rawData: data
        };
    };

    const formatWidgetItemData = (data) => {
        return {
            type: 'Widget Item',
            title: data.text_en || 'Fetched Widget Item',
            titleHi: data.text_hi || '',
            slug: data.slug_name,
            image: data.media_en || '',
            products: data.product_list ? data.product_list.split(',') : [],
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
