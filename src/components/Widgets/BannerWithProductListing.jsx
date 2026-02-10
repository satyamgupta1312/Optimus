import React from 'react';
import { useWidgetContext } from '../../context/WidgetContext';
import { searchProduct } from '../../services/CatalogService';

const BannerWithProductListing = ({ widget }) => {
    const { navigateTo } = useWidgetContext();

    const handleClick = async () => {
        let mockProducts = [];

        // Priority 1: Use Pre-fetched products (Populated via Enter key in Property Editor)
        if (widget.products && widget.products.length > 0) {
            console.log("[Banner] Using pre-fetched products:", widget.products);
            mockProducts = widget.products.map(p => {
                const salePrice = parseFloat(p.price.toString().replace(/[^0-9.]/g, '')) || 0;
                const mrp = parseFloat(p.mrp || 0) || 0;

                return {
                    id: p.itemCode || p.id,
                    name: p.name,
                    selling_price: salePrice,
                    mrp: mrp || (salePrice * 1.2), // Fake MRP if missing for preview
                    image_url: p.image || 'https://placehold.co/150',
                    quantity_text: '1 unit',
                    discount_percentage: mrp > salePrice ? Math.round(((mrp - salePrice) / mrp) * 100) : 0
                };
            });

            navigateTo('listing', {
                title: widget.title || 'Product Listing',
                products: mockProducts
            });
            return;
        }

        const rawIds = widget.productIds || "";

        // Priority 2: CSV URL
        if (rawIds.includes("http")) {
            try {
                const csvUrl = rawIds.trim();
                const response = await fetch(csvUrl);
                if (!response.ok) throw new Error("Network response was not ok");
                const text = await response.text();

                const lines = text.split('\n').filter(l => l.trim());
                if (lines.length > 1) {
                    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/_/g, ' '));

                    const idxCode = headers.findIndex(h => h.includes('item code'));
                    const idxName = headers.findIndex(h => h.includes('display name') || h.includes('name'));
                    const idxPrice = headers.findIndex(h => h === 'price');
                    const idxMrp = headers.findIndex(h => h.includes('mrp'));
                    const idxImage = headers.findIndex(h => h.includes('main image') || h.includes('image'));

                    mockProducts = lines.slice(1).map(line => {
                        const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''));
                        if (cols.length < 2) return null;

                        const price = idxPrice > -1 ? (parseFloat(cols[idxPrice]) || 0) : 0;
                        const mrp = idxMrp > -1 ? (parseFloat(cols[idxMrp]) || 0) : 0;
                        const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
                        const pName = idxName > -1 ? cols[idxName] : `Product ${cols[idxCode] || '?'}`;
                        const pImage = idxImage > -1 ? cols[idxImage] : 'https://placehold.co/150';

                        return {
                            id: (idxCode > -1 ? cols[idxCode] : '0') || '0',
                            name: pName,
                            selling_price: price,
                            mrp: mrp,
                            image_url: pImage,
                            quantity_text: '1 pc',
                            discount_percentage: discount
                        };
                    }).filter(Boolean);
                }
            } catch (e) {
                console.error("CSV Fetch Error", e);
                alert("Failed to load CSV. " + e.message);
                mockProducts = [{ name: "Error Loading Sheet", price: 0 }];
            }
        } else {
            // Priority 3: Simple IDs (Enhanced with Catalog Lookup)
            const codes = rawIds.toString().split(/[\n,]+/).map(s => s.trim()).filter(Boolean);

            mockProducts = codes.map(code => {
                const catalogItem = searchProduct(code);

                if (catalogItem) {
                    // Parse price from formatted string ("₹100" -> 100)
                    const priceVal = catalogItem.price || 0;
                    // Mock MRP as 20% higher since catalog CSV might only have selling price
                    const mrpVal = priceVal * 1.2;

                    return {
                        id: catalogItem.itemCode,
                        name: catalogItem.name,
                        selling_price: priceVal,
                        mrp: mrpVal,
                        image_url: catalogItem.image || 'https://placehold.co/150',
                        quantity_text: '1 pc',
                        discount_percentage: 20
                    };
                } else {
                    // Fallback for unknown IDs
                    return {
                        id: code,
                        name: `Preview Product (${code})`,
                        selling_price: 100,
                        mrp: 120,
                        image_url: 'https://placehold.co/150',
                        quantity_text: '1 unit',
                        discount_percentage: 16
                    };
                }
            });
        }

        navigateTo('listing', {
            title: widget.title || 'Product Listing',
            products: mockProducts
        });
    };

    return (
        <div
            onClick={handleClick}
            className="w-full relative overflow-hidden rounded-lg shadow-sm cursor-pointer active:scale-95 transition-transform"
        >
            {/* Banner Image */}
            <div
                className="w-full bg-slate-200 relative"
                style={{ aspectRatio: widget.aspectRatio ? `${widget.aspectRatio}/1` : '2/1' }}
            >
                {widget.image ? (
                    <img
                        src={widget.image}
                        alt={widget.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                    />
                ) : (
                    <div className="flex items-center justify-center w-full h-full text-slate-400">
                        No Image
                    </div>
                )}
            </div>


        </div>
    );
};

export default BannerWithProductListing;
