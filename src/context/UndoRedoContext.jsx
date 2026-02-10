import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const UndoRedoContext = createContext();

export const useUndoRedo = () => {
    const context = useContext(UndoRedoContext);
    if (!context) {
        throw new Error('useUndoRedo must be used within UndoRedoProvider');
    }
    return context;
};

/**
 * Undo/Redo Provider
 * Maintains history of widget states and allows time-travel debugging
 */
export const UndoRedoProvider = ({ children }) => {
    const [history, setHistory] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [maxHistorySize] = useState(50); // Keep last 50 states

    const canUndo = currentIndex > 0;
    const canRedo = currentIndex < history.length - 1;

    /**
     * Save a new state to history
     */
    const saveState = useCallback((state, description = 'Change') => {
        setHistory(prev => {
            // Remove any future states if we're not at the end
            const newHistory = prev.slice(0, currentIndex + 1);

            // Add new state with metadata
            newHistory.push({
                state: JSON.parse(JSON.stringify(state)), // Deep clone
                description,
                timestamp: Date.now(),
            });

            // Limit history size
            if (newHistory.length > maxHistorySize) {
                newHistory.shift();
                return newHistory;
            }

            return newHistory;
        });

        setCurrentIndex(prev => {
            const newIndex = Math.min(prev + 1, maxHistorySize - 1);
            return newIndex;
        });
    }, [currentIndex, maxHistorySize]);

    /**
     * Undo to previous state
     */
    const undo = useCallback(() => {
        if (canUndo) {
            setCurrentIndex(prev => prev - 1);
            return history[currentIndex - 1];
        }
        return null;
    }, [canUndo, currentIndex, history]);

    /**
     * Redo to next state
     */
    const redo = useCallback(() => {
        if (canRedo) {
            setCurrentIndex(prev => prev + 1);
            return history[currentIndex + 1];
        }
        return null;
    }, [canRedo, currentIndex, history]);

    /**
     * Get current state
     */
    const getCurrentState = useCallback(() => {
        if (currentIndex >= 0 && currentIndex < history.length) {
            return history[currentIndex];
        }
        return null;
    }, [currentIndex, history]);

    /**
     * Clear all history
     */
    const clearHistory = useCallback(() => {
        setHistory([]);
        setCurrentIndex(-1);
    }, []);

    /**
     * Get history summary for debugging
     */
    const getHistorySummary = useCallback(() => {
        return history.map((item, index) => ({
            index,
            description: item.description,
            timestamp: new Date(item.timestamp).toLocaleTimeString(),
            isCurrent: index === currentIndex,
        }));
    }, [history, currentIndex]);

    const value = {
        canUndo,
        canRedo,
        undo,
        redo,
        saveState,
        getCurrentState,
        clearHistory,
        getHistorySummary,
        historyLength: history.length,
        currentIndex,
    };

    return (
        <UndoRedoContext.Provider value={value}>
            {children}
        </UndoRedoContext.Provider>
    );
};
