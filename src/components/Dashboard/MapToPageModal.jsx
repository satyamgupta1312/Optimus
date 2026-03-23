import React, { useState, useMemo } from 'react';
import { X, MapPin, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { API_BASE, ENDPOINTS } from '../../config/apiConfig';
import { getCsrfToken } from '../../Backend/ApiClient';
import { LOCATION_HIERARCHY, HOMEPAGE_SLUG } from '../../config/Feature/HomepageMappingConfig';
import toast from 'react-hot-toast';

/**
 * MapToPageModal — maps deployed widget slugs to a page layout via CSV upload.
 *
 * Props:
 *   slugs    — Array of { widget, slug, status } from deploy results
 *   onClose  — close the modal
 *   onMapped — callback after successful mapping
 */
const MapToPageModal = ({ slugs, onClose, onMapped }) => {
    const [pageSlug, setPageSlug] = useState(HOMEPAGE_SLUG);
    const [mapping, setMapping] = useState(false);
    const [mapResult, setMapResult] = useState(null); // null | { ok: bool, message: string }

    // Only show widgets that deployed successfully
    const deployedSlugs = useMemo(
        () => slugs.filter(s => (s.status === 'ok' || s.status === 'updated') && s.slug),
        [slugs],
    );

    // Per-widget state: checked, levelTag, levelProperty, priority
    const [rows, setRows] = useState(() =>
        deployedSlugs.map((s, i) => ({
            slug: s.slug,
            widget: s.widget,
            checked: true,
            levelTag: 'global',
            levelProperty: 'global',
            priority: i + 1,
        })),
    );

    const updateRow = (idx, patch) => {
        setRows(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
    };

    const checkedCount = rows.filter(r => r.checked).length;

    // Build a single batch CSV for all checked widgets
    const handleMap = async () => {
        if (!pageSlug.trim()) {
            toast.error('Enter a page layout slug');
            return;
        }
        if (checkedCount === 0) {
            toast.error('Select at least one widget');
            return;
        }

        setMapping(true);
        setMapResult(null);

        try {
            const csvHeader = 'widget_slug_name,level_tag,level_property,priority,cohort';
            const csvRows = rows
                .filter(r => r.checked)
                .map(r => `${r.slug},${r.levelTag},${r.levelProperty},${r.priority},`);
            const csvContent = [csvHeader, ...csvRows].join('\n');
            const csvBlob = new Blob([csvContent], { type: 'text/csv' });

            const csrfToken = getCsrfToken();
            const formData = new FormData();
            if (csrfToken) formData.append('csrfmiddlewaretoken', csrfToken);
            formData.append('page_layout_slug', pageSlug.trim());
            formData.append('mapping_file', csvBlob, 'mapping.csv');

            const url = `${API_BASE}${ENDPOINTS.mapLayoutWidget}`;
            const res = await fetch(url, {
                method: 'POST',
                credentials: 'include',
                headers: { 'X-CSRFToken': csrfToken || '' },
                body: formData,
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(`HTTP ${res.status}: ${text.substring(0, 300)}`);
            }

            setMapResult({ ok: true, message: `Mapped ${checkedCount} widget(s) to ${pageSlug}` });
            toast.success(`Mapped ${checkedCount} widget(s) to ${pageSlug}`, { icon: '📍' });
            onMapped?.();
        } catch (err) {
            console.error('[MapToPage] Error:', err);
            setMapResult({ ok: false, message: err.message });
            toast.error(`Mapping failed: ${err.message}`);
        } finally {
            setMapping(false);
        }
    };

    // Level tag options from LOCATION_HIERARCHY
    const levelOptions = LOCATION_HIERARCHY.map(h => ({
        value: h.levelTag,
        label: h.level,
    }));

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/40 z-[200]" onClick={onClose} />

            {/* Modal */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] max-h-[80vh] bg-white rounded-lg shadow-md border border-slate-200 z-[201] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                        <MapPin size={16} className="text-blue-600" />
                        Map Widgets to Page
                    </h4>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-4 py-3 overflow-y-auto flex-1 space-y-3">
                    {/* Page Layout Slug */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Page Layout Slug</label>
                        <input
                            type="text"
                            value={pageSlug}
                            onChange={e => setPageSlug(e.target.value)}
                            placeholder="GL-HP-global"
                            className="w-full text-[13px] border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                        />
                    </div>

                    {/* Widget Rows */}
                    <div>
                        <p className="text-xs font-semibold text-slate-600 mb-2">
                            Deployed Widgets ({deployedSlugs.length})
                        </p>

                        {deployedSlugs.length === 0 && (
                            <p className="text-xs text-slate-400 italic">No successfully deployed widgets to map.</p>
                        )}

                        <div className="space-y-2.5">
                            {rows.map((row, idx) => (
                                <div
                                    key={row.slug}
                                    className={`border rounded-lg p-2.5 transition-all ${
                                        row.checked
                                            ? 'border-blue-200 bg-blue-50/50'
                                            : 'border-slate-100 bg-slate-50/50 opacity-60'
                                    }`}
                                >
                                    {/* Checkbox + slug */}
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={row.checked}
                                            onChange={e => updateRow(idx, { checked: e.target.checked })}
                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-[13px] font-medium text-slate-800 truncate">{row.slug}</span>
                                    </label>
                                    {row.widget !== row.slug && (
                                        <p className="text-xs text-slate-400 ml-6 truncate">{row.widget}</p>
                                    )}

                                    {/* Controls (only when checked) */}
                                    {row.checked && (
                                        <div className="mt-2 ml-6 grid grid-cols-3 gap-2">
                                            {/* Level Tag */}
                                            <div>
                                                <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Level</label>
                                                <select
                                                    value={row.levelTag}
                                                    onChange={e => {
                                                        const tag = e.target.value;
                                                        updateRow(idx, {
                                                            levelTag: tag,
                                                            levelProperty: tag === 'global' ? 'global' : '',
                                                        });
                                                    }}
                                                    className="w-full text-xs border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:border-blue-400"
                                                >
                                                    {levelOptions.map(o => (
                                                        <option key={o.value} value={o.value}>{o.label}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Level Property */}
                                            <div>
                                                <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Value</label>
                                                {row.levelTag === 'global' ? (
                                                    <input
                                                        type="text"
                                                        value="global"
                                                        disabled
                                                        className="w-full text-xs border border-slate-100 bg-slate-100 rounded px-1.5 py-1 text-slate-400"
                                                    />
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={row.levelProperty}
                                                        onChange={e => updateRow(idx, { levelProperty: e.target.value })}
                                                        placeholder={
                                                            row.levelTag === 'state' ? 'jharkhand' :
                                                            row.levelTag === 'city' ? 'bengaluru' :
                                                            '166'
                                                        }
                                                        className="w-full text-xs border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:border-blue-400"
                                                    />
                                                )}
                                            </div>

                                            {/* Priority */}
                                            <div>
                                                <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Priority</label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={row.priority}
                                                    onChange={e => updateRow(idx, { priority: parseInt(e.target.value, 10) || 1 })}
                                                    className="w-full text-xs border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:border-blue-400"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Result message */}
                    {mapResult && (
                        <div className={`flex items-center gap-2 text-xs p-2 rounded-lg ${
                            mapResult.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}>
                            {mapResult.ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
                            {mapResult.message}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-slate-200 flex gap-2 shrink-0">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleMap}
                        disabled={mapping || checkedCount === 0 || !pageSlug.trim()}
                        className="flex-1 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {mapping ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
                        {mapping ? 'Mapping...' : `Map ${checkedCount} Widget${checkedCount !== 1 ? 's' : ''}`}
                    </button>
                </div>
            </div>
        </>
    );
};

export default MapToPageModal;
