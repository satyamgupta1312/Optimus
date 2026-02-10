import React, { useRef, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { useClickOutside } from '../hooks/useClickOutside';

const ColorPickerInput = ({ color, onChange, placeholder = "#000000" }) => {
    const popover = useRef();
    const [isOpen, toggle] = useState(false);

    const close = () => toggle(false);
    useClickOutside(popover, close);

    const handleHexChange = (e) => {
        onChange(e.target.value);
    };

    return (
        <div className="relative flex items-center gap-2">
            {/* Manual Hex Input */}
            <input
                type="text"
                value={color}
                onChange={handleHexChange}
                placeholder={placeholder}
                className="flex-1 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-blue-500 uppercase"
            />

            {/* Color Swatch / Trigger */}
            <div className="relative">
                <div
                    className="w-8 h-8 rounded border border-slate-200 cursor-pointer shadow-sm hover:border-blue-400 transition-colors"
                    style={{ backgroundColor: color || placeholder }}
                    onClick={() => toggle(true)}
                />

                {/* Popover */}
                {isOpen && (
                    <div className="absolute z-50 top-full mt-2 right-0" ref={popover}>
                        <div className="fixed inset-0 bg-transparent" onClick={close} />
                        <div className="relative bg-white p-3 rounded-lg shadow-lg border border-slate-100 z-10">
                            <HexColorPicker color={color || placeholder} onChange={onChange} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ColorPickerInput;
