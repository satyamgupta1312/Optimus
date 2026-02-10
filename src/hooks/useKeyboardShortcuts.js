import { useEffect, useCallback } from 'react';

/**
 * Keyboard Shortcuts Hook
 * Provides centralized keyboard shortcut management
 */
export const useKeyboardShortcuts = (shortcuts, enabled = true) => {
    const handleKeyDown = useCallback((event) => {
        if (!enabled) return;

        // Build key combination string
        const keys = [];
        if (event.ctrlKey) keys.push('ctrl');
        if (event.metaKey) keys.push('cmd');
        if (event.altKey) keys.push('alt');
        if (event.shiftKey) keys.push('shift');
        keys.push(event.key.toLowerCase());

        const combination = keys.join('+');

        // Check if this combination has a handler
        const handler = shortcuts[combination];
        if (handler) {
            event.preventDefault();
            handler(event);
        }
    }, [shortcuts, enabled]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
};

/**
 * Global keyboard shortcuts configuration
 */
export const KEYBOARD_SHORTCUTS = {
    // File operations
    SAVE: 'cmd+s',
    SAVE_ALT: 'ctrl+s',

    // Edit operations
    UNDO: 'cmd+z',
    UNDO_ALT: 'ctrl+z',
    REDO: 'cmd+shift+z',
    REDO_ALT: 'ctrl+shift+z',

    // Widget operations
    DUPLICATE: 'cmd+d',
    DUPLICATE_ALT: 'ctrl+d',
    DELETE: 'delete',
    DELETE_ALT: 'backspace',

    // Selection
    SELECT_ALL: 'cmd+a',
    SELECT_ALL_ALT: 'ctrl+a',
    DESELECT: 'escape',

    // Navigation
    NEXT_WIDGET: 'tab',
    PREV_WIDGET: 'shift+tab',

    // View
    TOGGLE_PREVIEW: 'cmd+p',
    TOGGLE_PREVIEW_ALT: 'ctrl+p',
    ZOOM_IN: 'cmd+=',
    ZOOM_OUT: 'cmd+-',

    // Search
    SEARCH: 'cmd+f',
    SEARCH_ALT: 'ctrl+f',

    // Help
    SHOW_SHORTCUTS: 'cmd+/',
    SHOW_SHORTCUTS_ALT: 'ctrl+/',
};

/**
 * Format shortcut for display
 */
export const formatShortcut = (shortcut) => {
    return shortcut
        .split('+')
        .map(key => {
            const keyMap = {
                'cmd': '⌘',
                'ctrl': 'Ctrl',
                'alt': '⌥',
                'shift': '⇧',
                'delete': 'Del',
                'backspace': '⌫',
                'escape': 'Esc',
                'tab': 'Tab',
            };
            return keyMap[key] || key.toUpperCase();
        })
        .join(' + ');
};
