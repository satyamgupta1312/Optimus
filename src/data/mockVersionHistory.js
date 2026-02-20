/**
 * Mock Version History Data
 * 5-6 versions per widget showing realistic change progression.
 */
export const mockVersionHistory = {
    // Keyed by widget slug for easy lookup
    'rice_mela_spr_opt': [
        {
            version: 5,
            timestamp: '2026-02-20T10:00:00Z',
            user: 'satyam.gupta@apnamart.in',
            role: 'MAKER',
            changeLog: 'Added 15 new products for Holi season',
            snapshot: {
                title: 'Rice Mela',
                titleHi: 'चावल मेला',
                products: ['100001', '100002', '100003', '100004', '100005', '100006', '100007', '100008', '100009', '100010', '100011', '100012', '100013', '100014', '100015'],
                pnc: { rows: 1, is_optimized: true, has_multimedia: false },
                pageType: 'product_listing_page',
                slug: 'bau_plp_firstfold_sale_rice_mela_spr_w_all_both_OPT_w',
            },
        },
        {
            version: 4,
            timestamp: '2026-02-18T14:30:00Z',
            user: 'checker1@apnamart.in',
            role: 'CHECKER',
            changeLog: 'Approved with minor title update',
            snapshot: {
                title: 'Rice Mela',
                titleHi: 'चावल मेला',
                products: ['100001', '100002', '100003', '100004', '100005', '100006', '100007', '100008', '100009', '100010'],
                pnc: { rows: 1, is_optimized: true, has_multimedia: false },
                pageType: 'product_listing_page',
                slug: 'bau_plp_firstfold_sale_rice_mela_spr_w_all_both_OPT_w',
            },
        },
        {
            version: 3,
            timestamp: '2026-02-15T09:00:00Z',
            user: 'satyam.gupta@apnamart.in',
            role: 'MAKER',
            changeLog: 'Switched to optimized variant, added state products',
            snapshot: {
                title: 'Rice Festival',
                titleHi: 'चावल उत्सव',
                products: ['100001', '100002', '100003', '100004', '100005', '100006', '100007', '100008'],
                pnc: { rows: 1, is_optimized: true, has_multimedia: false },
                pageType: 'product_listing_page',
                slug: 'bau_plp_firstfold_sale_rice_mela_spr_w_all_both_OPT_w',
            },
        },
        {
            version: 2,
            timestamp: '2026-02-10T11:00:00Z',
            user: 'satyam.gupta@apnamart.in',
            role: 'MAKER',
            changeLog: 'Changed page type from category to PLP',
            snapshot: {
                title: 'Rice Festival',
                titleHi: '',
                products: ['100001', '100002', '100003', '100004', '100005'],
                pnc: { rows: 1, is_optimized: false, has_multimedia: false },
                pageType: 'category_page',
                slug: 'bau_plp_firstfold_sale_rice_mela_spr_w_all_both_OPT_w',
            },
        },
        {
            version: 1,
            timestamp: '2026-02-08T16:00:00Z',
            user: 'satyam.gupta@apnamart.in',
            role: 'MAKER',
            changeLog: 'Initial creation',
            snapshot: {
                title: 'Rice Festival',
                titleHi: '',
                products: ['100001', '100002', '100003'],
                pnc: { rows: 1, is_optimized: false, has_multimedia: false },
                pageType: 'product_listing_page',
                slug: 'bau_plp_firstfold_sale_rice_mela_spr_w_all_both_OPT_w',
            },
        },
    ],
};

/**
 * Get version history for a widget (returns array sorted newest-first)
 */
export function getVersionHistory(widgetSlug) {
    return mockVersionHistory[widgetSlug] || generateDefaultHistory(widgetSlug);
}

/**
 * Generate placeholder history for widgets without specific mock data
 */
function generateDefaultHistory(slug) {
    const now = new Date();
    return [
        {
            version: 3,
            timestamp: new Date(now - 2 * 3600000).toISOString(),
            user: 'satyam.gupta@apnamart.in',
            role: 'MAKER',
            changeLog: 'Updated product list',
            snapshot: { slug, title: 'Widget', products: ['101', '102', '103'], pnc: {} },
        },
        {
            version: 2,
            timestamp: new Date(now - 24 * 3600000).toISOString(),
            user: 'checker1@apnamart.in',
            role: 'CHECKER',
            changeLog: 'Approved',
            snapshot: { slug, title: 'Widget', products: ['101', '102'], pnc: {} },
        },
        {
            version: 1,
            timestamp: new Date(now - 72 * 3600000).toISOString(),
            user: 'satyam.gupta@apnamart.in',
            role: 'MAKER',
            changeLog: 'Initial creation',
            snapshot: { slug, title: 'Widget', products: ['101'], pnc: {} },
        },
    ];
}
