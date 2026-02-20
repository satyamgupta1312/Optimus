import React, { useState, useMemo } from 'react';
import { X, Search, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, Map } from 'lucide-react';
import { mockHomepageMappings, WIDGET_TYPE_LABELS } from '../../data/mockHomepageMappings';
import { MAPPING_TABLE_COLUMNS, HOMEPAGE_ENVIRONMENTS, LOCATION_HIERARCHY } from '../../config/Feature/HomepageMappingConfig';

/**
 * HomepageMappingDashboard — View all widget-to-homepage mappings.
 * Toolbar: environment pills, location selector, search, refresh
 * Sortable table with status badges, pagination
 */
const HomepageMappingDashboard = ({ onClose }) => {
    const [env, setEnv] = useState('PROD');
    const [locationFilter, setLocationFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState('priority');
    const [sortDir, setSortDir] = useState('asc');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    // Filter and sort data
    const filteredData = useMemo(() => {
        let data = [...mockHomepageMappings];

        // Location filter
        if (locationFilter !== 'all') {
            data = data.filter(row => {
                if (locationFilter === 'global') return row.level_tag === 'global';
                return row.level_property === locationFilter || row.level_tag === locationFilter;
            });
        }

        // Search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            data = data.filter(row =>
                row.widget__slug_name.toLowerCase().includes(q) ||
                row.heading.toLowerCase().includes(q) ||
                (row.widgetType || '').toLowerCase().includes(q)
            );
        }

        // Sort
        data.sort((a, b) => {
            let aVal = a[sortKey] ?? '';
            let bVal = b[sortKey] ?? '';
            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();
            if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });

        return data;
    }, [locationFilter, searchQuery, sortKey, sortDir]);

    // Pagination
    const totalPages = Math.ceil(filteredData.length / pageSize);
    const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const toggleSort = (key) => {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    const getStatus = (row) => {
        if (row.widget__deactivated_flag) return { label: 'Deactivated', color: 'bg-slate-100 text-slate-500' };
        const now = new Date();
        const start = new Date(row.widget__start_time);
        const end = new Date(row.widget__end_time);
        if (now >= start && now < end) return { label: 'Active', color: 'bg-green-100 text-green-700' };
        return { label: 'Inactive', color: 'bg-slate-100 text-slate-500' };
    };

    const formatTime = (iso) => {
        if (!iso) return '—';
        return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
    };

    // Unique locations for filter dropdown
    const locations = useMemo(() => {
        const set = new Set();
        mockHomepageMappings.forEach(r => {
            if (r.level_tag === 'global') set.add('global');
            else set.add(r.level_property);
        });
        return ['all', ...Array.from(set).sort()];
    }, []);

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

            {/* Panel */}
            <div className="fixed inset-y-0 right-0 w-full max-w-5xl bg-white shadow-2xl z-50 flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Map size={24} />
                            <div>
                                <h2 className="text-xl font-bold">Homepage Mappings</h2>
                                <p className="text-sm text-emerald-100 mt-1">GL-HP-global widget mapping table</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="border-b border-slate-200 px-6 py-3 flex items-center gap-3 flex-wrap bg-slate-50">
                    {/* Environment pills */}
                    <div className="flex gap-1 bg-white rounded-lg border border-slate-200 p-0.5">
                        {Object.entries(HOMEPAGE_ENVIRONMENTS).map(([key, envConfig]) => (
                            <button
                                key={key}
                                onClick={() => setEnv(key)}
                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                                    env === key
                                        ? 'bg-emerald-600 text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                {key}
                            </button>
                        ))}
                    </div>

                    {/* Location selector */}
                    <select
                        value={locationFilter}
                        onChange={(e) => { setLocationFilter(e.target.value); setCurrentPage(1); }}
                        className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-emerald-500"
                    >
                        {locations.map(loc => (
                            <option key={loc} value={loc}>
                                {loc === 'all' ? 'All Locations' : loc.charAt(0).toUpperCase() + loc.slice(1)}
                            </option>
                        ))}
                    </select>

                    {/* Search */}
                    <div className="relative flex-1 max-w-xs">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            placeholder="Search slug, heading, type..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-emerald-500"
                        />
                    </div>

                    {/* Refresh */}
                    <button className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                        <RefreshCw size={14} />
                    </button>

                    {/* Count */}
                    <span className="text-xs text-slate-500 ml-auto">
                        {filteredData.length} mapping{filteredData.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 sticky top-0">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 w-10">#</th>
                                <SortableHeader label="Widget Slug" sortKey="widget__slug_name" currentSort={sortKey} sortDir={sortDir} onSort={toggleSort} />
                                <SortableHeader label="Type" sortKey="widgetType" currentSort={sortKey} sortDir={sortDir} onSort={toggleSort} />
                                <SortableHeader label="Heading" sortKey="heading" currentSort={sortKey} sortDir={sortDir} onSort={toggleSort} />
                                <SortableHeader label="Level" sortKey="level_tag" currentSort={sortKey} sortDir={sortDir} onSort={toggleSort} />
                                <SortableHeader label="Location" sortKey="level_property" currentSort={sortKey} sortDir={sortDir} onSort={toggleSort} />
                                <SortableHeader label="Priority" sortKey="priority" currentSort={sortKey} sortDir={sortDir} onSort={toggleSort} />
                                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Start</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">End</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((row, i) => {
                                const status = getStatus(row);
                                return (
                                    <tr
                                        key={row.id}
                                        className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                                    >
                                        <td className="px-4 py-2.5 text-xs text-slate-400">{(currentPage - 1) * pageSize + i + 1}</td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs font-mono text-slate-700 truncate max-w-[200px]" title={row.widget__slug_name}>
                                                    {row.widget__slug_name}
                                                </span>
                                                <ExternalLink size={10} className="text-slate-400 shrink-0" />
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                                                {WIDGET_TYPE_LABELS[row.widgetType] || row.widgetType}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-xs text-slate-600 truncate max-w-[120px]">{row.heading || '—'}</td>
                                        <td className="px-4 py-2.5 text-xs text-slate-500">{row.level_tag}</td>
                                        <td className="px-4 py-2.5 text-xs text-slate-500 capitalize">{row.level_property}</td>
                                        <td className="px-4 py-2.5 text-xs text-slate-600 font-mono">{row.priority}</td>
                                        <td className="px-4 py-2.5 text-xs text-slate-500">{formatTime(row.widget__start_time)}</td>
                                        <td className="px-4 py-2.5 text-xs text-slate-500">{formatTime(row.widget__end_time)}</td>
                                        <td className="px-4 py-2.5">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${status.color}`}>
                                                {status.label}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {paginatedData.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="px-4 py-12 text-center text-sm text-slate-400">
                                        No mappings found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination footer */}
                {totalPages > 1 && (
                    <div className="border-t border-slate-200 px-6 py-3 flex items-center justify-between bg-white shrink-0">
                        <span className="text-xs text-slate-500">
                            Page {currentPage} of {totalPages}
                        </span>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                            >
                                Prev
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`px-3 py-1 text-xs rounded-lg border transition-all ${
                                        page === currentPage
                                            ? 'bg-emerald-600 text-white border-emerald-600'
                                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    {page}
                                </button>
                            ))}
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

/** Sortable table header */
const SortableHeader = ({ label, sortKey, currentSort, sortDir, onSort }) => (
    <th
        onClick={() => onSort(sortKey)}
        className="px-4 py-2 text-left text-xs font-semibold text-slate-500 cursor-pointer hover:text-slate-700 select-none"
    >
        <div className="flex items-center gap-1">
            {label}
            {currentSort === sortKey ? (
                sortDir === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />
            ) : (
                <ArrowUpDown size={10} className="text-slate-300" />
            )}
        </div>
    </th>
);

export default HomepageMappingDashboard;
