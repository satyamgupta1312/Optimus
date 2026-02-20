import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, GripVertical, Layers } from 'lucide-react';
import TextInput from '../Inputs/TextInput';
import PillSelector from '../Inputs/PillSelector';
import ImageUpload from '../ImageUpload';
import SubCategoryList from './SubCategoryList';

/**
 * CarouselItemEditor — Accordion list for Secondary Masthead carousel items.
 * Each item has: text, image, pageType, pageHeading, subCategories
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

    const items = Array.isArray(value) ? value : [];

    const addItem = () => {
        const newItem = {
            text: '',
            image: null,
            pageType: 'category_page',
            pageHeading: '',
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
                    <button
                        onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                        className="w-full flex items-center gap-2 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                    >
                        <GripVertical size={12} className="text-slate-300" />
                        {expandedIndex === index
                            ? <ChevronDown size={14} className="text-slate-400" />
                            : <ChevronRight size={14} className="text-slate-400" />
                        }
                        <Layers size={14} className="text-teal-500" />
                        <span className="text-sm text-slate-700 flex-1 truncate">
                            {item.text || `Carousel Item ${index + 1}`}
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
                    </button>

                    {/* Expanded content */}
                    {expandedIndex === index && (
                        <div className="p-3 space-y-1">
                            <TextInput
                                label="Display Text"
                                value={item.text || ''}
                                onChange={(val) => updateItem(index, 'text', val)}
                                required
                                disabled={disabled}
                            />

                            <div className="mb-3">
                                <ImageUpload
                                    label="Carousel Image"
                                    currentImage={item.image}
                                    onImageSelect={(file, preview) => updateItem(index, 'image', preview || file)}
                                />
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

                            <TextInput
                                label="Page Heading"
                                value={item.pageHeading || ''}
                                onChange={(val) => updateItem(index, 'pageHeading', val)}
                                required
                                disabled={disabled}
                            />

                            {/* Sub-Categories */}
                            <div className="mt-3 pt-3 border-t border-slate-200">
                                <label className="block text-xs font-semibold text-slate-500 mb-2">
                                    Sub-Categories
                                </label>
                                <SubCategoryList
                                    items={item.subCategories || []}
                                    onChange={(subs) => updateItem(index, 'subCategories', subs)}
                                    disabled={disabled}
                                />
                            </div>
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
