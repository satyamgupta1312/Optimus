import React, { useRef } from 'react';
import WidgetLibrary from './WidgetLibrary';
import PropertyEditor from './PropertyEditor';
import FetchWidget from '../FetchWidget';
import { useWidgetContext } from '../../context/WidgetContext';
import { WidgetRegistry } from '../../config/WidgetRegistry';
import { ChevronRight, ArrowLeft } from 'lucide-react';

const Sidebar = () => {
    const { selectedWidgetId, setSelectedWidgetId, widgets, addWidget } = useWidgetContext();
    const selectedWidget = widgets.find(w => w.id === selectedWidgetId);
    const sidebarRef = useRef(null);

    // Get display label for the selected widget
    const getWidgetLabel = () => {
        if (!selectedWidget) return '';
        const config = WidgetRegistry.getConfig(selectedWidget.type);
        if (config) {
            const variant = selectedWidget.pnc?.variant || selectedWidget.pnc?.displayMode;
            const label = config.label || selectedWidget.type;
            return variant ? `${label} (${variant})` : label;
        }
        return selectedWidget.type;
    };

    const handleSubmit = () => {
        // Scroll sidebar back to top after submit
        if (sidebarRef.current) {
            sidebarRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <div ref={sidebarRef} className="flex flex-col h-full bg-slate-50 overflow-y-auto custom-scrollbar">
            {/* Fetch Widget Section */}
            <div className="p-4 border-b border-slate-200 bg-white">
                <FetchWidget onWidgetFetched={(w) => addWidget(w)} />
            </div>

            {/* Widget Library Section */}
            <div className="p-4 border-b border-slate-200 bg-white">
                <WidgetLibrary />
            </div>

            {/* Property Editor Section */}
            {selectedWidgetId && selectedWidget && (
                <div className="p-4 bg-white flex-1 min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {/* Breadcrumb with back button */}
                    <div className="flex items-center gap-2 text-sm mb-4">
                        <button
                            onClick={() => setSelectedWidgetId(null)}
                            className="flex items-center gap-1 text-slate-400 hover:text-blue-600 transition-colors"
                            title="Back to Widget Library"
                        >
                            <ArrowLeft size={14} />
                            <span>Widgets</span>
                        </button>
                        <ChevronRight size={14} className="text-slate-300" />
                        <span className="font-semibold text-slate-800 truncate">{getWidgetLabel()}</span>
                    </div>

                    <PropertyEditor widget={selectedWidget} onSubmit={handleSubmit} />
                </div>
            )}

            {!selectedWidgetId && widgets.length > 0 && (
                <div className="p-8 text-center text-slate-400 mt-10">
                    Select a widget from the preview or add one from above.
                </div>
            )}
        </div>
    );
};

export default Sidebar;
