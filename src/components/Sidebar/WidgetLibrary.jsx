import React, { useState } from 'react';
import { Layers, Plus, ChevronDown } from 'lucide-react';
import { useWidgetContext } from '../../context/WidgetContext';
import { WidgetRegistry, LegacyWidgetDefinitions } from '../../config/WidgetRegistry';

// Combine Config-Driven and Legacy Widgets
const WIDGET_TYPES = [
    ...WidgetRegistry.getAllConfigs(),
    ...LegacyWidgetDefinitions
];

const WidgetLibrary = () => {
    const { addWidget } = useWidgetContext();
    const [selectedType, setSelectedType] = useState(WIDGET_TYPES[0].type);

    const handleAdd = () => {
        const widget = WIDGET_TYPES.find(w => w.type === selectedType);
        if (widget) {
            addWidget({ ...widget.defaultProps, type: widget.type });
        }
    };

    const selectedWidgetDef = WIDGET_TYPES.find(w => w.type === selectedType);

    return (
        <div>
            <div className="flex items-center gap-2 mb-4">
                <Layers size={18} className="text-slate-500" />
                <h2 className="font-semibold text-slate-800">Widget Types</h2>
            </div>

            <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                    <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
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

            {selectedWidgetDef && (
                <div className="text-xs text-slate-500 px-1">
                    {selectedWidgetDef.description}
                </div>
            )}
        </div>
    );
};

export default WidgetLibrary;
