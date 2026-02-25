import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, GripVertical, Layers, Image as ImageIcon, ImagePlus, Loader2 } from 'lucide-react';
import TextInput from '../Inputs/TextInput';
import PillSelector from '../Inputs/PillSelector';
import StateProductEditor from '../Inputs/StateProductEditor';
import SubCategoryList from './SubCategoryList';
import ExpandPageSection from './ExpandPageSection';
import { LocalApiService } from '../../services/LocalApiService';

/**
 * CarouselItemEditor — Accordion list for Secondary Masthead carousel items.
 *
 * Full category_page flow (same as ScrollItemEditor / Collection Banner Scroll):
 *   - Heading (page heading on destination page)
 *   - Banner Image (uploaded to local server)
 *   - Page Type: category_page | product_listing_page
 *   - PLP: ExpandPageSection + StateProductEditor
 *   - Category: SubCategoryList with showImage + showHindi
 *
 * Props (InputRegistry interface):
 * - label, value: CarouselItem[], onChange(items), helperText, error, required
 */
const CarouselItemEditor = ({
    label,
    value = [],
    onChange,
    helperText,
    error,
    required,
    disabled,
}) => {
    const [expandedIndex, setExpandedIndex] = useState(null);
    const [uploadingImageIdx, setUploadingImageIdx] = useState(null);

    const items = Array.isArray(value) ? value : [];

    const addItem = () => {
        const newItem = {
            pageHeading: '',
            image: null,
            pageType: 'category_page',
            expandPage: false,
            plpWidgets: [],
            stateProducts: { global: '' },
            subCategories: [],
        };
        onChange([...items, newItem]);
        setExpandedIndex(items.length);
    };

    const removeItem = (index) => {
        onChange(items.filter((_, i) => i !== index));
        if (expandedIndex === index) setExpandedIndex(null);
    };

    const updateItem = (index, field, val) => {
        onChange(items.map((item, i) => i === index ? { ...item, [field]: val } : item));
    };

    return (
        <div className="mb-3">
            <label className="block text-xs font-medium text-slate-500 mb-1">
                {label}
                {required && <span className="text-red-400 ml-1">*</span>}
            </label>

            {items.length > 0 && (
                <div className="mb-2 text-xs text-slate-500">
                    {items.length} carousel item{items.length !== 1 ? 's' : ''}
                </div>
            )}

            {items.map((item, index) => (
                <div key={index} className="border border-slate-200 rounded-lg mb-2 overflow-hidden bg-white">
                    {/* Accordion header */}
                    <div
                        onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                        className="w-full flex items-center gap-2 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left cursor-pointer"
                    >
                        <GripVertical size={12} className="text-slate-300" />
                        {expandedIndex === index
                            ? <ChevronDown size={14} className="text-slate-400" />
                            : <ChevronRight size={14} className="text-slate-400" />
                        }
                        {item.image
                            ? <div className="w-6 h-6 rounded bg-slate-200 overflow-hidden shrink-0">
                                <img src={typeof item.image === 'string' ? item.image : URL.createObjectURL(item.image)} alt="" className="w-full h-full object-cover" />
                            </div>
                            : <Layers size={14} className="text-teal-500" />
                        }
                        <span className="text-sm text-slate-700 flex-1 truncate">
                            {item.pageHeading || item.text || `Item ${index + 1}`}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                            {item.pageType === 'category_page' ? 'CAT' : 'PLP'}
                        </span>
                        {item.subCategories?.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-100 text-teal-600 border border-teal-200">
                                {item.subCategories.length} sub
                            </span>
                        )}
                        {!disabled && (
                            <button
                                onClick={(e) => { e.stopPropagation(); removeItem(index); }}
                                className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                            >
                                <Trash2 size={12} />
                            </button>
                        )}
                    </div>

                    {/* Expanded content */}
                    {expandedIndex === index && (
                        <div className="p-3 space-y-1">
                            {/* Heading → maps to page_heading in Page Layout */}
                            <TextInput
                                label="Heading"
                                placeholder="Page heading (shown on destination page)"
                                value={item.pageHeading || ''}
                                onChange={(val) => updateItem(index, 'pageHeading', val)}
                                required
                                disabled={disabled}
                            />

                            {/* Banner Image — uploaded to local server */}
                            <div className="mb-2">
                                <label className="block text-xs font-medium text-slate-500 mb-1">Carousel Image</label>
                                <label className="cursor-pointer group block w-fit">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={async (e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                const file = e.target.files[0];
                                                if (file.size > 300 * 1024) {
                                                    alert(`Image too large (${Math.round(file.size / 1024)}KB). Max allowed: 300KB.`);
                                                    e.target.value = '';
                                                    return;
                                                }
                                                updateItem(index, 'image', file);
                                                try {
                                                    setUploadingImageIdx(index);
                                                    const result = await LocalApiService.uploadMedia(file);
                                                    if (result.viewUrl) updateItem(index, 'image', result.viewUrl);
                                                } catch (err) {
                                                    console.error('[CarouselItemEditor] Image upload failed:', err);
                                                } finally {
                                                    setUploadingImageIdx(null);
                                                }
                                            }
                                        }}
                                        disabled={disabled}
                                    />
                                    {uploadingImageIdx === index ? (
                                        <div className="w-14 h-14 rounded-lg border border-blue-300 flex items-center justify-center bg-blue-50">
                                            <Loader2 size={16} className="animate-spin text-blue-500" />
                                        </div>
                                    ) : item.image && (item.image instanceof File || item.image instanceof Blob || (typeof item.image === 'string' && item.image.length > 0)) ? (
                                        <div className="w-14 h-14 rounded-lg border border-slate-200 overflow-hidden group-hover:ring-2 group-hover:ring-blue-500/30 transition-all">
                                            <img src={typeof item.image === 'string' ? item.image : URL.createObjectURL(item.image)} alt="" className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="w-14 h-14 rounded-lg border border-dashed border-slate-300 flex flex-col items-center justify-center bg-slate-50 group-hover:border-blue-400 group-hover:bg-blue-50 transition-all">
                                            <ImagePlus size={16} className="text-slate-400 group-hover:text-blue-500 mb-0.5" />
                                            <span className="text-[9px] text-slate-400 group-hover:text-blue-500">Upload</span>
                                        </div>
                                    )}
                                </label>
                            </div>

                            <PillSelector
                                label="Page Type"
                                options={[
                                    { label: 'Category Page', value: 'category_page' },
                                    { label: 'Product Listing', value: 'product_listing_page' },
                                ]}
                                value={item.pageType || 'category_page'}
                                onChange={(val) => updateItem(index, 'pageType', val)}
                            />

                            {/* PLP: ExpandPage + State Products */}
                            {item.pageType === 'product_listing_page' && (
                                <ExpandPageSection
                                    expandPage={item.expandPage || false}
                                    plpWidgets={item.plpWidgets || []}
                                    onChange={({ expandPage, plpWidgets }) => {
                                        onChange(items.map((it, i) =>
                                            i === index ? { ...it, expandPage, plpWidgets } : it
                                        ));
                                    }}
                                    disabled={disabled}
                                />
                            )}

                            {item.pageType === 'product_listing_page' && (
                                <StateProductEditor
                                    label="State-Wise Products"
                                    value={item.stateProducts || { global: '' }}
                                    onChange={(val) => updateItem(index, 'stateProducts', val)}
                                    helperText="Global is required. Add states for location-specific products."
                                    disabled={disabled}
                                />
                            )}

                            {/* Category Page: Sub-Categories with image + hindi */}
                            {item.pageType === 'category_page' && (
                                <div className="mt-3 pt-3 border-t border-slate-200">
                                    <label className="block text-xs font-semibold text-slate-500 mb-2">
                                        Sub-Categories
                                    </label>
                                    <SubCategoryList
                                        items={item.subCategories || []}
                                        onChange={(subs) => updateItem(index, 'subCategories', subs)}
                                        showImage={true}
                                        showHindi={true}
                                        disabled={disabled}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}

            {!disabled && (
                <button
                    onClick={addItem}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors w-full justify-center"
                >
                    <Plus size={14} />
                    Add Carousel Item
                </button>
            )}

            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
            {!error && helperText && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
        </div>
    );
};

export default CarouselItemEditor;
