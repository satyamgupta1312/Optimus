import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, GripVertical, Grid3X3 } from 'lucide-react';
import TextInput from '../Inputs/TextInput';
import PillSelector from '../Inputs/PillSelector';
import ImageUpload from '../ImageUpload';
import SubCategoryList from './SubCategoryList';
import ExpandPageSection from './ExpandPageSection';
import StateProductEditor from '../Inputs/StateProductEditor';
import { ImagePlus } from 'lucide-react';

/**
 * CategoryItemEditor — 2-level accordion for Collection Banner stick mode.
 * Level 1: Category items → Level 2: Sub-categories (via SubCategoryList)
 *
 * Props (InputRegistry interface):
 * - label, value: CategoryItem[], onChange(items), helperText, error, required
 */
const CategoryItemEditor = ({
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
            textHi: '',
            image: null,
            pageType: 'category_page',
            expandPage: false,
            plpWidgets: [],
            stateProducts: { global: '' },
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
                    {items.length} categor{items.length !== 1 ? 'ies' : 'y'}
                </div>
            )}

            {items.map((item, index) => (
                <div key={index} className="border border-slate-200 rounded-lg mb-2 bg-white">
                    {/* Level 1: Category header */}
                    <button
                        onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                        className="w-full flex items-center gap-2 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                    >
                        <GripVertical size={12} className="text-slate-300" />
                        {expandedIndex === index
                            ? <ChevronDown size={14} className="text-slate-400" />
                            : <ChevronRight size={14} className="text-slate-400" />
                        }
                        <Grid3X3 size={14} className="text-purple-500" />
                        <span className="text-sm text-slate-700 flex-1 truncate">
                            {item.text || `Category ${index + 1}`}
                        </span>
                        {item.subCategories?.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-600 border border-purple-200">
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
                            <div className="flex gap-3 items-start mb-3">
                                <div className="flex-1 space-y-3">
                                    <TextInput
                                        label="Category Name (English)"
                                        value={item.text || ''}
                                        onChange={(val) => updateItem(index, 'text', val)}
                                        required
                                        disabled={disabled}
                                    />
                                    <TextInput
                                        label="Category Name (Hindi)"
                                        value={item.textHi || ''}
                                        onChange={(val) => updateItem(index, 'textHi', val)}
                                        disabled={disabled}
                                    />
                                </div>
                                {/* Small image upload on right */}
                                <div className="shrink-0 mt-5">
                                    <label className="cursor-pointer group block">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    updateItem(index, 'image', e.target.files[0]);
                                                }
                                            }}
                                            disabled={disabled}
                                        />
                                        {item.image ? (
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

                            {/* Level 2: Sub-Categories — only when category_page selected */}
                            {item.pageType === 'category_page' && (
                                <div className="mt-3 pt-3 border-t border-slate-200">
                                    <label className="block text-xs font-semibold text-slate-500 mb-2">
                                        Sub-Categories
                                    </label>
                                    <SubCategoryList
                                        items={item.subCategories || []}
                                        onChange={(subs) => updateItem(index, 'subCategories', subs)}
                                        showImage
                                        showHindi
                                        disabled={disabled}
                                    />
                                </div>
                            )}

                            {/* PLP Configuration — only when product_listing_page selected */}
                            {item.pageType === 'product_listing_page' && (
                                <div className="mt-3 pt-3 border-t border-slate-200">
                                    <ExpandPageSection
                                        expandPage={item.expandPage || false}
                                        plpWidgets={item.plpWidgets || []}
                                        onChange={({ expandPage, plpWidgets }) => {
                                            updateItem(index, 'expandPage', expandPage);
                                            updateItem(index, 'plpWidgets', plpWidgets);
                                        }}
                                        disabled={disabled}
                                    />

                                    {!item.expandPage && (
                                        <div className="mt-3">
                                            <StateProductEditor
                                                label="Products"
                                                value={item.stateProducts || { global: '' }}
                                                onChange={(val) => updateItem(index, 'stateProducts', val)}
                                                required
                                                disabled={disabled}
                                            />
                                        </div>
                                    )}
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
                    Add Category
                </button>
            )}

            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
            {!error && helperText && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
        </div>
    );
};

export default CategoryItemEditor;
