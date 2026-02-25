import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { WidgetRegistry } from '../../config/WidgetRegistry';
import { useWidgetContext } from '../../context/WidgetContext';
import {
    HEADER_OPTIONS,
    WIDGET_TYPE_CODES,
    LEGACY_WIDGET_TYPE_CODES,
    WIDGET_ITEM_TYPE_AUTO_MAP,
    ZONE_OPTIONS,
    LOCATION_LEVELS,
    LOCATION_DATA,
    USER_OPTIONS,
    DEVICE_OPTIONS,
} from '../../constants/slugBuilderConstants';

/**
 * SlugBuilder — Optimized compound slug composer.
 *
 * Simplified layout:
 *   Row 1: [Header ▾] + [Identifier input] + auto badges
 *   Row 2: Slug preview (always visible)
 *   Row 3: "More options" toggle → Zone, Location, User, Device
 */
const SlugBuilder = ({ label, value, onChange, error, helperText, required, widget }) => {
    const { widgetSlugCache, setWidgetSlugCache } = useWidgetContext();
    const widgetId = widget?.id ?? 'global';
    const cached = widgetSlugCache?.[widgetId] ?? {};

    const [header, setHeader] = useState(cached.header ?? '');
    const [identifier, setIdentifier] = useState(cached.identifier ?? '');
    const [zone, setZone] = useState(cached.zone ?? '');
    const [locationLevel, setLocationLevel] = useState(cached.locationLevel ?? '');
    const [locations, setLocations] = useState(cached.locations ?? []);
    const [user, setUser] = useState(cached.user ?? '');
    const [device, setDevice] = useState(cached.device ?? '');
    const [showMore, setShowMore] = useState(false);
    const [copied, setCopied] = useState(false);

    // Restore from cache when widget changes
    useEffect(() => {
        const c = widgetSlugCache?.[widgetId] ?? {};
        if (c.header !== undefined) setHeader(c.header);
        if (c.identifier !== undefined) setIdentifier(c.identifier);
        if (c.zone !== undefined) setZone(c.zone);
        if (c.locationLevel !== undefined) setLocationLevel(c.locationLevel);
        if (c.locations !== undefined) setLocations(c.locations);
        if (c.user !== undefined) setUser(c.user);
        if (c.device !== undefined) setDevice(c.device);
    }, [widgetId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Write back to cache
    useEffect(() => {
        setWidgetSlugCache(widgetId, { header, identifier, zone, locationLevel, locations, user, device });
    }, [header, identifier, zone, locationLevel, locations, user, device, widgetId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-resolve widget type code
    const widgetTypeCode = useMemo(() => {
        if (!widget) return '';
        const config = WidgetRegistry.getConfig(widget.type);
        if (config) {
            const pnc = widget.pnc || config.initialState?.pnc || {};
            const backendType = WidgetRegistry.resolveVariant(widget.type, pnc, widget);
            return WIDGET_TYPE_CODES[backendType] || '';
        }
        return LEGACY_WIDGET_TYPE_CODES[widget.type] || '';
    }, [widget?.type, widget?.pnc]);

    // Auto-derive widget item type code
    const widgetItemTypeCode = useMemo(() => {
        if (!widget) return '';
        const config = WidgetRegistry.getConfig(widget.type);
        if (config) {
            const pnc = widget.pnc || config.initialState?.pnc || {};
            const backendType = WidgetRegistry.resolveVariant(widget.type, pnc, widget);
            return WIDGET_ITEM_TYPE_AUTO_MAP[backendType] || '';
        }
        const legacyItemMap = {
            'Primary Masthead': 'cl', 'Secondary Masthead': 'cl',
            'Category Grid': 'cat', 'Product Listing Page (CLP)': 'sc',
            'Single Product Row Optimize': 'sc', 'Banner With Product Listing': 'cl',
        };
        return legacyItemMap[widget.type] || '';
    }, [widget?.type, widget?.pnc]);

    // Compose slug
    const composedSlug = useMemo(() => {
        const locationPart = locationLevel === 'Global' ? 'global' : locations.join('_');
        return [header, identifier, widgetTypeCode, widgetItemTypeCode, zone, locationPart, user, device]
            .filter(Boolean).join('_');
    }, [header, identifier, widgetTypeCode, widgetItemTypeCode, zone, locationLevel, locations, user, device]);

    // Propagate to parent
    useEffect(() => {
        if (composedSlug && onChange) onChange(composedSlug);
    }, [composedSlug]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleIdentifierChange = useCallback((val) => {
        setIdentifier(val.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
    }, []);

    const handleCopy = useCallback(() => {
        if (!composedSlug) return;
        navigator.clipboard.writeText(composedSlug).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    }, [composedSlug]);

    // Count active "more" options for badge
    const moreCount = [zone, locationLevel, user, device].filter(Boolean).length;

    const locationValues = locationLevel && locationLevel !== 'Global' ? LOCATION_DATA[locationLevel] || [] : [];

    return (
        <div className="mb-3">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
                {label}
                {required && <span className="text-red-400 ml-1">*</span>}
            </label>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-2">
                {/* ── Row 1: Header + Identifier (compact) ── */}
                <div className="flex gap-1.5">
                    <select
                        value={header}
                        onChange={(e) => setHeader(e.target.value)}
                        className="w-[130px] shrink-0 px-2 py-1.5 bg-white border border-slate-200 rounded-md text-[11px] text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                    >
                        <option value="">Header...</option>
                        {HEADER_OPTIONS.map((h) => (
                            <option key={h} value={h}>{h}</option>
                        ))}
                    </select>
                    <input
                        type="text"
                        value={identifier}
                        onChange={(e) => handleIdentifierChange(e.target.value)}
                        placeholder="identifier (e.g. rice_mela)"
                        className="flex-1 min-w-0 px-2 py-1.5 bg-white border border-slate-200 rounded-md text-[11px] text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 placeholder:text-slate-400"
                    />
                </div>

                {/* ── Auto-detected badges ── */}
                {(widgetTypeCode || widgetItemTypeCode) && (
                    <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-slate-400 uppercase tracking-wide">Auto:</span>
                        {widgetTypeCode && (
                            <span className="px-1.5 py-0.5 bg-blue-50 border border-blue-200 rounded text-[10px] font-mono text-blue-700">
                                {widgetTypeCode}
                            </span>
                        )}
                        {widgetItemTypeCode && (
                            <span className="px-1.5 py-0.5 bg-violet-50 border border-violet-200 rounded text-[10px] font-mono text-violet-700">
                                {widgetItemTypeCode}
                            </span>
                        )}
                    </div>
                )}

                {/* ── Slug Preview (always visible) ── */}
                {composedSlug ? (
                    <div className="bg-white border border-slate-200 rounded-md px-2.5 py-1.5 flex items-center justify-between gap-2">
                        <code className="text-[11px] text-emerald-700 font-mono break-all flex-1 leading-relaxed">
                            {composedSlug}
                        </code>
                        <button
                            type="button"
                            onClick={handleCopy}
                            className="shrink-0 p-1 rounded hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
                            title="Copy slug"
                        >
                            {copied
                                ? <Check size={12} className="text-green-600" />
                                : <Copy size={12} />
                            }
                        </button>
                    </div>
                ) : (
                    <div className="bg-white border border-dashed border-slate-200 rounded-md px-2.5 py-1.5">
                        <span className="text-[11px] text-slate-400 italic">Select header + type identifier to compose slug</span>
                    </div>
                )}

                {/* ── More Options (collapsed by default) ── */}
                <button
                    type="button"
                    onClick={() => setShowMore(!showMore)}
                    className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-blue-600 transition-colors w-full"
                >
                    {showMore
                        ? <ChevronDown size={12} />
                        : <ChevronRight size={12} />
                    }
                    <span className="font-medium">More options</span>
                    {moreCount > 0 && (
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[9px] font-bold">
                            {moreCount}
                        </span>
                    )}
                    <span className="text-slate-400 text-[10px]">Zone, Location, User, Device</span>
                </button>

                {showMore && (
                    <div className="space-y-2 pt-1 border-t border-slate-100">
                        {/* Zone + Location */}
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-[10px] font-medium text-slate-400 mb-0.5">Zone</label>
                                <select
                                    value={zone}
                                    onChange={(e) => setZone(e.target.value)}
                                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md text-[11px] text-slate-700 focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">None</option>
                                    {ZONE_OPTIONS.map((z) => (
                                        <option key={z} value={z}>{z}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-medium text-slate-400 mb-0.5">Location</label>
                                <select
                                    value={locationLevel}
                                    onChange={(e) => { setLocationLevel(e.target.value); setLocations([]); }}
                                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md text-[11px] text-slate-700 focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">None</option>
                                    {LOCATION_LEVELS.map((l) => (
                                        <option key={l} value={l}>{l}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Location pills (if non-Global level selected) */}
                        {locationLevel && locationLevel !== 'Global' && locationValues.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {locationValues.map((loc) => {
                                    const isSelected = locations.includes(loc);
                                    return (
                                        <button
                                            key={loc}
                                            type="button"
                                            onClick={() => setLocations(prev =>
                                                prev.includes(loc) ? prev.filter(l => l !== loc) : [...prev, loc]
                                            )}
                                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${isSelected
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-white text-slate-500 border border-slate-200 hover:border-blue-300'
                                            }`}
                                        >
                                            {loc}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* User + Device */}
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-[10px] font-medium text-slate-400 mb-0.5">User</label>
                                <select
                                    value={user}
                                    onChange={(e) => setUser(e.target.value)}
                                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md text-[11px] text-slate-700 focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">None</option>
                                    {USER_OPTIONS.map((u) => (
                                        <option key={u} value={u}>{u}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-medium text-slate-400 mb-0.5">Device</label>
                                <select
                                    value={device}
                                    onChange={(e) => setDevice(e.target.value)}
                                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md text-[11px] text-slate-700 focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">None</option>
                                    {DEVICE_OPTIONS.map((d) => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
            {!error && helperText && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
        </div>
    );
};

export default SlugBuilder;
