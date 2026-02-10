import React from 'react';
import { Clock, User } from 'lucide-react';

/**
 * Last Modified Badge
 * Shows when and by whom a widget was last modified
 */
const LastModifiedBadge = ({
    timestamp,
    user = 'Unknown',
    className = ''
}) => {
    if (!timestamp) return null;

    const formatTime = (ts) => {
        const date = new Date(ts);
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

    return (
        <div className={`inline-flex items-center gap-2 px-2 py-1 bg-slate-100 rounded-lg text-xs text-slate-600 ${className}`}>
            <Clock size={12} className="text-slate-400" />
            <span>{formatTime(timestamp)}</span>
            <span className="text-slate-400">•</span>
            <User size={12} className="text-slate-400" />
            <span>{user}</span>
        </div>
    );
};

export default LastModifiedBadge;
