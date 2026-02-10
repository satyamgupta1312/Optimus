import { useEffect, useCallback } from 'react';

/**
 * Hook to prevent navigation when there are unsaved changes
 */
export const useUnsavedChanges = (hasUnsavedChanges, message = 'You have unsaved changes. Are you sure you want to leave?') => {
    // Prevent browser navigation (refresh, close tab)
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = message;
                return message;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [hasUnsavedChanges, message]);

    // For SPA navigation (if using React Router)
    const confirmNavigation = useCallback(() => {
        if (hasUnsavedChanges) {
            return window.confirm(message);
        }
        return true;
    }, [hasUnsavedChanges, message]);

    return { confirmNavigation };
};

export default useUnsavedChanges;
