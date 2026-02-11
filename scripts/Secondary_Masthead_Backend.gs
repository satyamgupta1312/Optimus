/**
 * ==========================================
 * SECONDARY MASTHEAD - FULL AUTOMATION
 * ==========================================
 * Creates:
 * 1. Multimedia (background)
 * 2. Secondary Masthead Widget
 * 3. For each carousel item:
 *    - Page Layout (category page)
 *    - Product Listing Widget
 *    - Sub-Category Items (with state mappings)
 *    - Carousel Item
 */

function createSecondaryMastheadFromApproval(widget, baseHeaders) {
  console.log("=== CREATING SECONDARY MASTHEAD: " + (widget.title || widget.slug_name) + " ===");
  
  var slugBase = widget.slug_name ? sanitizeSlug(widget.slug_name) : sanitizeSlug(widget.title || 'secondary_masthead');
  var widgetSlug = slugBase + '_sm_hp';
  var multimediaSlug = slugBase + '_bg';
  
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
  
  if (multimediaConfig.driveFileId) {
    console.log("Creating multimedia background:", multimediaSlug);
    
    var multimediaTypeValue = (multimediaConfig.type === "video") ? "4" : "3";
    
    var multimediaPayload = {
      "name": multimediaSlug,
      "multimedia_type": multimediaTypeValue,
      "background_color": "",
      "aspect_ratio": multimediaConfig.aspect_ratio || widget.aspectRatio || "4",
      "transition_color": "#FFFFFF",
      "accent_color": "#0277FA",
      "text_color": "",
      "icon_bg_color": "#F0F0F0",
      "is_multimedia_dark": "false"
    };

    if (multimediaConfig.driveFileId) {
      try {
        console.log("Fetching file from Drive ID:", multimediaConfig.driveFileId);
        var file = DriveApp.getFileById(multimediaConfig.driveFileId);
        var blob = file.getBlob();
        multimediaPayload["file_en"] = blob;
        console.log("File fetched. Size:", blob.getBytes().length, "bytes");
      } catch (driveError) {
        console.error("Failed to fetch file from Drive:", driveError);
        throw new Error("Drive file not accessible: " + driveError.toString());
      }
    }
    
    try {
      callApiWithRetry(BASE_URL + "/api/app/multimedia/", multimediaPayload, baseHeaders, "multipart");
      console.log("✅ Multimedia created:", multimediaSlug);
    } catch (e) {
      console.error("Multimedia creation failed:", e.toString());
      throw new Error("Failed to create multimedia: " + e.toString());
    }
  } else {
    console.log("No multimedia driveFileId provided");
    multimediaSlug = widget.background || "";
  }
  
  // =======================================
  // STEP 2:Create Secondary Masthead Widget
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
    "filter_dict": "{}",
    "app_configurations": "{}"
  };
  
  // Only include background_multimedia if we have a valid slug
  // API rejects empty string with "Background Multimedia Name is invalid"
  if (multimediaSlug) {
    payload["background_multimedia"] = multimediaSlug;
  }
  
  console.log("Creating Secondary Masthead widget:", widgetSlug);
  
  try {
    callApiWithRetry(BASE_URL +"/api/app/widget/", payload, baseHeaders, "multipart");
    console.log("✅ Secondary Masthead created:", widgetSlug);
  } catch (e) {
    console.error("Widget creation failed:", e.toString());
    throw new Error("Failed to create widget: " + e.toString());
  }
  
  // =======================================
  // STEP 3: Process Carousel Items
  // =======================================
  var carouselItems = widget.items || [];
  console.log("Processing " + carouselItems.length + " carousel items...");
  
  var carouselItemSlugs = [];
  
  for (var i = 0; i < carouselItems.length; i++) {
    console.log("\n--- Processing Carousel Item " + (i + 1) + " ---");
    var item = carouselItems[i];
    var itemSlug = slugBase + '_item_' + (i + 1);
    
    try {
      var result = createCarouselItemFull(item, itemSlug, widgetSlug, dates, baseHeaders);
      carouselItemSlugs.push(result.carouselSlug);
      console.log("✅ Carousel item " + (i + 1) + " completed");
    } catch (itemError) {
      console.error("Failed to create carousel item " + (i + 1) + ":", itemError);
      throw new Error("Carousel item " + (i + 1) + " failed: " + itemError.toString());
    }
  }
  
  // =======================================
  // STEP 4: Map Carousel Items to Widget
  // =======================================
  if (carouselItemSlugs.length > 0) {
    console.log("\nMapping " + carouselItemSlugs.length + " carousel items to widget...");
    try {
      var mappingCsv = "widget_item_slug_name,level_tag,level_property,priority,cohort\n";
      for (var i = 0; i < carouselItemSlugs.length; i++) {
        mappingCsv += carouselItemSlugs[i] + ",global,global," + (i + 1) + ",\n";
      }
      
      var mappingPayload = {
        "widget_slug": widgetSlug,
        "mapping_file": Utilities.newBlob(mappingCsv, 'text/csv', 'mapping.csv')
      };
      
      callApiWithRetry(BASE_URL + "/api/app/update_widget_widget_item_mapping/", mappingPayload, baseHeaders, "multipart");
      console.log("✅ Carousel items mapped to widget");
    } catch (mapError) {
      console.error("Failed to map carousel items:", mapError);
      // Don't throw - items are created, just not mapped
    }
  }
  
  console.log("=== SECONDARY MASTHEAD_COMPLETED: " + widgetSlug + " ===");
  return widgetSlug;
}

/**
 * Create complete carousel item ecosystem:
 * - Page Layout
 * - Product Listing Widget
 * - Sub-Categories
 * - Carousel Item
 */
function createCarouselItemFull(item, itemSlug, mastheadSlug, dates, baseHeaders) {
  // Default heading if not provided
  var heading = item.categoryPage?.heading || item.text || "Test Category";
  var pageLayoutSlug = itemSlug + '_page';
  var plpWidgetSlug = itemSlug + '_plp';
  var carouselSlug = itemSlug + '_carousel';
  
  console.log("  Creating Page Layout:", pageLayoutSlug);
  console.log(item.image)
  
  // =======================================
  // Step A: Create Page Layout
  // =======================================
  var pageLayoutPayload = {
    "slug_name": pageLayoutSlug,
    "page_type": "category_page",
    "page_heading": heading,
    "page_layout_type": "2"
  };
  
  try {
    callApiWithRetry(BASE_URL + "/api/app/post_page_layout/", pageLayoutPayload, baseHeaders, "json");
    console.log("  ✅ Page Layout created:", pageLayoutSlug);
  } catch (e) {
    console.error("  Page Layout creation failed:", e);
    throw new Error("Page Layout failed: " + e.toString());
  }
  
  // =======================================
  // Step B: Create Product Listing Widget
  // =======================================
  console.log("  Creating Product Listing Widget:", plpWidgetSlug);
  
  var plpPayload = {
    "slug_name": plpWidgetSlug,
    "widget_type": "product_listing",
    "description": "",
    "heading": "",
    "master_key": "",
    "heading_en": "",
    "heading_hi": "",
    "heading_bg": "",
    "start_time": dates.start,
    "end_time": dates.end,
    "clear_bg_media": "",
    "media_aspect_ratio": "1",
    "view_all_action_name": "",
    "background_multimedia": "",
    "filter_dict": "{}",
    "app_configurations": JSON.stringify({
      "show_sub_cat": true
    }),
    "configurations": "{}",
    "deactivated_flag": "no"
  };
  
  try {
    callApiWithRetry(BASE_URL + "/api/app/widget/", plpPayload, baseHeaders, "multipart");
    console.log("  ✅ PLP Widget created:", plpWidgetSlug);
  } catch (e) {
    console.error("  PLP Widget creation failed:", e);
    throw new Error("PLP Widget failed: " + e.toString());
  }
  
  // =======================================
  // Step C: Map PLP Widget to Page Layout
  // =======================================
  console.log("  Mapping PLP to Page Layout...");
  
  try {
    var layoutWidgetCsv = "widget_slug_name,level_tag,level_property,priority,cohort\n";
    layoutWidgetCsv += plpWidgetSlug + ",global,global,1,\n";
    
    var layoutMappingPayload = {
      "page_layout_slug": pageLayoutSlug,
      "mapping_file": Utilities.newBlob(layoutWidgetCsv, 'text/csv', 'mapping.csv')
    };
    
    callApiWithRetry(BASE_URL + "/api/app/update_layout_widget_mapping/", layoutMappingPayload, baseHeaders, "multipart");
    console.log("  ✅ PLP mapped to Page Layout");
  } catch (e) {
    console.error("  PLP mapping failed:", e);
    // Continue - widget is created
  }
  
  // =======================================
  // Step C2: Map Page Layout to Global
  // =======================================
  console.log("  Mapping Page Layout to Global...");
  
  try {
    var pageToLayoutCsv = "level_tag,level_property\nglobal,global";
    
    var pageLayoutMappingPayload = {
      "page_type": "",
      "page_layout_slug": pageLayoutSlug,
      "mapping_file": Utilities.newBlob(pageToLayoutCsv, 'text/csv', 'mapping.csv')
    };
    
    callApiWithRetry(BASE_URL + "/api/app/update_page_page_layout_mapping/", pageLayoutMappingPayload, baseHeaders, "multipart");
    console.log("  ✅ Page Layout mapped to Global");
  } catch (e) {
    console.error("  Page Layout global mapping failed:", e);
    // Continue - page is created
  }
  
  // =======================================
  // Step D: Create Sub-Categories (State-Specific)
  // =======================================
  var subCategories = item.subCategories || [];
  console.log("  Creating sub-categories for " + subCategories.length + " items (State-Specific)...");
  
  // Store created slugs with their mapping info: {slug: "...", tag: "...", prop: "..."}
  var subCatMappings = [];
  
  for (var j = 0; j < subCategories.length; j++) {
    var subCat = subCategories[j];
    // products object keys: global, jh, cg, wb (lowercase in payload usually, but let's handle case)
    var products = subCat.products || {};
    
    // Define states to check. Key matches the frontend 'products' keys.
    // Level Tag/Prop logic:
    // Global -> tag: global, prop: global
    // JH -> tag: state, prop: jharkhand (slug uses suffix: jh)
    // CG -> tag: state, prop: chhattisgarh
    // WB -> tag: state, prop: west bengal
    var statesToCheck = [
      { key: 'global', tag: 'global', suffix: 'global', prop: 'global' },
      { key: 'JH',     tag: 'state',  suffix: 'jh',     prop: 'jharkhand' },
      { key: 'CG',     tag: 'state',  suffix: 'cg',     prop: 'chhattisgarh' },
      { key: 'WB',     tag: 'state',  suffix: 'wb',     prop: 'west bengal' }
    ];
    // Helper to avoid duplicates if frontend sends mixed case
    var processedStates = {}; 

    for (var s = 0; s < statesToCheck.length; s++) {
      var stateObj = statesToCheck[s];
      var rawProductStr = products[stateObj.key] || "";
      console.log("    Checking state: " + stateObj.key + ", rawProductStr: '" + rawProductStr + "'");
      
      // key for deduplication (e.g. 'jh' and 'JH' are same target)
      var dedupKey = stateObj.prop.toLowerCase(); 
      if (processedStates[dedupKey]) {
        console.log("    Skipping duplicate state: " + dedupKey);
        continue;
      }

      if (rawProductStr && rawProductStr.trim().length > 0) {
        processedStates[dedupKey] = true;
        
        // Prepare products (handle both space and comma separation)
        var productList = rawProductStr.split(/[,\s]+/).filter(function(c) { return c && c.trim(); });
        console.log("    Found " + productList.length + " products for " + stateObj.key);
        
        var productListStr = productList.join(',');
        var productCodesArray = productList.map(function(c) { return parseInt(c.trim(), 10); }).filter(function(n) { return !isNaN(n); });

        if (productList.length === 0) {
           console.log("    Skipping empty product list for " + stateObj.key);
           continue;
        }

        // Generate slug: itemSlug + '_subcat_' + (index) + '_' + suffix
        var subCatSlug = itemSlug + '_subcat_' + (j + 1) + '_' + stateObj.suffix;
        var subCatName = subCat.name || "Test";
        
        console.log("    Creating sub-category " + (j + 1) + " [" + stateObj.prop + "]:", subCatName);

        // Payload construction
        try {
          // Default sample image for sub-categories
          var defaultSampleImage = "https://gs.apnamart.in/dynamic_widget_items/widget_items_None/download_1.png";
          
          var subCatPayload = {
            "widget_item_id": "undefined",
            "deactivated_flag": "no",
            "item_click_action": "null",
            "slug_name": subCatSlug,
            "slave_key": "",
            "item_type": "sub_category",
            "media": "",
            "text_en": subCatName,
            "media_en": subCat.image || defaultSampleImage, // Default to URL/sample
            "text_hi": subCat.nameHi || subCatName,
            "media_hi": "",
            "text_bg": "",
            "media_bg": "",
            "product_list": productListStr,
            "filters": "[]",
            "filter_lst": JSON.stringify([{"condition":"in_stk_item_codes","value":productCodesArray}]),
            "property_lst": "[]",
            "pl_edit": "PL",
            "is_clickable": "yes",
            "update_product_list": "no",
            "start_time": dates.start,
            "end_time": dates.end,
            "background_multimedia": "",
            "image_multimedia": "",
            "secondary_image_multimedia": "",
            "progress_bar": "",
            "offer_id": "",
            "click_action_params": "{}"
          };
          
          // If driveFileId exists, fetch blob and override media_en
          if (subCat.driveFileId) {
            try {
              // We only need to fetch this once really, but typically DriveApp cache is fine.
              // Or we could fetch it outside this loop. For simplicity, keeping it here.
              var scFile = DriveApp.getFileById(subCat.driveFileId);
              subCatPayload["media_en"] = scFile.getBlob();
            } catch (e) {
              console.error("    Failed to fetch sub-category drive file:", e);
            }
          }
          
          callApiWithRetry(BASE_URL + "/api/app/post_widget_item/", subCatPayload, baseHeaders, "multipart");
          console.log("    ✅ Sub-category created:", subCatSlug);
          
          // Add to mapping list
          subCatMappings.push({
            slug: subCatSlug,
            tag: stateObj.tag,
            prop: stateObj.prop,
            priority: (j + 1) // Keep priority based on user order
          });

        } catch (subErr) {
          console.error("    Sub-category " + (j + 1) + " [" + stateObj.prop + "] failed:", subErr);
        }
      }
    }
  }
  
  // =======================================
  // Step E: Map Sub-Categories to PLP
  // =======================================
  if (subCatMappings.length > 0) {
    console.log("  Mapping " + subCatMappings.length + " sub-categories to PLP...");
    
    try {
      var subCatCsv = "widget_item_slug_name,level_tag,level_property,priority,cohort\n";
      for (var k = 0; k < subCatMappings.length; k++) {
        var mapItem = subCatMappings[k];
        subCatCsv += mapItem.slug + "," + mapItem.tag + "," + mapItem.prop + "," + mapItem.priority + ",\n";
      }
      
      var subCatMappingPayload = {
        "widget_slug": plpWidgetSlug,
        "mapping_file": Utilities.newBlob(subCatCsv, 'text/csv', 'mapping.csv')
      };
      
      callApiWithRetry(BASE_URL + "/api/app/update_widget_widget_item_mapping/", subCatMappingPayload, baseHeaders, "multipart");
      console.log("  ✅ Sub-categories mapped to PLP");
    } catch (mapErr) {
      console.error("  Sub-category mapping failed:", mapErr);
    }
  }
  
  // =======================================
  // Step F: Create Carousel Item
  // =======================================
  console.log("  Creating Carousel Item:", carouselSlug);
  
  // Default sample image for carousel items
  var defaultCarouselImage = "https://gs.apnamart.in/dynamic_widget_items/widget_items_None/download_1.png";
  
  var carouselPayload = {
    "widget_item_id": "undefined",
    "deactivated_flag": "no",
    "item_click_action": "redirect-to-page",
    "slug_name": carouselSlug,
    "slave_key": "",
    "item_type": "carousel",
    "media": "",
    "text_en": "",
    "media_en": item.image || defaultCarouselImage, // Default to URL/sample
    "text_hi": "",
    "media_hi": "",
    "text_bg": "",
    "media_bg": "",
    "product_list": "",
    "filters": "[]",
    "filter_lst": "[]",
    "property_lst": "[]",
    "pl_edit": "PL",
    "is_clickable": "yes",
    "update_product_list": "no",
    "start_time": dates.start,
    "end_time": dates.end,
    "background_multimedia": "",
    "image_multimedia": "",
    "secondary_image_multimedia": "",
    "progress_bar": "",
    "offer_id": "",
    "click_action_params": JSON.stringify({
      "page_type": "category_page",
      "page_layout_slug_name": pageLayoutSlug
    })
  };
  
  // If driveFileId exists, fetch blob and override media_en
  if (item.driveFileId) {
    try {
      console.log("  Fetching carousel image from Drive:", item.driveFileId);
      var cFile = DriveApp.getFileById(item.driveFileId);
      carouselPayload["media_en"] = cFile.getBlob();
    } catch (e) {
      console.error("  Failed to fetch carousel drive file:", e);
      // Fallback is already set in payload definition
    }
  }
  
  try {
    callApiWithRetry(BASE_URL + "/api/app/post_widget_item/", carouselPayload, baseHeaders, "multipart");
    console.log("  ✅ Carousel item created:", carouselSlug);
  } catch (carErr) {
    console.error("  Carousel item creation failed:", carErr);
    throw new Error("Carousel item failed: " + carErr.toString());
  }
  
  return {
    carouselSlug: carouselSlug,
    pageLayoutSlug: pageLayoutSlug,
    plpWidgetSlug: plpWidgetSlug
  };
}
