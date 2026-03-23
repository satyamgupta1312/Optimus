
import React from 'react';
import { useWidgetContext } from '../../context/WidgetContext';
import { Plus, Trash2 } from 'lucide-react';
import { LocalApiService } from '../../services/LocalApiService';
import { searchProduct } from '../../services/CatalogService';
import ImageUpload from '../ImageUpload';
import SlugBuilder from '../Inputs/SlugBuilder';
import DateTimeInput from '../Inputs/DateTimeInput';
import { safeUUID } from '../../utils/uuid';

/**
 * LegacyPropertyEditor
 * Handles the property editing for older hardcoded widgets.
 * This component contains the technical debt and spaghetti logic that is being phased out.
 */
const LegacyPropertyEditor = ({ widget }) => {
    const { updateWidget } = useWidgetContext();

    const handleChange = (field, value) => {
        updateWidget(widget.id, { [field]: value });
    };

    const isCategoryGrid = widget.type === 'Category Grid';
    const isSecondaryMasthead = widget.type === 'Secondary Masthead';
    const isPrimaryMasthead = widget.type === 'Primary Masthead';
    const isCLP = widget.type === 'Product Listing Page (CLP)';
    const isSPROpt = widget.type === 'Single Product Row Optimize';
    const isBannerPLP = widget.type === 'Banner With Product Listing';

    const needsItems = isCategoryGrid || isSecondaryMasthead;

    return (
        <div className="flex flex-col gap-6">
            {/* Common Content Settings */}
            <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
                <h3 className="font-semibold text-sm text-slate-900 mb-3">Content Settings</h3>
                <div className="flex flex-col gap-3">
                    <SlugBuilder
                        label="Slug Name"
                        value={widget.slug || ''}
                        onChange={(val) => handleChange('slug', val)}
                        required
                        widget={widget}
                    />

                    {/* Start Time: Hide for SPR Optimize and Banner PLP */}
                    {!isSPROpt && !isBannerPLP && (
                        <DateTimeInput
                            label="Start Date & Time"
                            value={widget.startTime || ''}
                            onChange={(val) => handleChange('startTime', val)}
                            required
                        />
                    )}

                    <DateTimeInput
                        label="End Date & Time"
                        value={widget.endTime || ''}
                        onChange={(val) => handleChange('endTime', val)}
                        required
                    />

                    <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Title (English)</label>
                        <input
                            type="text"
                            value={widget.title || ''}
                            onChange={async (e) => {
                                const val = e.target.value;
                                // Update English Title
                                updateWidget(widget.id, { title: val });

                                // Auto-Transliterate to Hindi
                                if (val.trim()) {
                                    try {
                                        const res = await fetch(`https://inputtools.google.com/request?text=${encodeURIComponent(val)}&itc=hi-t-i0-und&num=1`);
                                        const data = await res.json();
                                        if (data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1]) {
                                            const hindiVal = data[1][0][1][0];
                                            updateWidget(widget.id, { titleHi: hindiVal });
                                        }
                                    } catch (err) {
                                        console.warn("Transliteration failed", err);
                                    }
                                } else {
                                    updateWidget(widget.id, { titleHi: '' });
                                }
                            }}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Title (Hindi)</label>
                        <input
                            type="text"
                            value={widget.titleHi || ''}
                            onChange={(e) => handleChange('titleHi', e.target.value)}
                            placeholder="Auto-generated from English"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>
                </div>
            </div>

            {/* Widget Specific Settings */}
            {(isPrimaryMasthead || isSecondaryMasthead || isCLP || isBannerPLP) && (
                <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
                    <h3 className="font-semibold text-sm text-slate-900 mb-3">Widget Configuration</h3>
                    <div className="flex flex-col gap-3">
                        {/* Background / Main Image */}
                        <div>
                            {(isSecondaryMasthead || isBannerPLP) ? (
                                <ImageUpload
                                    label={isBannerPLP ? 'Banner Image (Open Link)' : 'Background Image'}
                                    currentImage={widget.image || ''}
                                    onImageSelect={(file, preview) => {
                                        // For now, store the preview data URL
                                        // In production, upload to server and store URL
                                        handleChange('image', preview || '');
                                    }}
                                />
                            ) : (
                                <>
                                    <label className="text-xs font-medium text-slate-500 mb-1 block">
                                        {isCLP ? 'Icon / Image' : 'Background Image URL'}
                                    </label>
                                    <input
                                        type="text"
                                        value={widget.image || ''}
                                        onChange={(e) => handleChange('image', e.target.value)}
                                        placeholder="http://..."
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
                                    />
                                </>
                            )}
                        </div>

                        {/* Aspect Ratio (Secondary Masthead) */}
                        {isSecondaryMasthead && (
                            <div>
                                <label className="text-xs font-medium text-slate-500 mb-1 block">Aspect Ratio</label>
                                <select
                                    value={widget.aspectRatio || '4'}
                                    onChange={(e) => handleChange('aspectRatio', e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="4">4 (Standard)</option>
                                    <option value="3">3</option>
                                    <option value="2">2</option>
                                    <option value="1">1 (Square)</option>
                                </select>
                            </div>
                        )}

                        {/* Aspect Ratio (Banner PLP - Flexible Input) */}
                        {isBannerPLP && (
                            <div>
                                <label className="text-xs font-medium text-slate-500 mb-1 block">Aspect Ratio</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={widget.aspectRatio || '2.0'}
                                    onChange={(e) => handleChange('aspectRatio', e.target.value)}
                                    placeholder="e.g. 2.0 or 1.5"
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>
                        )}

                        {/* Master Key (Primary Masthead) */}
                        {isPrimaryMasthead && (
                            <div>
                                <label className="text-xs font-medium text-slate-500 mb-1 block">Master Key (Category Link)</label>
                                <input
                                    type="text"
                                    value={widget.masterKey || ''}
                                    onChange={(e) => handleChange('masterKey', e.target.value)}
                                    placeholder="e.g. 1020"
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>
                        )}

                        {/* Background Multimedia (Primary Masthead) */}
                        {isPrimaryMasthead && (
                            <div>
                                <label className="text-xs font-medium text-slate-500 mb-1 block">Background Multimedia</label>
                                <input
                                    type="text"
                                    value={widget.backgroundMultimedia || ''}
                                    onChange={(e) => handleChange('backgroundMultimedia', e.target.value)}
                                    placeholder="e.g. Breakfast_Needs_bg"
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>
                        )}


                        {/* Item Codes (CLP & Banner PLP) */}
                        {(isCLP || isBannerPLP) && (
                            <div>
                                <label className="text-xs font-medium text-slate-500 mb-1 block">Item Codes OR Google Sheet CSV Link</label>
                                <textarea
                                    value={widget.productIds || ''}
                                    onChange={(e) => handleChange('productIds', e.target.value)}
                                    onKeyDown={async (e) => {
                                        // Allow fetching on Enter
                                        if (e.key === 'Enter') {
                                            const val = e.target.value;
                                            // Don't intercept if it looks like a URL
                                            if (val.includes('http')) return;

                                            e.preventDefault();
                                            const ids = val.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
                                            if (ids.length === 0) return;

                                            console.log('[PropertyEditor] Fetching products for IDs:', ids);

                                            // Fetch from local catalog
                                            let fetchedProducts = [];
                                            try {
                                                const batchResult = await LocalApiService.getCatalogBatch(ids);
                                                fetchedProducts = Object.values(batchResult?.products || {});
                                            } catch (err) { console.warn("Catalog fetch failed", err); }

                                            const newProducts = ids.map(id => {
                                                // Check Sheet results then Local Catalog
                                                const p = fetchedProducts.find(x => x.itemCode == id || x.item_code == id) || searchProduct(id);
                                                if (p) {
                                                    return {
                                                        id: safeUUID(),
                                                        itemCode: id,
                                                        name: p.name || p.display_name || `Product ${id}`,
                                                        price: p.price || 0,
                                                        image: p.image || p.main_image || '',
                                                        mrp: p.mrp || 0
                                                    };
                                                }
                                                return {
                                                    id: safeUUID(),
                                                    itemCode: id,
                                                    name: `Product ${id} (Preview)`,
                                                    price: 0,
                                                    image: 'https://placehold.co/150'
                                                };
                                            });

                                            updateWidget(widget.id, { products: newProducts });
                                            // Don't clear productIds as it is the Source of Truth for Script
                                            alert(`Preview Updated with ${newProducts.length} products!`);
                                        }
                                    }}
                                    placeholder="e.g. 1234, 5678 (Press Enter to Fetch) OR https://docs.google.com/.../export?format=csv"
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 transition-colors min-h-[80px] font-mono"
                                />
                                <p className="text-[10px] text-slate-400 mt-1 italic">
                                    Type IDs & Press <b>Enter</b> to verify details. Or paste CSV Link.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Standard Products List (For Product Rows) */}
            {widget.products !== undefined && !needsItems && !isCLP && !isBannerPLP && (
                <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
                    {/* ... Existing Product Logic ... */}
                    <div className="mb-4">
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Item Code (Quick Add)</label>

                        {/* TEST BUTTON */}
                        <button
                            onClick={() => {
                                console.log('[TEST] Adding hardcoded product');
                                const testProduct = {
                                    id: safeUUID(),
                                    itemCode: '4586',
                                    name: 'Parrot Jeera Powder 50g',
                                    price: '₹38',
                                    image: 'https://gs.apnamart.in/product/product_39/processed/1761118899-4586_5.webp'
                                };
                                const currentProducts = widget.products || [];
                                const updated = [...currentProducts, testProduct];
                                console.log('[TEST] Updated products:', updated);
                                handleChange('products', updated);
                            }}
                            className="mb-2 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                        >
                            🧪 TEST: Add Jeera Powder
                        </button>

                        <textarea
                            value={widget.productIds || ''}
                            onKeyDown={async (e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const ids = e.target.value.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);

                                    if (ids.length === 0) return;

                                    console.log('[PropertyEditor] Processing item codes:', ids);

                                    let fetchedProducts = [];

                                    // Fetch from local catalog
                                    try {
                                        console.log('[PropertyEditor] Fetching from local catalog...');
                                        const batchResult = await LocalApiService.getCatalogBatch(ids);
                                        fetchedProducts = Object.values(batchResult?.products || {});
                                        console.log('[PropertyEditor] Local catalog returned:', fetchedProducts.length, 'products');
                                    } catch (error) {
                                        console.warn('[PropertyEditor] Catalog fetch failed:', error.message);
                                    }

                                    const newProducts = [];
                                    const notFound = [];

                                    ids.forEach(id => {
                                        // Try fetched data first
                                        let p = fetchedProducts.find(product =>
                                            product.itemCode === id || product.item_code === id
                                        );

                                        // Fallback to local catalog if not found in Sheets
                                        if (!p) {
                                            p = searchProduct(id);
                                            if (p) {
                                                console.log('[PropertyEditor] Found in local catalog fallback:', id);
                                            }
                                        } else {
                                            console.log('[PropertyEditor] Found in batch catalog:', id);
                                        }

                                        if (p) {
                                            newProducts.push({
                                                id: safeUUID(),
                                                itemCode: p.itemCode || p.item_code || id,
                                                name: p.name || p.display_name || `Item ${id}`,
                                                price: p.price ? (p.price.startsWith('₹') ? p.price : `₹${p.price}`) : '₹-',
                                                image: p.image || p.main_image || ''
                                            });
                                        } else {
                                            console.warn('[PropertyEditor] Product not found:', id);
                                            notFound.push(id);
                                            // Still add placeholder
                                            newProducts.push({
                                                id: safeUUID(),
                                                itemCode: id,
                                                name: `Item ${id} (Not Found)`,
                                                price: '₹-',
                                                image: ''
                                            });
                                        }
                                    });

                                    if (newProducts.length > 0) {
                                        // Get current widget state to avoid race condition
                                        updateWidget(widget.id, (currentWidget) => {
                                            const currentProducts = currentWidget.products || [];
                                            const updatedProducts = [...currentProducts, ...newProducts];
                                            console.log('[PropertyEditor] Updating widget products:', updatedProducts);
                                            return { products: updatedProducts };
                                        });

                                        handleChange('productIds', ''); // Clear input

                                        // User feedback
                                        if (notFound.length > 0) {
                                            console.warn(`⚠️ ${notFound.length} item(s) not found: ${notFound.join(', ')}`);
                                        }
                                        console.log(`✅ Added ${newProducts.length} product(s) to widget`);
                                    }
                                }
                            }}
                            onChange={(e) => handleChange('productIds', e.target.value)}
                            placeholder="Type IDs and press Enter (e.g. 4560, 4591)"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 transition-colors min-h-[60px] font-mono"
                        />
                    </div>
                    <div className="text-center py-4 text-xs text-slate-400 italic">Use Item Codes to populate products</div>
                </div>
            )}

            {/* Items Editor (For Category Grid & Secondary Masthead) */}
            {needsItems && (
                <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-sm text-slate-900">
                            {isCategoryGrid ? 'Category Items' : 'Carousel Items'}
                        </h3>
                        <button
                            onClick={() => {
                                const newItems = [...(widget.items || [])];
                                newItems.push({
                                    id: safeUUID(),
                                    text: 'New Item',
                                    textHi: '',
                                    image: '',
                                    leafIds: '',
                                    redirectLink: ''
                                });
                                updateWidget(widget.id, { items: newItems });
                            }}
                            className="flex items-center gap-1 text-xs font-medium px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                        >
                            <Plus size={14} /> Add Item
                        </button>
                    </div>

                    <div className="flex flex-col gap-3">
                        {(widget.items || []).map((item, idx) => (
                            <div key={item.id || idx} className="p-3 bg-slate-50 border border-slate-100 rounded-lg group relative">
                                <button
                                    onClick={() => {
                                        const newItems = (widget.items || []).filter((_, i) => i !== idx);
                                        updateWidget(widget.id, { items: newItems });
                                    }}
                                    className="absolute top-2 right-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded p-1 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Trash2 size={14} />
                                </button>

                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <div className="w-10 h-10 bg-slate-200 rounded shrink-0 flex items-center justify-center overflow-hidden border border-slate-300">
                                            {item.image ? (
                                                <img src={typeof item.image === 'string' ? item.image : URL.createObjectURL(item.image)} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-[10px] text-slate-400">Img</span>
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <input
                                                value={item.text || ''}
                                                onChange={(e) => {
                                                    const newItems = [...widget.items];
                                                    newItems[idx] = { ...newItems[idx], text: e.target.value };
                                                    updateWidget(widget.id, { items: newItems });
                                                }}
                                                placeholder="Name (En)"
                                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded"
                                            />
                                            <input
                                                value={item.textHi || ''}
                                                onChange={(e) => {
                                                    const newItems = [...widget.items];
                                                    newItems[idx] = { ...newItems[idx], textHi: e.target.value };
                                                    updateWidget(widget.id, { items: newItems });
                                                }}
                                                placeholder="Name (Hindi)"
                                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded"
                                            />
                                        </div>
                                    </div>

                                    {/* Conditional Field: Leaf IDs vs Redirect Link */}
                                    {isCategoryGrid && (
                                        <div>
                                            <label className="text-[10px] font-medium text-slate-400 block mb-0.5">Leaf IDs / Product List</label>
                                            <input
                                                value={item.leafIds || item.id || ''}
                                                onChange={(e) => {
                                                    const newItems = [...widget.items];
                                                    newItems[idx] = { ...newItems[idx], leafIds: e.target.value, id: e.target.value };
                                                    updateWidget(widget.id, { items: newItems });
                                                }}
                                                placeholder="e.g. 1020, 1030"
                                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded font-mono"
                                            />
                                        </div>
                                    )}

                                    {isSecondaryMasthead && (
                                        <div>
                                            <label className="text-[10px] font-medium text-slate-400 block mb-0.5">Redirect (Page Slug)</label>
                                            <input
                                                value={item.redirectLink || ''}
                                                onChange={(e) => {
                                                    const newItems = [...widget.items];
                                                    newItems[idx] = { ...newItems[idx], redirectLink: e.target.value };
                                                    updateWidget(widget.id, { items: newItems });
                                                }}
                                                placeholder="e.g. fruit_vegetables_plp"
                                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded font-mono"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LegacyPropertyEditor;
