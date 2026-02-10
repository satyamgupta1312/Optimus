import toast from 'react-hot-toast';

/**
 * Centralized toast notification utility
 * Replaces all alert() calls with beautiful toast notifications
 */

export const showToast = {
    success: (message, duration = 3000) => {
        return toast.success(message, {
            duration,
            icon: '✅',
            style: {
                borderRadius: '12px',
                background: '#10b981',
                color: '#fff',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: '500',
            },
        });
    },

    error: (message, duration = 4000) => {
        return toast.error(message, {
            duration,
            icon: '❌',
            style: {
                borderRadius: '12px',
                background: '#ef4444',
                color: '#fff',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: '500',
            },
        });
    },

    loading: (message) => {
        return toast.loading(message, {
            style: {
                borderRadius: '12px',
                background: '#fff',
                color: '#334155',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: '500',
            },
        });
    },

    promise: (promise, messages) => {
        return toast.promise(promise, messages, {
            style: {
                borderRadius: '12px',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: '500',
            },
        });
    },

    info: (message, duration = 3000) => {
        return toast(message, {
            duration,
            icon: 'ℹ️',
            style: {
                borderRadius: '12px',
                background: '#3b82f6',
                color: '#fff',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: '500',
            },
        });
    },

    warning: (message, duration = 3500) => {
        return toast(message, {
            duration,
            icon: '⚠️',
            style: {
                borderRadius: '12px',
                background: '#f59e0b',
                color: '#fff',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: '500',
            },
        });
    },

    custom: (message, options = {}) => {
        return toast(message, {
            style: {
                borderRadius: '12px',
                background: '#fff',
                color: '#334155',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: '500',
                border: '1px solid #e2e8f0',
                ...options.style,
            },
            ...options,
        });
    },

    dismiss: (toastId) => {
        toast.dismiss(toastId);
    },
};

export default showToast;
