import React, { createContext, useContext, useState, useEffect } from 'react';
import { mapApiToWidgets } from '../services/ApiMapper';
import homepageResponse from '../data/homepage_response.json';
import showToast from '../utils/toast';
import { useUndoRedo } from './UndoRedoContext';
import { useActivityLog } from './ActivityLogContext';
import { useAuth } from './AuthContext';

const WidgetContext = createContext();

export const useWidgetContext = () => {
    const context = useContext(WidgetContext);
    if (!context) {
        throw new Error('useWidgetContext must be used within a WidgetProvider');
    }
    return context;
};

export const WidgetProvider = ({ children }) => {
    console.log("DEBUG: WidgetProvider rendering");
    const undoRedo = useUndoRedo();
    const { logActivity } = useActivityLog();
    const { user } = useAuth(); // Get current user

    // Load initial widgets from the API response
    const [widgets, setWidgets] = useState(() => mapApiToWidgets(homepageResponse));
    const [selectedWidgetId, setSelectedWidgetId] = useState(null);
    const [selectedWidgetIds, setSelectedWidgetIds] = useState([]); // Multiple selection
    const [pageStatus, setPageStatus] = useState('DRAFT'); // DRAFT, PENDING, APPROVED, REJECTED
    const [currentView, setCurrentView] = useState('home');
    const [viewData, setViewData] = useState(null);
    const [comments, setComments] = useState([]); // Widget comments

    // Save state to undo/redo history whenever widgets change
    useEffect(() => {
        if (widgets.length > 0) {
            undoRedo.saveState({ widgets, headerWidgets }, 'Widget change');
        }
    }, [widgets]); // Only track widgets, not headerWidgets to avoid too many saves

    // Header Widgets State
    const [headerWidgets, setHeaderWidgets] = useState({
        primaryMasthead: {
            id: 'header-primary-masthead',
            type: 'Primary Masthead', // Now Category Navigation
            enabled: true,
            background: '#0277FA', // Default Blue
            slug_name: '',
            master_key: '',
            end_time: '',
            background_multimedia_slug: '',
            // Categories are currently hardcoded in component as default, but can be added here
        },
        secondaryMasthead: {
            id: 'header-secondary-masthead',
            type: 'Secondary Masthead', // Now Blue Banner
            enabled: true,
            title: '₹1000 का बिल बनेगा',
            subtitle: 'होलसेल रेट लगेगा!',
            textColor: '#ffffff',
            background: '#0277FA',
            image: ''
        }
    });

    const updateHeaderWidget = (widgetKey, updates) => {
        setHeaderWidgets(prev => ({
            ...prev,
            [widgetKey]: { ...prev[widgetKey], ...updates }
        }));
    };

    const navigateTo = (view, data = null) => {
        setCurrentView(view);
        setViewData(data);
    };

    const addWidget = (widget) => {
        if (pageStatus !== 'DRAFT' && pageStatus !== 'REJECTED') {
            showToast.warning("Cannot edit while in review or approved");
            return;
        }
        const newWidget = {
            ...widget,
            id: crypto.randomUUID(),
            lastModified: new Date().toISOString(),
            lastModifiedBy: 'Current User'
        };
        setWidgets([...widgets, newWidget]);
        logActivity('widget_added', { widgetId: newWidget.id, type: widget.type, title: widget.title });
        showToast.success('Widget added successfully');
    };

    const updateWidget = (id, updates) => {
        if (pageStatus !== 'DRAFT' && pageStatus !== 'REJECTED') return;

        console.log('[WidgetContext] updateWidget called:', { id, updates });

        setWidgets(prevWidgets => {
            return prevWidgets.map(w => {
                if (w.id === id) {
                    // Support functional updates to avoid stale state
                    const updateObj = typeof updates === 'function' ? updates(w) : updates;
                    const updated = {
                        ...w,
                        ...updateObj,
                        lastModified: new Date().toISOString(),
                        lastModifiedBy: 'Current User'
                    };
                    console.log('[WidgetContext] Widget updated:', {
                        id,
                        before: w,
                        after: updated,
                        productsCount: updated.products?.length || 0
                    });
                    logActivity('widget_updated', { widgetId: id, changes: Object.keys(updateObj) });
                    return updated;
                }
                return w;
            });
        });
    };

    const deleteWidget = (id) => {
        if (pageStatus !== 'DRAFT' && pageStatus !== 'REJECTED') {
            showToast.warning("Cannot edit while in review or approved");
            return;
        }
        const widget = widgets.find(w => w.id === id);
        setWidgets(widgets.filter(w => w.id !== id));
        if (selectedWidgetId === id) setSelectedWidgetId(null);
        logActivity('widget_deleted', { widgetId: id, type: widget?.type });
        showToast.success('Widget deleted');
    };

    const duplicateWidget = (id) => {
        if (pageStatus !== 'DRAFT' && pageStatus !== 'REJECTED') {
            showToast.warning("Cannot edit while in review or approved");
            return;
        }
        const widget = widgets.find(w => w.id === id);
        if (widget) {
            const duplicate = {
                ...widget,
                id: crypto.randomUUID(),
                title: widget.title + ' (Copy)',
                lastModified: new Date().toISOString(),
                lastModifiedBy: 'Current User'
            };
            const index = widgets.findIndex(w => w.id === id);
            const newWidgets = [...widgets];
            newWidgets.splice(index + 1, 0, duplicate);
            setWidgets(newWidgets);
            logActivity('widget_duplicated', { originalId: id, newId: duplicate.id });
            showToast.success('Widget duplicated');
        }
    };

    const bulkDelete = (ids) => {
        if (pageStatus !== 'DRAFT' && pageStatus !== 'REJECTED') {
            showToast.warning("Cannot edit while in review or approved");
            return;
        }
        setWidgets(widgets.filter(w => !ids.includes(w.id)));
        setSelectedWidgetIds([]);
        logActivity('bulk_delete', { count: ids.length, widgetIds: ids });
        showToast.success(`Deleted ${ids.length} widget(s)`);
    };

    const toggleWidgetSelection = (id) => {
        setSelectedWidgetIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(wId => wId !== id);
            }
            return [...prev, id];
        });
    };

    const moveWidget = (dragIndex, hoverIndex) => {
        if (pageStatus !== 'DRAFT' && pageStatus !== 'REJECTED') return;
        const newWidgets = [...widgets];
        const [movedWidget] = newWidgets.splice(dragIndex, 1);
        newWidgets.splice(hoverIndex, 0, movedWidget);
        setWidgets(newWidgets);
    };

    // Workflow Actions
    const submitForReview = async () => {
        try {
            console.log('Submitting to Google Sheet...');
            const { GoogleSheetService } = await import('../services/GoogleSheetService');
            // Assuming current user is maker
            // We need to access user from AuthContext, but we are in WidgetContext.
            // Ideally pass user info or store in request.
            // For now, hardcode or grab from localStorage/window if needed, or pass as arg.
            // Let's assume the component calling this passes metadata or we stick to generic identity for now.
            // Wait, MainLayout calls this. MainLayout has user.
            // I should update submitForReview to accept 'user' object.

            // For now, I'll alert the user to check if it works.
            // But to do it right, I'll update the signature later. 
            // Actually, let's just use a placeholder user if not passed.

            // Helper: Remove File objects from multimedia (can't be serialized)
            const cleanHeaderWidgets = (headerWidgets) => {
                const cleaned = JSON.parse(JSON.stringify(headerWidgets, (key, value) => {
                    // Skip File objects but keep all other fields
                    if (value instanceof File) {
                        return undefined;
                    }
                    return value;
                }));
                return cleaned;
            };

            await GoogleSheetService.createRequest({
                id: crypto.randomUUID(),
                user: user?.name || user?.email || 'Unknown User', // Use actual user's name
                type: 'Homepage Update',
                status: 'PENDING',
                widgets: widgets,
                headerWidgets: cleanHeaderWidgets(headerWidgets) // Clean before sending
            });

            setPageStatus('PENDING');
            showToast.success('Page submitted for review!');
        } catch (e) {
            console.error(e);
            showToast.error('Failed to submit to sheet');
        }
    };

    const approvePage = async () => {
        try {
            console.log('[Workflow] Approving and triggering automation...');

            // Call Google Sheet API to trigger automation
            const { GoogleSheetService } = await import('../services/GoogleSheetService');
            const result = await GoogleSheetService.approveRequest(
                crypto.randomUUID(), // Generate unique request ID
                widgets,
                headerWidgets
            );

            if (result.success) {
                setPageStatus('APPROVED');
                showToast.success('Widgets approved! Automation triggered successfully');
            } else {
                throw new Error(result.error || 'Automation failed');
            }
        } catch (error) {
            console.error('[Workflow] Approve failed:', error);
            showToast.error('Failed to trigger automation: ' + error.message);
        }
    };

    const rejectPage = () => {
        setPageStatus('REJECTED');
        showToast.warning('Page rejected. Maker can edit and resubmit');
    };

    const resetToDraft = () => {
        setPageStatus('DRAFT');
        showToast.info('Page reset to draft mode');
    };

    const restoreFromHistory = (historyItem) => {
        if (historyItem && historyItem.state) {
            setWidgets(historyItem.state.widgets || []);
            setHeaderWidgets(historyItem.state.headerWidgets || headerWidgets);
            logActivity('state_restored', { timestamp: historyItem.timestamp });
            showToast.success('State restored');
        }
    };

    // Comment management
    const addComment = (comment) => {
        setComments(prev => [...prev, comment]);
        logActivity('comment_added', { widgetId: comment.widgetId, commentId: comment.id });
    };

    const deleteComment = (commentId) => {
        setComments(prev => prev.filter(c => c.id !== commentId));
        logActivity('comment_deleted', { commentId });
    };

    return (
        <WidgetContext.Provider value={{
            widgets,
            selectedWidgetId,
            setSelectedWidgetId,
            addWidget,
            updateWidget,
            deleteWidget,
            moveWidget,
            pageStatus,
            submitForReview,
            approvePage,
            rejectPage,
            resetToDraft,
            navigateTo,
            currentView,
            viewData,
            headerWidgets,
            updateHeaderWidget,
            setPageStatus,
            setWidgets, // Exposing for Preview utility
            setHeaderWidgets, // Exposing for RequestQueue restoration
            // New features
            duplicateWidget,
            bulkDelete,
            selectedWidgetIds,
            toggleWidgetSelection,
            restoreFromHistory,
            // Undo/Redo
            canUndo: undoRedo.canUndo,
            canRedo: undoRedo.canRedo,
            undo: () => {
                const previous = undoRedo.undo();
                if (previous) restoreFromHistory(previous);
            },
            redo: () => {
                const next = undoRedo.redo();
                if (next) restoreFromHistory(next);
            },
            // Collaboration features
            comments,
            addComment,
            deleteComment
        }}>
            {children}
        </WidgetContext.Provider>
    );
};
