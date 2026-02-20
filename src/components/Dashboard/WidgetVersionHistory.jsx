import React, { useState, useMemo } from 'react';
import { X, History, Clock, User, GitBranch, RotateCcw } from 'lucide-react';
import { getVersionHistory } from '../../data/mockVersionHistory';
import showToast from '../../utils/toast';

/**
 * WidgetVersionHistory — Timeline + JSON diff viewer for widget versions.
 *
 * Props:
 * - widgetId: string
 * - widgetSlug: string
 * - onClose: () => void
 * - onRestore: (snapshot) => void (optional)
 */
const WidgetVersionHistory = ({ widgetId, widgetSlug = 'rice_mela_spr_opt', onClose, onRestore }) => {
    const versions = useMemo(() => getVersionHistory(widgetSlug), [widgetSlug]);
    const [selectedVersion, setSelectedVersion] = useState(versions[0]?.version ?? null);

    const selectedEntry = versions.find(v => v.version === selectedVersion);
    const previousEntry = versions.find(v => v.version === selectedVersion - 1);

    const handleRestore = () => {
        if (selectedEntry && onRestore) {
            onRestore(selectedEntry.snapshot);
            showToast.success(`Restored to version ${selectedEntry.version}`);
        } else {
            showToast.info('Restore callback not connected yet');
        }
    };

    const formatTime = (iso) => {
        const d = new Date(iso);
        const now = new Date();
        const diffMs = now - d;
        const diffHrs = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffHrs < 1) return 'Just now';
        if (diffHrs < 24) return `${diffHrs}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    };

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
                                <p className="text-sm text-indigo-200 mt-1 font-mono">{widgetSlug}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content: 2-panel */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Left: Timeline */}
                    <div className="w-72 border-r border-slate-200 overflow-y-auto p-4 bg-slate-50 shrink-0">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Timeline</h3>
                        {versions.map((entry, i) => {
                            const isSelected = entry.version === selectedVersion;
                            const isCurrent = i === 0;

                            return (
                                <button
                                    key={entry.version}
                                    onClick={() => setSelectedVersion(entry.version)}
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
                                                : isCurrent
                                                    ? 'bg-white border-indigo-400'
                                                    : 'bg-white border-slate-300'
                                        }`} />
                                        {i < versions.length - 1 && (
                                            <div className="w-0.5 flex-1 bg-slate-200 mt-1" />
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="ml-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                                isCurrent ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                v{entry.version}
                                            </span>
                                            {isCurrent && (
                                                <span className="text-[10px] text-indigo-500 font-medium">current</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 mt-1.5 text-[10px] text-slate-400">
                                            <Clock size={10} />
                                            {formatTime(entry.timestamp)}
                                        </div>
                                        <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-400">
                                            <User size={10} />
                                            {entry.user?.split('@')[0] || 'unknown'}
                                        </div>
                                        <p className="text-xs text-slate-600 mt-1.5 line-clamp-2">
                                            {entry.changeLog}
                                        </p>
                                        <span className={`inline-flex mt-1 text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                            entry.role === 'CHECKER'
                                                ? 'bg-amber-50 text-amber-700'
                                                : 'bg-blue-50 text-blue-700'
                                        }`}>
                                            {entry.role}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Right: Diff Viewer */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {selectedEntry ? (
                            <>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-slate-800">
                                        Version {selectedEntry.version} — {selectedEntry.changeLog}
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

                                {/* JSON diff view */}
                                <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs overflow-auto">
                                    {renderDiff(previousEntry?.snapshot, selectedEntry.snapshot)}
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                                Select a version to view changes
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 p-4 bg-white shrink-0 flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                        {versions.length} version{versions.length !== 1 ? 's' : ''} recorded
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
            // Unchanged
            lines.push(
                <div key={`same-${key}`} className="text-slate-400 pl-4">
                    "{key}": {truncateValue(currVal)},
                </div>
            );
        } else if (prevVal !== undefined && currVal !== undefined) {
            // Changed
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
            // Added
            lines.push(
                <div key={`new-${key}`} className="bg-green-500/10 text-green-400 pl-4">
                    + "{key}": {truncateValue(currVal)},
                </div>
            );
        } else {
            // Removed
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
