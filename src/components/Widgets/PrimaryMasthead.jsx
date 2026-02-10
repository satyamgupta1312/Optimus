import React from 'react';
import { ShoppingBag, ShoppingCart, Leaf, Tractor, Flame } from 'lucide-react';
import { useAppSettings } from '../../context/AppSettingsContext';

const PrimaryMasthead = ({ widget }) => {
    // This is the Category Navigation (formerly hardcoded in AppHeader)
    const { theme } = useAppSettings();
    const isDark = theme === 'dark';

    // Debug: Log the widget data to see what we're receiving
    console.log('[PrimaryMasthead] Received widget:', widget);
    console.log('[PrimaryMasthead] Widget.multimedia:', widget.multimedia);

    // Default categories if not provided in widget
    const defaultCategories = [
        { name: 'All', icon: ShoppingBag, active: true },
        { name: 'Buy Again', icon: ShoppingCart, active: false },
        { name: 'Rice', icon: Leaf, active: false },
        { name: 'Kirana', icon: Tractor, active: false },
        { name: 'Body Care', icon: Flame, active: false },
    ];

    const categories = widget.categories || defaultCategories;

    // Extract multimedia colors (if configured)
    const multimedia = widget.multimedia || {};
    const accentColor = multimedia.accent_color || '#0277FA';
    const textColor = multimedia.text_color || '#FFFFFF';
    const iconBgColor = multimedia.icon_bg_color || '#FFFFFF';

    // NOTE: Background is now handled by AppHeader, not here
    // This component only renders the category icons section

    return (
        <div
            className={`pt-2 pb-4 px-2 ${isDark ? 'bg-slate-900' : ''}`}
        // DO NOT set background here - it inherits from AppHeader
        >
            <div className="relative z-10 flex justify-between items-start px-2 overflow-x-auto scrollbar-hide">
                {categories.map((cat, idx) => {
                    const Icon = cat.icon || ShoppingBag; // Fallback icon
                    return (
                        <div key={idx} className="flex flex-col items-center gap-2 min-w-[3.5rem] cursor-pointer group">
                            {/* Icon Container */}
                            <div
                                className={`
                                    w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-200
                                    ${cat.active
                                        ? (isDark ? 'bg-blue-600' : 'shadow-sm')
                                        : 'hover:bg-white/10'}
                                `}
                                style={cat.active && !isDark ? {
                                    backgroundColor: iconBgColor,
                                    color: accentColor
                                } : {
                                    color: textColor
                                }}
                            >
                                <Icon
                                    size={24}
                                    strokeWidth={2}
                                    fill={cat.active ? "currentColor" : "none"}
                                />
                            </div>
                            <span
                                className={`text-[11px] font-medium tracking-wide`}
                                style={{ color: cat.active ? textColor : `${textColor}cc` }}
                            >
                                {cat.name}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PrimaryMasthead;
