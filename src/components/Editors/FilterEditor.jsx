import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Filter } from 'lucide-react';
import { getInputComponent } from '../Inputs/InputRegistry';

/**
 * FilterEditor — 3 collapsible sections for widget/item/product filters.
 * Reads config.filters from widget config and renders appropriate inputs.
 *
 * Props:
 * - filters: { widget: {...}, item: {...}, product: {...} }
 * - value: { widget: {...}, item: {...}, product: {...} }
 * - onChange(filterValues)
 */
const FilterEditor = ({ filters, value = {}, onChange }) => {
    const [expanded, setExpanded] = useState({});

    if (!filters) return null;

    const toggleSection = (key) => {
        setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleFilterChange = (section, filterKey, filterValue) => {
        onChange({
            ...value,
            [section]: {
                ...(value[section] || {}),
                [filterKey]: filterValue,
            },
        });
    };

    const sections = [
        { key: 'widget', label: 'Widget Filters', icon: 'text-blue-400', description: 'Controls widget visibility' },
        { key: 'item', label: 'Item Filters', icon: 'text-amber-400', description: 'Controls item visibility' },
        { key: 'product', label: 'Product Filters', icon: 'text-green-400', description: 'Filters products within items' },
    ];

    return (
        <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
            <div className="flex items-center gap-2 mb-3">
                <Filter size={14} className="text-slate-600" />
                <h3 className="font-semibold text-sm text-slate-900">Filters</h3>
            </div>

            {sections.map(section => {
                const sectionFilters = filters[section.key];
                if (!sectionFilters || Object.keys(sectionFilters).length === 0) return null;

                const isExpanded = expanded[section.key];

                return (
                    <div key={section.key} className="mb-2 last:mb-0">
                        <button
                            onClick={() => toggleSection(section.key)}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-left"
                        >
                            {isExpanded
                                ? <ChevronDown size={14} className="text-slate-400" />
                                : <ChevronRight size={14} className="text-slate-400" />
                            }
                            <span className={`text-xs font-bold ${section.icon}`}>
                                {section.label}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-auto">
                                {Object.keys(sectionFilters).length} filter{Object.keys(sectionFilters).length !== 1 ? 's' : ''}
                            </span>
                        </button>

                        {isExpanded && (
                            <div className="ml-4 pl-3 border-l-2 border-slate-100 mt-1 space-y-1">
                                {Object.entries(sectionFilters).map(([filterKey, filterDef]) => {
                                    // Product filters have operators
                                    if (filterDef.operators) {
                                        return (
                                            <ProductFilterRow
                                                key={filterKey}
                                                filterKey={filterKey}
                                                filterDef={filterDef}
                                                value={(value[section.key] || {})[filterKey]}
                                                onChange={(val) => handleFilterChange(section.key, filterKey, val)}
                                            />
                                        );
                                    }

                                    // Simple filters (widget/item level)
                                    const InputComponent = getInputComponent(filterDef.component || 'TextInput');
                                    return (
                                        <InputComponent
                                            key={filterKey}
                                            label={filterDef.label || filterKey}
                                            value={(value[section.key] || {})[filterKey] ?? ''}
                                            onChange={(val) => handleFilterChange(section.key, filterKey, val)}
                                            helperText={filterDef.description}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

/**
 * ProductFilterRow — operator + value pair for product-level filters
 */
const ProductFilterRow = ({ filterKey, filterDef, value = {}, onChange }) => {
    const InputComponent = getInputComponent(filterDef.component || 'TextInput');
    const operators = filterDef.operators || [];

    return (
        <div className="mb-3">
            <label className="block text-xs font-medium text-slate-500 mb-1 capitalize">
                {filterKey.replace(/_/g, ' ')}
            </label>
            {filterDef.description && (
                <p className="text-[10px] text-slate-500 mb-1">{filterDef.description}</p>
            )}
            <div className="flex gap-2">
                <select
                    value={value.operator || ''}
                    onChange={(e) => onChange({ ...value, operator: e.target.value })}
                    className="px-2 py-1.5 rounded-lg text-xs bg-slate-50 border border-slate-200 text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                    <option value="">Select</option>
                    {operators.map(op => (
                        <option key={op} value={op}>{op}</option>
                    ))}
                </select>
                <div className="flex-1">
                    <InputComponent
                        label=""
                        value={value.value ?? ''}
                        onChange={(val) => onChange({ ...value, value: val })}
                        placeholder={`${filterKey} value`}
                    />
                </div>
            </div>
        </div>
    );
};

export default FilterEditor;
