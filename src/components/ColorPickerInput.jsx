import React, { useRef, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { useClickOutside } from '../hooks/useClickOutside';

const ColorPickerInput = ({ color, value, onChange, placeholder = "#000000", label, error, helperText, required }) => {
    const popover = useRef();
    const [isOpen, toggle] = useState(false);

    // Support both 'color' (legacy) and 'value' (config-driven) props
    const currentColor = color ?? value ?? '';

    const close = () => toggle(false);
    useClickOutside(popover, close);

    const handleHexChange = (e) => {
        onChange(e.target.value);
    };

    return (
        <div className="mb-3">
            {label && (
                <label className="block text-xs font-medium text-slate-500 mb-1">
                    {label}
                    {required && <span className="text-red-400 ml-1">*</span>}
                </label>
            )}
            <div className="relative flex items-center gap-2">
                {/* Manual Hex Input */}
                <input
                    type="text"
                    value={currentColor}
                    onChange={handleHexChange}
                    placeholder={placeholder}
                    className="flex-1 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-blue-500 uppercase"
                />

                {/* Color Swatch / Trigger */}
                <div className="relative">
                    <div
                        className="w-8 h-8 rounded border border-slate-200 cursor-pointer shadow-sm hover:border-blue-400 transition-colors"
                        style={{ backgroundColor: currentColor || placeholder }}
                        onClick={() => toggle(true)}
                    />

                    {/* Popover */}
                    {isOpen && (
                        <div className="absolute z-50 top-full mt-2 right-0" ref={popover}>
                            <div className="fixed inset-0 bg-transparent" onClick={close} />
                            <div className="relative bg-white p-3 rounded-lg shadow-lg border border-slate-100 z-10">
                                <HexColorPicker color={currentColor || placeholder} onChange={onChange} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
            {!error && helperText && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
        </div>
    );
};

export default ColorPickerInput;
