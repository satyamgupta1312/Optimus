import React, { useState } from 'react';
import { X, CheckCircle, XCircle, SkipForward, Loader, Clock, ChevronDown, ChevronRight, RotateCcw, Rocket } from 'lucide-react';
import { mockDeployResults } from '../../data/mockDeployResults';

/**
 * DeploymentStatusPanel — Deploy progress + per-widget results.
 *
 * Props:
 * - results: DeployResult[] (defaults to mock)
 * - onClose: () => void
 * - onRetry: (widgetId) => void (optional)
 */
const DeploymentStatusPanel = ({ results = mockDeployResults, onClose, onRetry }) => {
    const [expandedLogs, setExpandedLogs] = useState({});

    const toggleLog = (widgetId) => {
        setExpandedLogs(prev => ({ ...prev, [widgetId]: !prev[widgetId] }));
    };

    // Compute summary
    const summary = results.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
    }, {});

    const completed = (summary.success || 0) + (summary.error || 0) + (summary.skipped || 0);
    const total = results.length;
    const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

    const statusConfig = {
        success: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50', label: 'Deployed' },
        error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Failed' },
        skipped: { icon: SkipForward, color: 'text-slate-400', bg: 'bg-slate-50', label: 'Skipped' },
        deploying: { icon: Loader, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Deploying' },
        pending: { icon: Clock, color: 'text-slate-300', bg: 'bg-white', label: 'Pending' },
    };

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

            {/* Panel */}
            <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Rocket size={24} />
                            <div>
                                <h2 className="text-xl font-bold">Deployment Status</h2>
                                <p className="text-sm text-blue-200 mt-1">
                                    {completed}/{total} widgets processed
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-600">Progress</span>
                        <span className="text-xs font-bold text-slate-700">{progressPct}%</span>
                    </div>
                    <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-blue-500 to-cyan-500"
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>
                    <div className="flex gap-4 mt-2">
                        {summary.success > 0 && (
                            <span className="text-[10px] font-medium text-green-600">{summary.success} succeeded</span>
                        )}
                        {summary.error > 0 && (
                            <span className="text-[10px] font-medium text-red-600">{summary.error} failed</span>
                        )}
                        {summary.skipped > 0 && (
                            <span className="text-[10px] font-medium text-slate-500">{summary.skipped} skipped</span>
                        )}
                        {summary.deploying > 0 && (
                            <span className="text-[10px] font-medium text-blue-600">{summary.deploying} deploying</span>
                        )}
                        {summary.pending > 0 && (
                            <span className="text-[10px] font-medium text-slate-400">{summary.pending} pending</span>
                        )}
                    </div>
                </div>

                {/* Results list */}
                <div className="flex-1 overflow-y-auto">
                    {results.map((result) => {
                        const config = statusConfig[result.status] || statusConfig.pending;
                        const StatusIcon = config.icon;
                        const isLogExpanded = expandedLogs[result.widgetId];

                        return (
                            <div key={result.widgetId} className={`border-b border-slate-100 ${config.bg}`}>
                                {/* Result row */}
                                <div className="px-6 py-3 flex items-start gap-3">
                                    <StatusIcon
                                        size={18}
                                        className={`mt-0.5 shrink-0 ${config.color} ${result.status === 'deploying' ? 'animate-spin' : ''}`}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-slate-800">{result.name}</span>
                                            <span className="text-[10px] font-mono text-slate-400 truncate">{result.slug}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5">{result.message}</p>
                                        {result.error && (
                                            <p className="text-xs text-red-600 mt-1 bg-red-50 px-2 py-1 rounded">
                                                {result.error}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {result.status === 'error' && onRetry && (
                                            <button
                                                onClick={() => onRetry(result.widgetId)}
                                                className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                                            >
                                                <RotateCcw size={10} />
                                                Retry
                                            </button>
                                        )}
                                        {result.log?.length > 0 && (
                                            <button
                                                onClick={() => toggleLog(result.widgetId)}
                                                className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                                                title="View log"
                                            >
                                                {isLogExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Expandable log */}
                                {isLogExpanded && result.log?.length > 0 && (
                                    <div className="px-6 pb-3">
                                        <div className="bg-slate-900 rounded-lg p-3 max-h-40 overflow-y-auto">
                                            {result.log.map((line, i) => (
                                                <div
                                                    key={i}
                                                    className={`text-[11px] font-mono leading-relaxed ${
                                                        line.includes('Error') || line.includes('❌')
                                                            ? 'text-red-400'
                                                            : line.includes('✅')
                                                                ? 'text-green-400'
                                                                : 'text-slate-400'
                                                    }`}
                                                >
                                                    {line}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 p-4 bg-white shrink-0 flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                        {summary.success || 0} succeeded
                        {summary.error ? ` · ${summary.error} failed` : ''}
                        {summary.skipped ? ` · ${summary.skipped} skipped` : ''}
                        {summary.pending ? ` · ${summary.pending} pending` : ''}
                    </p>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </>
    );
};

export default DeploymentStatusPanel;
