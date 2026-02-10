/**
 * ==========================================
 * SPR OPTIMIZED AUTOMATION (Updated for User Columns)
 * ==========================================
 * Columns:
 * A: Slug Name
 * B: Item Codes (Comma Separated)
 * C: Heading En
 * D: Heading Hi
 * E: End Date (Optional, defaults to 1 year)
 * F: Status (Output)
 */

// --- CONFIGURATION ---
// --- CONFIGURATION ---
var COOKIE_STRING = "theme=samaan; _ga=GA1.1.1894549250.1747731290; csrftoken=AbIuEA7YbSwUde3MKFmOyviw7iSJ7QYs; sessionid=npjz2gp62gcajn91wg2tu9bh4cs8my99";

var BASE_URL = "https://samaan.apnamart.in";

function automateSPRCreation() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  
  var csrfToken = extractCsrf(COOKIE_STRING);
  console.log("Using CSRF Token: " + csrfToken);

  var baseHeaders = {
    "Cookie": COOKIE_STRING,
    "x-csrftoken": csrfToken,
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
    "Origin": BASE_URL,
    "Referer": BASE_URL + "/"
  };

  // Skip header row
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    
    // -------------------------------------------------------------------
    // MAP USER COLUMNS
    // -------------------------------------------------------------------
    var slugBase = row[0];        // Column A: Slug Name
    var itemCodes = row[1];       // Column B: Item Codes
    var headingEn = row[2];       // Column C: heading en
    var headingHi = row[3] || ""; // Column D: heading hi
    var endDateRaw = row[4];      // Column E: End date
    var status = row[5];          // Column F: status

    if (status && status.toString().indexOf("Success") > -1) continue;
    if (!slugBase) continue;

    try {
      console.log("Processing Row " + (i+1) + ": " + slugBase);

      var names = { wi: slugBase + "_wi", w_spr: slugBase + "_spr", page: slugBase + "_page" };
      
      // Calculate Dates
      var dates = getDates(endDateRaw);
      var blankBlob = getBlankImageBlob(); 
      
      // STEP 1: Page Layout
      var payloadStep1 = { "slug_name": names.page, "page_heading": headingEn, "page_layout_type": "2", "page_type": "product_listing_page" };
      var final_page = callApiWithRetry(BASE_URL + "/api/app/post_page_layout/", payloadStep1, baseHeaders, "json");

      // STEP 2: Widget Item (Item Rows)
      var payloadStep2 = {
        "slug_name": names.wi, 
        "text_en": headingEn,         // Heading EN
        "text_hi": headingHi,         // Heading HI
        "product_list": itemCodes.toString(), 
        "item_type": "item_rows",
        "media_en": blankBlob, 
        "widget_item_id": "undefined", 
        "deactivated_flag": "no", 
        "item_click_action": "deal-detail-redirect",
        "slave_key": "", "media": "", "text_bg": "", "media_bg": "", "filters": "[]", 
        "filter_lst": JSON.stringify([{ "condition": "in_stk_item_codes", "value": itemCodes.toString() }]),
        "property_lst": "[]", "pl_edit": "PL", "is_clickable": "no", "update_product_list": "no", "start_time": dates.start, "end_time": dates.end,
        "background_multimedia": "", "image_multimedia": "", "secondary_image_multimedia": "", "progress_bar": "", "offer_id": "", "click_action_params": "{}"
      };
      var final_wi = callApiWithRetry(BASE_URL + "/api/app/post_widget_item/", payloadStep2, baseHeaders, "multipart");

      // STEP 3: Widget (Single Product Row Optimized - v2)
      var payloadStep3 = {
        "slug_name": names.w_spr, 
        "widget_type": "single_product_row_v2", 
        "heading_en": headingEn,      // Heading EN
        "heading_hi": headingHi,      // Heading HI
        "description": "", "heading": "",
        "master_key": "", "heading_bg": "", "start_time": dates.start, "end_time": dates.end, "clear_bg_media": "",
        "media_aspect_ratio": "1", "view_all_action_name": "redirect-to-page", 
        "view_all_action_params": JSON.stringify({ "page_type": "product_listing_page", "page_layout_slug_name": final_page }),
        "background_multimedia": "", "filter_dict": "{}", "app_configurations": "{}"
      };
      var final_w_spr = callApiWithRetry(BASE_URL + "/api/app/widget/", payloadStep3, baseHeaders, "multipart");

      // MAPPING STEPS
      
      // 1. Map Widget to Widget Item
      var csvStep4 = createCsv("widget_item", final_wi);
      var payloadStep4 = { "widget_slug": final_w_spr, "mapping_file": csvStep4 };
      callApiWithRetry(BASE_URL + "/api/app/update_widget_widget_item_mapping/", payloadStep4, baseHeaders, "multipart");

      // 2. Map Page to Widget
      var csvStep5 = createCsv("layout_widget", final_w_spr);
      var payloadStep5 = { "page_layout_slug": final_page, "mapping_file": csvStep5 };
      callApiWithRetry(BASE_URL + "/api/app/update_layout_widget_mapping/", payloadStep5, baseHeaders, "multipart");

      // 3. Map Global to Page (optional, makes it visible)
      var csvStep6 = createCsv("global_page", "");
      var payloadStep6 = { "page_layout_slug": final_page, "page_type": "", "mapping_file": csvStep6 };
      callApiWithRetry(BASE_URL + "/api/app/update_page_page_layout_mapping/", payloadStep6, baseHeaders, "multipart");

      // SUCCESS
      sheet.getRange(i + 1, 6).setValue("Success - " + final_w_spr); // Write status to Column F
      SpreadsheetApp.flush();

    } catch (e) {
      console.error("Row " + (i+1) + " Failed: " + e.message);
      sheet.getRange(i + 1, 6).setValue("Error: " + e.message); // Write error to Column F
    }
  }
}

// ==========================================
// UTILS
// ==========================================
function extractCsrf(cookieString) {
  var match = cookieString.match(/csrftoken=([^;]+)/);
  return match ? match[1] : "dummy_token";
}

function callApiWithRetry(url, payload, baseHeaders, type) {
  var maxRetries = 5;
  var originalSlug = payload["slug_name"];
  
  if (url.indexOf("mapping") > -1) {
     var options = { "method": "post", "headers": baseHeaders, "payload": payload, "muteHttpExceptions": true };
     var response = UrlFetchApp.fetch(url, options);
     if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) return "Mapped";
     throw new Error("Mapping Step Failed (" + response.getResponseCode() + "): " + response.getContentText());
  }

  var currentSlug = originalSlug;
  var attempt = 0;
  while (attempt <= maxRetries) {
    try {
      payload["slug_name"] = currentSlug;
      var options = {
        "method": "post",
        "headers": (type === "json") ? getJsonHeaders(baseHeaders) : baseHeaders,
        "payload": (type === "json") ? JSON.stringify(payload) : payload,
        "muteHttpExceptions": true
      };
      var response = UrlFetchApp.fetch(url, options);
      var code = response.getResponseCode();
      if (code >= 200 && code < 300) return currentSlug;
      
      var respText = response.getContentText();
      if (code === 400 && (respText.indexOf("exists") > -1 || respText.indexOf("unique") > -1)) {
        attempt++;
        currentSlug = originalSlug + "_" + attempt;
      } else {
        throw new Error("API Failed (" + code + "): " + respText);
      }
    } catch (e) {
      if (e.message.indexOf("API Failed") > -1) throw e;
      throw e; 
    }
  }
  throw new Error("Max retries reached for slug: " + originalSlug);
}

function getBlankImageBlob() {
  var base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  return Utilities.newBlob(Utilities.base64Decode(base64), 'image/png', 'blank.png');
}

function getJsonHeaders(base) {
  var h = JSON.parse(JSON.stringify(base));
  h["Content-Type"] = "application/json;charset=UTF-8";
  return h;
}

function getDates(endDateInput) {
  var now = new Date();
  var start = formatDate(now);
  
  var end;
  if (endDateInput && endDateInput instanceof Date) {
     end = formatDate(endDateInput);
  } else if (endDateInput && typeof endDateInput === 'string' && endDateInput.trim() !== '') {
     end = endDateInput; // Assume valid string or add parsing if needed
  } else {
     // Default to 1 year later
     var nextYear = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
     end = formatDate(nextYear);
  }
  
  return { start: start, end: end };
}

function formatDate(d) {
  return d.getFullYear() + '-' + 
         ('0'+(d.getMonth()+1)).slice(-2) + '-' + 
         ('0'+d.getDate()).slice(-2) + ' ' + 
         ('0'+d.getHours()).slice(-2) + ':' + 
         ('0'+d.getMinutes()).slice(-2) + ':00';
}
