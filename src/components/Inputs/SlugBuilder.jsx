import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

// ── Reusable dark-themed select ──
const SlugSelect = ({ label, value, onChange, options, placeholder, disabled }) => (
    <div>
        <label className="block text-[10px] font-medium text-slate-500 mb-1">{label}</label>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <option value="">{placeholder || `Select ${label}`}</option>
            {options.map((opt) => {
                const val = typeof opt === 'object' ? opt.value : opt;
                const lbl = typeof opt === 'object' ? opt.label : opt;
                return (
                    <option key={val} value={val}>{lbl}</option>
                );
            })}
        </select>
    </div>
);

// ── Smart 2-step location selector ──
const SmartLocationSelect = ({ level, setLevel, locations, setLocations }) => {
    const toggleLocation = (loc) => {
        setLocations((prev) =>
            prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc]
        );
    };

    const locationValues = level && level !== 'Global' ? LOCATION_DATA[level] || [] : [];

    return (
        <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-1">Location</label>
            {/* Step 1: Level picker */}
            <select
                value={level}
                onChange={(e) => {
                    setLevel(e.target.value);
                    setLocations([]);
                }}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:bg-white mb-1.5"
            >
                <option value="">Select Level</option>
                {LOCATION_LEVELS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                ))}
            </select>

            {/* Step 2: Multi-select pills (only for non-Global) */}
            {level && level !== 'Global' && locationValues.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                    {locationValues.map((loc) => {
                        const isSelected = locations.includes(loc);
                        return (
                            <button
                                key={loc}
                                type="button"
                                onClick={() => toggleLocation(loc)}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${isSelected
                                    ? 'bg-blue-600 text-white ring-1 ring-blue-500/30'
                                    : 'bg-slate-50 text-slate-500 border border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                                    }`}
                            >
                                {loc}
                            </button>
                        );
                    })}
                </div>
            )}
            {level === 'Global' && (
                <span className="text-[10px] text-slate-500 italic">Global scope selected</span>
            )}
        </div>
    );
};

/**
 * SlugBuilder — Compound component that composes slug names from 8 hierarchical parts.
 *
 * Props match InputRegistry interface:
 * { label, value, onChange, error, helperText, required, widget }
 */
const SlugBuilder = ({ label, value, onChange, error, helperText, required, widget }) => {
    const { widgetSlugCache, setWidgetSlugCache } = useWidgetContext();
    const widgetId = widget?.id ?? 'global';
    const cached = widgetSlugCache?.[widgetId] ?? {};

    // ── Parse existing slug into parts (best-effort) ──
    const [header, setHeader] = useState(cached.header ?? '');
    const [identifier, setIdentifier] = useState(cached.identifier ?? '');

    const [zone, setZone] = useState(cached.zone ?? '');
    const [locationLevel, setLocationLevel] = useState(cached.locationLevel ?? '');
    const [locations, setLocations] = useState(cached.locations ?? []);
    const [user, setUser] = useState(cached.user ?? '');
    const [device, setDevice] = useState(cached.device ?? '');
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

    // Write back to cache whenever any part changes
    useEffect(() => {
        setWidgetSlugCache(widgetId, { header, identifier, zone, locationLevel, locations, user, device });
    }, [header, identifier, zone, locationLevel, locations, user, device, widgetId]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Auto-resolve widget type code (Part 3) ──
    const widgetTypeCode = useMemo(() => {
        if (!widget) return '';

        // Config-driven: resolve via WidgetRegistry
        const config = WidgetRegistry.getConfig(widget.type);
        if (config) {
            const pnc = widget.pnc || config.initialState?.pnc || {};
            const backendType = WidgetRegistry.resolveVariant(widget.type, pnc, widget);
            return WIDGET_TYPE_CODES[backendType] || '';
        }

        // Legacy fallback
        return LEGACY_WIDGET_TYPE_CODES[widget.type] || '';
    }, [widget?.type, widget?.pnc]);

    // ── Auto-derive widget item type code (Part 4) — no user input needed ──
    const widgetItemTypeCode = useMemo(() => {
        if (!widget) return '';

        // Config-driven: resolve backend type first, then map to item type
        const config = WidgetRegistry.getConfig(widget.type);
        if (config) {
            const pnc = widget.pnc || config.initialState?.pnc || {};
            const backendType = WidgetRegistry.resolveVariant(widget.type, pnc, widget);
            return WIDGET_ITEM_TYPE_AUTO_MAP[backendType] || '';
        }

        // Legacy fallback — map from legacy UI type names
        const legacyItemMap = {
            'Primary Masthead': 'cl',
            'Secondary Masthead': 'cl',
            'Category Grid': 'cat',
            'Product Listing Page (CLP)': 'sc',
            'Single Product Row Optimize': 'sc',
            'Banner With Product Listing': 'cl',
        };
        return legacyItemMap[widget.type] || '';
    }, [widget?.type, widget?.pnc]);

    // ── Compose slug on any change ──
    const composedSlug = useMemo(() => {
        const locationPart = locationLevel === 'Global'
            ? 'global'
            : locations.join('_');

        const parts = [
            header,
            identifier,
            widgetTypeCode,
            widgetItemTypeCode,
            zone,
            locationPart,
            user,
            device,
        ];

        // Join non-empty parts with underscore
        return parts.filter(Boolean).join('_');
    }, [header, identifier, widgetTypeCode, widgetItemTypeCode, zone, locationLevel, locations, user, device]);

    // ── Propagate composed slug to parent ──
    useEffect(() => {
        if (composedSlug && onChange) {
            onChange(composedSlug);
        }
    }, [composedSlug]);

    // ── Sanitize identifier input ──
    const handleIdentifierChange = useCallback((val) => {
        const sanitized = val.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        setIdentifier(sanitized);
    }, []);

    // ── Copy to clipboard ──
    const handleCopy = useCallback(() => {
        if (!composedSlug) return;
        navigator.clipboard.writeText(composedSlug).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    }, [composedSlug]);


    return (
        <div className="mb-3">
            <label className="block text-xs font-medium text-slate-500 mb-2">
                {label}
                {required && <span className="text-red-400 ml-1">*</span>}
            </label>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2.5">
                {/* Row 1: Header + Identifier */}
                <div className="grid grid-cols-2 gap-2">
                    <SlugSelect
                        label="1. Header"
                        value={header}
                        onChange={setHeader}
                        options={HEADER_OPTIONS}
                        placeholder="Select header"
                    />
                    <div>
                        <label className="block text-[10px] font-medium text-slate-500 mb-1">2. Identifier</label>
                        <input
                            type="text"
                            value={identifier}
                            onChange={(e) => handleIdentifierChange(e.target.value)}
                            placeholder="e.g. buy_1_get_1"
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-md text-xs text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                        />
                    </div>
                </div>

                {/* Row 2: Widget Type (auto) + Widget Item Type (auto) */}
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-[10px] font-medium text-slate-500 mb-1">3. Widget Type</label>
                        <div className="px-2 py-1.5 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-700 font-mono min-h-[28px] flex items-center">
                            {widgetTypeCode || <span className="text-slate-400 italic font-sans">auto-detected</span>}
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-medium text-slate-500 mb-1">4. Item Type</label>
                        <div className="px-2 py-1.5 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-700 font-mono min-h-[28px] flex items-center">
                            {widgetItemTypeCode || <span className="text-slate-400 italic font-sans">auto-detected</span>}
                        </div>
                    </div>
                </div>

                {/* Row 3: Zone + Location */}
                <div className="grid grid-cols-2 gap-2">
                    <SlugSelect
                        label="5. Zone"
                        value={zone}
                        onChange={setZone}
                        options={ZONE_OPTIONS}
                        placeholder="Select zone"
                    />
                    <SmartLocationSelect
                        level={locationLevel}
                        setLevel={setLocationLevel}
                        locations={locations}
                        setLocations={setLocations}
                    />
                </div>

                {/* Row 4: User + Device */}
                <div className="grid grid-cols-2 gap-2">
                    <SlugSelect
                        label="7. User"
                        value={user}
                        onChange={setUser}
                        options={USER_OPTIONS}
                        placeholder="Select user"
                    />
                    <SlugSelect
                        label="8. Device"
                        value={device}
                        onChange={setDevice}
                        options={DEVICE_OPTIONS}
                        placeholder="Select device"
                    />
                </div>

                {/* Slug Preview */}
                {composedSlug && (
                    <div className="mt-2 bg-white border border-slate-200 rounded-md p-2 flex items-center justify-between gap-2 shadow-sm">
                        <code className="text-[11px] text-emerald-700 font-mono break-all flex-1 leading-relaxed">
                            {composedSlug}
                        </code>
                        <button
                            type="button"
                            onClick={handleCopy}
                            className="shrink-0 px-2 py-1 text-[10px] font-medium rounded bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                )}
            </div>

            {error && (
                <p className="mt-1 text-xs text-red-500">{error}</p>
            )}
            {!error && helperText && (
                <p className="mt-1 text-xs text-slate-500">{helperText}</p>
            )}
        </div>
    );
};

export default SlugBuilder;
