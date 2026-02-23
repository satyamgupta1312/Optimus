import React, { useState, useEffect, useRef } from 'react';
import { X, MapPin, Building2, Search, Plus, Trash2, Globe } from 'lucide-react';
import { STATE_DEFINITIONS, STATE_CATALOG } from '../../config/widgets/MastheadConfig';

const LS_KEY = 'optimus_enabled_states';

/** Read enabled extra state keys from localStorage */
export function getEnabledStates() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

/** Build the full effective STATE_DEFINITIONS (defaults + user-enabled extras) */
export function getEffectiveStateDefinitions() {
    const extras = getEnabledStates();
    const result = { ...STATE_DEFINITIONS };
    for (const key of extras) {
        if (STATE_CATALOG[key] && !result[key]) {
            result[key] = STATE_CATALOG[key];
        }
    }
    return result;
}

const StateManagerModal = ({ onClose }) => {
    const [search, setSearch] = useState('');
    const [enabledKeys, setEnabledKeys] = useState(getEnabledStates);
    const searchRef = useRef(null);

    useEffect(() => {
        searchRef.current?.focus();
    }, []);

    // Persist to localStorage whenever enabledKeys changes
    useEffect(() => {
        localStorage.setItem(LS_KEY, JSON.stringify(enabledKeys));
    }, [enabledKeys]);

    const addState = (key) => {
        if (!enabledKeys.includes(key)) {
            setEnabledKeys(prev => [...prev, key]);
        }
    };

    const removeState = (key) => {
        setEnabledKeys(prev => prev.filter(k => k !== key));
    };

    // Build catalog entries filtered by search, excluding already-default or already-enabled
    const catalogEntries = Object.entries(STATE_CATALOG).filter(([key, def]) => {
        const alreadyDefault = !!STATE_DEFINITIONS[key];
        const query = search.toLowerCase().trim();
        const matchesSearch = !query
            || def.label.toLowerCase().includes(query)
            || def.levelProperty.toLowerCase().includes(query)
            || key.toLowerCase().includes(query);
        return !alreadyDefault && matchesSearch;
    });

    const states = catalogEntries.filter(([, d]) => d.type === 'state');
    const cities = catalogEntries.filter(([, d]) => d.type === 'city');

    const defaultEntries = Object.entries(STATE_DEFINITIONS).filter(([k]) => k !== 'global');
    const enabledEntries = enabledKeys
        .filter(k => STATE_CATALOG[k])
        .map(k => [k, STATE_CATALOG[k]]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-[600px] max-h-[80vh] flex flex-col border border-slate-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <MapPin size={18} className="text-blue-600" />
                        <h2 className="text-sm font-semibold text-slate-800">Manage States & Cities</h2>
                        <span className="text-xs text-slate-400 ml-1">— for state-wise product mapping</span>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">

                    {/* Default states (always on, not removable) */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Globe size={13} className="text-slate-400" />
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Default (Always Active)</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {defaultEntries.map(([key, def]) => (
                                <span key={key} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                    {def.levelTag === 'city' ? <Building2 size={10} /> : <MapPin size={10} />}
                                    {def.levelProperty.replace(/\b\w/g, c => c.toUpperCase())}
                                    <span className="text-blue-400 font-mono text-[10px]">{key}</span>
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* User-enabled states */}
                    {enabledEntries.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Plus size={13} className="text-emerald-500" />
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Enabled by You</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {enabledEntries.map(([key, def]) => (
                                    <span key={key} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        {def.type === 'city' ? <Building2 size={10} /> : <MapPin size={10} />}
                                        {def.label}
                                        <span className="text-emerald-400 font-mono text-[10px]">{key}</span>
                                        <button
                                            onClick={() => removeState(key)}
                                            className="ml-0.5 text-emerald-400 hover:text-red-500 transition-colors"
                                        >
                                            <X size={10} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Search + Add */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Search size={13} className="text-slate-400" />
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Add State or City</span>
                        </div>
                        <div className="relative mb-3">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                ref={searchRef}
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search Gujarat, Mumbai, Punjab..."
                                className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                            />
                        </div>

                        {/* States */}
                        {states.length > 0 && (
                            <div className="mb-3">
                                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">States</p>
                                <div className="flex flex-wrap gap-2">
                                    {states.map(([key, def]) => {
                                        const isEnabled = enabledKeys.includes(key);
                                        return (
                                            <button
                                                key={key}
                                                onClick={() => isEnabled ? removeState(key) : addState(key)}
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${isEnabled
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
                                                    }`}
                                            >
                                                <MapPin size={10} />
                                                {def.label}
                                                <span className="font-mono text-[10px] opacity-60">{key}</span>
                                                {isEnabled ? <X size={9} /> : <Plus size={9} />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Cities */}
                        {cities.length > 0 && (
                            <div>
                                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Cities</p>
                                <div className="flex flex-wrap gap-2">
                                    {cities.map(([key, def]) => {
                                        const isEnabled = enabledKeys.includes(key);
                                        return (
                                            <button
                                                key={key}
                                                onClick={() => isEnabled ? removeState(key) : addState(key)}
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${isEnabled
                                                        ? 'bg-amber-50 text-amber-700 border-amber-300'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200'
                                                    }`}
                                            >
                                                <Building2 size={10} />
                                                {def.label}
                                                <span className="font-mono text-[10px] opacity-60">{key}</span>
                                                {isEnabled ? <X size={9} /> : <Plus size={9} />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {states.length === 0 && cities.length === 0 && (
                            <p className="text-sm text-slate-400 text-center py-4">No results for "{search}"</p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                        {enabledKeys.length} extra state(s)/city(ies) enabled — saved automatically
                    </p>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StateManagerModal;
