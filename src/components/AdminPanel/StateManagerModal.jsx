import React, { useState, useEffect, useRef } from 'react';
import { X, MapPin, Building2, Search, Plus, Trash2, Globe, Loader2 } from 'lucide-react';
import { LocalApiService } from '../../services/LocalApiService';
import { getEffectiveStateDefinitionsSync } from '../../services/LocationService';
import showToast from '../../utils/toast';

/** @deprecated Use fetchEffectiveStateDefinitions() from LocationService instead */
export function getEffectiveStateDefinitions() {
    return getEffectiveStateDefinitionsSync();
}

const StateManagerModal = ({ onClose }) => {
    const [search, setSearch] = useState('');
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState(null); // key currently being toggled
    const searchRef = useRef(null);

    // Custom location form
    const [showCustomForm, setShowCustomForm] = useState(false);
    const [customForm, setCustomForm] = useState({ key: '', label: '', levelProperty: '', slugSuffix: '', type: 'state' });
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        searchRef.current?.focus();
        loadLocations();
    }, []);

    const loadLocations = async () => {
        try {
            const data = await LocalApiService.getLocations();
            setLocations(data);
        } catch (err) {
            console.error('Failed to load locations:', err);
            showToast.error('Failed to load locations');
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (key) => {
        setToggling(key);
        // Optimistic UI
        setLocations(prev => prev.map(loc =>
            loc.key === key ? { ...loc, isEnabled: !loc.isEnabled } : loc
        ));
        try {
            await LocalApiService.toggleLocation(key);
        } catch (err) {
            // Revert on error
            setLocations(prev => prev.map(loc =>
                loc.key === key ? { ...loc, isEnabled: !loc.isEnabled } : loc
            ));
            showToast.error(err.message || 'Failed to toggle location');
        } finally {
            setToggling(null);
        }
    };

    const handleDelete = async (key) => {
        try {
            await LocalApiService.deleteLocation(key);
            setLocations(prev => prev.filter(loc => loc.key !== key));
            showToast.success(`Deleted "${key}"`);
        } catch (err) {
            showToast.error(err.message || 'Failed to delete');
        }
    };

    const handleCreateCustom = async (e) => {
        e.preventDefault();
        if (!customForm.key || !customForm.label || !customForm.levelProperty || !customForm.slugSuffix) {
            showToast.error('All fields are required');
            return;
        }
        setCreating(true);
        try {
            const created = await LocalApiService.createLocation({
                key: customForm.key.toLowerCase().replace(/\s+/g, '_'),
                levelTag: customForm.type,
                levelProperty: customForm.levelProperty.toLowerCase(),
                slugSuffix: customForm.slugSuffix.startsWith('_') ? customForm.slugSuffix : `_${customForm.slugSuffix}`,
                label: customForm.label,
                type: customForm.type,
            });
            setLocations(prev => [...prev, created]);
            setCustomForm({ key: '', label: '', levelProperty: '', slugSuffix: '', type: 'state' });
            setShowCustomForm(false);
            showToast.success(`Created "${created.label}"`);
        } catch (err) {
            showToast.error(err.message || 'Failed to create location');
        } finally {
            setCreating(false);
        }
    };

    // Categorize locations
    const defaultEntries = locations.filter(loc => loc.isDefault);
    const enabledExtras = locations.filter(loc => !loc.isDefault && loc.isEnabled);

    const query = search.toLowerCase().trim();
    const catalogEntries = locations.filter(loc => {
        if (loc.isDefault) return false;
        if (!query) return true;
        return loc.label.toLowerCase().includes(query)
            || loc.levelProperty.toLowerCase().includes(query)
            || loc.key.toLowerCase().includes(query);
    });
    const states = catalogEntries.filter(loc => loc.type === 'state');
    const cities = catalogEntries.filter(loc => loc.type === 'city');

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

                {loading ? (
                    <div className="flex-1 flex items-center justify-center py-12">
                        <Loader2 size={24} className="animate-spin text-slate-400" />
                        <span className="ml-2 text-sm text-slate-400">Loading locations...</span>
                    </div>
                ) : (
                    <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">

                        {/* Default states (always on, not removable) */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Globe size={13} className="text-slate-400" />
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Default (Always Active)</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {defaultEntries.map(loc => (
                                    <span key={loc.key} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                        {loc.type === 'city' ? <Building2 size={10} /> : <MapPin size={10} />}
                                        {loc.levelProperty.replace(/\b\w/g, c => c.toUpperCase())}
                                        <span className="text-blue-400 font-mono text-[10px]">{loc.key}</span>
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* User-enabled entries */}
                        {enabledExtras.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Plus size={13} className="text-emerald-500" />
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Enabled</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {enabledExtras.map(loc => (
                                        <span key={loc.key} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            {loc.type === 'city' ? <Building2 size={10} /> : <MapPin size={10} />}
                                            {loc.label}
                                            <span className="text-emerald-400 font-mono text-[10px]">{loc.key}</span>
                                            <button
                                                onClick={() => handleToggle(loc.key)}
                                                disabled={toggling === loc.key}
                                                className="ml-0.5 text-emerald-400 hover:text-red-500 transition-colors disabled:opacity-50"
                                            >
                                                <X size={10} />
                                            </button>
                                            {loc.isCustom && (
                                                <button
                                                    onClick={() => handleDelete(loc.key)}
                                                    className="text-emerald-400 hover:text-red-500 transition-colors"
                                                    title="Delete custom location"
                                                >
                                                    <Trash2 size={10} />
                                                </button>
                                            )}
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
                                        {states.map(loc => (
                                            <button
                                                key={loc.key}
                                                onClick={() => handleToggle(loc.key)}
                                                disabled={toggling === loc.key}
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all disabled:opacity-50 ${loc.isEnabled
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
                                                    }`}
                                            >
                                                <MapPin size={10} />
                                                {loc.label}
                                                <span className="font-mono text-[10px] opacity-60">{loc.key}</span>
                                                {loc.isEnabled ? <X size={9} /> : <Plus size={9} />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Cities */}
                            {cities.length > 0 && (
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Cities</p>
                                    <div className="flex flex-wrap gap-2">
                                        {cities.map(loc => (
                                            <button
                                                key={loc.key}
                                                onClick={() => handleToggle(loc.key)}
                                                disabled={toggling === loc.key}
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all disabled:opacity-50 ${loc.isEnabled
                                                        ? 'bg-amber-50 text-amber-700 border-amber-300'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200'
                                                    }`}
                                            >
                                                <Building2 size={10} />
                                                {loc.label}
                                                <span className="font-mono text-[10px] opacity-60">{loc.key}</span>
                                                {loc.isEnabled ? <X size={9} /> : <Plus size={9} />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {states.length === 0 && cities.length === 0 && (
                                <p className="text-sm text-slate-400 text-center py-4">No results for "{search}"</p>
                            )}
                        </div>

                        {/* Create Custom Location */}
                        <div>
                            <button
                                onClick={() => setShowCustomForm(!showCustomForm)}
                                className="flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-700 transition-colors"
                            >
                                <Plus size={12} />
                                {showCustomForm ? 'Hide' : 'Create Custom Location'}
                            </button>

                            {showCustomForm && (
                                <form onSubmit={handleCreateCustom} className="mt-3 p-3 bg-violet-50 rounded-xl border border-violet-200 space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            placeholder="Key (e.g. jmu)"
                                            value={customForm.key}
                                            onChange={e => setCustomForm(prev => ({ ...prev, key: e.target.value }))}
                                            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Label (e.g. Jammu)"
                                            value={customForm.label}
                                            onChange={e => setCustomForm(prev => ({ ...prev, label: e.target.value }))}
                                            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Level Property (e.g. jammu)"
                                            value={customForm.levelProperty}
                                            onChange={e => setCustomForm(prev => ({ ...prev, levelProperty: e.target.value }))}
                                            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Slug Suffix (e.g. _jmu)"
                                            value={customForm.slugSuffix}
                                            onChange={e => setCustomForm(prev => ({ ...prev, slugSuffix: e.target.value }))}
                                            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <select
                                            value={customForm.type}
                                            onChange={e => setCustomForm(prev => ({ ...prev, type: e.target.value }))}
                                            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                                        >
                                            <option value="state">State</option>
                                            <option value="city">City</option>
                                        </select>
                                        <button
                                            type="submit"
                                            disabled={creating}
                                            className="px-4 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
                                        >
                                            {creating ? 'Creating...' : 'Create'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                        {enabledExtras.length} extra state(s)/city(ies) enabled — shared across team
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
