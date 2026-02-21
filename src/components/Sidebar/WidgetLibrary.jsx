import React, { useState, useRef, useEffect } from 'react';
import { Layers, Plus, ChevronDown, X } from 'lucide-react';
import { useWidgetContext } from '../../context/WidgetContext';
import { WidgetRegistry, LegacyWidgetDefinitions } from '../../config/WidgetRegistry';

// Combine Config-Driven and Legacy Widgets
const WIDGET_TYPES = [
    ...WidgetRegistry.getAllConfigs(),
    ...LegacyWidgetDefinitions
];

/**
 * Get variant options from a widget config's properties.
 * Returns null if no variant properties exist.
 */
const getVariantProperties = (widgetDef) => {
    if (!widgetDef?.properties) return null;
    const entries = Object.entries(widgetDef.properties).filter(
        ([, prop]) => prop.options && Array.isArray(prop.options) && prop.options.length > 1
    );
    return entries.length > 0 ? entries : null;
};

/**
 * Normalize option to { label, value } regardless of input format.
 */
const normalizeOption = (opt) => {
    if (typeof opt === 'string') return { label: opt.charAt(0).toUpperCase() + opt.slice(1), value: opt };
    if (typeof opt === 'object' && opt.label !== undefined) return opt;
    if (typeof opt === 'number') return { label: String(opt), value: opt };
    return { label: String(opt), value: opt };
};

const WidgetLibrary = () => {
    const { addWidget, setSelectedWidgetId, widgets } = useWidgetContext();
    const [selectedType, setSelectedType] = useState(WIDGET_TYPES[0].type);
    const [showVariantPicker, setShowVariantPicker] = useState(false);
    const pickerRef = useRef(null);

    // Close picker on click outside
    useEffect(() => {
        if (!showVariantPicker) return;
        const handler = (e) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target)) {
                setShowVariantPicker(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showVariantPicker]);

    const handleAdd = () => {
        const widgetDef = WIDGET_TYPES.find(w => w.type === selectedType);
        if (!widgetDef) return;

        const variantProps = getVariantProperties(widgetDef);
        if (variantProps) {
            // Has variants — show picker
            setShowVariantPicker(true);
        } else {
            // No variants — add directly
            addDirectly(widgetDef, {});
        }
    };

    const addDirectly = (widgetDef, pncOverrides) => {
        const baseState = widgetDef.initialState || widgetDef.defaultProps || {};
        const newWidget = {
            ...baseState,
            type: widgetDef.type,
            pnc: { ...(baseState.pnc || {}), ...pncOverrides },
        };
        const newId = addWidget(newWidget);
        setShowVariantPicker(false);
        // Auto-select the newly added widget so its PropertyEditor opens
        if (newId) setSelectedWidgetId(newId);
    };

    const addWithVariant = (widgetDef, pncOverrides) => {
        const baseState = widgetDef.initialState || widgetDef.defaultProps || {};
        const newWidget = {
            ...baseState,
            type: widgetDef.type,
            pnc: { ...(baseState.pnc || {}), ...pncOverrides },
        };
        const newId = addWidget(newWidget);
        setShowVariantPicker(false);
        // Auto-select the newly added widget so its PropertyEditor opens
        if (newId) setSelectedWidgetId(newId);
    };

    const selectedWidgetDef = WIDGET_TYPES.find(w => w.type === selectedType);
    const variantProps = selectedWidgetDef ? getVariantProperties(selectedWidgetDef) : null;

    return (
        <div className="relative">
            <div className="flex items-center gap-2 mb-4">
                <Layers size={18} className="text-slate-500" />
                <h2 className="font-semibold text-slate-800">Widget Types</h2>
            </div>

            <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                    <select
                        value={selectedType}
                        onChange={(e) => { setSelectedType(e.target.value); setShowVariantPicker(false); }}
                        className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-2.5 px-3 pr-8 rounded-lg text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow cursor-pointer shadow-sm"
                    >
                        {WIDGET_TYPES.map((widget) => (
                            <option key={widget.type} value={widget.type}>
                                {widget.label || widget.type}
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                <button
                    onClick={handleAdd}
                    className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm shrink-0"
                    title="Add Widget"
                    aria-label="Add widget"
                >
                    <Plus size={20} />
                </button>
            </div>

            {selectedWidgetDef && !showVariantPicker && (
                <div className="text-xs text-slate-500 px-1">
                    {selectedWidgetDef.description}
                </div>
            )}

            {/* Variant Picker Popup */}
            {showVariantPicker && variantProps && (
                <div
                    ref={pickerRef}
                    className="mt-2 border border-blue-200 bg-blue-50/50 rounded-xl p-3 animate-in fade-in slide-in-from-top-2 duration-200"
                >
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-700">
                            Choose type to add
                        </span>
                        <button
                            onClick={() => setShowVariantPicker(false)}
                            className="p-0.5 text-slate-400 hover:text-slate-600"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    {variantProps.map(([propKey, prop]) => (
                        <div key={propKey} className="space-y-2">
                            {prop.options.map((rawOpt) => {
                                const opt = normalizeOption(rawOpt);
                                return (
                                    <button
                                        key={opt.value}
                                        onClick={() => addWithVariant(selectedWidgetDef, { [propKey]: opt.value })}
                                        className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-left group"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            {opt.label.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold text-slate-800">{opt.label}</div>
                                            <div className="text-[10px] text-slate-400">
                                                {selectedWidgetDef.label} — {opt.label}
                                            </div>
                                        </div>
                                        <Plus size={16} className="ml-auto text-slate-300 group-hover:text-blue-500" />
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default WidgetLibrary;
