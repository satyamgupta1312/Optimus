import React from 'react';
import { ShoppingBag, ShoppingCart, Leaf, Tractor, Flame } from 'lucide-react';
import { useAppSettings } from '../../context/AppSettingsContext';
import { useWidgetContext } from '../../context/WidgetContext';

/**
 * PrimaryMasthead — Category navigation bar in the emulator.
 *
 * Color logic (reads directly from canvas widget for live preview):
 *   - Transition Color → header background (handled by AppHeader)
 *   - Accent Color     → active icon color, lighter shade of transition
 *   - Text Color       → category labels
 *   - Icon BG Color    → active icon background (soft gradient from transition)
 *   - Is Multimedia Dark → if true, indicates dark overlay theme
 */
const PrimaryMasthead = () => {
    const { theme } = useAppSettings();
    const { widgets } = useWidgetContext();
    const isDark = theme === 'dark';

    // Get the canvas widget directly — has all colors at top level
    const primaryWidget = widgets.find(w => w.type === 'masthead' && w.pnc?.variant === 'primary');

    // Colors from canvas widget (live preview as user edits)
    const accentColor = primaryWidget?.accent_color || '#0277FA';
    const textColor = primaryWidget?.text_color || '#FFFFFF';
    const iconBgColor = primaryWidget?.icon_bg_color || '#FFFFFF';
    const isMultimediaDark = primaryWidget?.is_multimedia_dark || false;

    // Default categories
    const defaultCategories = [
        { name: 'All', icon: ShoppingBag, active: true },
        { name: 'Buy Again', icon: ShoppingCart, active: false },
        { name: 'Rice', icon: Leaf, active: false },
        { name: 'Kirana', icon: Tractor, active: false },
        { name: 'Body Care', icon: Flame, active: false },
    ];

    const categories = primaryWidget?.categories || defaultCategories;

    // Determine text color based on is_multimedia_dark
    const labelColor = isMultimediaDark ? '#FFFFFF' : textColor;

    return (
        <div className={`pt-2 pb-4 px-2 ${isDark ? 'bg-slate-900' : ''}`}>
            <div className="relative z-10 flex justify-between items-start px-2 overflow-x-auto scrollbar-hide">
                {categories.map((cat, idx) => {
                    const Icon = cat.icon || ShoppingBag;
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
                                    color: labelColor
                                }}
                            >
                                <Icon
                                    size={24}
                                    strokeWidth={2}
                                    fill={cat.active ? "currentColor" : "none"}
                                />
                            </div>
                            <span
                                className="text-[11px] font-medium tracking-wide"
                                style={{ color: cat.active ? labelColor : `${labelColor}cc` }}
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
