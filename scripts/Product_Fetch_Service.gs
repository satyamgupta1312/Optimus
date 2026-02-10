/**
 * Product Fetch Service for Optimus Widget Manager
 * 
 * Purpose: Fetch product details from "Product Master" Google Sheet
 * 
 * Usage:
 * 1. Deploy this as a Web App in Google Apps Script
 * 2. Allow "Anyone" access (or "Anyone with link")
 * 3. Copy the deployed URL to GoogleSheetService.js SHEET_API_URL
 * 
 * Expected Sheet Structure:
 * - Sheet Name: "Product Master"
 * - Columns: item_code, display_name, brand, main_image, mrp, price
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    if (action === 'fetch_products') {
      return fetchProductsByItemCodes(data.item_codes);
    }

    // Handle other actions (create, update_status) from your existing script
    
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Unknown action'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error in doPost: ' + error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Fetch products from "Product Master" sheet by item codes
 */
function fetchProductsByItemCodes(itemCodes) {
  try {
    // Get the Product Master sheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Product Master');
    
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Product Master sheet not found'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Get all data
    const data = sheet.getDataRange().getValues();
    const headers = data[0]; // First row is headers
    
    // Find column indices
    const itemCodeCol = headers.indexOf('item_code');
    const nameCol = headers.indexOf('display_name');
    const brandCol = headers.indexOf('brand');
    const imageCol = headers.indexOf('main_image');
    const mrpCol = headers.indexOf('mrp');
    const priceCol = headers.indexOf('price');

    // Build products array
    const products = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const itemCode = row[itemCodeCol] ? row[itemCodeCol].toString() : '';
      
      // Check if this item code is in the requested list
      if (itemCodes.includes(itemCode)) {
        products.push({
          item_code: itemCode,
          display_name: row[nameCol] || '',
          brand: row[brandCol] || '',
          main_image: row[imageCol] || '',
          mrp: row[mrpCol] || 0,
          price: row[priceCol] || 0
        });
      }
    }

    Logger.log('Found ' + products.length + ' products for codes: ' + itemCodes.join(', '));

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      products: products,
      count: products.length
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('Error fetching products: ' + error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Test function - run this to verify the script works
 */
function testFetchProducts() {
  const result = fetchProductsByItemCodes(['4560', '4591', '1132']);
  Logger.log(result.getContent());
}
