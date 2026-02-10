import React from 'react';
import { fetchWidgetProductList } from '../../services/api';

const CategoryGrid = ({ widget }) => {

    const handleItemClick = async (item) => {
        // Use widget.id and item.id provided by the prop
        // Fallback to defaults if missing (for demo)
        const widgetId = widget.id || 426; // Default from example curl
        const itemId = item.id;

        console.log(`[CategoryGrid] Fetching products for Widget: ${widgetId}, Item: ${itemId}`);

        try {
            const data = await fetchWidgetProductList(widgetId, itemId);
            console.log('[CategoryGrid] API Response:', data);

            if (data && data.results) {
                alert(`API Success!\nFetched ${data.results.length} products for category "${item.text}".\n(Check Console for full data)`);
            } else {
                alert(`API Success, but no results found.`);
            }
        } catch (error) {
            console.error("Failed to fetch products", error);
            alert("API Failed. Check console.");
        }
    };

    return (
        <div style={{ backgroundColor: widget.background || '#fff' }} className="p-4">
            {/* Header */}
            <div className="flex justify-between items-end mb-3">
                <h3 style={{ color: widget.textColor || '#1e293b' }} className="font-bold text-lg leading-tight">
                    {widget.title}
                </h3>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-4 gap-y-4 gap-x-2">
                {widget.items && widget.items.map((item) => (
                    <div
                        key={item.id}
                        className="flex flex-col items-center gap-2 cursor-pointer transition-opacity hover:opacity-80 active:scale-95"
                        onClick={() => handleItemClick(item)}
                    >
                        <div className="w-full aspect-square bg-slate-50 rounded-lg overflow-hidden relative border border-slate-100 shadow-sm">
                            {item.image ? (
                                <img src={item.image} alt={item.text} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300 text-[10px]">No Img</div>
                            )}
                        </div>
                        <span className="text-[10px] text-center leading-tight text-slate-700 font-medium line-clamp-2">
                            {item.text}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CategoryGrid;
