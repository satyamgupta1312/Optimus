/**
 * StateMapper — State-based product mapping for location-wise widget items.
 *
 * Ported from: scripts/Secondary_Masthead_Automation.gs (state loop)
 *              scripts/Category_Grid_Backend.gs (state CSV rows)
 *              config/widgets/MastheadConfig.js → STATE_DEFINITIONS
 *
 * Usage:
 *   import { StateMapper } from '@/Backend/utils/StateMapper';
 *   const rows = StateMapper.buildCsvRows(subCatProducts, slugGen, '_sc_wi');
 */

import { STATE_DEFINITIONS } from '../../config/widgets/MastheadConfig';

export class StateMapper {
    /**
     * Get active states from a products map.
     * Products shape: { global: "1,2,3", jh: "4,5", cg: "6,7" }
     *
     * @param {Object} products - { global: string, [stateKey]: string }
     * @returns {{ key: string, def: Object, codes: string }[]}
     */
    static getActiveStates(products = {}) {
        const states = [];
        for (const [rawKey, rawCodes] of Object.entries(products)) {
            if (!rawCodes) continue;

            // Normalize key to lowercase to match STATE_DEFINITIONS keys (jh, cg, wb, global)
            const key = rawKey.toLowerCase();

            // Normalize: array of objects → comma-separated string
            let codes;
            if (Array.isArray(rawCodes)) {
                codes = rawCodes
                    .map(c => (typeof c === 'object' && c !== null) ? (c.itemCode || c.item_code || '') : c)
                    .filter(Boolean)
                    .join(',');
            } else {
                codes = rawCodes.toString().trim();
            }

            // Clean up: split on commas/whitespace, remove blanks, rejoin
            codes = codes.split(/[,\s]+/).filter(Boolean).join(',');
            if (!codes) continue;

            // 'global' always has a fallback definition — never skip it
            // Unknown state keys also get a generic fallback (level_tag = key)
            const def = STATE_DEFINITIONS[key] || (key === 'global'
                ? { levelTag: 'global', levelProperty: 'global', slugSuffix: '_global' }
                : { levelTag: key, levelProperty: key, slugSuffix: `_${key}` }
            );

            states.push({ key, def, codes });
        }
        // Ensure global is first
        states.sort((a, b) => (a.key === 'global' ? -1 : b.key === 'global' ? 1 : 0));
        return states;
    }

    /**
     * Build CSV mapping rows for state-wise widget items.
     *
     * Each state gets a row: {itemSlug}_{stateKey}, level_tag, level_property, priority, cohort
     * Global is always priority 1. Other states increment from 2.
     *
     * @param {Object} products - { global: "...", jh: "...", ... }
     * @param {Function} slugFn - (stateKey) => itemSlugName
     * @returns {string[]} CSV rows (without header)
     */
    static buildMappingRows(products, slugFn) {
        const states = this.getActiveStates(products);
        const rows = [];
        let priority = 1;

        for (const state of states) {
            const slug = slugFn(state.key);
            rows.push(`${slug},${state.def.levelTag},${state.def.levelProperty},${priority},`);
            priority++;
        }

        return rows;
    }

    /**
     * Build a complete CSV Blob for widget_item mapping with states.
     *
     * @param {Object} products - { global: "...", jh: "...", ... }
     * @param {Function} slugFn - (stateKey) => itemSlugName
     * @returns {Blob} CSV blob
     */
    static buildMappingCsv(products, slugFn) {
        const header = 'widget_item_slug_name,level_tag,level_property,priority,cohort';
        const rows = this.buildMappingRows(products, slugFn);
        return new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    }

    /**
     * Build the in-stock filter list for a product codes string.
     * Returns: [{"condition":"in_stk_item_codes","value":"1,2,3"}]
     *
     * @param {string} productCodes - Comma-separated item codes
     * @returns {string} JSON stringified filter list
     */
    static buildInStockFilter(productCodes) {
        if (!productCodes || !String(productCodes).trim()) return '[]';
        // GAS script: value is an array of integers, NOT a string
        // e.g. [{"condition":"in_stk_item_codes","value":[1001,1002]}]
        const codes = String(productCodes)
            .split(/[,\s]+/)
            .map(c => parseInt(c.trim(), 10))
            .filter(n => !isNaN(n));
        if (codes.length === 0) return '[]';
        return JSON.stringify([{ condition: 'in_stk_item_codes', value: codes }]);
    }

    /**
     * Get all state definitions.
     * @returns {Object} STATE_DEFINITIONS
     */
    static getDefinitions() {
        return STATE_DEFINITIONS;
    }
}
