import React, { useState } from 'react';
import { Clock, User, Plus, Trash2, Edit, ChevronDown, Download } from 'lucide-react';
import { useActivityLog } from '../context/ActivityLogContext';

/**
 * Activity Log Panel
 * Displays recent activity history
 */
const ActivityLogPanel = ({ className = '' }) => {
    const { activities, getRecentActivities, clearActivities, exportActivities } = useActivityLog();
    const [showAll, setShowAll] = useState(false);
    const [filter, setFilter] = useState('all'); // 'all', 'widget', 'status', 'user'

    const displayActivities = showAll ? activities : getRecentActivities(20);

    const getActionIcon = (action) => {
        if (action.includes('add')) return <Plus size={14} className="text-green-600" />;
        if (action.includes('delete')) return <Trash2 size={14} className="text-red-600" />;
        if (action.includes('update') || action.includes('edit')) return <Edit size={14} className="text-blue-600" />;
        return <Clock size={14} className="text-slate-600" />;
    };

    const getActionColor = (action) => {
        if (action.includes('add')) return 'bg-green-50 border-green-200';
        if (action.includes('delete')) return 'bg-red-50 border-red-200';
        if (action.includes('update') || action.includes('edit')) return 'bg-blue-50 border-blue-200';
        return 'bg-slate-50 border-slate-200';
    };

    const formatAction = (action) => {
        return action
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const handleExport = () => {
        const data = exportActivities();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `activity-log-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
            {/* Header */}
            <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <Clock size={18} className="text-blue-600" />
                        Activity Log
                    </h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExport}
                            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Export activity log"
                        >
                            <Download size={16} />
                        </button>
                        <button
                            onClick={clearActivities}
                            className="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            Clear All
                        </button>
                    </div>
                </div>

                {/* Filter */}
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                >
                    <option value="all">All Activities</option>
                    <option value="widget">Widget Changes</option>
                    <option value="status">Status Changes</option>
                    <option value="user">User Actions</option>
                </select>
            </div>

            {/* Activity List */}
            <div className="max-h-96 overflow-y-auto">
                {displayActivities.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                        <Clock size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No activities yet</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {displayActivities.map((activity) => (
                            <div
                                key={activity.id}
                                className={`p-3 hover:bg-slate-50 transition-colors border-l-4 ${getActionColor(activity.action)}`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center mt-0.5">
                                        {getActionIcon(activity.action)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="text-sm font-medium text-slate-900">
                                                {formatAction(activity.action)}
                                            </p>
                                            <span className="text-xs text-slate-500 whitespace-nowrap">
                                                {formatTime(activity.timestamp)}
                                            </span>
                                        </div>
                                        {activity.details && Object.keys(activity.details).length > 0 && (
                                            <p className="text-xs text-slate-600 mt-1 truncate">
                                                {JSON.stringify(activity.details).slice(0, 100)}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-2 mt-1">
                                            <User size={12} className="text-slate-400" />
                                            <span className="text-xs text-slate-500">{activity.user}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            {activities.length > 20 && (
                <div className="p-3 border-t border-slate-200">
                    <button
                        onClick={() => setShowAll(!showAll)}
                        className="w-full text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center gap-1"
                    >
                        {showAll ? 'Show Less' : `Show All (${activities.length})`}
                        <ChevronDown size={14} className={showAll ? 'rotate-180' : ''} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default ActivityLogPanel;
