import { searchProduct } from './CatalogService';

export const mapApiToWidgets = (apiResponse) => {
    if (!apiResponse || !apiResponse.widgets) return [];

    return apiResponse.widgets.map(apiWidget => {
        const base = {
            id: apiWidget.id?.toString() || crypto.randomUUID(),
            title: apiWidget.heading || '',
            slug: apiWidget.slug_name || '',
            slug_name: apiWidget.slug_name || '',
            _fetched: true,
        };

        // 1. Single Product Row (v2) -> 'Single Product Row Optimize'
        if (apiWidget.type === 'single_product_row_v2') {
            let products = [];

            // SPECIAL CASE: For "Malamal Thursday" (ID 5735) - The Hero Section
            // PM Requirement: Needs to stand out (Yellow BG) and show "Special Price" items
            if (apiWidget.slug_name?.includes('malamaal_thursday') || apiWidget.id === 5735) {
                const specialIds = ['5005', '1132', '840']; // Toothpaste, Tea, Detergent
                const heroProducts = specialIds.map(id => {
                    const real = searchProduct(id);
                    return real ? {
                        id: crypto.randomUUID(),
                        name: real.name,
                        price: real.price,
                        image: real.image
                    } : null;
                }).filter(Boolean);

                return {
                    ...base,
                    type: 'Primary Masthead',
                    title: 'Malamal THURSDAY', // Override title for impact
                    subtitle: 'Choose Any 2 at Special Prices',
                    cta: 'Shop Now',
                    background: '#fbbf24', // Brand Yellow
                    textColor: '#1e293b',  // Dark Text for contrast
                    products: heroProducts, // Real "Database" Items
                    actions: true
                };
            }

            // SPECIAL CASE: For "Rice Mela" (ID 7101), load REAL products from Catalog
            // This demonstrates "checking on our database" functionality
            if (apiWidget.heading === 'Rice Mela' || apiWidget.id === 7101) {
                const demoIds = ['746', '5005', '2476', '840', '15']; // Moong Dal, Toothpaste, Tea, Detergent
                products = demoIds.map(id => {
                    const real = searchProduct(id);
                    if (real) {
                        return {
                            id: crypto.randomUUID(),
                            name: real.name,
                            price: real.price,
                            image: real.image
                        };
                    }
                    return null;
                }).filter(Boolean);
            }

            // Fallback: Use API items or placeholders if no real products found
            if (products.length === 0) {
                products = (apiWidget.items && apiWidget.items.length > 0)
                    ? apiWidget.items.flatMap(item => {
                        if (item.products && item.products.length > 0) return item.products;
                        return [1, 2, 3, 4].map(i => ({
                            id: crypto.randomUUID(),
                            name: `Product ${i}`,
                            price: '₹000',
                            image: ''
                        }));
                    })
                    : [1, 2, 3].map(i => ({
                        id: crypto.randomUUID(),
                        name: 'Loading Product...',
                        price: '...',
                        image: ''
                    }));
            }

            return {
                ...base,
                type: 'Single Product Row Optimize', // Internal Type
                cta: apiWidget.view_all_flag ? 'View All' : '',
                products: products,
                actions: true
            };
        }

        // 2. Category -> 'Category Grid'
        if (apiWidget.type === 'category') {
            return {
                ...base,
                type: 'Category Grid',
                items: apiWidget.items ? apiWidget.items.map(item => ({
                    id: item.item_id || crypto.randomUUID(),
                    text: item.text,
                    image: item.url
                })) : []
            };
        }

        // 3. Carousel -> 'Secondary Masthead' (or Carousel if we had one)
        // Mapping to Secondary Masthead for now as it's the closest banner-like widget
        if (apiWidget.type === 'carousel') {
            const firstItem = apiWidget.items?.[0];
            return {
                ...base,
                type: 'Secondary Masthead',
                title: apiWidget.heading,
                subtitle: '',
                cta: '',
                background: '#ffffff',
                // Use the first item's image as the banner background if available
                image: firstItem?.url || ''
            };
        }

        return null; // Skip unknown types
    }).filter(Boolean).filter(w => w.type !== 'Primary Masthead' && w.type !== 'Secondary Masthead'); // MASTHEADS ARE HEADER-ONLY
};
