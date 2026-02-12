/**
 * ==========================================
 * CATEGORY GRID - FULL AUTOMATION
 * ==========================================
 * Order (bottom-up):
 * 1. Sub-Categories (state-specific widget items)
 * 2. PLP Widget (product_listing) + map sub-cats → PLP
 * 3. Category Page Layout + map PLP → page + map page → global
 * 4. Category Widget Item (type: "category", redirect-to-page)
 * 5. Category Widget (type: "category")
 * 6. Map category items → widget
 */

function createCategoryGridFromApproval(widget, baseHeaders) {
  console.log("=== CREATING CATEGORY GRID: " + (widget.title || widget.slug_name) + " ===");

  var slugBase = widget.slug_name ? sanitizeSlug(widget.slug_name) : sanitizeSlug(widget.title || 'category_grid');
  var widgetSlug = slugBase + '_cm_hp';

  var dates = getDates();
  if (widget.start_time) {
    try { dates.start = formatDate(new Date(widget.start_time)); } catch (e) { console.error("Invalid Start Time", e); }
  }
  if (widget.end_time) {
    try { dates.end = formatDate(new Date(widget.end_time)); } catch (e) { console.error("Invalid End Time", e); }
  }

  // =======================================
  // STEP 1-4: Process each Category Item (bottom-up)
  // =======================================
  var categoryItems = widget.items || [];
  console.log("Processing " + categoryItems.length + " category items...");

  var categoryItemSlugs = [];

  for (var i = 0; i < categoryItems.length; i++) {
    console.log("\n--- Processing Category Item " + (i + 1) + " ---");
    var item = categoryItems[i];
    var itemSlug = slugBase + '_item_' + (i + 1);

    try {
      var result = createCategoryItemFull(item, itemSlug, dates, baseHeaders);
      categoryItemSlugs.push(result.categorySlug);
      console.log("✅ Category item " + (i + 1) + " completed");
    } catch (itemError) {
      console.error("Failed to create category item " + (i + 1) + ":", itemError);
      throw new Error("Category item " + (i + 1) + " failed: " + itemError.toString());
    }
  }

  // =======================================
  // STEP 5: Create Category Widget
  // =======================================
  console.log("\nCreating Category widget:", widgetSlug);

  var payload = {
    "slug_name": widgetSlug,
    "widget_type": "category",
    "description": "",
    "heading": "",
    "master_key": "",
    "heading_en": widget.heading_en || widget.title || "",
    "heading_hi": widget.heading_hi || "",
    "heading_bg": "",
    "start_time": dates.start,
    "end_time": dates.end,
    "clear_bg_media": "",
    "media_aspect_ratio": "1",
    "view_all_action_name": "",
    "background_multimedia": "",
    "filter_dict": "{}",
    "app_configurations": "{}"
  };

  try {
    callApiWithRetry(BASE_URL + "/api/app/widget/", payload, baseHeaders, "multipart");
    console.log("✅ Category widget created:", widgetSlug);
  } catch (e) {
    console.error("Widget creation failed:", e.toString());
    throw new Error("Failed to create widget: " + e.toString());
  }

  // =======================================
  // STEP 6: Map Category Items to Widget
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
    }
  }

  console.log("=== CATEGORY GRID COMPLETED: " + widgetSlug + " ===");
  return widgetSlug;
}

/**
 * Create complete category item (bottom-up):
 * 1. Sub-Categories (state-specific)
 * 2. PLP Widget + map sub-cats → PLP
 * 3. Page Layout + map PLP → page + map page → global
 * 4. Category Widget Item (redirect-to-page)
 */
function createCategoryItemFull(item, itemSlug, dates, baseHeaders) {
  var heading = item.categoryPage?.heading || item.text || "Category Page";
  var pageLayoutSlug = itemSlug + '_page';
  var plpWidgetSlug = itemSlug + '_plp';
  var categorySlug = itemSlug + '_cat_wi';

  // =======================================
  // Step 1: Create Sub-Categories (State-Specific)
  // =======================================
  var subCategories = item.subCategories || [];
  console.log("  Creating " + subCategories.length + " sub-categories...");

  var subCatMappings = [];

  for (var j = 0; j < subCategories.length; j++) {
    var subCat = subCategories[j];
    var products = subCat.products || {};

    var statesToCheck = [
      { key: 'global', tag: 'global', suffix: 'global', prop: 'global' },
      { key: 'JH',     tag: 'state',  suffix: 'jh',     prop: 'jharkhand' },
      { key: 'CG',     tag: 'state',  suffix: 'cg',     prop: 'chhattisgarh' },
      { key: 'WB',     tag: 'state',  suffix: 'wb',     prop: 'west bengal' }
    ];
    var processedStates = {};

    for (var s = 0; s < statesToCheck.length; s++) {
      var stateObj = statesToCheck[s];
      var rawProductStr = products[stateObj.key] || "";

      var dedupKey = stateObj.prop.toLowerCase();
      if (processedStates[dedupKey]) continue;

      if (rawProductStr && rawProductStr.trim().length > 0) {
        processedStates[dedupKey] = true;

        var productList = rawProductStr.split(/[,\s]+/).filter(function(c) { return c && c.trim(); });
        var productListStr = productList.join(',');
        var productCodesArray = productList.map(function(c) { return parseInt(c.trim(), 10); }).filter(function(n) { return !isNaN(n); });

        if (productList.length === 0) continue;

        var subCatSlug = itemSlug + '_subcat_' + (j + 1) + '_' + stateObj.suffix;
        var subCatName = subCat.name || "Sub Category";

        console.log("    Creating sub-category " + (j + 1) + " [" + stateObj.prop + "]:", subCatName);

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
  // Step 2: Create PLP Widget + Map Sub-Cats → PLP
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

  // Map sub-categories → PLP
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
  // Step 3: Create Page Layout + Map PLP → Page + Map Page → Global
  // =======================================
  console.log("  Creating Page Layout:", pageLayoutSlug);

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

  // Map PLP → Page Layout
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
  }

  // Map Page Layout → Global
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
  }

  // =======================================
  // Step 4: Create Category Widget Item
  // =======================================
  console.log("  Creating Category Widget Item:", categorySlug);

  var defaultCatImage = "https://gs.apnamart.in/dynamic_widget_items/widget_items_None/download_1.png";

  var categoryItemPayload = {
    "widget_item_id": "undefined",
    "deactivated_flag": "no",
    "item_click_action": "redirect-to-page",
    "slug_name": categorySlug,
    "slave_key": "",
    "item_type": "category",
    "media": "",
    "text_en": item.text || heading,
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
