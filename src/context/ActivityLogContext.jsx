import React, { createContext, useContext, useState, useCallback } from 'react';

const ActivityLogContext = createContext();

export const useActivityLog = () => {
    const context = useContext(ActivityLogContext);
    if (!context) {
        throw new Error('useActivityLog must be used within ActivityLogProvider');
    }
    return context;
};

/**
 * Activity Log Provider
 * Tracks all user actions for audit trail
 */
export const ActivityLogProvider = ({ children }) => {
    const [activities, setActivities] = useState([]);
    const [maxActivities] = useState(100); // Keep last 100 activities

    /**
     * Log an activity
     */
    const logActivity = useCallback((action, details = {}, user = 'Current User') => {
        const activity = {
            id: crypto.randomUUID(),
            action, // 'widget_added', 'widget_deleted', 'widget_updated', etc.
            details,
            user,
            timestamp: new Date().toISOString(),
        };

        setActivities(prev => {
            const newActivities = [activity, ...prev];
            // Keep only the latest activities
            if (newActivities.length > maxActivities) {
                return newActivities.slice(0, maxActivities);
            }
            return newActivities;
        });

        return activity;
    }, [maxActivities]);

    /**
     * Get activities by type
     */
    const getActivitiesByType = useCallback((action) => {
        return activities.filter(a => a.action === action);
    }, [activities]);

    /**
     * Get recent activities
     */
    const getRecentActivities = useCallback((count = 10) => {
        return activities.slice(0, count);
    }, [activities]);

    /**
     * Clear all activities
     */
    const clearActivities = useCallback(() => {
        setActivities([]);
    }, []);

    /**
     * Export activities as JSON
     */
    const exportActivities = useCallback(() => {
        return JSON.stringify(activities, null, 2);
    }, [activities]);

    const value = {
        activities,
        logActivity,
        getActivitiesByType,
        getRecentActivities,
        clearActivities,
        exportActivities,
    };

    return (
        <ActivityLogContext.Provider value={value}>
            {children}
        </ActivityLogContext.Provider>
    );
};
