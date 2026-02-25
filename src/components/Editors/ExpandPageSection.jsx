import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, LayoutGrid, Layers, GripVertical } from 'lucide-react';
import TextInput from '../Inputs/TextInput';
import StateProductEditor from '../Inputs/StateProductEditor';

/**
 * Supported widget types that can be added to a PLP page via Expand Page.
 * Category Grid is NOT supported on PLP pages.
 * multimedia_double_product_row is on hold (NOT AVAILABLE).
 */
const PLP_WIDGET_TYPES = [
    { type: 'carousel', label: 'Carousel' },
    { type: 'masthead_secondary_category_hp', label: 'Secondary Masthead' },
    { type: 'single_product_row', label: 'SPR Standard' },
    { type: 'single_product_row_v2', label: 'SPR Optimized' },
    { type: 'multimedia_single_product_row', label: 'Multimedia SPR' },
    { type: 'multimedia_single_product_row_v2', label: 'Multimedia SPR V2' },
    { type: 'double_product_row', label: 'Double Row' },
    { type: 'double_product_row_v2', label: 'Double Row V2' },
    { type: 'multimedia_double_product_row_v2', label: 'MM Double Row V2' },
];

/**
 * ExpandPageSection — Reusable toggle + widget list for PLP page expansion.
 *
 * When the user selects `product_listing_page` as page type, this section appears
 * allowing them to toggle "Expand Page" ON/OFF. When ON, they can add multiple
 * widgets to the PLP page — each widget gets its own title and state-wise products.
 *
 * All added widgets will be mapped to the same Page Layout during deployment
 * via layout_widget mapping with incremental priority.
 *
 * Props:
 * - expandPage: boolean — current toggle state
 * - plpWidgets: array — list of PLP page widgets
 * - onChange({ expandPage, plpWidgets }) — callback when data changes
 * - disabled: boolean — disable editing
 *
 * Wiki: wiki/PLP-PAGE-widget-support.md §3-4
 * Config: src/config/widgets/PLP-PAGE-widget-support.js → EXPAND_PAGE_CONFIG
 */
const ExpandPageSection = ({ value, expandPage: expandPageProp, plpWidgets: plpWidgetsProp = [], onChange, disabled }) => {
    // Support both: value={expandPage, plpWidgets} (from PropertyEditor) AND direct props
    const expandPage = value?.expandPage ?? expandPageProp ?? false;
    const plpWidgets = value?.plpWidgets ?? plpWidgetsProp ?? [];

    const [showPicker, setShowPicker] = useState(false);
    const [expandedWidgetId, setExpandedWidgetId] = useState(null);

    const toggleExpand = () => {
        const next = !expandPage;
        onChange({ expandPage: next, plpWidgets: next ? plpWidgets : [] });
    };

    const addPlpWidget = (widgetType) => {
        const typeDef = PLP_WIDGET_TYPES.find(t => t.type === widgetType);
        const newWidget = {
            id: crypto.randomUUID(),
            type: widgetType,
            label: typeDef?.label || widgetType,
            title: '',
            stateProducts: { global: '' },
        };
        onChange({
            expandPage: true,
            plpWidgets: [...plpWidgets, newWidget],
        });
        setShowPicker(false);
        setExpandedWidgetId(newWidget.id);
    };

    const removePlpWidget = (id) => {
        onChange({
            expandPage,
            plpWidgets: plpWidgets.filter(w => w.id !== id),
        });
        if (expandedWidgetId === id) setExpandedWidgetId(null);
    };

    const updatePlpWidget = (id, field, value) => {
        onChange({
            expandPage,
            plpWidgets: plpWidgets.map(w =>
                w.id === id ? { ...w, [field]: value } : w
            ),
        });
    };

    return (
        <div className="mt-3">
            {/* Toggle */}
            <div className="flex items-center justify-between px-3 py-2.5 bg-violet-50 border border-violet-200 rounded-lg">
                <div className="flex items-center gap-2">
                    <Layers size={14} className="text-violet-500" />
                    <div>
                        <span className="text-xs font-semibold text-violet-700">Expand Page</span>
                        <span className="text-[10px] text-violet-400 ml-1.5">Add widgets to PLP</span>
                    </div>
                </div>
                <button
                    onClick={toggleExpand}
                    disabled={disabled}
                    className={`relative w-10 h-5 rounded-full transition-colors ${expandPage ? 'bg-violet-500' : 'bg-slate-300'
                        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                    <div
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${expandPage ? 'translate-x-5' : 'translate-x-0.5'
                            }`}
                    />
                </button>
            </div>

            {/* Expanded content */}
            {expandPage && (
                <div className="mt-2 border border-violet-200 rounded-lg bg-violet-50/30 p-3">
                    <div className="text-[10px] font-bold text-violet-500 uppercase tracking-wide mb-2">
                        PLP Page Widgets{plpWidgets.length > 0 && ` (${plpWidgets.length})`}
                    </div>

                    {/* Widget list */}
                    {plpWidgets.map((w, index) => (
                        <div
                            key={w.id}
                            className="border border-slate-200 rounded-lg mb-2 bg-white overflow-hidden"
                        >
                            {/* Widget header */}
                            <button
                                onClick={() =>
                                    setExpandedWidgetId(expandedWidgetId === w.id ? null : w.id)
                                }
                                className="w-full flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                            >
                                {expandedWidgetId === w.id ? (
                                    <ChevronDown size={12} className="text-slate-400" />
                                ) : (
                                    <ChevronRight size={12} className="text-slate-400" />
                                )}
                                <LayoutGrid size={12} className="text-violet-500" />
                                <span className="text-xs font-medium text-slate-700 flex-1 truncate">
                                    {w.title || `Widget ${index + 1}`}
                                </span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-600 border border-violet-200">
                                    {w.label}
                                </span>
                                {!disabled && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removePlpWidget(w.id);
                                        }}
                                        className="p-0.5 text-slate-300 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={11} />
                                    </button>
                                )}
                            </button>

                            {/* Widget mini-editor */}
                            {expandedWidgetId === w.id && (
                                <div className="p-3 space-y-1">
                                    <TextInput
                                        label="Title"
                                        value={w.title || ''}
                                        onChange={(val) => updatePlpWidget(w.id, 'title', val)}
                                        required
                                        disabled={disabled}
                                    />
                                    <StateProductEditor
                                        label="Products (State-wise)"
                                        value={w.stateProducts || { global: '' }}
                                        onChange={(val) =>
                                            updatePlpWidget(w.id, 'stateProducts', val)
                                        }
                                        helperText="Global required. Add states for location-specific."
                                        disabled={disabled}
                                    />
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Add widget button / Picker */}
                    {!showPicker ? (
                        <button
                            onClick={() => setShowPicker(true)}
                            disabled={disabled}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg transition-colors w-full justify-center"
                        >
                            <Plus size={14} />
                            Add Widget to PLP Page
                        </button>
                    ) : (
                        <div className="border border-violet-200 rounded-lg p-2.5 bg-white">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                                    Select Widget Type
                                </span>
                                <button
                                    onClick={() => setShowPicker(false)}
                                    className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                                {PLP_WIDGET_TYPES.map((t) => (
                                    <button
                                        key={t.type}
                                        onClick={() => addPlpWidget(t.type)}
                                        className="flex items-center gap-2 px-2.5 py-2 text-[11px] text-slate-700 bg-slate-50 hover:bg-violet-50 hover:text-violet-700 border border-slate-200 hover:border-violet-300 rounded-md transition-colors text-left"
                                    >
                                        <LayoutGrid size={11} className="text-slate-400 shrink-0" />
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-2 text-[10px] text-slate-400 text-center">
                                Category Grid not supported on PLP pages
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ExpandPageSection;
