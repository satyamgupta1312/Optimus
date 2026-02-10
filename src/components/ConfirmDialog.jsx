import React from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';

/**
 * Reusable Confirmation Dialog
 * Prevents accidental destructive actions
 */
const ConfirmDialog = ({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'warning', // 'warning' | 'danger' | 'info'
    confirmButtonClass = ''
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'danger':
                return <AlertTriangle className="text-red-600" size={24} />;
            case 'info':
                return <Info className="text-blue-600" size={24} />;
            default:
                return <AlertTriangle className="text-yellow-600" size={24} />;
        }
    };

    const getDefaultButtonClass = () => {
        switch (type) {
            case 'danger':
                return 'bg-red-600 hover:bg-red-700 text-white';
            case 'info':
                return 'bg-blue-600 hover:bg-blue-700 text-white';
            default:
                return 'bg-yellow-600 hover:bg-yellow-700 text-white';
        }
    };

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fadeIn"
                onClick={onClose}
            />

            {/* Dialog */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="bg-white rounded-xl shadow-2xl max-w-md w-full animate-slideUp"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-start gap-4 p-6 pb-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                            {getIcon()}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                            <p className="text-sm text-slate-600 mt-1">{message}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 p-6 pt-2 justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={handleConfirm}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${confirmButtonClass || getDefaultButtonClass()
                                }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ConfirmDialog;
