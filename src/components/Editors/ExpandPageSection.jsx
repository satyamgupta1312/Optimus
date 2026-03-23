import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, LayoutGrid, Layers, GripVertical, ImagePlus, Loader2 } from 'lucide-react';
import TextInput from '../Inputs/TextInput';
import StateProductEditor from '../Inputs/StateProductEditor';
import ScrollItemEditor from './ScrollItemEditor';
import CarouselItemEditor from './CarouselItemEditor';
import { LocalApiService } from '../../services/LocalApiService';
import { safeUUID } from '../../utils/uuid';

/**
 * Supported widget types that can be added to a PLP page via Expand Page.
 * Category Grid is NOT supported on PLP pages.
 * multimedia_double_product_row is on hold (NOT AVAILABLE).
 */
const PLP_WIDGET_TYPES = [
    { type: 'carousel', label: 'Carousel', group: 'carousel' },
    { type: 'masthead_secondary_category_hp', label: 'Secondary Masthead', group: 'masthead' },
    { type: 'single_product_row', label: 'SPR Standard', group: 'spr' },
    { type: 'single_product_row_v2', label: 'SPR Optimized', group: 'spr' },
    { type: 'multimedia_single_product_row', label: 'Multimedia SPR', group: 'spr' },
    { type: 'multimedia_single_product_row_v2', label: 'Multimedia SPR V2', group: 'spr' },
    { type: 'double_product_row', label: 'Double Row', group: 'spr' },
    { type: 'double_product_row_v2', label: 'Double Row V2', group: 'spr' },
    { type: 'multimedia_double_product_row_v2', label: 'MM Double Row V2', group: 'spr' },
];

/** Build initial data per widget type */
const getInitialWidgetData = (widgetType) => {
    const typeDef = PLP_WIDGET_TYPES.find(t => t.type === widgetType);
    const base = {
        id: safeUUID(),
        type: widgetType,
        label: typeDef?.label || widgetType,
    };

    if (typeDef?.group === 'carousel') {
        // Carousel: same structure as Collection Banner scroll mode
        return { ...base, title: '', scrollItems: [], media_number: '3.5' };
    }
    if (typeDef?.group === 'masthead') {
        // Secondary Masthead: same structure as Masthead secondary variant
        return { ...base, background_media: null, carouselItems: [], media_number: '2.5' };
    }
    // SPR / DPR variants: Title + State-wise product codes
    return { ...base, title: '', stateProducts: { global: '' } };
};

/**
 * ExpandPageSection — Reusable toggle + widget list for PLP page expansion.
 *
 * When the user selects `product_listing_page` as page type, this section appears
 * allowing them to toggle "Expand Page" ON/OFF. When ON, they can add multiple
 * widgets to the PLP page — each widget type shows its OWN editor (same as homepage).
 *
 * Props:
 * - expandPage: boolean — current toggle state
 * - plpWidgets: array — list of PLP page widgets
 * - onChange({ expandPage, plpWidgets }) — callback when data changes
 * - disabled: boolean — disable editing
 */
const ExpandPageSection = ({ value, expandPage: expandPageProp, plpWidgets: plpWidgetsProp = [], onChange, disabled }) => {
    // Support both: value={expandPage, plpWidgets} (from PropertyEditor) AND direct props
    const expandPage = value?.expandPage ?? expandPageProp ?? false;
    const plpWidgets = value?.plpWidgets ?? plpWidgetsProp ?? [];

    const [showPicker, setShowPicker] = useState(false);
    const [expandedWidgetId, setExpandedWidgetId] = useState(null);
    const [uploadingBgMedia, setUploadingBgMedia] = useState(null);

    const toggleExpand = () => {
        const next = !expandPage;
        onChange({ expandPage: next, plpWidgets: next ? plpWidgets : [] });
    };

    const addPlpWidget = (widgetType) => {
        const newWidget = getInitialWidgetData(widgetType);
        onChange({
            expandPage: true,
            plpWidgets: [...plpWidgets, newWidget],
        });
        setShowPicker(false);
        setExpandedWidgetId(newWidget.id);
    };

    const removePlpWidget = (id) => {
        onChange({
            expandPage,
            plpWidgets: plpWidgets.filter(w => w.id !== id),
        });
        if (expandedWidgetId === id) setExpandedWidgetId(null);
    };

    const updatePlpWidget = (id, field, val) => {
        onChange({
            expandPage,
            plpWidgets: plpWidgets.map(w =>
                w.id === id ? { ...w, [field]: val } : w
            ),
        });
    };

    /** Resolve group from PLP_WIDGET_TYPES for a given widget */
    const getWidgetGroup = (w) => {
        const typeDef = PLP_WIDGET_TYPES.find(t => t.type === w.type);
        return typeDef?.group || 'spr';
    };

    return (
        <div className="mt-3">
            {/* Toggle */}
            <div className="flex items-center justify-between px-3 py-2.5 bg-violet-50 border border-violet-200 rounded-lg">
                <div className="flex items-center gap-2">
                    <Layers size={14} className="text-violet-500" />
                    <div>
                        <span className="text-xs font-semibold text-violet-700">Expand Page</span>
                        <span className="text-[10px] text-violet-400 ml-1.5">Add widgets to PLP</span>
                    </div>
                </div>
                <button
                    onClick={toggleExpand}
                    disabled={disabled}
                    className={`relative w-10 h-5 rounded-full transition-colors ${expandPage ? 'bg-violet-500' : 'bg-slate-300'
                        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                    <div
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${expandPage ? 'translate-x-5' : 'translate-x-0.5'
                            }`}
                    />
                </button>
            </div>

            {/* Expanded content */}
            {expandPage && (
                <div className="mt-2 border border-violet-200 rounded-lg bg-violet-50/30 p-3">
                    <div className="text-[10px] font-bold text-violet-500 uppercase tracking-wide mb-2">
                        PLP Page Widgets{plpWidgets.length > 0 && ` (${plpWidgets.length})`}
                    </div>

                    {/* Widget list */}
                    {plpWidgets.map((w, index) => {
                        const group = getWidgetGroup(w);

                        return (
                            <div
                                key={w.id}
                                className="border border-slate-200 rounded-lg mb-2 bg-white overflow-hidden"
                            >
                                {/* Widget header */}
                                <div
                                    onClick={() =>
                                        setExpandedWidgetId(expandedWidgetId === w.id ? null : w.id)
                                    }
                                    role="button"
                                    className="w-full flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors text-left cursor-pointer"
                                >
                                    {expandedWidgetId === w.id ? (
                                        <ChevronDown size={12} className="text-slate-400" />
                                    ) : (
                                        <ChevronRight size={12} className="text-slate-400" />
                                    )}
                                    <LayoutGrid size={12} className="text-violet-500" />
                                    <span className="text-xs font-medium text-slate-700 flex-1 truncate">
                                        {w.title || (group === 'carousel' ? `Carousel ${index + 1}` : group === 'masthead' ? `Masthead ${index + 1}` : `Widget ${index + 1}`)}
                                    </span>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-600 border border-violet-200">
                                        {w.label}
                                    </span>
                                    {!disabled && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removePlpWidget(w.id);
                                            }}
                                            className="p-0.5 text-slate-300 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={11} />
                                        </button>
                                    )}
                                </div>

                                {/* Widget mini-editor — type-specific inputs */}
                                {expandedWidgetId === w.id && (
                                    <div className="p-3 space-y-1">
                                        {/* ── Carousel type → ScrollItemEditor (same as homepage Collection Banner scroll) ── */}
                                        {group === 'carousel' && (
                                            <>
                                                <TextInput
                                                    label="Title"
                                                    value={w.title || ''}
                                                    onChange={(val) => updatePlpWidget(w.id, 'title', val)}
                                                    required
                                                    disabled={disabled}
                                                />
                                                <TextInput
                                                    label="Media Number"
                                                    value={w.media_number || '3.5'}
                                                    onChange={(val) => updatePlpWidget(w.id, 'media_number', val)}
                                                    placeholder="e.g. 3.5"
                                                    helperText="Items visible at once (e.g. 3.5 = 3 full + half peek)"
                                                    disabled={disabled}
                                                />
                                                <ScrollItemEditor
                                                    label="Carousel Items"
                                                    value={w.scrollItems || []}
                                                    onChange={(val) => updatePlpWidget(w.id, 'scrollItems', val)}
                                                    helperText="Add banner items with images and product lists"
                                                    required
                                                    disabled={disabled}
                                                />
                                            </>
                                        )}

                                        {/* ── Secondary Masthead type → CarouselItemEditor (same as homepage Masthead secondary) ── */}
                                        {group === 'masthead' && (
                                            <>
                                                {/* Background Media Upload */}
                                                <div className="mb-2">
                                                    <label className="block text-xs font-medium text-slate-500 mb-1">Background Media</label>
                                                    <label className="cursor-pointer group block w-fit">
                                                        <input
                                                            type="file"
                                                            accept="image/*,video/*"
                                                            className="hidden"
                                                            onChange={async (e) => {
                                                                if (e.target.files && e.target.files[0]) {
                                                                    const file = e.target.files[0];
                                                                    updatePlpWidget(w.id, 'background_media', file);
                                                                    try {
                                                                        setUploadingBgMedia(w.id);
                                                                        const result = await LocalApiService.uploadMedia(file);
                                                                        if (result.viewUrl) updatePlpWidget(w.id, 'background_media', result.viewUrl);
                                                                    } catch (err) {
                                                                        console.error('[ExpandPage] Background media upload failed:', err);
                                                                    } finally {
                                                                        setUploadingBgMedia(null);
                                                                    }
                                                                }
                                                            }}
                                                            disabled={disabled}
                                                        />
                                                        {uploadingBgMedia === w.id ? (
                                                            <div className="w-20 h-12 rounded-lg border border-blue-300 flex items-center justify-center bg-blue-50">
                                                                <Loader2 size={16} className="animate-spin text-blue-500" />
                                                            </div>
                                                        ) : w.background_media && (typeof w.background_media === 'string' && w.background_media.length > 0) ? (
                                                            <div className="w-20 h-12 rounded-lg border border-slate-200 overflow-hidden group-hover:ring-2 group-hover:ring-violet-500/30 transition-all">
                                                                <img src={w.background_media} alt="" className="w-full h-full object-cover" />
                                                            </div>
                                                        ) : (
                                                            <div className="w-20 h-12 rounded-lg border border-dashed border-slate-300 flex flex-col items-center justify-center bg-slate-50 group-hover:border-violet-400 group-hover:bg-violet-50 transition-all">
                                                                <ImagePlus size={16} className="text-slate-400 group-hover:text-violet-500 mb-0.5" />
                                                                <span className="text-[9px] text-slate-400 group-hover:text-violet-500">Upload</span>
                                                            </div>
                                                        )}
                                                    </label>
                                                    <p className="mt-1 text-[10px] text-slate-400">Upload image/video for multimedia background</p>
                                                </div>
                                                <TextInput
                                                    label="Media Number"
                                                    value={w.media_number || '2.5'}
                                                    onChange={(val) => updatePlpWidget(w.id, 'media_number', val)}
                                                    placeholder="e.g. 2.5"
                                                    helperText="Items visible at once (e.g. 2.5 = 2 full + half peek)"
                                                    disabled={disabled}
                                                />
                                                <CarouselItemEditor
                                                    label="Carousel Items"
                                                    value={w.carouselItems || []}
                                                    onChange={(val) => updatePlpWidget(w.id, 'carouselItems', val)}
                                                    helperText="Add banner items with category pages and sub-categories"
                                                    required
                                                    disabled={disabled}
                                                />
                                            </>
                                        )}

                                        {/* ── SPR / DPR / Multimedia variants → Title + StateProductEditor ── */}
                                        {group === 'spr' && (
                                            <>
                                                <TextInput
                                                    label="Title"
                                                    value={w.title || ''}
                                                    onChange={(val) => updatePlpWidget(w.id, 'title', val)}
                                                    required
                                                    disabled={disabled}
                                                />
                                                <StateProductEditor
                                                    label="Products (State-wise)"
                                                    value={w.stateProducts || { global: '' }}
                                                    onChange={(val) =>
                                                        updatePlpWidget(w.id, 'stateProducts', val)
                                                    }
                                                    helperText="Global required. Add states for location-specific."
                                                    disabled={disabled}
                                                />
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Add widget button / Picker */}
                    {!showPicker ? (
                        <button
                            onClick={() => setShowPicker(true)}
                            disabled={disabled}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg transition-colors w-full justify-center"
                        >
                            <Plus size={14} />
                            Add Widget to PLP Page
                        </button>
                    ) : (
                        <div className="border border-violet-200 rounded-lg p-2.5 bg-white">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                                    Select Widget Type
                                </span>
                                <button
                                    onClick={() => setShowPicker(false)}
                                    className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                                {PLP_WIDGET_TYPES.map((t) => (
                                    <button
                                        key={t.type}
                                        onClick={() => addPlpWidget(t.type)}
                                        className="flex items-center gap-2 px-2.5 py-2 text-[11px] text-slate-700 bg-slate-50 hover:bg-violet-50 hover:text-violet-700 border border-slate-200 hover:border-violet-300 rounded-md transition-colors text-left"
                                    >
                                        <LayoutGrid size={11} className="text-slate-400 shrink-0" />
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-2 text-[10px] text-slate-400 text-center">
                                Category Grid not supported on PLP pages
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ExpandPageSection;
