import React, { useState, useEffect } from 'react';
import { useWidgetContext } from '../../context/WidgetContext';
import { Plus, Trash2, GripVertical, X, Upload, CheckCircle, Loader2 } from 'lucide-react';
import { GoogleSheetService } from '../../services/GoogleSheetService';
import { searchProduct, searchProductsBatch } from '../../services/CatalogService';
import ImageUpload from '../ImageUpload';
import { toast } from 'react-hot-toast';

// Product Code Preview - shows product names below item code input
const ProductCodePreview = ({ codesString }) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!codesString || !codesString.trim()) {
            setProducts([]);
            return;
        }

        const codes = codesString.split(/[\s,]+/).map(c => c.trim()).filter(Boolean);
        if (codes.length === 0) {
            setProducts([]);
            return;
        }

        // Instant local lookup
        const localResults = codes.map(code => {
            const item = searchProduct(code);
            return item ? { code, name: item.name, found: true } : { code, name: null, found: false };
        });

        const hasMissing = localResults.some(r => !r.found);
        if (!hasMissing) {
            setProducts(localResults);
            return;
        }

        // Show local results + loading for missing
        setProducts(localResults);
        setLoading(true);

        searchProductsBatch(codes).then(resultsMap => {
            const updated = codes.map(code => {
                const cleanCode = code.toString().trim().replace(/,/g, '');
                const item = resultsMap[cleanCode];
                return item ? { code, name: item.name, found: true } : { code, name: null, found: false };
            });
            setProducts(updated);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [codesString]);

    if (products.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-1 mt-1">
            {products.map((p, i) => (
                <span
                    key={i}
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-medium ${p.found
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-orange-50 text-orange-600 border border-orange-200'
                        }`}
                    title={p.found ? p.name : `Code ${p.code} not found in catalog`}
                >
                    {p.found ? p.name : `#${p.code}`}
                </span>
            ))}
            {loading && <Loader2 size={10} className="animate-spin text-blue-500" />}
        </div>
    );
};

const PropertyEditor = ({ widget }) => {
    const { updateWidget } = useWidgetContext();

    const handleChange = (field, value) => {
        updateWidget(widget.id, { [field]: value });
    };

    // Helper to generate random product (For classic products list)
    const addProduct = () => {
        const newProduct = {
            id: crypto.randomUUID(),
            name: 'New Product',
            price: '$99',
            image: '' // Placeholder
        };
        const currentProducts = widget.products || [];
        updateWidget(widget.id, { products: [...currentProducts, newProduct] });
    };

    const removeProduct = (productId) => {
        const currentProducts = widget.products || [];
        updateWidget(widget.id, { products: currentProducts.filter(p => p.id !== productId) });
    };

    const handleProductChange = (productId, field, value) => {
        const currentProducts = widget.products || [];
        const updatedProducts = currentProducts.map(p =>
            p.id === productId ? { ...p, [field]: value } : p
        );
        updateWidget(widget.id, { products: updatedProducts });
    };

    const isCategoryGrid = widget.type === 'Category Grid' || widget.type === 'category'; // Handle API type too
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
                    <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Slug Name (Required for Script)</label>
                        <input
                            type="text"
                            value={widget.slug || ''}
                            onChange={(e) => handleChange('slug', e.target.value)}
                            placeholder="e.g., rice_mela_offer_spr"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                        />
                    </div>

                    {/* Start Time: Hide for SPR Optimize and Banner PLP */}
                    {!isSPROpt && !isBannerPLP && (
                        <div>
                            <label className="text-xs font-medium text-slate-500 mb-1 block">Start Time</label>
                            <input
                                type="datetime-local"
                                value={widget.startTime || ''}
                                onChange={(e) => handleChange('startTime', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">End Time</label>
                        <input
                            type="datetime-local"
                            value={widget.endTime || ''}
                            onChange={(e) => handleChange('endTime', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>

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

                                            let resultsMap = {};

                                            // Use CatalogService for reliable fetching (Local + CSV Cache)
                                            try {
                                                console.log('[PropertyEditor] Fetching via CatalogService...');
                                                resultsMap = await searchProductsBatch(ids);
                                                console.log('[PropertyEditor] CatalogService returned:', Object.keys(resultsMap).length, 'products');
                                            } catch (error) {
                                                console.warn('[PropertyEditor] CatalogService failed:', error.message);
                                            }

                                            const newProducts = ids.map(id => {
                                                const cleanId = id.toString().trim().replace(/,/g, '');
                                                const p = resultsMap[cleanId];

                                                if (p) {
                                                    console.log('[PropertyEditor] Found:', cleanId);
                                                    return {
                                                        id: crypto.randomUUID(),
                                                        itemCode: p.itemCode,
                                                        name: p.name || p.display_name || `Product ${p.itemCode}`,
                                                        price: p.priceDisplay || `₹${p.price}`,
                                                        image: p.image || p.main_image || '',
                                                        mrp: p.mrp || 0
                                                    };
                                                }
                                                return {
                                                    id: crypto.randomUUID(),
                                                    itemCode: cleanId,
                                                    name: `Product ${cleanId} (Not Found)`,
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
                                    id: crypto.randomUUID(),
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

                                    console.log('[PropertyEditor] Processing item codes:', ids);

                                    let resultsMap = {};

                                    // Use CatalogService for reliable fetching (Local + CSV Cache)
                                    try {
                                        console.log('[PropertyEditor] Fetching via CatalogService...');
                                        resultsMap = await searchProductsBatch(ids);
                                        console.log('[PropertyEditor] CatalogService returned:', Object.keys(resultsMap).length, 'products');
                                    } catch (error) {
                                        console.warn('[PropertyEditor] CatalogService failed:', error.message);
                                    }

                                    const newProducts = [];
                                    const notFound = [];

                                    ids.forEach(id => {
                                        const cleanId = id.toString().trim().replace(/,/g, '');
                                        const p = resultsMap[cleanId];

                                        if (p) {
                                            console.log('[PropertyEditor] Found:', cleanId);
                                            newProducts.push({
                                                id: crypto.randomUUID(),
                                                itemCode: p.itemCode,
                                                name: p.name || `Item ${p.itemCode}`,
                                                price: p.priceDisplay || `₹${p.price}`,
                                                image: p.image || ''
                                            });
                                        } else {
                                            console.warn('[PropertyEditor] Product not found:', cleanId);
                                            notFound.push(cleanId);
                                            // Still add placeholder
                                            newProducts.push({
                                                id: crypto.randomUUID(),
                                                itemCode: cleanId,
                                                name: `Item ${cleanId} (Not Found)`,
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
                                    id: crypto.randomUUID(),
                                    text: 'New Item',
                                    textHi: '',
                                    image: '',
                                    leafIds: '',
                                    redirectLink: '',
                                    categoryPage: { heading: '' },
                                    subCategories: []
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
                                    className="absolute top-2 right-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded p-1 opacity-0 group-hover:opacity-100 transition-all z-10"
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

                                        {/* Image Upload for Item */}
                                        <div className="flex flex-col justify-center">
                                            <label
                                                htmlFor={`item-img-${idx}`}
                                                className="p-1 bg-blue-100 text-blue-600 rounded cursor-pointer hover:bg-blue-200"
                                                title="Upload Image"
                                            >
                                                <Upload size={14} />
                                            </label>
                                            <input
                                                id={`item-img-${idx}`}
                                                type="file"
                                                accept="image/*"
                                                onChange={async (e) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        try {
                                                            toast.loading('Uploading...', { id: `item-${idx}` });
                                                            const result = await GoogleSheetService.uploadMediaToDrive(file);
                                                            if (result.success) {
                                                                const newItems = [...widget.items];
                                                                newItems[idx] = { ...newItems[idx], image: result.viewUrl, driveFileId: result.fileId };
                                                                updateWidget(widget.id, { items: newItems });
                                                                toast.success('Uploaded!', { id: `item-${idx}` });
                                                            } else {
                                                                toast.error('Upload failed', { id: `item-${idx}` });
                                                            }
                                                        } catch (err) {
                                                            toast.error('Upload error', { id: `item-${idx}` });
                                                        }
                                                    }
                                                    e.target.value = '';
                                                }}
                                                className="hidden"
                                            />
                                        </div>
                                    </div>

                                    {/* Sub-Categories Section (For Category Grid) */}
                                    {isCategoryGrid && (
                                        <div className="border-t border-slate-300 pt-3 mt-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="text-[10px] font-semibold text-slate-600">Sub-Categories</div>
                                                <button
                                                    onClick={() => {
                                                        const newItems = [...widget.items];
                                                        const subCategories = [...(newItems[idx].subCategories || [])];
                                                        subCategories.push({
                                                            id: crypto.randomUUID(),
                                                            name: '',
                                                            nameHi: '',
                                                            image: '',
                                                            products: { global: '', JH: '', CG: '', WB: '' }
                                                        });
                                                        newItems[idx] = { ...newItems[idx], subCategories };
                                                        updateWidget(widget.id, { items: newItems });
                                                    }}
                                                    className="flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 bg-green-50 text-green-600 rounded hover:bg-green-100"
                                                >
                                                    <Plus size={10} /> Add Sub-Category
                                                </button>
                                            </div>

                                            <div className="space-y-2">
                                                {(item.subCategories || []).map((subCat, subIdx) => (
                                                    <div key={subCat.id || subIdx} className="p-2 bg-white border border-slate-200 rounded relative">
                                                        <button
                                                            onClick={() => {
                                                                const newItems = [...widget.items];
                                                                const subCategories = (newItems[idx].subCategories || []).filter((_, i) => i !== subIdx);
                                                                newItems[idx] = { ...newItems[idx], subCategories };
                                                                updateWidget(widget.id, { items: newItems });
                                                            }}
                                                            className="absolute top-1 right-1 text-slate-300 hover:text-red-400"
                                                        >
                                                            <X size={12} />
                                                        </button>

                                                        <div className="text-[9px] font-bold text-slate-500 mb-1">Sub-Cat #{subIdx + 1}</div>

                                                        <input
                                                            value={subCat.name || ''}
                                                            onChange={(e) => {
                                                                const newItems = [...widget.items];
                                                                const subCategories = [...(newItems[idx].subCategories || [])];
                                                                subCategories[subIdx] = { ...subCategories[subIdx], name: e.target.value };
                                                                newItems[idx] = { ...newItems[idx], subCategories };
                                                                updateWidget(widget.id, { items: newItems });
                                                            }}
                                                            placeholder="Name (e.g., Basmati Rice)"
                                                            className="w-full px-2 py-1 text-[10px] border border-slate-200 rounded mb-1.5"
                                                        />

                                                        <div className="flex gap-1 mb-1.5">
                                                            <input
                                                                value={subCat.image || ''}
                                                                onChange={(e) => {
                                                                    const newItems = [...widget.items];
                                                                    const subCategories = [...(newItems[idx].subCategories || [])];
                                                                    subCategories[subIdx] = { ...subCategories[subIdx], image: e.target.value };
                                                                    newItems[idx] = { ...newItems[idx], subCategories };
                                                                    updateWidget(widget.id, { items: newItems });
                                                                }}
                                                                placeholder="Image URL"
                                                                className="flex-1 px-2 py-1 text-[9px] border border-slate-200 rounded font-mono"
                                                            />
                                                            <label
                                                                htmlFor={`subcat-img-${idx}-${subIdx}`}
                                                                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-purple-100'); }}
                                                                onDragLeave={(e) => { e.currentTarget.classList.remove('bg-purple-100'); }}
                                                                onDrop={(e) => {
                                                                    e.preventDefault();
                                                                    e.currentTarget.classList.remove('bg-purple-100');
                                                                    const file = e.dataTransfer.files[0];
                                                                    if (file) {
                                                                        const fileInput = document.getElementById(`subcat-img-${idx}-${subIdx}`);
                                                                        const dataTransfer = new DataTransfer();
                                                                        dataTransfer.items.add(file);
                                                                        fileInput.files = dataTransfer.files;
                                                                        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                                                                    }
                                                                }}
                                                                className="flex items-center justify-center px-1.5 py-0.5 bg-purple-500 text-white rounded text-[8px] cursor-pointer hover:bg-purple-600 transition-colors"
                                                                title="Upload image"
                                                            >
                                                                <Upload size={10} />
                                                            </label>
                                                            <input
                                                                id={`subcat-img-${idx}-${subIdx}`}
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={async (e) => {
                                                                    const file = e.target.files[0];
                                                                    if (file) {
                                                                        try {
                                                                            toast.loading('Uploading...', { id: `subcat-${idx}-${subIdx}` });
                                                                            const result = await GoogleSheetService.uploadMediaToDrive(file);
                                                                            if (result.success) {
                                                                                const newItems = [...widget.items];
                                                                                const subCategories = [...(newItems[idx].subCategories || [])];
                                                                                subCategories[subIdx] = { ...subCategories[subIdx], image: result.viewUrl, driveFileId: result.fileId };
                                                                                newItems[idx] = { ...newItems[idx], subCategories };
                                                                                updateWidget(widget.id, { items: newItems });
                                                                                toast.success('Uploaded!', { id: `subcat-${idx}-${subIdx}` });
                                                                            } else {
                                                                                toast.error('Upload failed', { id: `subcat-${idx}-${subIdx}` });
                                                                            }
                                                                        } catch (err) {
                                                                            toast.error('Upload error', { id: `subcat-${idx}-${subIdx}` });
                                                                        }
                                                                    }
                                                                    e.target.value = '';
                                                                }}
                                                                className="hidden"
                                                            />
                                                        </div>

                                                        {/* State-wise Products */}
                                                        <div className="text-[9px] font-semibold text-slate-500 mb-1">Products by State</div>
                                                        <div className="space-y-1">
                                                            {['global', 'JH', 'CG', 'WB'].map(state => (
                                                                <div key={state} className="flex items-center gap-1.5">
                                                                    <span className="text-[9px] font-medium text-slate-600 w-12">{state === 'global' ? 'Global' : state}:</span>
                                                                    <input
                                                                        value={subCat.products?.[state] || ''}
                                                                        onChange={(e) => {
                                                                            const newItems = [...widget.items];
                                                                            const subCategories = [...(newItems[idx].subCategories || [])];
                                                                            subCategories[subIdx] = {
                                                                                ...subCategories[subIdx],
                                                                                products: {
                                                                                    ...(subCategories[subIdx].products || {}),
                                                                                    [state]: e.target.value
                                                                                }
                                                                            };
                                                                            newItems[idx] = { ...newItems[idx], subCategories };
                                                                            updateWidget(widget.id, { items: newItems });
                                                                        }}
                                                                        placeholder="Item codes (e.g. 4586)"
                                                                        className="flex-1 px-1.5 py-0.5 text-[9px] border border-slate-200 rounded font-mono"
                                                                    />
                                                                    {state === 'global' && subCat.products?.global && (
                                                                        <ProductCodePreview codesString={subCat.products.global} />
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
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

export default PropertyEditor;
