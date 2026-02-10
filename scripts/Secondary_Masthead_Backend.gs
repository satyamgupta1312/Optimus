/**
 * ==========================================
 * SECONDARY MASTHEAD - APPROVAL FLOW INTEGRATION
 * ==========================================
 * Creates Multimedia (background) FIRST, then Secondary Masthead widget
 * Simplified version without color pickers - just image/video with auto aspect ratio
 */
function createSecondaryMastheadFromApproval(widget, baseHeaders) {
  console.log("Creating Secondary Masthead widget:", widget.title);
  
  // Generate slug
  var slugBase = widget.slug_name ? sanitizeSlug(widget.slug_name) : sanitizeSlug(widget.title || 'secondary_masthead');
  var widgetSlug = slugBase + '_sm_hp';
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
  
  // Only create multimedia if there's a driveFileId
  if (multimediaConfig.driveFileId) {
    console.log("Creating multimedia background:", multimediaSlug);
    
    // Determine multimedia_type: 3 = image, 4 = video
    var multimediaTypeValue = "3"; // default to image
    if (multimediaConfig.type === "video") {
      multimediaTypeValue = "4";
    }
    
    // Build simplified payload (no accent colors, etc.)
    var multimediaPayload = {
      "name": multimediaSlug,
      "multimedia_type": multimediaTypeValue,
      "background_color": "",
      "aspect_ratio": multimediaConfig.aspect_ratio || widget.aspectRatio || "4",
      "transition_color": "#FFFFFF",  // Default white
      "accent_color": "#0277FA",  // Default blue
      "text_color": "",
      "icon_bg_color": "#F0F0F0",
      "is_multimedia_dark": "false"
    };

    // FETCH FILE FROM DRIVE
    if (multimediaConfig.driveFileId) {
      try {
        console.log("Fetching file from Drive ID:", multimediaConfig.driveFileId);
        var file = DriveApp.getFileById(multimediaConfig.driveFileId);
        var blob = file.getBlob();
        
        multimediaPayload["file_en"] = blob;
        
        console.log("File fetched. Size:", blob.getBytes().length, "bytes, Name:", blob.getName());
      } catch (driveError) {
        console.error("Failed to fetch file from Drive:", driveError);
        throw new Error("Drive file not accessible: " + driveError.toString());
      }
    }
    
    console.log("Multimedia payload created for:", multimediaSlug);
    
    try {
      callApiWithRetry(BASE_URL + "/api/app/multimedia/", multimediaPayload, baseHeaders, "multipart");
      console.log("Multimedia created successfully:", multimediaSlug);
    } catch (e) {
      console.error("Multimedia creation failed:", e.toString());
      throw new Error("Failed to create multimedia: " + e.toString());
    }
  } else {
    console.log("No multimedia driveFileId provided, using background URL/color fallback");
    multimediaSlug = widget.background || "";
  }
  
  // =======================================
  // STEP 2: Create Secondary Masthead Widget
  // =======================================
  var payload = {
    "slug_name": widgetSlug,
    "widget_type": "masthead_secondary_category_hp",
    "description": "",
    "heading": "",
    "master_key": widget.master_key || "",
    "heading_en": "",
    "heading_hi": "",
    "heading_bg": "",
    "start_time": dates.start,
    "end_time": dates.end,
    "clear_bg_media": "",
    "media_aspect_ratio": multimediaConfig.aspect_ratio || widget.aspectRatio || "4",
    "view_all_action_name": "",
    "background_multimedia": multimediaSlug,  // Link to multimedia we just created
    "filter_dict": "{}",
    "app_configurations": "{}"
  };
  
  console.log("Secondary Masthead payload:", JSON.stringify(payload));
  
  // Create widget
  callApiWithRetry(BASE_URL + "/api/app/widget/", payload, baseHeaders, "multipart");
  
  console.log("Secondary Masthead created successfully: " + widgetSlug);
  return widgetSlug;
}
