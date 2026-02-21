import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, History, Clock, User, RotateCcw, Loader2, Eye, Code2, ChevronDown } from 'lucide-react';
import { LocalApiService } from '../../services/LocalApiService';
import showToast from '../../utils/toast';
import SnapshotPreview from './SnapshotPreview';

/**
 * WidgetVersionHistory — Timeline + JSON diff / visual preview for widget versions.
 *
 * Props:
 * - widgetId: string (Prisma widget ID)
 * - widgetSlug: string (display only)
 * - onClose: () => void
 * - onRestore: (snapshot) => void (optional)
 */
const WidgetVersionHistory = ({ widgetId, widgetSlug = '', onClose, onRestore }) => {
    const [versions, setVersions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [nextCursor, setNextCursor] = useState(null);
    const [selectedVersion, setSelectedVersion] = useState(null);
    const [rightTab, setRightTab] = useState('diff'); // 'diff' | 'preview'

    useEffect(() => {
        if (!widgetId) return;
        setLoading(true);
        LocalApiService.getWidgetVersions(widgetId)
            .then((res) => {
                const data = res.versions || res; // support both paginated and legacy response
                setVersions(data);
                setHasMore(res.hasMore || false);
                setNextCursor(res.nextCursor || null);
                if (data.length > 0) setSelectedVersion(data[0].version);
            })
            .catch((err) => {
                console.error('Failed to fetch versions:', err);
                showToast.error('Failed to load version history');
            })
            .finally(() => setLoading(false));
    }, [widgetId]);

    const loadOlderVersions = useCallback(async () => {
        if (!nextCursor || loadingMore) return;
        setLoadingMore(true);
        try {
            const res = await LocalApiService.getWidgetVersions(widgetId, { cursor: nextCursor });
            const data = res.versions || res;
            setVersions(prev => [...prev, ...data]);
            setHasMore(res.hasMore || false);
            setNextCursor(res.nextCursor || null);
        } catch (err) {
            console.error('Failed to load older versions:', err);
            showToast.error('Failed to load older versions');
        } finally {
            setLoadingMore(false);
        }
    }, [widgetId, nextCursor, loadingMore]);

    const selectedEntry = versions.find(v => v.version === selectedVersion);
    const previousEntry = versions.find(v => v.version === selectedVersion - 1);

    const handleRestore = () => {
        if (selectedEntry && onRestore) {
            const snapshot = typeof selectedEntry.snapshot === 'string'
                ? JSON.parse(selectedEntry.snapshot)
                : selectedEntry.snapshot;
            onRestore(snapshot);
            showToast.success(`Restored to version ${selectedEntry.version}`);
        } else {
            showToast.info('Restore callback not connected yet');
        }
    };

    const formatTime = useCallback((iso) => {
        if (!iso) return '--';
        const d = new Date(iso);
        const now = new Date();
        const diffMs = now - d;
        const diffHrs = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffHrs < 1) return 'Just now';
        if (diffHrs < 24) return `${diffHrs}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    }, []);

    // Memoize diff computation
    const diffContent = useMemo(() => {
        if (!selectedEntry) return null;
        return renderDiff(
            parseSnapshot(previousEntry?.snapshot),
            parseSnapshot(selectedEntry.snapshot)
        );
    }, [selectedEntry, previousEntry]);

    // Memoize parsed snapshots for preview
    const selectedSnapshot = useMemo(() => parseSnapshot(selectedEntry?.snapshot), [selectedEntry]);
    const previousSnapshot = useMemo(() => parseSnapshot(previousEntry?.snapshot), [previousEntry]);

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

            {/* Panel */}
            <div className="fixed inset-y-0 right-0 w-full max-w-4xl bg-white shadow-2xl z-50 flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-6 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <History size={24} />
                            <div>
                                <h2 className="text-xl font-bold">Version History</h2>
                                <p className="text-sm text-indigo-200 mt-1 font-mono">{widgetSlug || widgetId}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <Loader2 size={32} className="animate-spin mb-3" />
                        <span className="text-sm">Loading versions...</span>
                    </div>
                )}

                {/* Empty State */}
                {!loading && versions.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <History size={40} className="mb-3 text-slate-300" />
                        <h4 className="font-semibold text-slate-600 mb-1">No Versions Yet</h4>
                        <p className="text-sm">This widget has no version history recorded.</p>
                    </div>
                )}

                {/* Content: 2-panel */}
                {!loading && versions.length > 0 && (
                    <div className="flex flex-1 overflow-hidden">
                        {/* Left: Timeline */}
                        <div className="w-72 border-r border-slate-200 overflow-y-auto p-4 bg-slate-50 shrink-0">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Timeline</h3>
                            {versions.map((entry, i) => (
                                <TimelineEntry
                                    key={entry.version}
                                    entry={entry}
                                    isFirst={i === 0}
                                    isLast={i === versions.length - 1}
                                    isSelected={entry.version === selectedVersion}
                                    onSelect={setSelectedVersion}
                                    formatTime={formatTime}
                                />
                            ))}

                            {/* Load older versions */}
                            {hasMore && (
                                <button
                                    onClick={loadOlderVersions}
                                    disabled={loadingMore}
                                    className="w-full mt-3 py-2 flex items-center justify-center gap-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {loadingMore ? (
                                        <Loader2 size={12} className="animate-spin" />
                                    ) : (
                                        <ChevronDown size={12} />
                                    )}
                                    {loadingMore ? 'Loading...' : 'Load older versions'}
                                </button>
                            )}
                        </div>

                        {/* Right: Diff / Preview */}
                        <div className="flex-1 overflow-y-auto flex flex-col">
                            {selectedEntry ? (
                                <>
                                    <div className="flex items-center justify-between p-6 pb-0">
                                        <h3 className="text-sm font-bold text-slate-800">
                                            Version {selectedEntry.version}
                                            {selectedEntry.changeLog ? ` — ${selectedEntry.changeLog}` : ''}
                                        </h3>
                                        {selectedVersion !== versions[0]?.version && (
                                            <button
                                                onClick={handleRestore}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                            >
                                                <RotateCcw size={12} />
                                                Restore This Version
                                            </button>
                                        )}
                                    </div>

                                    {/* Tab switcher */}
                                    <div className="flex gap-1 px-6 pt-3 pb-2">
                                        <button
                                            onClick={() => setRightTab('diff')}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                                rightTab === 'diff'
                                                    ? 'bg-slate-800 text-white'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                        >
                                            <Code2 size={12} />
                                            Diff
                                        </button>
                                        <button
                                            onClick={() => setRightTab('preview')}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                                rightTab === 'preview'
                                                    ? 'bg-slate-800 text-white'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                        >
                                            <Eye size={12} />
                                            Preview
                                        </button>
                                    </div>

                                    {/* Tab content */}
                                    <div className="flex-1 overflow-y-auto px-6 pb-6">
                                        {rightTab === 'diff' ? (
                                            <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs overflow-auto">
                                                {diffContent}
                                            </div>
                                        ) : (
                                            <div className="flex gap-4">
                                                {previousSnapshot && (
                                                    <div className="flex-1 min-w-0">
                                                        <SnapshotPreview
                                                            snapshot={previousSnapshot}
                                                            label={`v${selectedVersion - 1} (Previous)`}
                                                        />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <SnapshotPreview
                                                        snapshot={selectedSnapshot}
                                                        label={`v${selectedVersion} (Selected)`}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                                    Select a version to view changes
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="border-t border-slate-200 p-4 bg-white shrink-0 flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                        {versions.length} version{versions.length !== 1 ? 's' : ''} loaded
                        {hasMore && ' (more available)'}
                    </p>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </>
    );
};

/** Memoized timeline entry */
const TimelineEntry = React.memo(({ entry, isFirst, isLast, isSelected, onSelect, formatTime }) => {
    return (
        <button
            onClick={() => onSelect(entry.version)}
            className={`w-full text-left mb-1 last:mb-0 relative pl-6 py-3 rounded-lg transition-all ${
                isSelected
                    ? 'bg-indigo-50 border border-indigo-200'
                    : 'hover:bg-white border border-transparent'
            }`}
        >
            {/* Timeline dot and line */}
            <div className="absolute left-2 top-0 bottom-0 flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full border-2 mt-4 shrink-0 ${
                    isSelected
                        ? 'bg-indigo-600 border-indigo-600'
                        : isFirst
                            ? 'bg-white border-indigo-400'
                            : 'bg-white border-slate-300'
                }`} />
                {!isLast && (
                    <div className="w-0.5 flex-1 bg-slate-200 mt-1" />
                )}
            </div>

            {/* Content */}
            <div className="ml-2">
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                        isFirst ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                        v{entry.version}
                    </span>
                    {isFirst && (
                        <span className="text-[10px] text-indigo-500 font-medium">current</span>
                    )}
                </div>
                <div className="flex items-center gap-1 mt-1.5 text-[10px] text-slate-400">
                    <Clock size={10} />
                    {formatTime(entry.createdAt)}
                </div>
                <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-400">
                    <User size={10} />
                    {(entry.changedBy || 'unknown').split('@')[0]}
                </div>
                {entry.changeLog && (
                    <p className="text-xs text-slate-600 mt-1.5 line-clamp-2">
                        {entry.changeLog}
                    </p>
                )}
            </div>
        </button>
    );
});

function parseSnapshot(snapshot) {
    if (!snapshot) return null;
    if (typeof snapshot === 'string') {
        try { return JSON.parse(snapshot); } catch { return null; }
    }
    return snapshot;
}

/**
 * Render a simple JSON diff between two snapshots
 */
function renderDiff(prev, current) {
    if (!current) return <span className="text-slate-500">No data</span>;

    const lines = [];
    const allKeys = new Set([...Object.keys(prev || {}), ...Object.keys(current)]);

    lines.push(<span key="open" className="text-slate-400">{'{'}</span>);

    for (const key of allKeys) {
        const prevVal = prev ? JSON.stringify(prev[key], null, 2) : undefined;
        const currVal = JSON.stringify(current[key], null, 2);

        if (prevVal === currVal) {
            lines.push(
                <div key={`same-${key}`} className="text-slate-400 pl-4">
                    "{key}": {truncateValue(currVal)},
                </div>
            );
        } else if (prevVal !== undefined && currVal !== undefined) {
            lines.push(
                <div key={`del-${key}`} className="bg-red-500/10 text-red-400 pl-4">
                    - "{key}": {truncateValue(prevVal)},
                </div>
            );
            lines.push(
                <div key={`add-${key}`} className="bg-green-500/10 text-green-400 pl-4">
                    + "{key}": {truncateValue(currVal)},
                </div>
            );
        } else if (prevVal === undefined) {
            lines.push(
                <div key={`new-${key}`} className="bg-green-500/10 text-green-400 pl-4">
                    + "{key}": {truncateValue(currVal)},
                </div>
            );
        } else {
            lines.push(
                <div key={`rem-${key}`} className="bg-red-500/10 text-red-400 pl-4">
                    - "{key}": {truncateValue(prevVal)},
                </div>
            );
        }
    }

    lines.push(<span key="close" className="text-slate-400">{'}'}</span>);

    return <div className="space-y-0.5">{lines}</div>;
}

function truncateValue(val) {
    if (!val) return 'null';
    if (val.length > 80) return val.slice(0, 77) + '...';
    return val;
}

export default WidgetVersionHistory;
