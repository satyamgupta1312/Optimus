import React, { useEffect, useState } from 'react';
import { Search, ShoppingBag, Leaf, Tractor, Flame, ShoppingCart, User, ChevronDown, MapPin, Ban } from 'lucide-react';
import { useAppSettings } from '../../context/AppSettingsContext';
import { useWidgetContext } from '../../context/WidgetContext';
import PrimaryMasthead from '../Widgets/PrimaryMasthead';

/**
 * AppHeader — Emulator top bar with masthead preview.
 *
 * Color logic (all from canvas widget for live editing):
 *   - Background image: background_media URL (uploaded image)
 *   - Background color: transition_color (dominant color from image)
 *   - On scroll: accent_color (lighter shade of transition)
 *   - Text: text_color (category labels)
 *   - Icon BG: icon_bg_color (soft gradient from transition)
 */
const AppHeader = () => {
    const { theme } = useAppSettings();
    const { headerWidgets, widgets, setSelectedWidgetId, selectedWidgetId } = useWidgetContext();

    // Find the config-driven primary masthead widget for selection
    const primaryWidget = widgets.find(w => w.type === 'masthead' && w.pnc?.variant === 'primary');
    const isSelected = primaryWidget && selectedWidgetId === primaryWidget.id;

    const isDark = theme === 'dark';

    // ── Colors from canvas widget (live preview) ──
    const transitionColor = primaryWidget?.transition_color || '#0277FA';
    const textColor = primaryWidget?.text_color || '#FFFFFF';
    const isMultimediaDark = primaryWidget?.is_multimedia_dark || false;

    // Canvas widget background_media → resolve to URL for display
    const canvasBgMedia = primaryWidget?.background_media;
    const [canvasMediaUrl, setCanvasMediaUrl] = useState(null);

    useEffect(() => {
        if (!canvasBgMedia) { setCanvasMediaUrl(null); return; }
        if (canvasBgMedia instanceof File || canvasBgMedia instanceof Blob) {
            const url = URL.createObjectURL(canvasBgMedia);
            setCanvasMediaUrl(url);
            return () => URL.revokeObjectURL(url);
        }
        if (typeof canvasBgMedia === 'string') {
            setCanvasMediaUrl(canvasBgMedia);
        }
    }, [canvasBgMedia]);

    // Determine header text color based on is_multimedia_dark
    const headerTextColor = isMultimediaDark ? '#FFFFFF' : textColor;

    // Helper to determine style
    const getHeaderStyle = () => {
        if (isDark) return { backgroundColor: '#0f172a' };

        // Priority 0: Canvas widget background_media (uploaded image)
        if (canvasMediaUrl) {
            return {
                backgroundImage: `url(${canvasMediaUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            };
        }

        // Priority 1: Transition color from canvas widget (solid color fallback)
        return { backgroundColor: transitionColor };
    };

    return (
        <div
            className={`flex flex-col shrink-0 z-20 sticky top-0 transition-colors duration-300 relative overflow-hidden cursor-pointer ${isSelected ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
            style={{ ...getHeaderStyle(), color: headerTextColor }}
            onClick={() => primaryWidget && setSelectedWidgetId(primaryWidget.id)}
        >
            {/* Content wrapper with relative positioning to stay above background */}
            <div className="relative z-10">
                {/* Top Bar: Delivery Info & Profile */}
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-bold" style={{ color: headerTextColor }}>Delivery on hold</h1>
                            <Ban size={16} style={{ color: headerTextColor, opacity: 0.8 }} />
                        </div>
                        <div className="flex items-center gap-1 text-sm cursor-pointer" style={{ color: `${headerTextColor}cc` }}>
                            <span className="truncate max-w-[200px]">BLR office - 148, 5th Main Rd, Sector 6, HSR L...</span>
                            <ChevronDown size={14} />
                        </div>
                    </div>

                    {/* Profile Icon */}
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center cursor-pointer hover:bg-white/30 transition-colors">
                        <User size={20} style={{ color: headerTextColor }} />
                    </div>
                </div>

                {/* Search Bar */}
                <div className="px-4 py-2">
                    <div className={`
                        w-full h-12 rounded-xl flex items-center px-4 gap-3 shadow-sm transition-colors
                        ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-500'}
                    `}>
                        <Search size={22} className={`${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
                        <span className="text-base font-normal">Search for "Sugar"</span>
                    </div>
                </div>

                {/* Categories (Primary Masthead) */}
                {primaryWidget && <PrimaryMasthead />}
            </div>
        </div>
    );
};

export default AppHeader;
