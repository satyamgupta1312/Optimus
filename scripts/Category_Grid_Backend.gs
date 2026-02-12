/**
 * ==========================================
 * CATEGORY GRID - FULL AUTOMATION
 * ==========================================
 * Creates:
 * 1. Multimedia (background - optional)
 * 2. Category Masthead Widget
 * 3. For each category item:
 *    - Page Layout (category page)
 *    - Product Listing Widget
 *    - Sub-Category Items (with state mappings)
 *    - Category Widget Item
 */

function createCategoryGridFromApproval(widget, baseHeaders) {
  console.log("=== CREATING CATEGORY GRID: " + (widget.title || widget.slug_name) + " ===");
  
  var slugBase = widget.slug_name ? sanitizeSlug(widget.slug_name) : sanitizeSlug(widget.title || 'category_masthead');
  var widgetSlug = slugBase + '_cm_hp'; // Category Masthead Home Page
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
  // STEP 2: Create Category Widget
  // =======================================
  var payload = {
    "slug_name": widgetSlug,
    "widget_type": "category", // Per user cURL
    "description": "",
    "heading": "",
    "master_key": widget.master_key || "",
    "heading_en": widget.heading_en || "", // Use heading if provided
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
  if (multimediaSlug) {
    payload["background_multimedia"] = multimediaSlug;
  }
  
  console.log("Creating Category widget:", widgetSlug);
  
  try {
    callApiWithRetry(BASE_URL +"/api/app/widget/", payload, baseHeaders, "multipart");
    console.log("✅ Category widget created:", widgetSlug);
  } catch (e) {
    console.error("Widget creation failed:", e.toString());
    throw new Error("Failed to create widget: " + e.toString());
  }
  
  // =======================================
  // STEP 3: Process Category Items
  // =======================================
  var categoryItems = widget.items || [];
  console.log("Processing " + categoryItems.length + " category items...");
  
  var categoryItemSlugs = [];
  
  for (var i = 0; i < categoryItems.length; i++) {
    console.log("\n--- Processing Category Item " + (i + 1) + " ---");
    var item = categoryItems[i];
    var itemSlug = slugBase + '_cat_item_' + (i + 1);
    
    try {
      var result = createCategoryWidgetItemFull(item, itemSlug, widgetSlug, dates, baseHeaders);
      categoryItemSlugs.push(result.categorySlug);
      console.log("✅ Category item " + (i + 1) + " completed");
    } catch (itemError) {
      console.error("Failed to create category item " + (i + 1) + ":", itemError);
      throw new Error("Category item " + (i + 1) + " failed: " + itemError.toString());
    }
  }
  
  // =======================================
  // STEP 4: Map Category Items to Widget
  // =======================================
  if (categoryItemSlugs.length > 0) {
    console.log("\nMapping " + categoryItemSlugs.length + " category items to widget...");
    try {
      var mappingCsv = "widget_item_slug_name,level_tag,level_property,priority,cohort\n";
      for (var i = 0; i < categoryItemSlugs.length; i++) {
        mappingCsv += categoryItemSlugs[i] + ",global,global," + (i + 1) + ",\n";
      }
      
      var mappingPayload = {
        "widget_slug": widgetSlug,
        "mapping_file": Utilities.newBlob(mappingCsv, 'text/csv', 'mapping.csv')
      };
      
      callApiWithRetry(BASE_URL + "/api/app/update_widget_widget_item_mapping/", mappingPayload, baseHeaders, "multipart");
      console.log("✅ Category items mapped to widget");
    } catch (mapError) {
      console.error("Failed to map category items:", mapError);
      // Don't throw - items are created, just not mapped
    }
  }
  
  console.log("=== CATEGORY GRID COMPLETED: " + widgetSlug + " ===");
  return widgetSlug;
}

/**
 * Create complete category item ecosystem:
 * - Page Layout
 * - Product Listing Widget
 * - Sub-Categories
 * - Category Widget Item
 */
function createCategoryWidgetItemFull(item, itemSlug, mastheadSlug, dates, baseHeaders) {
  // Default heading if not provided
  var heading = item.categoryPage?.heading || item.text || "Category Page";
  var pageLayoutSlug = itemSlug + '_page';
  var plpWidgetSlug = itemSlug + '_plp';
  var categorySlug = itemSlug + '_cat_wi';
  
  console.log("  Creating Page Layout:", pageLayoutSlug);
  
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
    var products = subCat.products || {};
    
    // Define states to check. Key matches the frontend 'products' keys.
    var statesToCheck = [
      { key: 'global', tag: 'global', suffix: 'global', prop: 'global' },
      { key: 'JH',     tag: 'state',  suffix: 'jh',     prop: 'jharkhand' }, 
      { key: 'CG',     tag: 'state',  suffix: 'cg',     prop: 'chhattisgarh' },
      { key: 'WB',     tag: 'state',  suffix: 'wb',     prop: 'west bengal' }
    ];
    // Helper to avoid duplicates
    var processedStates = {}; 

    for (var s = 0; s < statesToCheck.length; s++) {
      var stateObj = statesToCheck[s];
      var rawProductStr = products[stateObj.key] || "";
      
      // key for deduplication
      var dedupKey = stateObj.prop.toLowerCase(); 
      if (processedStates[dedupKey]) continue;

      if (rawProductStr && rawProductStr.trim().length > 0) {
        processedStates[dedupKey] = true;
        
        // Prepare products (handle both space and comma separation)
        var productList = rawProductStr.split(/[,\s]+/).filter(function(c) { return c && c.trim(); });
        var productListStr = productList.join(',');
        var productCodesArray = productList.map(function(c) { return parseInt(c.trim(), 10); }).filter(function(n) { return !isNaN(n); });

        if (productList.length === 0) continue;

        // Generate slug: itemSlug + '_subcat_' + (index) + '_' + suffix
        var subCatSlug = itemSlug + '_subcat_' + (j + 1) + '_' + stateObj.suffix;
        var subCatName = subCat.name || "Test SubCat";
        
        console.log("    Creating sub-category " + (j + 1) + " [" + stateObj.prop + "]:", subCatName);

        // Payload construction
        try {
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
            "media_en": subCat.image || defaultSampleImage,
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
          
          if (subCat.driveFileId) {
            try {
              var scFile = DriveApp.getFileById(subCat.driveFileId);
              subCatPayload["media_en"] = scFile.getBlob();
            } catch (e) {
              console.error("    Failed to fetch sub-category drive file:", e);
            }
          }
          
          callApiWithRetry(BASE_URL + "/api/app/post_widget_item/", subCatPayload, baseHeaders, "multipart");
          console.log("    ✅ Sub-category created:", subCatSlug);
          
          subCatMappings.push({
            slug: subCatSlug,
            tag: stateObj.tag,
            prop: stateObj.prop,
            priority: (j + 1)
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
  // Step F: Create Category Widget Item
  // =======================================
  console.log("  Creating Category Widget Item:", categorySlug);
  
  var defaultCatImage = "https://gs.apnamart.in/dynamic_widget_items/widget_items_None/download_1.png";
  
  var categoryItemPayload = {
    "widget_item_id": "undefined",
    "deactivated_flag": "no",
    "item_click_action": "redirect-to-page", // Updated per cURL
    "slug_name": categorySlug,
    "slave_key": "",
    "item_type": "category", // Updated per cURL
    "media": "",
    "text_en": item.text || heading, // Should verify if this maps correctly
    "media_en": item.image || defaultCatImage,
    "text_hi": item.textHi || "",
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
  
  if (item.driveFileId) {
    try {
      console.log("  Fetching category item image from Drive:", item.driveFileId);
      var cFile = DriveApp.getFileById(item.driveFileId);
      categoryItemPayload["media_en"] = cFile.getBlob();
    } catch (e) {
      console.error("  Failed to fetch category drive file:", e);
    }
  }
  
  try {
    callApiWithRetry(BASE_URL + "/api/app/post_widget_item/", categoryItemPayload, baseHeaders, "multipart");
    console.log("  ✅ Category item created:", categorySlug);
  } catch (carErr) {
    console.error("  Category item creation failed:", carErr);
    throw new Error("Category item failed: " + carErr.toString());
  }
  
  return {
    categorySlug: categorySlug,
    pageLayoutSlug: pageLayoutSlug,
    plpWidgetSlug: plpWidgetSlug
  };
}
