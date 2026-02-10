import React, { useState } from 'react';
import { MessageSquare, X, Send, Trash2 } from 'lucide-react';
import showToast from '../utils/toast';

/**
 * Widget Comments Component
 * Allows adding notes/comments to widgets
 */
const WidgetComments = ({ widgetId, comments = [], onAddComment, onDeleteComment }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [newComment, setNewComment] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        const comment = {
            id: crypto.randomUUID(),
            widgetId,
            text: newComment,
            user: 'Current User', // Replace with actual user
            timestamp: new Date().toISOString(),
        };

        if (onAddComment) {
            onAddComment(comment);
            showToast.success('Comment added');
        }

        setNewComment('');
    };

    const handleDelete = (commentId) => {
        if (onDeleteComment) {
            onDeleteComment(commentId);
            showToast.success('Comment deleted');
        }
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleString();
    };

    const widgetComments = comments.filter(c => c.widgetId === widgetId);

    return (
        <div className="relative">
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
          flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all
          ${widgetComments.length > 0
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }
        `}
            >
                <MessageSquare size={14} />
                Comments {widgetComments.length > 0 && `(${widgetComments.length})`}
            </button>

            {/* Comments Panel */}
            {isOpen && (
                <div className="absolute top-full mt-2 right-0 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-200">
                        <h4 className="font-bold text-slate-900 flex items-center gap-2">
                            <MessageSquare size={16} className="text-blue-600" />
                            Widget Comments
                        </h4>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Comments List */}
                    <div className="max-h-64 overflow-y-auto p-4 space-y-3">
                        {widgetComments.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-4">
                                No comments yet. Add one below!
                            </p>
                        ) : (
                            widgetComments.map((comment) => (
                                <div
                                    key={comment.id}
                                    className="bg-slate-50 rounded-lg p-3 border border-slate-200 group hover:bg-slate-100 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <span className="text-xs font-semibold text-slate-700">
                                            {comment.user}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs text-slate-500">
                                                {formatTime(comment.timestamp)}
                                            </span>
                                            <button
                                                onClick={() => handleDelete(comment.id)}
                                                className="p-1 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-800">{comment.text}</p>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Add Comment Form */}
                    <form onSubmit={handleSubmit} className="p-4 border-t border-slate-200">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Add a comment..."
                                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                            <button
                                type="submit"
                                disabled={!newComment.trim()}
                                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default WidgetComments;
