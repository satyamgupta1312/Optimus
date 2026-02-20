import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, GripVertical, ImagePlus } from 'lucide-react';
import TextInput from '../Inputs/TextInput';
import StateProductEditor from '../Inputs/StateProductEditor';

/**
 * SubCategoryList — Shared sub-component for sub-category editing.
 * Used by both CategoryItemEditor and CarouselItemEditor.
 *
 * Props:
 * - items: SubCategory[] — [{name, nameHi?, image?, products: {global, ...states}}]
 * - onChange(items)
 * - showImage: boolean — whether to show image upload (stick mode has images)
 * - showHindi: boolean — whether to show Hindi name field
 */
const SubCategoryList = ({
    items = [],
    onChange,
    showImage = false,
    showHindi = false,
    disabled,
}) => {
    const [expandedIndex, setExpandedIndex] = useState(null);

    const addItem = () => {
        onChange([...items, { name: '', nameHi: '', image: null, products: { global: '' } }]);
        setExpandedIndex(items.length);
    };

    const removeItem = (index) => {
        const next = items.filter((_, i) => i !== index);
        onChange(next);
        if (expandedIndex === index) setExpandedIndex(null);
    };

    const updateItem = (index, field, value) => {
        const next = items.map((item, i) =>
            i === index ? { ...item, [field]: value } : item
        );
        onChange(next);
    };

    const handleImageSelect = (index, e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => updateItem(index, 'image', reader.result);
            reader.readAsDataURL(file);
        }
    };

    return (
        <div>
            {items.map((item, index) => (
                <div key={index} className="border border-slate-200 rounded-lg mb-2 overflow-hidden bg-white">
                    {/* Accordion header */}
                    <button
                        onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                        className="w-full flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                    >
                        <GripVertical size={12} className="text-slate-300" />
                        {expandedIndex === index
                            ? <ChevronDown size={14} className="text-slate-400" />
                            : <ChevronRight size={14} className="text-slate-400" />
                        }
                        <span className="text-sm text-slate-700 flex-1 truncate">
                            {item.name || `Sub-category ${index + 1}`}
                        </span>

                        {/* Small image thumbnail on right */}
                        {showImage && item.image && (
                            <div className="w-6 h-6 rounded border border-slate-200 overflow-hidden shrink-0">
                                <img src={item.image} alt="" className="w-full h-full object-cover" />
                            </div>
                        )}

                        <span className="text-[10px] text-slate-400">#{index + 1}</span>
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
                            {/* Name + Image inline when showImage */}
                            {showImage ? (
                                <div className="flex gap-3 items-start">
                                    <div className="flex-1">
                                        <TextInput
                                            label="Sub-Category Name"
                                            value={item.name || ''}
                                            onChange={(val) => updateItem(index, 'name', val)}
                                            required
                                            disabled={disabled}
                                        />
                                    </div>
                                    {/* Small image upload on right */}
                                    <div className="shrink-0 mt-5">
                                        <label className="cursor-pointer group">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => handleImageSelect(index, e)}
                                            />
                                            {item.image ? (
                                                <div className="w-10 h-10 rounded-lg border border-slate-200 overflow-hidden group-hover:ring-2 group-hover:ring-blue-500/30 transition-all">
                                                    <img src={item.image} alt="" className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg border border-dashed border-slate-300 flex items-center justify-center bg-slate-50 group-hover:border-blue-400 group-hover:bg-blue-50 transition-all">
                                                    <ImagePlus size={14} className="text-slate-400 group-hover:text-blue-500" />
                                                </div>
                                            )}
                                        </label>
                                    </div>
                                </div>
                            ) : (
                                <TextInput
                                    label="Sub-Category Name"
                                    value={item.name || ''}
                                    onChange={(val) => updateItem(index, 'name', val)}
                                    required
                                    disabled={disabled}
                                />
                            )}

                            {showHindi && (
                                <TextInput
                                    label="Sub-Category Name (Hindi)"
                                    value={item.nameHi || ''}
                                    onChange={(val) => updateItem(index, 'nameHi', val)}
                                    disabled={disabled}
                                />
                            )}

                            <StateProductEditor
                                label="Products"
                                value={item.products || { global: '' }}
                                onChange={(val) => updateItem(index, 'products', val)}
                                required
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
                    Add Sub-Category
                </button>
            )}
        </div>
    );
};

export default SubCategoryList;
