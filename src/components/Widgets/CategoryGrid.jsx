import React from 'react';
import { useWidgetContext } from '../../context/WidgetContext';

const CategoryGrid = ({ widget }) => {
    const { navigateTo } = useWidgetContext();

    const handleItemClick = (item) => {
        navigateTo('category', {
            heading: item.categoryPage?.heading || item.text,
            subCategories: item.subCategories || []
        });
    };

    const getImageSrc = (item) => {
        if (item.driveFileId) {
            return `https://drive.google.com/thumbnail?id=${item.driveFileId}&sz=w200`;
        }
        if (item.image) {
            const fileIdMatch = item.image.match(/\/d\/([^\/]+)/);
            if (fileIdMatch) {
                return `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}&sz=w200`;
            }
        }
        return item.image;
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
                            {item.image || item.driveFileId ? (
                                <img
                                    src={getImageSrc(item)}
                                    alt={item.text}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        if (item.driveFileId && !e.target.dataset.retried) {
                                            e.target.dataset.retried = 'true';
                                            e.target.src = `https://lh3.googleusercontent.com/d/${item.driveFileId}`;
                                        } else {
                                            e.target.style.display = 'none';
                                        }
                                    }}
                                />
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
