/**
 * ==========================================
 * FINAL MODULAR CLP AUTOMATION SCRIPT
 * ==========================================
 * Complete with all helper functions and API retry logic.
 */

// ------------------------------------------
// CONFIGURATION
// ------------------------------------------
var BASE_URL = "https://samaan.apnamart.in"; 

// ==========================================
// MAIN FUNCTION: CREATE CLP WIDGET
// ==========================================
function createCLPWidget(widget, baseHeaders) {
  // 1. Sanitize Inputs
  var slugBase = sanitizeSlug(widget.slug || widget.title || 'clp_widget');
  var inputProducts = (widget.productIds || "").toString().trim();
  var itemCodes = "";

  // 2. Fetch/Process Item Codes
  if (inputProducts.indexOf("http") === 0) {
    try {
      console.log("Fetching Item Codes from Sheet: " + inputProducts);
      itemCodes = fetchCodesFromSheet(inputProducts);
      console.log("Fetched " + itemCodes.split(",").length + " codes.");
    } catch (e) {
      throw new Error("Failed to fetch sheet: " + e.message);
    }
  } else {
    // Clean string input (handle newlines, commas, spaces)
    itemCodes = inputProducts.replace(/[\r\n]+/g, ",")
      .split(',')
      .map(function(s) { return s.trim(); })
      .filter(function(s) { return s !== ""; })
      .join(",");
  }
  
  // Fallback: Extract from 'products' array object if string is empty
  if (!itemCodes && widget.products && Array.isArray(widget.products) && widget.products.length > 0) {
      console.log("No productIds string found. Extracting from widget.products array...");
      var extracted = [];
      for (var i = 0; i < widget.products.length; i++) {
          var p = widget.products[i];
          var code = p.itemCode || p.id || p.item_code;
          if (code) extracted.push(code.toString().trim());
      }
      itemCodes = extracted.join(",");
      console.log("Extracted IDs: " + itemCodes);
  }

  // Final Validation
  if (!itemCodes) {
     throw new Error("Product Item Codes are required for CLP.");
  }

  var imageUrl = widget.image || "";
  var aspectRatio = widget.aspectRatio || "1";
  var widgetTitle = widget.title || slugBase;  // Ensure we always have a title

  console.log("Processing CLP Automation for: " + slugBase);
  console.log("Widget Title: " + widgetTitle);


  // 3. Define Naming Convention
  var names = { 
    wi_plp: slugBase + "_sub_cat_wi",  // Sub Category Widget Item
    w_plp:  slugBase + "_plp_w",        // PLP Widget
    page:   slugBase + "_Page_p",       // Product Listing Page
    wi_cl:  slugBase + "_cl_wi",        // Carousel Widget Item
    w_cl:   slugBase + "_Cl_w_HP"       // Carousel Widget (Main Result)
  };

  var dates = getDates();
  var blankBlob = getBlankImageBlob(); 

  // ------------------------------------------
  // STEP 1: Widget Item (Sub Category)
  // ------------------------------------------
  var payloadStep1 = {
    "slug_name": names.wi_plp, "text_en": widgetTitle, 
    "product_list": itemCodes.toString(), "item_type": "sub_category",
    "media_en": blankBlob, "widget_item_id": "undefined", "deactivated_flag": "no", "item_click_action": "deal-detail-redirect",
    "slave_key": "", "media": "", "text_hi": "", "media_hi": "", "text_bg": "", "media_bg": "", "filters": "[]", 
    "filter_lst": JSON.stringify([{ "condition": "in_stk_item_codes", "value": itemCodes.toString() }]),
    "property_lst": "[]", "pl_edit": "PL", "is_clickable": "yes", "update_product_list": "no", "start_time": dates.start, "end_time": dates.end,
    "background_multimedia": "", "image_multimedia": "", "secondary_image_multimedia": "", "progress_bar": "", "offer_id": "", "click_action_params": "{}"
  };
  callApiWithRetryCLP(BASE_URL + "/api/app/post_widget_item/", payloadStep1, baseHeaders, "multipart");
  
  // ------------------------------------------
  // STEP 2: Widget (PLP)
  // ------------------------------------------
  var payloadStep2 = {
    "slug_name": names.w_plp, "widget_type": "product_listing",
    "start_time": dates.start, "end_time": dates.end,
    "heading": widgetTitle, "heading_en": widgetTitle, "heading_hi": "",
    "media_aspect_ratio": "1", "filter_dict": "{}", "app_configurations": "{}",
    "description": "", "master_key": "", "heading_bg": "", "clear_bg_media": "",
    "view_all_action_name": "", "background_multimedia": ""
  };
  callApiWithRetryCLP(BASE_URL + "/api/app/widget/", payloadStep2, baseHeaders, "multipart");

  // ------------------------------------------
  // STEP 3: Page Layout (PLP Page)
  // ------------------------------------------
  var payloadStep3 = { "slug_name": names.page, "page_heading": widgetTitle, "page_layout_type": "2", "page_type": "product_listing_page" };
  callApiWithRetryCLP(BASE_URL + "/api/app/post_page_layout/", payloadStep3, baseHeaders, "json");

  // ------------------------------------------
  // STEP 4: Widget Item (Carousel)
  // ------------------------------------------
  console.log("Step 4 - Starting Carousel Widget Item creation...");
  console.log("Step 4 - imageUrl received: " + imageUrl);
  
  var imageBlob = blankBlob;
  if (imageUrl && imageUrl.toString().trim() !== "") {
    console.log("Step 4 - Fetching image from URL: " + imageUrl.toString().trim());
    imageBlob = fetchViaProxy(imageUrl.toString().trim());
    console.log("Step 4 - Image fetched. Blob size: " + (imageBlob ? imageBlob.getBytes().length : 0) + " bytes");
  } else {
    console.log("Step 4 - No image URL provided, using blank blob");
  }

  // CRITICAL: Order matters! page_type MUST come before page_layout_slug_name (matching working curl)
  var clickParams = { "page_type": "product_listing_page", "page_layout_slug_name": names.page };
  console.log("Step 4 - Using click_action_params: " + JSON.stringify(clickParams));
  console.log("Step 4 - widget item slug = " + names.wi_cl);
  
  var payloadStep4 = {
    "widget_item_id": "undefined", "deactivated_flag": "no", "item_click_action": "redirect-to-page",
    "slug_name": names.wi_cl, "slave_key": "", "item_type": "carousel",
    "media": "", "text_en": "", "media_en": imageBlob, "text_hi": "", "media_hi": "", "text_bg": "", "media_bg": "",
    "product_list": "", "filters": "[]", "filter_lst": "[]", "property_lst": "[]", "pl_edit": "PL",
    "is_clickable": "yes", "update_product_list": "no",
    "start_time": dates.start, "end_time": dates.end,
    "background_multimedia": "", "image_multimedia": "", "secondary_image_multimedia": "", "progress_bar": "", "offer_id": "",
    "click_action_params": JSON.stringify(clickParams)
  };
  
  console.log("Step 4 - Calling API to create carousel widget item...");
  callApiWithRetryCLP(BASE_URL + "/api/app/post_widget_item/", payloadStep4, baseHeaders, "multipart");

  // ------------------------------------------
  // STEP 5: Widget (Carousel)
  // ------------------------------------------
  var payloadStep5 = {
    "slug_name": names.w_cl, "widget_type": "carousel",
    "description": "", "heading": "", "master_key": "",
    "heading_en": "", "heading_hi": "", "heading_bg": "",
    "start_time": dates.start, "end_time": dates.end,
    "clear_bg_media": "", "media_aspect_ratio": aspectRatio,
    "view_all_action_name": "", "background_multimedia": "",
    "filter_dict": "{}", "app_configurations": "{}"
  };
  callApiWithRetryCLP(BASE_URL + "/api/app/widget/", payloadStep5, baseHeaders, "multipart");

  // ------------------------------------------
  // MAPPINGS - Using slugs from names object (matching SPR pattern)
  // ------------------------------------------
  // Step 6: Layout -> PLP Widget
  var csvStep6 = Utilities.newBlob("widget_slug_name,level_tag,level_property,priority,cohort\n" + names.w_plp + ",global,global,1,", 'text/csv', 'map.csv');
  callApiWithRetryCLP(BASE_URL + "/api/app/update_layout_widget_mapping/", { "page_layout_slug": names.page, "mapping_file": csvStep6 }, baseHeaders, "multipart");

  // Step 7: PLP Widget -> SubCat Item
  var csvStep7 = Utilities.newBlob("widget_item_slug_name,level_tag,level_property,priority,cohort\n" + names.wi_plp + ",global,global,1,", 'text/csv', 'map.csv');
  callApiWithRetryCLP(BASE_URL + "/api/app/update_widget_widget_item_mapping/", { "widget_slug": names.w_plp, "mapping_file": csvStep7 }, baseHeaders, "multipart");

  // Step 8: Carousel Widget -> Carousel Item
  var csvStep8 = Utilities.newBlob("widget_item_slug_name,level_tag,level_property,priority,cohort\n" + names.wi_cl + ",global,global,1,", 'text/csv', 'map.csv');
  callApiWithRetryCLP(BASE_URL + "/api/app/update_widget_widget_item_mapping/", { "widget_slug": names.w_cl, "mapping_file": csvStep8 }, baseHeaders, "multipart");

  console.log("Using Item Codes: " + itemCodes);

  // Step 9: Global -> Page
  var csvStep9 = Utilities.newBlob("level_tag,level_property\nglobal,global", 'text/csv', 'map.csv');
  callApiWithRetryCLP(BASE_URL + "/api/app/update_page_page_layout_mapping/", { "page_layout_slug": names.page, "page_type": "", "mapping_file": csvStep9 }, baseHeaders, "multipart");

  // ------------------------------------------
  // VERIFICATION: Check which widgets were created
  // ------------------------------------------
  console.log("=== VERIFICATION: Checking created widgets ===");
  var verification = verifyWidgetsCreated(names, names.wi_plp, names.w_plp, names.page, names.wi_cl, names.w_cl, baseHeaders);
  console.log("Verification Results: " + JSON.stringify(verification));

  return names.w_cl;
}

// ==========================================
// VERIFICATION FUNCTION
// ==========================================

/**
 * Verify which widgets/items were actually created in the database
 */
function verifyWidgetsCreated(names, wi_plp, w_plp, page, wi_cl, w_cl, baseHeaders) {
  var results = {
    step1_subcat_item: checkWidgetItemExists(wi_plp, baseHeaders),
    step2_plp_widget: checkWidgetExists(w_plp, baseHeaders),
    step3_page_layout: checkPageLayoutExists(page, baseHeaders),
    step4_carousel_item: checkWidgetItemExists(wi_cl, baseHeaders),
    step5_carousel_widget: checkWidgetExists(w_cl, baseHeaders)
  };
  
  console.log("Step 1 (Sub Category Item): " + (results.step1_subcat_item ? "✅ Created" : "❌ Not Found"));
  console.log("Step 2 (PLP Widget): " + (results.step2_plp_widget ? "✅ Created" : "❌ Not Found"));
  console.log("Step 3 (Page Layout): " + (results.step3_page_layout ? "✅ Created" : "❌ Not Found"));
  console.log("Step 4 (Carousel Item): " + (results.step4_carousel_item ? "✅ Created" : "❌ Not Found"));
  console.log("Step 5 (Carousel Widget): " + (results.step5_carousel_widget ? "✅ Created" : "❌ Not Found"));
  
  return results;
}

function checkWidgetExists(slug, baseHeaders) {
  try {
    var url = BASE_URL + "/api/app/widget/?slug_name=" + encodeURIComponent(slug);
    var options = { "method": "get", "headers": baseHeaders, "muteHttpExceptions": true };
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    return code === 200;
  } catch (e) {
    console.error("Error checking widget " + slug + ": " + e.toString());
    return false;
  }
}

function checkWidgetItemExists(slug, baseHeaders) {
  try {
    var url = BASE_URL + "/api/app/widget_item/?slug_name=" + encodeURIComponent(slug);
    var options = { "method": "get", "headers": baseHeaders, "muteHttpExceptions": true };
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    return code === 200;
  } catch (e) {
    console.error("Error checking widget item " + slug + ": " + e.toString());
    return false;
  }
}

function checkPageLayoutExists(slug, baseHeaders) {
  try {
    var url = BASE_URL + "/api/app/page_layout/?slug_name=" + encodeURIComponent(slug);
    var options = { "method": "get", "headers": baseHeaders, "muteHttpExceptions": true };
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    return code === 200;
  } catch (e) {
    console.error("Error checking page layout " + slug + ": " + e.toString());
    return false;
  }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function fetchViaProxy(url) {
  try {
    // Uses weserv.nl for resizing and compression (q=60)
    var proxyUrl = "https://images.weserv.nl/?url=" + encodeURIComponent(url) + "&q=60&output=jpg";
    console.log("Fetching via Proxy: " + proxyUrl);
    var response = UrlFetchApp.fetch(proxyUrl);
    if (response.getResponseCode() === 200) return response.getBlob();
    throw new Error("Proxy returned " + response.getResponseCode());
  } catch (e) {
    console.warn("Image Fetch Failed via Proxy (" + e.message + "). Using Blank.");
    return getBlankImageBlob();
  }
}

/**
 * Fetch the actual page layout slug from the database
 * This is needed because the API may modify the slug (add prefix, numbers, etc.)
 */
function fetchActualPageLayoutSlug(pageHeading, baseHeaders) {
  try {
    // Search for page layout by page_heading
    var url = BASE_URL + "/api/app/page_layout/?page_heading=" + encodeURIComponent(pageHeading);
    console.log("Fetching page layout with heading: " + pageHeading);
    
    var options = { 
      "method": "get", 
      "headers": baseHeaders, 
      "muteHttpExceptions": true 
    };
    
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    var content = response.getContentText();
    
    console.log("Page Layout search response (" + code + "): " + content.substring(0, 300));
    
    if (code === 200) {
      var json = JSON.parse(content);
      
      // Handle array response
      if (Array.isArray(json) && json.length > 0) {
        // Get the most recent one (last in array)
        var latest = json[json.length - 1];
        console.log("Found page layout: " + JSON.stringify(latest).substring(0, 200));
        return latest.slug_name || latest.slug;
      }
      
      // Handle object response
      if (json.results && Array.isArray(json.results) && json.results.length > 0) {
        var latest = json.results[json.results.length - 1];
        console.log("Found page layout in results: " + JSON.stringify(latest).substring(0, 200));
        return latest.slug_name || latest.slug;
      }
      
      // Direct object with slug
      if (json.slug_name || json.slug) {
        return json.slug_name || json.slug;
      }
    }
    
    console.warn("Could not find page layout by heading: " + pageHeading);
    return null;
  } catch (e) {
    console.error("Error fetching page layout: " + e.message);
    return null;
  }
}

function fetchCodesFromSheet(url) {
  var csvUrl = url;
  if (url.indexOf("/edit") > -1) {
    csvUrl = url.replace(/\/edit.*$/, "/export?format=csv");
  }
  
  console.log("Downloading CSV from: " + csvUrl);
  var resp = UrlFetchApp.fetch(csvUrl);
  var csvContent = resp.getContentText();
  var csvData = Utilities.parseCsv(csvContent);
  
  if (csvData.length < 2) {
    throw new Error("CSV is empty or invalid format.");
  }

  // Find "item code" column
  var headers = csvData[0];
  var colIndex = -1;
  
  for (var i=0; i<headers.length; i++) {
     var h = headers[i].toLowerCase().replace(/_/g, " ");
     if (h.indexOf("item code") > -1) { colIndex = i; break; }
  }
  
  // Fallback to Column B (Index 1)
  if (colIndex === -1 && headers.length > 1) {
     console.warn("Could not find 'item code' header. Defaulting to Column Index 1.");
     colIndex = 1; 
  }

  var codes = [];
  for (var i=1; i<csvData.length; i++) {
     var row = csvData[i];
     if (row.length > colIndex) {
       var val = row[colIndex];
       if (val && val.toString().trim() !== "") {
         codes.push(val.toString().trim());
       }
     }
  }
  
  return codes.join(",");
}

function sanitizeSlug(text) {
  if (!text) return 'clp_widget';
  return text.toString().toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')   // Replace non-alphanumeric with _
    .replace(/^_+|_+$/g, '');      // Trim leading/trailing _
}

function getDates() {
  var now = new Date();
  var start = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  
  // Default to 10 years expiry
  var endObj = new Date(now.valueOf());
  endObj.setFullYear(endObj.getFullYear() + 10);
  var end = Utilities.formatDate(endObj, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  
  return { start: start, end: end };
}

function getBlankImageBlob() {
  // Returns a 1x1 transparent GIF
  var decoded = Utilities.base64Decode("R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==");
  return Utilities.newBlob(decoded, "image/gif", "blank.gif");
}

function callApiWithRetryCLP(url, payload, headers, type) {
  var options = {
    "method": "post",
    "headers": headers || {},
    "muteHttpExceptions": true
  };

  if (type === "json") {
    options.contentType = "application/json";
    options.payload = JSON.stringify(payload);
  } else {
    // For "multipart", Apps Script handles it automatically if payload is a key-value object
    options.payload = payload; 
  }

  var maxRetries = 3;
  var lastError;

  for (var i = 0; i < maxRetries; i++) {
    try {
      var response = UrlFetchApp.fetch(url, options);
      var code = response.getResponseCode();
      var content = response.getContentText();

      if (code >= 200 && code < 300) {
        console.log("API Success (" + code + "): " + content.substring(0, 500));  // Log first 500 chars
        try {
          var json = JSON.parse(content);
          console.log("Parsed JSON keys: " + Object.keys(json).join(", "));
          // Return the slug if present, otherwise log and return what we got
          var slug = json.slug_name || json.slug || json.data?.slug_name || json.data?.slug;
          if (slug) {
            console.log("Extracted slug: " + slug);
            return slug;
          }
          // If no slug found, check for ID or return the full response for debugging
          console.log("No slug found in response. Keys: " + Object.keys(json).join(", "));
          return json.id || JSON.stringify(json);
        } catch (e) {
          console.log("Response is not JSON: " + content.substring(0, 200));
          return content; // Return raw text if not JSON
        }
      } else {
        console.error("Attempt " + (i+1) + " failed: " + code + " - " + content);
        lastError = "API Error " + code + ": " + content;
        Utilities.sleep(1000); // Wait 1 second before retry
      }
    } catch (e) {
      console.error("Attempt " + (i+1) + " exception: " + e.message);
      lastError = e.message;
      Utilities.sleep(1000);
    }
  }
  
  // If we get here, all retries failed
  throw new Error(lastError);
}
