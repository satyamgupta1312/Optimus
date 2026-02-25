import React, { useState } from 'react';
import { LocalApiService } from '../services/LocalApiService';
import { Search, Database, Globe, Loader2 } from 'lucide-react';

/**
 * Fetch Widget Component
 * Allows users to fetch widgets from CMS API or Prisma DB
 */
export default function FetchWidget({ onWidgetFetched }) {
    const [slugName, setSlugName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [source, setSource] = useState('db'); // 'db' | 'api'
    const [dbResults, setDbResults] = useState(null); // search results from Prisma

    // ── Prisma DB Search ──
    const handleDbSearch = async () => {
        if (!slugName.trim()) { setError('Please enter a slug or title'); return; }
        setLoading(true); setError(''); setDbResults(null);
        try {
            const widgets = await LocalApiService.getWidgets({ slug: slugName.trim() });
            // Also search by title if slug search returns nothing
            let results = Array.isArray(widgets) ? widgets : [];
            if (results.length === 0) {
                const allWidgets = await LocalApiService.getWidgets();
                const q = slugName.trim().toLowerCase();
                results = (Array.isArray(allWidgets) ? allWidgets : []).filter(w =>
                    (w.slug || '').toLowerCase().includes(q) ||
                    (w.title || '').toLowerCase().includes(q)
                );
            }
            if (results.length === 0) {
                setError(`No widgets found matching "${slugName}"`);
            } else {
                setDbResults(results.slice(0, 10)); // show max 10
            }
        } catch (err) {
            setError('DB search failed: ' + err.message);
        } finally { setLoading(false); }
    };

    const handleLoadFromDb = (dbWidget) => {
        // Convert Prisma widget into canvas widget format
        const pnc = typeof dbWidget.pnc === 'string' ? JSON.parse(dbWidget.pnc) : (dbWidget.pnc || {});
        const config = typeof dbWidget.config === 'string' ? JSON.parse(dbWidget.config) : (dbWidget.config || {});
        const products = typeof dbWidget.products === 'string' ? JSON.parse(dbWidget.products) : (dbWidget.products || []);

        // For masthead widgets, ensure pnc.variant is always set so PhoneFrame
        // can render it in the correct slot (primary → AppHeader, secondary → SecondaryMasthead).
        // pnc.variant may be absent on older DB records saved before config round-tripping was fixed.
        let resolvedPnc = { ...pnc };
        if (dbWidget.type === 'masthead' && !resolvedPnc.variant) {
            // 1. Check config (populated for widgets saved after the round-trip fix)
            const hasCarousel = Array.isArray(config.carouselItems) && config.carouselItems.length > 0;
            const hasSecondaryField = config.view_all_redirect !== undefined
                || config.media_number !== undefined
                || config.master_key !== undefined;

            if (hasCarousel || hasSecondaryField) {
                resolvedPnc.variant = 'secondary';
            } else {
                // 2. Slug-based heuristic for legacy records with empty config
                // Secondary masthead slugs often contain _2nd / _sm / secondary
                const slug = (dbWidget.slug || '').toLowerCase();
                const looksSecondary = /_2nd|_sm_|_sm$|secondary/.test(slug);
                resolvedPnc.variant = looksSecondary ? 'secondary' : 'primary';
            }
        }

        const canvasWidget = {
            type: dbWidget.type || 'unknown',
            slug_name: dbWidget.slug || '',
            title: dbWidget.title || '',
            titleHi: dbWidget.titleHi || '',
            status: dbWidget.status || 'DRAFT',
            ...config,        // spread config first (restores carouselItems, background_media, etc.)
            pnc: resolvedPnc, // pnc set after config so it is never overwritten
            products: products,
            _fetched: true,
            _fromDB: true,
            _dbId: dbWidget.id,
        };

        onWidgetFetched(canvasWidget);
        setSlugName('');
        setDbResults(null);
    };

    // ── CMS API Fetch (existing logic) ──
    const handleApiFetch = async () => {
        if (!slugName.trim()) { setError('Please enter a slug name'); return; }
        setLoading(true); setError('');
        try {
            let widgetResponse = await fetch(`/api/app/widget/?slug_name=${encodeURIComponent(slugName.trim())}`);
            if (!widgetResponse.ok && widgetResponse.status === 404) {
                widgetResponse = await fetch(`/api/app/get_widget/?slug_name=${encodeURIComponent(slugName.trim())}`);
            }
            if (widgetResponse.ok) {
                const widgetData = await widgetResponse.json();
                onWidgetFetched(formatWidgetData(widgetData));
                setSlugName('');
                return;
            }

            let itemResponse = await fetch(`/api/app/widget_item/?slug_name=${encodeURIComponent(slugName.trim())}`);
            if (!itemResponse.ok && itemResponse.status === 404) {
                itemResponse = await fetch(`/api/app/get_widget_item/?widget_item_slug_name=${encodeURIComponent(slugName.trim())}`);
            }
            if (itemResponse.ok) {
                const itemData = await itemResponse.json();
                onWidgetFetched(formatWidgetItemData(itemData));
                setSlugName('');
                return;
            }
            setError('Widget not found with slug: ' + slugName);
        } catch (err) {
            setError('Failed to fetch widget: ' + err.message);
        } finally { setLoading(false); }
    };

    const handleFetch = () => source === 'db' ? handleDbSearch() : handleApiFetch();

    const formatWidgetData = (data) => {
        const typeMap = {
            'carousel': 'Banner With Product Listing',
            'single_product_row': 'Single Product Row',
            'single_product_row_v2': 'Single Product Row Optimize',
            'product_listing': 'Product Listing Page (CLP)',
            'masthead_secondary_category_hp': 'Secondary Masthead',
            'category': 'Category Grid',
        };
        return {
            type: typeMap[data.widget_type] || data.widget_type,
            slug: data.slug_name || '',
            title: data.heading_en || data.heading || 'Fetched Widget',
            titleHi: data.heading_hi || '',
            titleBg: data.heading_bg || '',
            description: data.description || '',
            startTime: data.start_time || '',
            endTime: data.end_time || '',
            aspectRatio: data.media_aspect_ratio || '1',
            image: data.image || '',
            backgroundMultimedia: data.background_multimedia || '',
            clearBgMedia: data.clear_bg_media || '',
            masterKey: data.master_key || '',
            viewAllActionName: data.view_all_action_name || '',
            viewAllActionParams: data.view_all_action_params || '',
            filterDict: data.filter_dict || '{}',
            appConfigurations: data.app_configurations || '{}',
            configurations: data.configurations || '{}',
            deactivatedFlag: data.deactivated_flag || 'no',
            products: [],
            items: data.items || [],
            _fetched: true,
            _rawData: data,
        };
    };

    const formatWidgetItemData = (data) => {
        const itemTypeMap = {
            'carousel': 'Banner With Product Listing',
            'sub_category': 'Product Listing Page (CLP)',
            'item_rows': 'Single Product Row Optimize',
        };
        return {
            type: itemTypeMap[data.item_type] || 'Widget Item',
            itemType: data.item_type || '',
            slug: data.slug_name || '',
            title: data.text_en || 'Fetched Widget Item',
            text: data.text_en || '',
            titleHi: data.text_hi || '',
            textHi: data.text_hi || '',
            textBg: data.text_bg || '',
            image: data.media_en || '',
            mediaEn: data.media_en || '',
            mediaHi: data.media_hi || '',
            mediaBg: data.media_bg || '',
            media: data.media || '',
            productIds: data.product_list || '',
            products: data.product_list
                ? data.product_list.split(',').map(code => ({
                    id: crypto.randomUUID(),
                    itemCode: code.trim(),
                    name: `Product ${code.trim()}`,
                    price: '₹-',
                    image: '',
                }))
                : [],
            itemClickAction: data.item_click_action || '',
            clickActionParams: data.click_action_params || '{}',
            isClickable: data.is_clickable || 'no',
            slaveKey: data.slave_key || '',
            filters: data.filters || '[]',
            filterLst: data.filter_lst || '[]',
            propertyLst: data.property_lst || '[]',
            plEdit: data.pl_edit || 'PL',
            updateProductList: data.update_product_list || 'no',
            startTime: data.start_time || '',
            endTime: data.end_time || '',
            deactivatedFlag: data.deactivated_flag || 'no',
            backgroundMultimedia: data.background_multimedia || '',
            imageMultimedia: data.image_multimedia || '',
            secondaryImageMultimedia: data.secondary_image_multimedia || '',
            progressBar: data.progress_bar || '',
            offerId: data.offer_id || '',
            _fetched: true,
            _rawData: data,
        };
    };

    const statusColors = {
        DRAFT: 'bg-slate-100 text-slate-600',
        PENDING: 'bg-amber-100 text-amber-700',
        APPROVED: 'bg-green-100 text-green-700',
        REJECTED: 'bg-red-100 text-red-700',
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
                🔍 Fetch Widget from Database
            </h3>

            {/* Source toggle */}
            <div className="flex gap-1 mb-3 bg-slate-100 rounded-lg p-0.5">
                <button
                    onClick={() => { setSource('db'); setError(''); setDbResults(null); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${source === 'db' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Database size={12} />
                    From DB
                </button>
                <button
                    onClick={() => { setSource('api'); setError(''); setDbResults(null); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${source === 'api' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Globe size={12} />
                    From API
                </button>
            </div>

            <div className="flex gap-2">
                <input
                    type="text"
                    value={slugName}
                    onChange={(e) => setSlugName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
                    placeholder={source === 'db' ? 'Search by slug or title...' : 'Enter widget slug name...'}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                />
                <button
                    onClick={handleFetch}
                    disabled={loading || !slugName.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : 'Fetch'}
                </button>
            </div>

            {error && (
                <div className="mt-2 text-sm text-red-600">⚠️ {error}</div>
            )}

            {/* DB search results */}
            {dbResults && dbResults.length > 0 && (
                <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                    {dbResults.map((w, i) => (
                        <button
                            key={w.id || i}
                            onClick={() => handleLoadFromDb(w)}
                            className="w-full text-left px-3 py-2.5 border-b border-slate-100 last:border-0 hover:bg-blue-50 transition-colors flex items-center justify-between gap-2"
                        >
                            <div className="min-w-0">
                                <div className="text-sm font-medium text-slate-800 truncate">
                                    {w.title || w.slug || 'Untitled'}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono truncate">
                                    {w.slug}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] text-slate-400">{w.type}</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${statusColors[w.status] || 'bg-slate-100 text-slate-600'
                                    }`}>
                                    {w.status}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            <div className="mt-2 text-xs text-gray-500">
                {source === 'db'
                    ? 'Search saved widgets from Prisma DB to edit and resubmit'
                    : 'Enter the slug name of any widget or widget item to fetch and preview it'}
            </div>
        </div>
    );
}

