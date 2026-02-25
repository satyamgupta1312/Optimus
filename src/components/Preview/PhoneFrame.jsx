import React from 'react';
import { useWidgetContext } from '../../context/WidgetContext';
import { useAppSettings } from '../../context/AppSettingsContext';
import { Battery, Signal, Wifi } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import SortableWidget from '../Widgets/SortableWidget';
import ProductListingPage from '../Pages/ProductListingPage';
import CategoryPage from './CategoryPage';
import AppHeader from './AppHeader';
import PrimaryMasthead from '../Widgets/PrimaryMasthead';
import SecondaryMasthead from '../Widgets/SecondaryMasthead';

const PhoneFrame = () => {
    const {
        widgets,
        selectedWidgetId,
        setSelectedWidgetId,
        deleteWidget,
        moveWidget,
        currentView,
        viewData,
        headerWidgets
    } = useWidgetContext();
    const { theme, osType } = useAppSettings();

    if (!widgets) {
        console.error("DEBUG: Widgets is null/undefined in PhoneFrame");
        return <div className="p-10 text-red-500">Error: Widgets Data Missing</div>;
    }

    // Filter out masthead widgets — they render in AppHeader / SecondaryMasthead areas, not in the sortable list
    const contentWidgets = widgets.filter(w => w.type !== 'masthead');

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            const oldIndex = widgets.findIndex((w) => w.id === active.id);
            const newIndex = widgets.findIndex((w) => w.id === over.id);
            moveWidget(oldIndex, newIndex);
        }
    };

    // Phone dimensions and styling based on OS
    const phoneStyle = osType === 'ios'
        ? {
            width: '375px',
            height: '812px',
            borderRadius: '50px',
            border: '8px solid',
        }
        : {
            width: '360px',
            height: '800px',
            borderRadius: '40px',
            border: '6px solid',
        };

    // Theme-based colors
    const themeColors = theme === 'dark'
        ? {
            bg: 'bg-slate-900',
            border: 'border-slate-700',
            statusBar: 'bg-black',
            statusText: 'text-slate-200',
            contentBg: 'bg-slate-800',
        }
        : {
            bg: 'bg-white',
            border: 'border-slate-900',
            statusBar: 'bg-[#fff9e6]',
            statusText: 'text-slate-900',
            contentBg: 'bg-slate-50',
        };

    return (
        <div
            className={`${themeColors.bg} rounded-[50px] shadow-2xl ${themeColors.border} relative overflow-hidden shrink-0 select-none`}
            style={phoneStyle}
        >
            {/* Notch (iOS only) */}
            {osType === 'ios' && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150px] h-[30px] bg-slate-900 rounded-b-[20px] z-50 flex items-center justify-center">
                    <div className="w-16 h-4 bg-black rounded-full mb-1"></div>
                </div>
            )}

            {/* Status Bar */}
            <div className={`h-12 w-full ${themeColors.statusBar} flex items-center justify-between px-6 ${osType === 'ios' ? 'pt-2' : 'pt-1'} ${themeColors.statusText} z-40 relative`}>
                <span className="text-xs font-semibold ml-2">9:41</span>
                <div className="flex items-center gap-1.5 mr-1">
                    <Signal size={14} fill="currentColor" />
                    <Wifi size={14} />
                    <Battery size={14} fill="currentColor" />
                </div>
            </div>

            {currentView === 'listing' ? (
                <ProductListingPage
                    title={viewData?.title}
                    widgetId={viewData?.widgetId}
                    itemId={viewData?.itemId}
                    products={viewData?.products}
                />
            ) : currentView === 'category' ? (
                <CategoryPage categoryData={viewData} />
            ) : (
                <>
                    {/* App Header */}
                    <AppHeader />

                    {/* App Content */}
                    <div className={`h-[calc(100%-140px)] overflow-y-auto ${themeColors.contentBg} pb-20 pt-0`} style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none'
                    }}>
                        <style>{`
                            div::-webkit-scrollbar {
                                display: none;
                            }
                        `}</style>

                        {/* Secondary Masthead (Banner + Carousel) */}
                        {(() => {
                            const secondaryWidget = widgets.find(w => w.type === 'masthead' && w.pnc?.variant === 'secondary');
                            if (!secondaryWidget) return null;
                            const isSecondarySelected = selectedWidgetId === secondaryWidget.id;
                            return (
                                <div
                                    className={`mb-2 cursor-pointer ${isSecondarySelected ? 'ring-2 ring-blue-500 rounded-xl' : ''}`}
                                    onClick={() => setSelectedWidgetId(secondaryWidget.id)}
                                >
                                    <SecondaryMasthead widget={secondaryWidget} />
                                </div>
                            );
                        })()}


                        {/* API / Skeleton Placeholder Note */}
                        {/* This represents data fetched from: api/app/page_skeleton/v2/ */}

                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={contentWidgets.map(w => w.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {contentWidgets.map((widget) => (
                                    <SortableWidget
                                        key={widget.id}
                                        widget={widget}
                                        isSelected={widget.id === selectedWidgetId}
                                        onClick={() => setSelectedWidgetId(widget.id)}
                                        deleteWidget={deleteWidget}
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>

                        {contentWidgets.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                                <div className="w-16 h-16 bg-slate-200 rounded-full mb-4"></div>
                                <p>Empty Page</p>
                            </div>
                        )}
                    </div>
                </>
            )
            }

            {/* Home Indicator */}
            <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 ${osType === 'ios' ? 'w-32 h-1' : 'w-40 h-1'} ${theme === 'dark' ? 'bg-slate-600' : 'bg-slate-900'} rounded-full z-50`}></div>
        </div >
    );
};

export default PhoneFrame;
