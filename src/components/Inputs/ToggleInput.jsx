import React from 'react';

/**
 * ToggleInput — Boolean toggle switch with label and description.
 * Used for flags like `is_optimized`, `show_pb_tag`, `allow_android`.
 */
const ToggleInput = ({
    label,
    description,
    helperText,
    value = false,
    onChange,
    disabled,
}) => {
    return (
        <div className="mb-3 flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div>
                <span className="text-sm font-medium text-slate-700">{label}</span>
                {(description || helperText) && (
                    <p className="text-xs text-slate-400 mt-0.5">{description || helperText}</p>
                )}
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={!!value}
                disabled={disabled}
                onClick={() => onChange(!value)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                    ${value ? 'bg-blue-600' : 'bg-slate-600'}
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                        ${value ? 'translate-x-6' : 'translate-x-1'}`}
                />
            </button>
        </div>
    );
};

export default ToggleInput;
