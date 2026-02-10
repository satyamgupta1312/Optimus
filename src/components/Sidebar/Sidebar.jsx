import React, { useState } from 'react';
import WidgetLibrary from './WidgetLibrary';
import PropertyEditor from './PropertyEditor';
import FetchWidget from '../FetchWidget';
import { useWidgetContext } from '../../context/WidgetContext';
import { ChevronRight } from 'lucide-react';

const Sidebar = () => {
    const { selectedWidgetId, widgets, addWidget } = useWidgetContext();
    const selectedWidget = widgets.find(w => w.id === selectedWidgetId);

    const handleWidgetFetched = (fetchedWidget) => {
        // Add the fetched widget to the canvas
        addWidget(fetchedWidget);
    };

    // If a widget is selected, we might want to show the specific editor path
    // But per design, it seems the library is always up top or navigating via breadcrumbs?
    // The design shows "Widgets > Single Product Row" in the breadcrumb.

    // Let's implement a simple navigation logic or just render both based on context.
    // The mockup shows "Widget Types" on top, and an Editor below? 
    // Wait, the mockup has specific sections. 
    // Left side is "Widget Types" card. 
    // Below that "Widgets > Single Product Row" (Editor).
    // This implies a single scrollable sidebar or sections.

    // I will stack them: Library is always accessible? Or maybe Library is the "Add" mode.
    // Let's just stack them for now. Library at top, Editor below it if selected.

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-y-auto custom-scrollbar">
            {/* Fetch Widget Section */}
            <div className="p-4 border-b border-slate-200 bg-white">
                <FetchWidget onWidgetFetched={handleWidgetFetched} />
            </div>

            {/* Widget Library Section */}
            <div className="p-4 border-b border-slate-200 bg-white">
                <WidgetLibrary />
            </div>

            {/* Property Editor Section */}
            {selectedWidgetId && (
                <div className="p-4 bg-white flex-1 min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                        <span>Widgets</span>
                        <ChevronRight size={14} />
                        <span className="font-medium text-slate-800">{selectedWidget?.type}</span>
                    </div>
                    <PropertyEditor widget={selectedWidget} />
                </div>
            )}

            {!selectedWidgetId && widgets.length > 0 && (
                <div className="p-8 text-center text-slate-400 mt-10">
                    Select a widget from the right or add one from above to edit settings.
                </div>
            )}
        </div>
    );
};

export default Sidebar;
