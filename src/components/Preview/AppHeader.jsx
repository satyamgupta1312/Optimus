import React, { useEffect, useState } from 'react';
import { Search, ShoppingBag, Leaf, Tractor, Flame, ShoppingCart, User, ChevronDown, MapPin, Ban } from 'lucide-react';
import { useAppSettings } from '../../context/AppSettingsContext';
import { useWidgetContext } from '../../context/WidgetContext';
import PrimaryMasthead from '../Widgets/PrimaryMasthead';

const AppHeader = () => {
    const { theme } = useAppSettings();
    const { headerWidgets, widgets, setSelectedWidgetId, selectedWidgetId } = useWidgetContext();
    const [mediaUrl, setMediaUrl] = useState(null);

    // Find the config-driven primary masthead widget for selection
    const primaryWidget = widgets.find(w => w.type === 'masthead' && w.pnc?.variant === 'primary');
    const isSelected = primaryWidget && selectedWidgetId === primaryWidget.id;

    // Categories now handled by PrimaryMasthead component

    // Theme logic - The header is predominantly blue in the screenshot
    // We'll keep dark mode support but ensure Light Mode matches the application theme
    const isDark = theme === 'dark';

    const primaryMasthead = headerWidgets?.primaryMasthead || {};
    const multimedia = primaryMasthead.multimedia || {};

    // Debug logging for preview issues
    console.log('[AppHeader] primaryMasthead:', primaryMasthead);
    console.log('[AppHeader] multimedia:', multimedia);
    console.log('[AppHeader] driveFileId:', multimedia.driveFileId);

    // Create blob URL for uploaded file (for instant preview)
    useEffect(() => {
        if (multimedia.file && multimedia.file instanceof File) {
            const url = URL.createObjectURL(multimedia.file);
            setMediaUrl(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setMediaUrl(null);
        }
    }, [multimedia.file]);

    // Use Primary Masthead background if available (for Light Mode), otherwise default to Blue (#0277FA)
    const headerBg = primaryMasthead.background || multimedia.transition_color || '#0277FA';

    // Helper to determine style
    const getHeaderStyle = () => {
        if (isDark) return { backgroundColor: '#0f172a' };

        // For video type from Drive - show thumbnail (first frame) as background image
        if (multimedia.type === 'video' && !mediaUrl && multimedia.driveFileId) {
            const thumbnailUrl = `https://drive.google.com/thumbnail?id=${multimedia.driveFileId}&sz=w1000`;
            return {
                backgroundImage: `url(${thumbnailUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            };
        }

        // Priority 1: Local blob URL (instant preview of uploaded file)
        if (mediaUrl) {
            return {
                backgroundImage: `url(${mediaUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            };
        }

        // Priority 2: Google Drive Image (using File ID for reliable thumbnail)
        if (multimedia.driveFileId) {
            // Use the thumbnail API which is reliable for embedding and handling CORS
            const reliableUrl = `https://drive.google.com/thumbnail?id=${multimedia.driveFileId}&sz=w1000`;
            return {
                backgroundImage: `url(${reliableUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            };
        }

        // Priority 3: Google Drive URL (Fallback)
        if (multimedia.driveUrl) {
            return {
                backgroundImage: `url(${multimedia.driveUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            };
        }

        // Priority 4: API URL from widget.background (after save)
        if (headerBg && headerBg.startsWith('http')) {
            return {
                backgroundImage: `url(${headerBg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            };
        }

        // Priority 5: Solid color fallback
        return { backgroundColor: headerBg };
    };

    return (
        <div
            className={`flex flex-col shrink-0 z-20 sticky top-0 text-white transition-colors duration-300 relative overflow-hidden cursor-pointer ${isSelected ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
            style={getHeaderStyle()}
            onClick={() => primaryWidget && setSelectedWidgetId(primaryWidget.id)}
        >
            {/* Video background - Local file (blob) */}
            {multimedia.type === 'video' && mediaUrl && (
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
                    key={mediaUrl}
                >
                    <source src={mediaUrl} type="video/webm" />
                    <source src={mediaUrl} type="video/mp4" />
                </video>
            )}

            {/* Note: Drive videos cannot be streamed directly due to CORS. 
                For videos from Drive, we just show the transition_color background.
                To show actual video preview, videos need to be hosted on a CORS-enabled CDN. */}

            {/* Content wrapper with relative positioning to stay above background */}
            <div className="relative z-10">
                {/* Top Bar: Delivery Info & Profile */}
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-bold">Delivery on hold</h1>
                            <Ban size={16} className="text-white/80" />
                        </div>
                        <div className="flex items-center gap-1 text-sm text-blue-100 cursor-pointer">
                            <span className="truncate max-w-[200px]">BLR office - 148, 5th Main Rd, Sector 6, HSR L...</span>
                            <ChevronDown size={14} />
                        </div>
                    </div>

                    {/* Profile Icon */}
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center cursor-pointer hover:bg-white/30 transition-colors">
                        <User size={20} className="text-white" />
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

                {/* Categories (Primary Masthead) - Always Enabled */}
                {headerWidgets?.primaryMasthead && (
                    <PrimaryMasthead widget={headerWidgets.primaryMasthead} />
                )}
            </div>
        </div>
    );
};

export default AppHeader;
