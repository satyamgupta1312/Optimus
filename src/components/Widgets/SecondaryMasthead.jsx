import React, { useEffect, useState } from 'react';
import { useWidgetContext } from '../../context/WidgetContext';

const SecondaryMasthead = ({ widget }) => {
    // This is the Blue Banner (formerly PrimaryMasthead)
    const { navigateTo } = useWidgetContext();
    const [mediaUrl, setMediaUrl] = useState(null);

    const multimedia = widget.multimedia || {};

    // Create blob URL for uploaded file (for instant local preview)
    useEffect(() => {
        if (multimedia.file && multimedia.file instanceof File) {
            const url = URL.createObjectURL(multimedia.file);
            setMediaUrl(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setMediaUrl(null);
        }
    }, [multimedia.file]);

    const handleClick = () => {
        navigateTo('listing', {
            title: widget.title || 'Malamal THURSDAY',
            widgetId: widget.id,
            products: [] // Will fetch default
        });
    };

    // Helper to determine background style
    const getBackgroundStyle = () => {
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

        // Priority 4: Simple background color fallback
        return { backgroundColor: widget.background || '#0277FA' };
    };

    return (
        <div className="flex flex-col">
            <div
                className="h-32 rounded-b-[2rem] -mt-1 relative z-10 shadow-lg overflow-hidden"
                style={getBackgroundStyle()}
            >
                {/* Media-only - no text overlay */}
            </div>

            {/* Image (Optional - below the banner) */}
            {widget.image && (
                <div className="mt-[-20px] mx-4 relative z-0">
                    <img
                        src={widget.image}
                        alt="Banner"
                        className="w-full h-auto rounded-xl shadow-md"
                    />
                </div>
            )}

            {/* Carousel Items Preview */}
            {widget.items && widget.items.length > 0 && (
                <div className="px-4 py-3 space-y-2">
                    <div className="text-[10px] font-semibold text-slate-500 mb-2">Carousel Categories</div>
                    <div className="grid grid-cols-3 gap-2">
                        {widget.items.map((item, idx) => (
                            <div
                                key={idx}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigateTo('category', {
                                        heading: item.categoryPage?.heading || item.text,
                                        subCategories: item.subCategories || []
                                    });
                                }}
                                className="bg-gradient-to-br from-pink-50 to-orange-50 rounded-xl p-2 shadow-sm border border-pink-100 cursor-pointer active:scale-95 transition-transform"
                            >
                                {/* Category Heading */}
                                <div className="text-[9px] font-bold text-pink-700 mb-1.5 leading-tight min-h-[20px]">
                                    {item.categoryPage?.heading || item.text || 'Category'}
                                </div>

                                {/* Category Image */}
                                {item.image && (
                                    <div className="aspect-square bg-white rounded-lg overflow-hidden border border-pink-200">
                                        <img
                                            src={item.image.includes('googleusercontent.com') || item.image.includes('drive.google.com')
                                                ? item.image.replace('/view', '').replace('?usp=sharing', '')
                                                : item.image}
                                            alt={item.text}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                // Try to extract file ID and use thumbnail URL
                                                const fileIdMatch = e.target.src.match(/\/d\/([^\/]+)/);
                                                if (fileIdMatch) {
                                                    e.target.src = `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}&sz=w400`;
                                                } else {
                                                    e.target.style.display = 'none';
                                                }
                                            }}
                                        />
                                    </div>
                                )}
                                {!item.image && (
                                    <div className="aspect-square bg-white rounded-lg flex items-center justify-center border border-dashed border-pink-300">
                                        <span className="text-[8px] text-pink-300">No Image</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SecondaryMasthead;

