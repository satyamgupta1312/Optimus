import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, GripVertical, Image as ImageIcon } from 'lucide-react';
import TextInput from '../Inputs/TextInput';
import PillSelector from '../Inputs/PillSelector';
import StateProductEditor from '../Inputs/StateProductEditor';
import ImageUpload from '../ImageUpload';

/**
 * ScrollItemEditor — Accordion list editor for Collection Banner scroll mode.
 *
 * Each carousel item has: title, image, pageType, productIds, stateProducts
 *
 * Props (InputRegistry interface):
 * - label, value: ScrollItem[], onChange(items), helperText, error, required
 */
const ScrollItemEditor = ({
    label,
    value = [],
    onChange,
    helperText,
    error,
    required,
    disabled,
}) => {
    const [expandedIndex, setExpandedIndex] = useState(null);

    const items = Array.isArray(value) ? value : [];

    const addItem = () => {
        const newItem = {
            title: '',
            image: null,
            pageType: 'product_listing_page',
            productIds: '',
            stateProducts: { global: '' },
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
                    {items.length} item{items.length !== 1 ? 's' : ''}
                </div>
            )}

            {items.map((item, index) => (
                <div key={index} className="border border-slate-200 rounded-lg mb-2 overflow-hidden bg-white">
                    {/* Accordion header */}
                    <button
                        onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                        className="w-full flex items-center gap-2 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
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
                            : <ImageIcon size={14} className="text-slate-400" />
                        }
                        <span className="text-sm text-slate-700 flex-1 truncate">
                            {item.title || `Item ${index + 1}`}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                            {item.pageType === 'category_page' ? 'CAT' : 'PLP'}
                        </span>
                        {!disabled && (
                            <button
                                onClick={(e) => { e.stopPropagation(); removeItem(index); }}
                                className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                            >
                                <Trash2 size={12} />
                            </button>
                        )}
                    </button>

                    {/* Expanded content */}
                    {expandedIndex === index && (
                        <div className="p-3 space-y-1">
                            <TextInput
                                label="Item Title"
                                value={item.title || ''}
                                onChange={(val) => updateItem(index, 'title', val)}
                                required
                                disabled={disabled}
                            />

                            <div className="mb-3">
                                <ImageUpload
                                    label="Banner Image"
                                    currentImage={item.image}
                                    onImageSelect={(file, preview) => updateItem(index, 'image', preview || file)}
                                />
                            </div>

                            <PillSelector
                                label="Page Type"
                                options={[
                                    { label: 'Product Listing', value: 'product_listing_page' },
                                    { label: 'Category Page', value: 'category_page' },
                                ]}
                                value={item.pageType || 'product_listing_page'}
                                onChange={(val) => updateItem(index, 'pageType', val)}
                            />

                            <TextInput
                                label="Product Codes"
                                value={item.productIds || ''}
                                onChange={(val) => updateItem(index, 'productIds', val)}
                                placeholder="Comma-separated item codes"
                                helperText="Comma-separated, CSV URL, or newline-separated"
                                required
                                disabled={disabled}
                            />

                            <StateProductEditor
                                label="State-Wise Products"
                                value={item.stateProducts || { global: '' }}
                                onChange={(val) => updateItem(index, 'stateProducts', val)}
                                helperText="Global is required. Add states for location-specific products."
                                disabled={disabled}
                            />
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

export default ScrollItemEditor;
