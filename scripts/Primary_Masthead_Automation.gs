/**
 * PRIMARY MASTHEAD AUTOMATION SCRIPT - CREATE NEW WIDGETS
 * 
 * This script creates a Primary Masthead widget via the API.
 * Primary Masthead is a promotional banner linked to a category pane.
 * 
 * Required fields in Google Sheet:
 * - Column A: slug_name (unique identifier, e.g., "test_primary_masthead_1_1")
 * - Column B: master_key (category pane link, OPTIONAL, can be empty)
 * - Column C: background_multimedia (multimedia name reference, e.g., "CATG_1st_Reg")
 * - Column D: start_time (format: YYYY-MM-DD HH:MM:SS)
 * - Column E: end_time (format: YYYY-MM-DD HH:MM:SS)
 */

function createPrimaryMasthead() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  // Skip header row
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const slug_name = row[0];
    const master_key = row[1] || ''; // Can be empty
    const background_multimedia = row[2];
    const start_time = row[3];
    const end_time = row[4];
    
    // Skip empty rows (only slug_name is required)
    if (!slug_name) continue;
    
    try {
      const result = createPrimaryMastheadWidget(
        slug_name,
        master_key,
        background_multimedia,
        start_time,
        end_time
      );
      
      // Log result in column F
      sheet.getRange(i + 1, 6).setValue(result);
      Logger.log(`Row ${i + 1}: ${result}`);
    } catch (error) {
      sheet.getRange(i + 1, 6).setValue(`ERROR: ${error.message}`);
      Logger.log(`Row ${i + 1} Error: ${error.message}`);
    }
    
    // Pause to avoid rate limiting
    Utilities.sleep(500);
  }
}

function createPrimaryMastheadWidget(slug_name, master_key, background_multimedia, start_time, end_time) {
  const API_BASE = 'https://samaan.apnamart.in/api/app/widget/';
  const CSRF_TOKEN = 'YOUR_CSRF_TOKEN_HERE'; // Replace with actual CSRF token
  const SESSION_ID = 'YOUR_SESSION_ID_HERE'; // Replace with actual session ID
  
  // Format dates if provided as Date objects
  const formattedStartTime = formatDateTime(start_time);
  const formattedEndTime = formatDateTime(end_time);
  
  // Create form data boundary
  const boundary = '----WebKitFormBoundary' + Utilities.getUuid().replace(/-/g, '').substring(0, 16);
  
  // Build multipart form data
  let payload = '';
  
  // Add form fields - EXACT ORDER AND FORMAT FROM CURL
  const fields = {
    'slug_name': slug_name,
    'widget_type': 'masthead_primary',
    'description': '',
    'heading': '',
    'master_key': master_key,
    'heading_en': '',
    'heading_hi': '',
    'heading_bg': '',
    'start_time': formattedStartTime,
    'end_time': formattedEndTime,
    'clear_bg_media': '',
    'media_aspect_ratio': '1',
    'view_all_action_name': '',
    'background_multimedia': background_multimedia || '',
    'filter_dict': '{}',
    'app_configurations': '{}'
  };
  
  for (const [key, value] of Object.entries(fields)) {
    payload += `--${boundary}\r\n`;
    payload += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
    payload += `${value}\r\n`;
  }
  
  payload += `--${boundary}--\r\n`;
  
  // Make API request (POST to create new widget)
  const options = {
    method: 'post',
    contentType: `multipart/form-data; boundary=${boundary}`,
    headers: {
      'X-CSRFToken': CSRF_TOKEN,
      'Cookie': `csrftoken=${CSRF_TOKEN}; sessionid=${SESSION_ID}`
    },
    payload: payload,
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(API_BASE, options);
  const responseCode = response.getResponseCode();
  const responseText = response.getContentText();
  
  if (responseCode === 200 || responseCode === 201) {
    const jsonResponse = JSON.parse(responseText);
    return `SUCCESS: Widget ID ${jsonResponse.id || 'created'}`;
  } else {
    return `FAILED (${responseCode}): ${responseText}`;
  }
}

function formatDateTime(dateInput) {
  if (!dateInput) return '';
  
  // If it's already a string in correct format, return it
  if (typeof dateInput === 'string') {
    return dateInput;
  }
  
  // If it's a Date object, format it
  if (dateInput instanceof Date) {
    const year = dateInput.getFullYear();
    const month = String(dateInput.getMonth() + 1).padStart(2, '0');
    const day = String(dateInput.getDate()).padStart(2, '0');
    const hours = String(dateInput.getHours()).padStart(2, '0');
    const minutes = String(dateInput.getMinutes()).padStart(2, '0');
    const seconds = String(dateInput.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
  
  return '';
}

/**
 * ==========================================
 * PRIMARY MASTHEAD - APPROVAL FLOW INTEGRATION
 * ==========================================
 * Creates Multimedia (background) FIRST, then Primary Masthead widget
 * Matches pattern from CLP_Automation.gs and SPR_Widget_Optimized.gs
 */
function createPrimaryMastheadFromApproval(widget, baseHeaders) {
  console.log("Creating Primary Masthead widget:", widget.title);
  
  // Generate slug
  var slugBase = widget.slug_name ? sanitizeSlug(widget.slug_name) : sanitizeSlug(widget.title || 'primary_masthead');
  var widgetSlug = slugBase + '_pm_hp';
  var multimediaSlug = slugBase + '_bg';
  
  // Get dates
  var dates = getDates();
  if (widget.end_time) {
    try {
      dates.end = formatDate(new Date(widget.end_time));
    } catch (e) {
      console.error("Invalid End Time format, using default 1 year", e);
    }
  }
  
  // =======================================
  // STEP 1: Create Multimedia (Background)
  // =======================================
  var multimediaConfig = widget.multimedia || {};
  
  // Only create multimedia if there's config data
  if (multimediaConfig && (multimediaConfig.type || multimediaConfig.transition_color || multimediaConfig.driveFileId)) {
    console.log("Creating multimedia background:", multimediaSlug);
    
    // Determine multimedia_type: 3 = image, 4 = video (based on API)
    var multimediaTypeValue = "3"; // default to image
    if (multimediaConfig.type === "video") {
      multimediaTypeValue = "4";
    }
    
    // Build payload matching exact curl format
    var multimediaPayload = {
      "name": multimediaSlug,  // API uses 'name' not 'slug_name'
      "multimedia_type": multimediaTypeValue,  // Numeric: 3=image, 4=video
      "background_color": "",  // Usually empty
      "aspect_ratio": multimediaConfig.aspect_ratio || "1",
      "transition_color": multimediaConfig.transition_color || "#FFFFFF",
      "accent_color": multimediaConfig.accent_color || "#0000FF",
      "text_color": multimediaConfig.text_color || "",
      "icon_bg_color": multimediaConfig.icon_bg_color || "#F0F0F0",
      "is_multimedia_dark": multimediaConfig.is_dark ? "true" : "false"
    };

    // FETCH FILE FROM DRIVE if available
    if (multimediaConfig.driveFileId) {
      try {
        console.log("Fetching file from Drive ID:", multimediaConfig.driveFileId);
        var file = DriveApp.getFileById(multimediaConfig.driveFileId);
        var blob = file.getBlob();
        
        // API uses 'file_en' for the file field
        multimediaPayload["file_en"] = blob;
        
        console.log("File fetched and added to payload. Size:", blob.getBytes().length, "bytes, Name:", blob.getName());
      } catch (driveError) {
        console.error("Failed to fetch file from Drive:", driveError);
        // Continue anyway - API might accept without file
      }
    }
    
    console.log("Multimedia payload keys:", Object.keys(multimediaPayload));
    console.log("Multimedia type:", multimediaTypeValue, "Name:", multimediaSlug);
    
    try {
      callApiWithRetry(BASE_URL + "/api/app/multimedia/", multimediaPayload, baseHeaders, "multipart");
      console.log("Multimedia created successfully:", multimediaSlug);
    } catch (e) {
      console.error("Multimedia creation failed:", e.toString());
      // If it failed, we can't really link it. But we'll try to proceed.
    }
  } else {
    console.log("No multimedia config provided, skipping multimedia creation");
    multimediaSlug = widget.background_multimedia_slug || "";
  }
  
  // =======================================
  // STEP 2: Create Primary Masthead Widget
  // =======================================
  var payload = {
    "slug_name": widgetSlug,
    "widget_type": "masthead_primary",
    "description": "",
    "heading": "",
    "master_key": widget.master_key || "",  // Category pane widget reference
    "heading_en": "",
    "heading_hi": "",
    "heading_bg": "",
    "start_time": dates.start,
    "end_time": dates.end,
    "clear_bg_media": "",
    "media_aspect_ratio": "1",
    "view_all_action_name": "",
    "background_multimedia": multimediaSlug,  // Link to multimedia we just created
    "filter_dict": "{}",
    "app_configurations": "{}"
  };
  
  console.log("Primary Masthead payload:", JSON.stringify(payload));
  
  // Create widget
  callApiWithRetry(BASE_URL + "/api/app/widget/", payload, baseHeaders, "multipart");
  
  console.log("Primary Masthead created successfully: " + widgetSlug);
  return widgetSlug;
}
