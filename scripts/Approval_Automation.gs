/**
 * ==========================================
 * OPTIMUS REQUEST MANAGEMENT + APPROVAL AUTOMATION
 * ==========================================
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * ------------------------
 * 1. Open this file in Google Apps Script Editor
 * 2. Click "Deploy" → "New deployment"
 * 3. Settings:
 *    - Type: Web app
 *    - Description: "Optimus Request Queue API"
 *    - Execute as: Me (your email)
 *    - Who has access: **Anyone** (CRITICAL for CORS!)
 * 4. Click "Deploy"
 * 5. Copy the Web App URL
 * 6. Update src/services/GoogleSheetService.js with the new URL
 * 
 * REQUIRED FILES:
 * ---------------
 * - Primary_Masthead_Automation.gs (contains createPrimaryMastheadFromApproval)
 * - SPR_Widget_Optimized.gs (contains createSPROptimizedWidget, createSPRStandardWidget)
 * - CLP_Widget_Creator.gs (contains createCLPWidget)
 */

// Configuration for widget creation automation
// ==================== CONFIGURATION ====================
// TEMPORARY FIX: Using manual cookies until authorization popup issue is resolved
// Fresh cookies obtained: 2026-02-03
var COOKIE_STRING = "csrftoken=0aAZrbP6ESnptako3gFliD0kAsQMGz5f; sessionid=90wx34k16le6wyrr4o18zhyp5uqmftj7; theme=samaan";
var BASE_URL = "https://samaan.apnamart.in";

/**
 * Handle GET requests - Fetch all requests
 */
function doGet(e) {
  return getAllRequests();
}

/**
 * Fetch all requests from Sheet
 */
function getAllRequests() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Requests');
  var rows = sheet.getDataRange().getValues();
  var result = [];

  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    var obj = {};
    obj.id = row[0];
    obj.user = row[1];
    obj.type = row[2];
    obj.status = row[3];
    obj.date = row[4];
    try { obj.widgets = JSON.parse(row[5]); } catch(e) { obj.widgets = []; }
    try { obj.headerWidgets = JSON.parse(row[6]); } catch(e) { obj.headerWidgets = {}; }
    result.push(obj);
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle POST requests - Create, Update, Approve
 */
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Requests');
    var params = JSON.parse(e.postData.contents);
    
    // Action: CREATE (New Request)
    if (params.action === 'create') {
      sheet.appendRow([
        params.id,
        params.user,
        params.type,
        params.status,
        new Date().toISOString(),
        JSON.stringify(params.widgets || []),
        JSON.stringify(params.headerWidgets || {})
      ]);
      return ContentService.createTextOutput(JSON.stringify({ "result": "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Action: UPDATE_STATUS (Simple status update)
    if (params.action === 'update_status') {
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (data[i][0].toString() === params.id.toString()) {
          sheet.getRange(i + 1, 4).setValue(params.status);
          return ContentService.createTextOutput(JSON.stringify({ "result": "updated" }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ "result": "not_found" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Action: APPROVE (Triggers widget creation automation)
    if (params.action === 'approve') {
      return handleApprove(params, sheet);
    }

    // Action: FETCH_PRODUCTS (Product lookup)
    if (params.action === 'fetch_products') {
      return handleFetchProducts(params);
    }

    // Action: UPLOAD_MEDIA (Upload file to Google Drive)
    if (params.action === 'uploadMedia') {
      return handleUploadMedia(params);
    }

    return ContentService.createTextOutput(JSON.stringify({ "result": "unknown_action" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      "result": "error", 
      "message": error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle APPROVE - Create widgets via backend API
 */
function handleApprove(params, sheet) {
  try {
    console.log('=== APPROVAL AUTOMATION STARTED ===');
    
    // Using fresh session from COOKIE_STRING
    var csrfToken = extractCsrf(COOKIE_STRING);
    var baseHeaders = {
      "Cookie": COOKIE_STRING,
      "x-csrftoken": csrfToken,
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Origin": BASE_URL,
      "Referer": BASE_URL + "/"
    };
    
    var results = [];
    
    // Process each widget
    if (params.widgets && params.widgets.length > 0) {
      for (var i = 0; i < params.widgets.length; i++) {
        var widget = params.widgets[i];
        console.log('Processing widget ' + (i+1) + ':', widget.type);
        
        try {
          if (widget.type === 'Single Product Row Optimize') {
            console.log("Routing to Optimized Logic...");
            var result = createSPROptimizedWidget(widget, baseHeaders);
            results.push({ widget: widget.title, status: 'success', slug: result });
          } else if (widget.type === 'Single Product Row') {
            console.log("Routing to Standard Logic...");
            var result = createSPRStandardWidget(widget, baseHeaders);
            results.push({ widget: widget.title, status: 'success', slug: result });
          } else if (widget.type === 'Banner With Product Listing') {
            console.log("Routing to Banner PLP Logic (Using CLP)...");
            var result = createCLPWidget(widget, baseHeaders);
            results.push({ widget: widget.title, status: 'success', slug: result });
          } else if (widget.type === 'Primary Masthead') {
            console.log("Routing to Primary Masthead Logic...");
            var result = createPrimaryMastheadFromApproval(widget, baseHeaders);
            results.push({ widget: widget.title, status: 'success', slug: result });
          } else {
            results.push({ widget: widget.title, status: 'skipped', reason: 'Type not supported' });
          }
        } catch (widgetError) {
          console.error('Widget creation failed:', widgetError);
          results.push({ widget: widget.title, status: 'failed', error: widgetError.toString() });
        }
      }
    }
    
    // =======================================
    // PROCESS HEADER WIDGETS (Primary Masthead, Secondary Masthead)
    // =======================================
    if (params.headerWidgets) {
      console.log('Processing header widgets...');
      
      // Process Primary Masthead
      if (params.headerWidgets.primaryMasthead && params.headerWidgets.primaryMasthead.enabled !== false) {
        var pmWidget = params.headerWidgets.primaryMasthead;
        console.log('Processing Primary Masthead:', pmWidget.slug_name);
        
        try {
          var result = createPrimaryMastheadFromApproval(pmWidget, baseHeaders);
          results.push({ widget: 'Primary Masthead', status: 'success', slug: result });
        } catch (pmError) {
          console.error('Primary Masthead creation failed:', pmError);
          results.push({ widget: 'Primary Masthead', status: 'failed', error: pmError.toString() });
        }
      }
      
      // Process Secondary Masthead (if enabled)
      if (params.headerWidgets.secondaryMasthead && params.headerWidgets.secondaryMasthead.enabled === true) {
        var smWidget = params.headerWidgets.secondaryMasthead;
        console.log('Processing Secondary Masthead:', smWidget.slug_name);
        
        try {
          // Secondary Masthead uses different creation function
          var result = createSecondaryMastheadFromApproval(smWidget, baseHeaders);
          results.push({ widget: 'Secondary Masthead', status: 'success', slug: result });
        } catch (smError) {
          console.error('Secondary Masthead creation failed:', smError);
          results.push({ widget: 'Secondary Masthead', status: 'failed', error: smError.toString() });
        }
      }

      // Process Category Masthead (if enabled)
      if (params.headerWidgets.categoryMasthead && params.headerWidgets.categoryMasthead.enabled === true) {
        var cmWidget = params.headerWidgets.categoryMasthead;
        console.log('Processing Category Masthead:', cmWidget.slug_name);
        
        try {
          // New Category Grid logic
          var result = createCategoryGridFromApproval(cmWidget, baseHeaders);
          results.push({ widget: 'Category Masthead', status: 'success', slug: result });
        } catch (cmError) {
          console.error('Category Masthead creation failed:', cmError);
          results.push({ widget: 'Category Masthead', status: 'failed', error: cmError.toString() });
        }
      }
    }
    
    // Update status in sheet
    if (params.id) {
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (data[i][0].toString() === params.id.toString()) {
          sheet.getRange(i + 1, 4).setValue('APPROVED');
          break;
        }
      }
    }
    
    console.log('=== APPROVAL AUTOMATION COMPLETED ===');
    console.log('Results:', JSON.stringify(results));
    
    // Check if any widget failed
    var failedWidgets = results.filter(function(r) { return r.status === 'failed'; });
    var hasFailures = failedWidgets.length > 0;
    
    if (hasFailures) {
      return ContentService.createTextOutput(JSON.stringify({ 
        success: false,
        message: failedWidgets.length + ' widget(s) failed to create',
        results: results,
        errors: failedWidgets
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      message: 'All widgets created successfully',
      results: results
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error('Approval automation failed:', error);
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle product fetch
 */
function handleFetchProducts(params) {
  var requestedCodes = params.item_codes || [];
  if (requestedCodes.length === 0) {
    return ContentService.createTextOutput(JSON.stringify({ success: true, products: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // User's Master Sheet
  var catalogUrl = "https://docs.google.com/spreadsheets/d/1h_y6sQ075NMeEWRxBCrF5H6ZHQLv5q1yy_6qrs-hBcw/edit";
  var products = [];
  
  try {
    var ss = SpreadsheetApp.openByUrl(catalogUrl);
    var sheet = ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();
    
    if (data.length < 2) {
      return ContentService.createTextOutput(JSON.stringify({ success: true, products: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Normalize Headers
    var headers = data[0].map(function(h) { return h.toString().toLowerCase().trim().replace(/_/g, ' '); });
    
    // Find key columns
    var idxCode = headers.indexOf('item code');
    if (idxCode === -1) idxCode = 1;
    
    var idxName = headers.indexOf('display name');
    if (idxName === -1) idxName = headers.indexOf('name');
    
    var idxPrice = headers.indexOf('price');
    var idxMrp = headers.indexOf('mrp');
    
    var idxImage = headers.indexOf('main image');
    if (idxImage === -1) idxImage = headers.indexOf('image');

    // Loop data
    for (var i = 1; i < data.length; i++) {
       var row = data[i];
       var code = row[idxCode] ? row[idxCode].toString().trim() : "";
       
       if (code && requestedCodes.map(String).indexOf(code) > -1) {
           var pName = (idxName > -1) ? row[idxName] : "";
           var pPrice = (idxPrice > -1) ? row[idxPrice] : "";
           var pMrp = (idxMrp > -1) ? row[idxMrp] : "";
           var pImage = (idxImage > -1) ? row[idxImage] : "";
           
           products.push({
               itemCode: code,
               name: pName,
               price: pPrice,
               mrp: pMrp,
               image: pImage,
               display_name: pName,
               main_image: pImage
           });
       }
    }
  } catch(e) {
      console.error("Catalog Fetch Error: " + e.toString());
      return ContentService.createTextOutput(JSON.stringify({ 
        success: false, 
        error: e.toString(),
        products: []
      })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ 
    success: true, 
    products: products 
  })).setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// UTILITIES
// ==========================================

function extractCsrf(cookieString) {
  var match = cookieString.match(/csrftoken=([^;]+)/);
  return match ? match[1] : "dummy_token";
}

function sanitizeSlug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').substring(0, 50);
}

function callApiWithRetry(url, payload, baseHeaders, type) {
  var maxRetries = 5;
  var originalSlug = payload["slug_name"];
  
  if (url.indexOf("mapping") > -1) {
    var options = { "method": "post", "headers": baseHeaders, "payload": payload, "muteHttpExceptions": true };
    var response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) return "Mapped";
    var mapErr = response.getContentText();
    console.error("Mapping Error Body: " + mapErr);
    throw new Error("Mapping failed (" + response.getResponseCode() + "): " + mapErr);
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
  throw new Error("Max retries reached");
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

function getDates() {
  var now = new Date();
  var nextYear = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  return { start: formatDate(now), end: formatDate(nextYear) };
}

function formatDate(d) {
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' +
    ('0' + d.getDate()).slice(-2) + ' ' + ('0' + d.getHours()).slice(-2) + ':' +
    ('0' + d.getMinutes()).slice(-2) + ':00';
}

function createCsv(type, value) {
  return Utilities.newBlob(type + "\n" + value + "\n", 'text/csv', 'mapping.csv');
}

// ==========================================
// TEST FUNCTION FOR AUTHORIZATION
// ==========================================

/**
 * Simple test function to trigger UrlFetchApp authorization
 * Run this once to authorize external requests
 */
function testExternalRequest() {
  var response = UrlFetchApp.fetch('https://www.google.com');
  Logger.log('✅ Authorization successful!');
  Logger.log('Status: ' + response.getResponseCode());
  return 'Authorization granted! You can now use loginToSamaan.';
}

// ==========================================
// GOOGLE DRIVE MEDIA UPLOAD
// ==========================================

/**
 * Handle media upload to Google Drive
 * Expects base64 encoded file data
 */
function handleUploadMedia(params) {
  try {
    console.log('[DriveUpload] Starting upload for:', params.fileName);
    
    // Validate required params
    if (!params.fileData || !params.fileName || !params.mimeType) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Missing required fields: fileData, fileName, mimeType'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Your Google Drive folder ID
    var DRIVE_FOLDER_ID = '1sSv358Psa57WaA6KKY84TQf4LQFvL19N';
    
    // Decode base64 file data
    var fileData = Utilities.base64Decode(params.fileData);
    var blob = Utilities.newBlob(fileData, params.mimeType, params.fileName);
    
    // Get the folder
    var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    
    // Create file with unique name (add timestamp)
    var timestamp = new Date().getTime();
    var uniqueName = timestamp + '_' + params.fileName;
    var file = folder.createFile(blob);
    file.setName(uniqueName);
    
    // Make file publicly viewable
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    var fileId = file.getId();
    
    // Create direct embeddable URL (lh3 format works without CORS issues)
    // Alternative formats tried:
    // - drive.google.com/uc?export=view - has CORS issues
    // - drive.google.com/thumbnail?id=xxx&sz=w1000 - works but lower quality
    // - lh3.googleusercontent.com/d/xxx - works well for embedding
    var viewUrl = 'https://lh3.googleusercontent.com/d/' + fileId;
    var downloadUrl = 'https://drive.google.com/uc?export=download&id=' + fileId;
    var thumbnailUrl = 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1000';
    
    console.log('[DriveUpload] File uploaded successfully:', uniqueName);
    console.log('[DriveUpload] View URL:', viewUrl);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      fileId: fileId,
      fileName: uniqueName,
      viewUrl: viewUrl,
      thumbnailUrl: thumbnailUrl,
      downloadUrl: downloadUrl
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error('[DriveUpload] Error:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
