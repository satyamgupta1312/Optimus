/**
 * ==========================================
 * SPR WIDGET OPTIMIZATION LOGIC
 * File: SPR_Widget_Optimized.gs
 * Contains: Optimized Logic (Flow 1+2) and Standard Fallback
 * ==========================================
 */

/**
 * Create Single Product Row Optimized Widget
 * Implements Full PLP Ecosystem (Flow 1) + Row Widget (Flow 2)
 */
function createSPROptimizedWidget(widget, baseHeaders) {
  var slugBase = widget.slug ? sanitizeSlug(widget.slug) : sanitizeSlug(widget.title || 'spr_widget');
  var itemCodes = widget.products ? widget.products.map(function(p) { return p.itemCode; }).join(',') : '';
  
  // Validation
  if (!itemCodes || itemCodes.length === 0) {
    throw new Error("No products selected for widget. Cannot create empty widget.");
  }

  var headingEn = widget.title || 'New Product Collection';
  var headingHi = widget.titleHi || headingEn;
  var dates = getDates();
  // Override End Date if provided by user
  if (widget.endTime) {
    try {
      dates.end = formatDate(new Date(widget.endTime));
    } catch (e) {
      console.error("Invalid End Time format from user, using default 1 year", e);
    }
  }

  var blankBlob = getBlankImageBlob();

  console.log("Starting SPR Optimized Flow for: " + slugBase);
  
  // Unique Slugs (Deterministic - No Timestamps as per Master Rule)
  var slugs = {
    scItem: slugBase + '_sc_wi',
    plpWidget: slugBase + '_plp_w',
    page: slugBase + '_page_p',
    rowItem: slugBase + '_pr_wi',
    rowWidget: slugBase + '_spr_opt'
  };

  // --- FLOW 1: PLP LISTING ECOSYSTEM ---
  
  // 1.1 Create Sub-Category Widget Item
  var payloadSc = {
    "widget_item_id": "undefined", "deactivated_flag": "no", "item_click_action": "deal-detail-redirect",
    "slug_name": slugs.scItem, "item_type": "sub_category", 
    "text_en": headingEn, "text_hi": headingHi, "media_en": blankBlob,
    "product_list": itemCodes, "filters": "[]", 
    "filter_lst": JSON.stringify([{ "condition": "in_stk_item_codes", "value": itemCodes }]),
    "property_lst": "[]", "pl_edit": "PL", "is_clickable": "yes", "update_product_list": "no", 
    "start_time": dates.start, "end_time": dates.end
  };
  callApiWithRetry(BASE_URL + "/api/app/post_widget_item/", payloadSc, baseHeaders, "multipart");

  // 1.2 Create Product Listing Widget
  var payloadPlp = {
    "slug_name": slugs.plpWidget, "widget_type": "product_listing", 
    "start_time": dates.start, "end_time": dates.end,
    "heading": headingEn, "heading_en": headingEn, "heading_hi": "", 
    "media_aspect_ratio": "1", "filter_dict": "{}", "app_configurations": "{}", 
    "description": "", "master_key": "", "heading_bg": "", "clear_bg_media": "", 
    "view_all_action_name": "", "background_multimedia": ""
  };
  callApiWithRetry(BASE_URL + "/api/app/widget/", payloadPlp, baseHeaders, "multipart");

  // 1.3 Create Page Layout
  var payloadPage = {
    "slug_name": slugs.page, "page_heading": headingEn, 
    "page_layout_type": "2", "page_type": "product_listing_page"
  };
  callApiWithRetry(BASE_URL + "/api/app/post_page_layout/", payloadPage, baseHeaders, "json");

  // 1.4 Map PLP Widget -> SubCat Item
  var csvMap1 = Utilities.newBlob("widget_item_slug_name,level_tag,level_property,priority,cohort\n" + slugs.scItem + ",global,global,1,", 'text/csv', 'map.csv');
  callApiWithRetry(BASE_URL + "/api/app/update_widget_widget_item_mapping/", 
    { "widget_slug": slugs.plpWidget, "mapping_file": csvMap1 }, baseHeaders, "multipart");

  // 1.5 Map Page -> PLP Widget
  var csvMap2 = Utilities.newBlob("widget_slug_name,level_tag,level_property,priority,cohort\n" + slugs.plpWidget + ",global,global,1,", 'text/csv', 'map.csv');
  callApiWithRetry(BASE_URL + "/api/app/update_layout_widget_mapping/",
    { "page_layout_slug": slugs.page, "mapping_file": csvMap2 }, baseHeaders, "multipart");
    
  // 1.6 Map Global -> Page
  var globalCsv = Utilities.newBlob("level_tag,level_property\nglobal,global", 'text/csv', 'map.csv');
  callApiWithRetry(BASE_URL + "/api/app/update_page_page_layout_mapping/",
    { "page_type": "", "page_layout_slug": slugs.page, "mapping_file": globalCsv }, baseHeaders, "multipart");

  // --- FLOW 2: ROW WIDGET ---
  
  // 2.1 Create Row Widget Item
  var payloadRowItem = {
    "widget_item_id": "undefined", "deactivated_flag": "no", "item_click_action": "", "slug_name": slugs.rowItem, "slave_key": "",
    "item_type": "item_rows", "media": "", "text_en": "", "media_en": "", "text_hi": "", "media_hi": "", "text_bg": "", "media_bg": "",
    "product_list": itemCodes, "filters": "[]", 
    "filter_lst": JSON.stringify([{ "condition": "in_stk_item_codes", "value": itemCodes }]),
    "property_lst": "[]", "pl_edit": "PL", "is_clickable": "no", "update_product_list": "no", 
    "start_time": dates.start, "end_time": dates.end, "click_action_params": "{}"
  };
  callApiWithRetry(BASE_URL + "/api/app/post_widget_item/", payloadRowItem, baseHeaders, "multipart");

  // 2.2 Create SPR Optimized Widget
  var payloadSpr = {
    "slug_name": slugs.rowWidget, "widget_type": "single_product_row_v2", "description": "", "heading": "", "master_key": "",
    "heading_en": headingEn, "heading_hi": headingHi, "heading_bg": "", "start_time": dates.start, "end_time": dates.end,
    "clear_bg_media": "", "media_aspect_ratio": "1", "view_all_action_name": "redirect-to-page",
    "view_all_action_params": JSON.stringify({ "page_type": "product_listing_page", "page_layout_slug_name": slugs.page }),
    "background_multimedia": "", "filter_dict": "{}", "app_configurations": "{}"
  };
  callApiWithRetry(BASE_URL + "/api/app/widget/", payloadSpr, baseHeaders, "multipart");

  // 2.3 Map SPR Widget -> Row Item
  var customCsv = Utilities.newBlob("widget_item_slug_name,level_tag,level_property,priority,cohort\n" + slugs.rowItem + ",global,global,1,", 'text/csv', 'map.csv');
  callApiWithRetry(BASE_URL + "/api/app/update_widget_widget_item_mapping/", 
    { "widget_slug": slugs.rowWidget, "mapping_file": customCsv }, baseHeaders, "multipart");

  return slugs.rowWidget;
}

/**
 * (LEGACY) Create Standard Single Product Row Widget
 * Kept for fallback support
 */
function createSPRStandardWidget(widget, baseHeaders) {
  var slugBase = widget.slug ? sanitizeSlug(widget.slug) : sanitizeSlug(widget.title || 'spr_widget');
  var itemCodes = widget.products ? widget.products.map(function(p) { return p.itemCode; }).join(',') : '';
  
  // Validation
  if (!itemCodes || itemCodes.length === 0) {
    throw new Error("No products selected for widget. Cannot create empty widget.");
  }

  var headingEn = widget.title || 'New Product Collection';
  var headingHi = widget.titleHi || headingEn;
  var dates = getDates();
  var blankBlob = getBlankImageBlob();

  var names = {
    wi: slugBase + '_wi_' + Date.now(),
    w_spr: slugBase + '_spr_' + Date.now(),
    page: slugBase + '_page_' + Date.now()
  };
  
  // 1. Create Page Layout
  var payloadStep1 = {
    "slug_name": names.page,
    "page_heading": headingEn,
    "page_layout_type": "2",
    "page_type": "product_listing_page"
  };
  var final_page = callApiWithRetry(BASE_URL + "/api/app/post_page_layout/", payloadStep1, baseHeaders, "json");
  
  // 2. Create Widget Item
  var payloadStep2 = {
    "slug_name": names.wi,
    "text_en": headingEn,
    "text_hi": headingHi,
    "product_list": itemCodes,
    "item_type": "item_rows",
    "media_en": blankBlob,
    "widget_item_id": "undefined",
    "deactivated_flag": "no",
    "item_click_action": "deal-detail-redirect",
    "slave_key": "", "media": "", "text_bg": "", "media_bg": "", "filters": "[]",
    "filter_lst": JSON.stringify([{ "condition": "in_stk_item_codes", "value": itemCodes }]),
    "property_lst": "[]", "pl_edit": "PL", "is_clickable": "no", "update_product_list": "no",
    "start_time": dates.start, "end_time": dates.end,
    "background_multimedia": "", "image_multimedia": "", "secondary_image_multimedia": "",
    "progress_bar": "", "offer_id": "", "click_action_params": "{}"
  };
  var final_wi = callApiWithRetry(BASE_URL + "/api/app/post_widget_item/", payloadStep2, baseHeaders, "multipart");
  
  // 3. Create Widget
  var payloadStep3 = {
    "slug_name": names.w_spr,
    "widget_type": "single_product_row",
    "heading_en": headingEn,
    "heading_hi": headingHi,
    "description": "", "heading": "", "master_key": "", "heading_bg": "",
    "start_time": dates.start, "end_time": dates.end, "clear_bg_media": "",
    "media_aspect_ratio": "1", "view_all_action_name": "redirect-to-page",
    "view_all_action_params": JSON.stringify({ "page_type": "product_listing_page", "page_layout_slug_name": final_page }),
    "background_multimedia": "", "filter_dict": "{}", "app_configurations": "{}"
  };
  var final_w_spr = callApiWithRetry(BASE_URL + "/api/app/widget/", payloadStep3, baseHeaders, "multipart");
  
  // 4. Map Widget -> Widget Item
  var csvStep4 = createCsv("widget_item", final_wi);
  callApiWithRetry(BASE_URL + "/api/app/update_widget_widget_item_mapping/", 
    { "widget_slug": final_w_spr, "mapping_file": csvStep4 }, baseHeaders, "multipart");
  
  // 5. Map Page -> Widget
  var csvStep5 = createCsv("layout_widget", final_w_spr);
  callApiWithRetry(BASE_URL + "/api/app/update_layout_widget_mapping/",
    { "page_layout_slug": final_page, "mapping_file": csvStep5 }, baseHeaders, "multipart");
  
  return final_w_spr;
}
