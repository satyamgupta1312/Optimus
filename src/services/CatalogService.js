import catalogData from '../data/catalog.csv?raw';

// Helper to parse CSV line correctly handling quotes
const parseCSVLine = (text) => {
    const result = [];
    let cell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(cell.trim());
            cell = '';
        } else {
            cell += char;
        }
    }
    result.push(cell.trim());
    return result;
};

// Parse the CSV once
const rows = catalogData.split('\n').slice(1); // Skip header
const items = rows.map(row => {
    if (!row.trim()) return null;
    const cols = parseCSVLine(row);
    // Columns: id(0), item code(1), Display Name(2), Brand(3), main_image(4), MRP(5), Price(6)

    // Clean item code (remove commas inside quotes e.g. "5,005" -> 5005)
    let itemCode = cols[1] ? cols[1].replace(/"/g, '').replace(/,/g, '').trim() : '';

    return {
        itemCode: itemCode,
        name: cols[2] ? cols[2].replace(/"/g, '') : '',
        brand: cols[3],
        image: cols[4],
        mrp: parseFloat((cols[5] || '0').replace(/[^0-9.]/g, '')) || 0,
        price: parseFloat((cols[6] || cols[5] || '0').replace(/[^0-9.]/g, '')) || 0,
        priceDisplay: "₹" + (cols[6] || cols[5] || '0')
    };
}).filter(Boolean);

export const searchProduct = (code) => {
    // Normalize code
    const cleanCode = code.toString().trim().replace(/,/g, '');
    return items.find(item => item.itemCode === cleanCode);
};
