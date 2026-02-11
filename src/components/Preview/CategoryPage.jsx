import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Loader2 } from 'lucide-react';
import { useWidgetContext } from '../../context/WidgetContext';
import { searchProduct, searchProductsBatch } from '../../services/CatalogService';

const CategoryPage = ({ categoryData }) => {
    const { navigateTo } = useWidgetContext();
    const [selectedSubCategory, setSelectedSubCategory] = useState(0);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);

    const heading = categoryData?.heading || 'Category';
    const subCategories = categoryData?.subCategories || [];

    // Fetch product data asynchronously (supports both local CSV and Google Sheet)
    useEffect(() => {
        if (subCategories.length === 0) {
            setProducts([]);
            return;
        }
        const subCat = subCategories[selectedSubCategory];
        if (!subCat) {
            setProducts([]);
            return;
        }

        const productCodesStr = subCat.products?.global || subCat.products?.jh || subCat.products?.cg || subCat.products?.wb || '';
        if (!productCodesStr.trim()) {
            setProducts([]);
            return;
        }

        // Split by comma, space, or both
        const codes = productCodesStr.split(/[\s,]+/).map(c => c.trim()).filter(Boolean);

        // First show instant results from local cache
        const instantResults = codes.map(code => {
            const catalogItem = searchProduct(code);
            if (catalogItem) {
                return {
                    id: catalogItem.itemCode,
                    name: catalogItem.name,
                    brand: catalogItem.brand,
                    image: catalogItem.image,
                    price: catalogItem.price,
                    mrp: catalogItem.mrp,
                    discount: catalogItem.mrp > catalogItem.price
                        ? `₹${Math.round(catalogItem.mrp - catalogItem.price)} OFF`
                        : null
                };
            }
            return null;
        });

        const hasAllLocal = instantResults.every(r => r !== null);
        if (hasAllLocal) {
            setProducts(instantResults);
            return;
        }

        // Some missing - show what we have and fetch the rest
        setProducts(instantResults.map((r, i) => r || {
            id: codes[i], name: `Loading #${codes[i]}...`, brand: '', image: null, price: 0, mrp: 0, discount: null, _loading: true
        }));
        setLoading(true);

        // Fetch missing from Google Sheet
        searchProductsBatch(codes).then(resultsMap => {
            const fullResults = codes.map(code => {
                const item = resultsMap[code.toString().trim().replace(/,/g, '')];
                if (item) {
                    return {
                        id: item.itemCode,
                        name: item.name,
                        brand: item.brand,
                        image: item.image,
                        price: item.price,
                        mrp: item.mrp,
                        discount: item.mrp > item.price
                            ? `₹${Math.round(item.mrp - item.price)} OFF`
                            : null
                    };
                }
                return {
                    id: code, name: `Product #${code}`, brand: '', image: null, price: 0, mrp: 0, discount: null
                };
            }).filter(p => p.name);
            setProducts(fullResults);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [subCategories, selectedSubCategory]);

    // Helper to get image src with Drive URL handling
    const getImageSrc = (url) => {
        if (!url) return null;
        if (url.includes('googleusercontent.com') || url.includes('drive.google.com')) {
            const fileIdMatch = url.match(/\/d\/([^\/]+)/);
            if (fileIdMatch) {
                return `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}&sz=w200`;
            }
        }
        return url;
    };

    return (
        <div className="flex flex-col" style={{ height: 'calc(100% - 48px)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200 bg-white">
                <button onClick={() => navigateTo('home')} className="p-1">
                    <ArrowLeft size={18} />
                </button>
                <h1 className="text-sm font-semibold flex-1 ml-2 truncate">{heading}</h1>
                <button className="p-1">
                    <Search size={18} />
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar - Sub-Categories */}
                {subCategories.length > 0 && (
                    <div className="w-[72px] bg-orange-50 border-r border-orange-100 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                        {subCategories.map((subCat, idx) => {
                            const imgSrc = getImageSrc(subCat.image);
                            return (
                                <div
                                    key={idx}
                                    onClick={() => setSelectedSubCategory(idx)}
                                    className={`flex flex-col items-center justify-center p-2 border-b border-orange-100 cursor-pointer transition-colors ${selectedSubCategory === idx
                                        ? 'bg-white border-l-[3px] border-l-orange-500'
                                        : 'hover:bg-orange-100'
                                        }`}
                                >
                                    {imgSrc ? (
                                        <div className="w-11 h-11 mb-1 rounded-lg overflow-hidden bg-white shadow-sm">
                                            <img
                                                src={imgSrc}
                                                alt={subCat.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    const fileIdMatch = e.target.src.match(/\/d\/([^\/]+)/);
                                                    if (fileIdMatch) {
                                                        e.target.src = `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}&sz=w200`;
                                                    } else {
                                                        e.target.style.display = 'none';
                                                    }
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-11 h-11 mb-1 rounded-lg bg-slate-100 flex items-center justify-center">
                                            <span className="text-sm">📦</span>
                                        </div>
                                    )}
                                    <span className="text-[8px] text-center leading-tight text-slate-700 font-medium line-clamp-2">
                                        {subCat.name || `Sub-cat ${idx + 1}`}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Main Content - Products */}
                <div className="flex-1 overflow-y-auto p-2" style={{ scrollbarWidth: 'none' }}>
                    {loading && (
                        <div className="flex items-center justify-center py-2 text-blue-600 text-[10px] gap-1">
                            <Loader2 size={12} className="animate-spin" />
                            <span>Loading products...</span>
                        </div>
                    )}
                    {products.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                            {products.map((product) => (
                                <div key={product.id} className="bg-white border border-slate-200 rounded-lg p-2 flex flex-col">
                                    {/* Discount Badge */}
                                    {product.discount && (
                                        <div className="flex justify-end mb-1">
                                            <span className="text-[8px] bg-green-500 text-white px-1.5 py-0.5 rounded font-bold">
                                                {product.discount}
                                            </span>
                                        </div>
                                    )}

                                    {/* Product Image */}
                                    <div className="flex justify-center mb-2">
                                        {product.image ? (
                                            <img
                                                src={product.image}
                                                alt={product.name}
                                                className="w-16 h-16 object-contain"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 bg-slate-100 rounded flex items-center justify-center">
                                                <span className="text-slate-400 text-xs">📦</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Product Info */}
                                    <div className="text-[9px] font-medium text-slate-800 mb-1 line-clamp-2 leading-tight min-h-[24px]">
                                        {product.name}
                                    </div>

                                    {/* Price */}
                                    <div className="flex items-center gap-1 mb-1.5">
                                        <span className="text-xs font-bold text-slate-900">₹{product.price}</span>
                                        {product.mrp > product.price && (
                                            <span className="text-[9px] text-slate-400 line-through">
                                                ₹{product.mrp}
                                            </span>
                                        )}
                                    </div>

                                    {/* Add Button */}
                                    <button className="w-full py-1 border-2 border-blue-600 text-blue-600 rounded text-[10px] font-bold hover:bg-blue-50 mt-auto">
                                        ADD
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <span className="text-2xl mb-2">📦</span>
                            <p className="text-xs">No products found</p>
                            <p className="text-[10px] mt-1">Add product codes in sub-category</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CategoryPage;
