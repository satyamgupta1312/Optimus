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
        for (const [key, codes] of Object.entries(products)) {
            if (!codes || !codes.toString().trim()) continue;
            const def = STATE_DEFINITIONS[key];
            if (!def) continue;
            states.push({ key, def, codes: codes.toString().trim() });
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
        if (!productCodes || !productCodes.trim()) return '[]';
        return JSON.stringify([{ condition: 'in_stk_item_codes', value: productCodes.trim() }]);
    }

    /**
     * Get all state definitions.
     * @returns {Object} STATE_DEFINITIONS
     */
    static getDefinitions() {
        return STATE_DEFINITIONS;
    }
}
