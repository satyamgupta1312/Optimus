import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, MapPin, Globe, Building2 } from 'lucide-react';
import { getEffectiveStateDefinitions } from '../AdminPanel/StateManagerModal';

/**
 * StateProductEditor — Global + per-state product inputs.
 *
 * Props (InputRegistry interface):
 * - label, value: {global: string, [stateKey]: string}, onChange({...})
 * - helperText, error, required, disabled
 */
const StateProductEditor = ({
    label,
    value = {},
    onChange,
    helperText,
    error,
    required,
    disabled,
}) => {
    const [showStateMenu, setShowStateMenu] = useState(false);
    const menuRef = useRef(null);
    // Reload effective definitions when State Manager saves to localStorage
    const [stateDefs, setStateDefs] = useState(getEffectiveStateDefinitions);

    useEffect(() => {
        const onStorage = () => setStateDefs(getEffectiveStateDefinitions());
        window.addEventListener('storage', onStorage);
        // Also refresh on focus (same-tab localStorage change)
        window.addEventListener('optimus_states_changed', onStorage);
        return () => {
            window.removeEventListener('storage', onStorage);
            window.removeEventListener('optimus_states_changed', onStorage);
        };
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        if (!showStateMenu) return;
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setShowStateMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showStateMenu]);

    const activeStates = Object.keys(value).filter(k => k !== 'global');
    const availableStates = Object.entries(stateDefs)
        .filter(([key]) => key !== 'global' && !activeStates.includes(key));

    const handleGlobalChange = (text) => {
        onChange({ ...value, global: text });
    };

    const handleStateChange = (stateKey, text) => {
        onChange({ ...value, [stateKey]: text });
    };

    const addState = (stateKey) => {
        onChange({ ...value, [stateKey]: '' });
        setShowStateMenu(false);
    };

    const removeState = (stateKey) => {
        const next = { ...value };
        delete next[stateKey];
        onChange(next);
    };

    return (
        <div className="mb-3">
            <label className="block text-xs font-medium text-slate-500 mb-1">
                {label}
                {required && <span className="text-red-400 ml-1">*</span>}
            </label>

            {/* Global products (always visible) */}
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 mb-2">
                <div className="flex items-center gap-1.5 mb-1.5">
                    <Globe size={12} className="text-blue-600" />
                    <span className="text-xs font-semibold text-blue-600">Global (Required)</span>
                </div>
                <textarea
                    value={value.global || ''}
                    onChange={(e) => handleGlobalChange(e.target.value)}
                    placeholder="Enter comma-separated product codes"
                    disabled={disabled}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg text-sm font-mono bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                />
            </div>

            {/* Per-state product inputs */}
            {activeStates.map(stateKey => {
                const stateDef = stateDefs[stateKey];
                const isCity = stateDef?.levelTag === 'city';
                return (
                    <div key={stateKey} className={`rounded-lg border p-3 mb-2 ${isCity ? 'border-amber-200 bg-amber-50/50' : 'border-emerald-200 bg-emerald-50/50'}`}>
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                                {isCity
                                    ? <Building2 size={12} className="text-amber-600" />
                                    : <MapPin size={12} className="text-emerald-600" />
                                }
                                <span className={`text-xs font-semibold capitalize ${isCity ? 'text-amber-700' : 'text-emerald-700'}`}>
                                    {stateDef?.levelProperty || stateKey}
                                </span>
                                <span className="font-mono text-[10px] text-slate-400">{stateKey}</span>
                            </div>
                            {!disabled && (
                                <button
                                    onClick={() => removeState(stateKey)}
                                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                    title="Remove state"
                                >
                                    <Trash2 size={12} />
                                </button>
                            )}
                        </div>
                        <textarea
                            value={value[stateKey] || ''}
                            onChange={(e) => handleStateChange(stateKey, e.target.value)}
                            placeholder={`Product codes for ${stateDef?.levelProperty || stateKey}`}
                            disabled={disabled}
                            rows={2}
                            className="w-full px-3 py-2 rounded-lg text-sm font-mono bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                        />
                    </div>
                );
            })}

            {/* Add State button */}
            {!disabled && availableStates.length > 0 && (
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setShowStateMenu(!showStateMenu)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                    >
                        <Plus size={12} />
                        Add State
                    </button>

                    {showStateMenu && (
                        <div className="absolute z-40 mt-1 py-1 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[180px]">
                            {availableStates.map(([key, def]) => (
                                <button
                                    key={key}
                                    onClick={() => addState(key)}
                                    className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                                >
                                    <MapPin size={12} className="text-slate-400" />
                                    <span className="capitalize">{def.levelProperty}</span>
                                    <span className="text-xs text-slate-400 ml-auto">{def.levelTag}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
            {!error && helperText && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
        </div>
    );
};

export default StateProductEditor;
