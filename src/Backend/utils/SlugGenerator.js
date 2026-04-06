/**
 * SlugGenerator — Slug generation with collision retry.
 *
 * Ported from: scripts/SPR_Optimized_Automation.gs (retry logic)
 *              scripts/CLP_Automation.gs (sanitize + suffix patterns)
 *
 * Usage:
 *   import { SlugGenerator } from '@/Backend/utils/SlugGenerator';
 *   const gen = new SlugGenerator('rice_mela_rail');
 *   gen.get('_spr_opt');              // → 'rice_mela_rail_spr_opt'
 *   gen.getTimestamped('_spr');       // → 'rice_mela_rail_spr_2602201430'
 */

// ── Sanitize a string into a valid slug ──
export function sanitizeSlug(input) {
    return (input || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9_\s-]/g, '')
        .replace(/[\s-]+/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_|_$/g, '');
}

// ── Generate timestamp suffix (YYMMDDHHMM) ──
export function generateTimestamp() {
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${yy}${MM}${dd}_${hh}${mm}${ss}`;
}

/** Strip known widget type suffixes to get clean base slug */
export function stripSuffix(slug) {
    return (slug || '')
        .replace(/_spr_opt$/, '')
        .replace(/_spr$/, '')
        .replace(/_crausel_w$/, '')
        .replace(/_cl_w_hp$/, '')
        .replace(/_cm_hp$/, '')
        .replace(/_mm$/, '');
}

export class SlugGenerator {
    /**
     * @param {string} base - Raw base string (title or slug).
     *   If it already contains a type suffix (_spr_opt, _crausel_w, etc.),
     *   the suffix is stripped so get('_spr_opt') won't double it.
     */
    constructor(base) {
        this.base = stripSuffix(sanitizeSlug(base));
    }

    /** Deterministic slug: {base}{suffix} */
    get(suffix = '') {
        return `${this.base}${suffix}`;
    }

    /** Timestamped slug: {base}{suffix}_{timestamp} */
    getTimestamped(suffix = '') {
        return `${this.base}${suffix}_${generateTimestamp()}`;
    }

    /**
     * Slug with state key: {base}{suffix}_{stateKey}
     * @param {string} suffix
     * @param {string} stateKey - e.g. 'global', 'jh', 'cg'
     */
    getStateful(suffix, stateKey) {
        return `${this.base}${suffix}_${stateKey}`;
    }

    /**
     * Indexed slug for item-level: {base}_item_{n}{suffix}
     * @param {number} index - 0-based item index
     * @param {string} suffix
     */
    getIndexed(index, suffix = '') {
        return `${this.base}_item_${index + 1}${suffix}`;
    }

    /**
     * Double-indexed slug: {base}_item_{n}_subcat_{m}_{state}
     * @param {number} itemIndex
     * @param {number} subIndex
     * @param {string} stateKey
     */
    getNestedStateful(itemIndex, subIndex, stateKey) {
        return `${this.base}_item_${itemIndex + 1}_subcat_${subIndex + 1}_${stateKey}`;
    }

    /**
     * Try a slug with collision retry.
     * Calls `testFn(slug)` — if it throws with "exists" in message, appends _1, _2, etc.
     *
     * Ported from: SPR_Optimized_Automation.gs → retry loop
     *
     * @param {string} slug - The base slug to try
     * @param {Function} testFn - async (slug) => response. Must throw on slug collision.
     * @param {number} maxRetries - Max retry attempts (default 5)
     * @returns {Promise<{slug: string, response: any}>}
     */
    static async withRetry(slug, testFn, maxRetries = 5) {
        let currentSlug = slug;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const response = await testFn(currentSlug);
                return { slug: currentSlug, response };
            } catch (err) {
                const msg = (err.message || '').toLowerCase();
                if (msg.includes('exists') || msg.includes('unique') || msg.includes('p2002')) {
                    currentSlug = `${slug}_${attempt + 1}`;
                    continue;
                }
                throw err; // Non-collision error, don't retry
            }
        }
        throw new Error(`Slug collision: "${slug}" — exhausted ${maxRetries} retries`);
    }
}
