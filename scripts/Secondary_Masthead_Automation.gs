/**
 * CLEVERTAP/APNAMART AUTOMATION SCRIPT (V12 - NO COMPRESSION)
 * Features: 
 * 1. Image Upload: Uploads original images directly (No resizing/compression).
 * 2. Hindi Text: Auto-Transliteration using Google Input Tools.
 * 3. Logic: Full automation for Parents, Children, and Mappings.
 */

// ========== CONFIGURATION ==========
const CONFIG = {
  SHEET_ID: "1eE20BwGcTL5B2_E7pQj7DuIBzzV2xosJegxfVLKh-N0", 
  SHEET_NAME: "PROD",
  USERNAME: "Automation",
  PASSWORD: "Qwerty@123",
  BASE_URL: "https://samaan.apnamart.in",
  
  STATE_MAP: {
    'JH': 'jharkhand',
    'CG': 'chhattisgarh',
    'WB': 'west bengal',
    'global': 'global'
  }
};

// COLUMN MAPPING
const COL_INDEX = {
  MASTHEAD_TYPE: 0,     
  CAROUSEL_ITEM: 1,     
  CAT_PAGE: 2,          
  SUB_CATEGORY: 3,      
  PLP_WIDGET: 4,        
  SLUG_PREFIX: 5,       
  MULTIMEDIA_URL: 6,    
  PROD_GLOBAL: 7,       
  PROD_JH: 8,           
  PROD_CG: 9,           
  PROD_WB: 10,
  STATUS: 12,           
  GEN_SLUGS: 13         
};

var GLOBAL_HEADERS = {};
var SHEET_LOGS = []; 

function main() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data.shift(); 

  SHEET_LOGS = data.map(() => ({ status: [], slugs: [] }));

  if (!authenticate()) {
    Logger.log("CRITICAL: Authentication failed. Exiting.");
    return;
  }

  let processingData = preprocessData(data);
  let parentMastheads = processingData.mastheads;
  let parentLayouts = processingData.layouts;
  let parentPlps = processingData.plps;
  let rows = processingData.rows;

  // --- Phase 1: Parents ---
  Logger.log("--- Phase 1: Create Parent Components ---");
  
  for (let slug of Object.keys(parentMastheads)) {
    let rowIndex = parentMastheads[slug].rowIndex;
    let res = createMastheadWidget(slug, parentMastheads[slug].row);
    logResult(rowIndex, res.success ? "Success (Masthead)" : `Failed: ${res.msg}`, slug);
  }

  for (let slug of Object.keys(parentLayouts)) {
    let rowIndex = parentLayouts[slug].rowIndex; 
    let res = createPageLayout(slug, parentLayouts[slug].heading);
    logResult(rowIndex, res.success ? "Success (Layout)" : `Failed: ${res.msg}`, slug);
    if (res.success) mapLayoutToPage(slug);
  }

  for (let slug of Object.keys(parentPlps)) {
    let rowIndex = parentPlps[slug].rowIndex; 
    let res = createPlpWidget(slug);
    if (rowIndex !== undefined) {
      logResult(rowIndex, res.success ? "Success (PLP Widget)" : `Failed: ${res.msg}`, slug);
    }
  }

  // --- Phase 2: Children ---
  Logger.log("--- Phase 2: Create Child Components ---");
  
  let plpMappings = {};     
  let layoutMappings = {};  
  let mastheadMappings = {};

  rows.forEach(row => {
    let slugPrefix = row.slugPrefix;
    let context = row.context; 
    let rIdx = row.rowIndex;

    if (!slugPrefix) return; 

    // A. Carousel Logic
    if (row.isCarousel) {
      let pageLink = context.layout || row.lookAheadLayout || "";
      if (pageLink) {
        let res = createCarouselItem(row.rawData, pageLink);
        logResult(rIdx, res.success ? "Success (Carousel)" : `Failed: ${res.msg}`, slugPrefix);
        if (res.success && context.masthead) {
          if (!mastheadMappings[context.masthead]) mastheadMappings[context.masthead] = [];
          mastheadMappings[context.masthead].push({ slug: slugPrefix, state: 'global' });
        }
      } else {
        logResult(rIdx, "Skipped (No Layout Found)", "");
      }
    }
    // B. Sub-Category Logic
    else if (row.isSubCat) {
      let stateCols = [
        { key: 'global', val: row.rawData[COL_INDEX.PROD_GLOBAL] },
        { key: 'JH', val: row.rawData[COL_INDEX.PROD_JH] },
        { key: 'CG', val: row.rawData[COL_INDEX.PROD_CG] },
        { key: 'WB', val: row.rawData[COL_INDEX.PROD_WB] }
      ];

      stateCols.forEach(st => {
        let pList = (st.val || "").toString().trim();
        if (pList !== "") {
          let finalSlug = `${slugPrefix}_${st.key.toLowerCase()}`;
          pList = pList.replace(/[\r\n]+/g, "").trim(); 
          let res = createSubCategoryWidget(row.rawData, pList, st.key, finalSlug);
          logResult(rIdx, res.success ? `Success (${st.key})` : `Failed (${st.key}): ${res.msg}`, finalSlug);
          if (res.success && context.plp) {
            if (!plpMappings[context.plp]) plpMappings[context.plp] = [];
            plpMappings[context.plp].push({ slug: finalSlug, state: st.key });
          }
        }
      });
    }
    
    if (context.layout && context.plp) {
      if (!layoutMappings[context.layout]) layoutMappings[context.layout] = new Set();
      layoutMappings[context.layout].add(context.plp);
    }
  });

  // --- Phase 3: Mappings ---
  Logger.log("--- Phase 3: Mappings ---");

  for (let plp in plpMappings) mapItemsToWidget(plp, plpMappings[plp], "PLP");
  for (let layout in layoutMappings) mapWidgetToLayout(layout, Array.from(layoutMappings[layout]));
  for (let masthead in mastheadMappings) mapItemsToWidget(masthead, mastheadMappings[masthead], "Masthead");

  Logger.log("--- Writing Results to Sheet ---");
  flushLogsToSheet(sheet);
  Logger.log("--- Automation Completed ---");
}

// ==========================================
// GOOGLE INPUT TOOLS (HINDI TRANSLITERATION)
// ==========================================
function getHindiText(englishText) {
  if (!englishText || englishText.trim() === "") return "";
  try {
    let encodedText = encodeURIComponent(englishText);
    let url = `https://inputtools.google.com/request?text=${encodedText}&itc=hi-t-i0-und&num=1`;
    let resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    let json = JSON.parse(resp.getContentText());
    if (json[0] === "SUCCESS" && json[1] && json[1][0] && json[1][0][1]) {
      return json[1][0][1][0];
    }
    return englishText;
  } catch (e) {
    return englishText; 
  }
}

// ==========================================
// CREATION FUNCTIONS (NO COMPRESSION)
// ==========================================

function createSubCategoryWidget(row, prodList, stateCode, slug) {
  let url = `${CONFIG.BASE_URL}/api/app/post_widget_item/`;
  let imgUrl = row[COL_INDEX.MULTIMEDIA_URL];
  
  // DIRECT FETCH - NO COMPRESSION
  let imgBlob = fetchImageBlob(imgUrl);
  
  let subCatText = row[COL_INDEX.SUB_CATEGORY].toString().trim();
  let subCatTextHi = getHindiText(subCatText);

  let payload = {
    'slug_name': slug,
    'item_type': 'sub_category',
    'product_list': prodList,
    'filter_lst': JSON.stringify([{"condition": "in_stk_item_codes", "value": prodList}]),
    'start_time': getNowStr(),
    'end_time': getFutureStr(30),
    'text_en': subCatText,
    'text_hi': subCatTextHi, 
    'is_clickable': 'yes',
    'update_product_list': 'yes',
    'widget_item_id': 'undefined', 'deactivated_flag': 'no', 'filters': '[]',
    'property_lst': '[]', 'pl_edit': 'PL', 'addition_sources': '{"":""}' 
  };
  if (imgBlob) payload['media_en'] = imgBlob;

  return safeApiCall(url, { method: 'post', payload: payload, headers: GLOBAL_HEADERS }, "Sub-Cat", slug);
}

function createCarouselItem(row, pageLayoutSlug) {
  let url = `${CONFIG.BASE_URL}/api/app/post_widget_item/`;
  let slug = row[COL_INDEX.SLUG_PREFIX];
  let imgUrl = row[COL_INDEX.MULTIMEDIA_URL];
  
  // DIRECT FETCH - NO COMPRESSION
  let imgBlob = fetchImageBlob(imgUrl);
  
  let englishName = row[COL_INDEX.CAROUSEL_ITEM].toString().trim(); 
  let hindiName = englishName ? getHindiText(englishName) : "";
  let clickParams = JSON.stringify({ "page_type": "category_page", "page_layout_slug_name": pageLayoutSlug });

  let payload = {
    'slug_name': slug,
    'item_type': 'carousel',
    'item_click_action': 'redirect-to-page',
    'click_action_params': clickParams,
    'start_time': getNowStr(),
    'end_time': getFutureStr(30),
    'is_clickable': 'yes',
    'update_product_list': 'no',
    'text_en': englishName,   
    'text_hi': hindiName,     
    'widget_item_id': 'undefined', 'deactivated_flag': 'no', 'filters': '[]',
    'filter_lst': '[]', 'property_lst': '[]', 'addition_sources': '{"":""}',
    'slave_key': '', 'media': '', 'media_hi': '',
    'text_bg': '', 'media_bg': '', 'product_list': '', 'pl_edit': 'PL',
    'background_multimedia': '', 'image_multimedia': '', 'secondary_image_multimedia': '', 'progress_bar': '',
    'offer_id': ''
  };
  if (imgBlob) payload['media_en'] = imgBlob;
  return safeApiCall(url, { method: 'post', payload: payload, headers: GLOBAL_HEADERS }, "Carousel", slug);
}

// ==========================================
// API & HELPERS
// ==========================================

function safeApiCall(url, options, type, slug) {
  try {
    options.muteHttpExceptions = true;
    let response = UrlFetchApp.fetch(url, options);
    let code = response.getResponseCode();
    let text = response.getContentText();

    if (code >= 200 && code < 300) {
      Logger.log(`  -> Success: Created ${type} '${slug}'`);
      return { success: true, msg: "Created" };
    } else {
      if (text.includes("already exists") || text.includes("unique constraint")) {
        Logger.log(`  -> Info: ${type} '${slug}' already exists.`);
        return { success: true, msg: "Already Exists" };
      }
      Logger.log(`  -> Error creating ${type} '${slug}': Code ${code} - ${text.substring(0, 100)}...`);
      return { success: false, msg: `API Error ${code}: ${text.substring(0, 50)}` };
    }
  } catch (e) {
    Logger.log(`  -> Exception creating ${type} '${slug}': ${e}`);
    return { success: false, msg: e.toString() };
  }
}

function fetchImageBlob(url) {
  if (!url || !url.includes('http')) return null;
  // Convert Drive View Links to Download Links
  if (url.includes('drive.google.com') && url.includes('/view')) {
    let idMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (idMatch) url = `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
  }
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      let resp = UrlFetchApp.fetch(url);
      let blob = resp.getBlob();
      blob.setName("image.jpeg");
      return blob;
    } catch (e) {
      Utilities.sleep(1000); 
    }
  }
  return null;
}

function createPlpWidget(slug) {
  let url = `${CONFIG.BASE_URL}/api/app/widget/`;
  let payload = {
    'slug_name': slug, 'widget_type': 'product_listing',
    'start_time': getNowStr(), 'end_time': getFutureStr(30), 'media_aspect_ratio': '1',
    'app_configurations': '{}', 'description': '', 'heading': '', 'master_key': '',
    'heading_en': '', 'heading_hi': '', 'heading_bg': '',
    'clear_bg_media': '', 'view_all_action_name': '', 'background_multimedia': ''
  };
  return safeApiCall(url, { method: 'post', payload: payload, headers: GLOBAL_HEADERS }, "PLP Widget", slug);
}

function createMastheadWidget(slug, row) {
  let url = `${CONFIG.BASE_URL}/api/app/widget/`;
  let mastheadType = row[COL_INDEX.MASTHEAD_TYPE];
  let ratio = mastheadType.match(/\d/) ? mastheadType.match(/\d/)[0] : '4';
  let payload = {
    'slug_name': slug, 'widget_type': 'masthead_secondary_category_hp',
    'media_aspect_ratio': ratio, 'background_multimedia': row[COL_INDEX.MULTIMEDIA_URL],
    'start_time': getNowStr(), 'end_time': getFutureStr(30),
    'app_configurations': '{}', 'description': '', 'heading': '', 'master_key': '',
    'heading_en': '', 'heading_hi': '', 'heading_bg': '',
    'clear_bg_media': '', 'view_all_action_name': ''
  };
  return safeApiCall(url, { method: 'post', payload: payload, headers: GLOBAL_HEADERS }, "Masthead", slug);
}

function createPageLayout(slug, heading) {
  let url = `${CONFIG.BASE_URL}/api/app/post_page_layout/`;
  let payload = { "slug_name": slug, "page_heading": heading, "page_layout_type": "2", "page_type": "category_page" };
  let options = { method: 'post', payload: JSON.stringify(payload), headers: { ...GLOBAL_HEADERS, 'Content-Type': 'application/json' } };
  return safeApiCall(url, options, "Page Layout", slug);
}

function mapItemsToWidget(parentSlug, items, type) {
  if (!items || items.length === 0) return;
  let csvContent = "widget_item_slug_name,level_tag,level_property,priority,cohort\n";
  items.forEach((item, index) => {
    let isGlobal = (item.state === 'global' || type === "Masthead");
    let levelTag = isGlobal ? 'global' : 'state';
    let levelProperty = isGlobal ? 'global' : (CONFIG.STATE_MAP[item.state] || item.state.toLowerCase());
    csvContent += `${item.slug},${levelTag},${levelProperty},${index + 1},\n`;
  });
  let blob = Utilities.newBlob(csvContent, 'text/csv', 'mapping.csv');
  let url = `${CONFIG.BASE_URL}/api/app/update_widget_widget_item_mapping/`;
  let payload = { 'widget_slug': parentSlug, 'mapping_file': blob };
  safeApiCall(url, { method: 'post', payload: payload, headers: GLOBAL_HEADERS }, "Map Items", parentSlug);
}

function mapWidgetToLayout(layoutSlug, plpSlugs) {
  if (!plpSlugs || plpSlugs.length === 0) return;
  let csvContent = "widget_slug_name,level_tag,level_property,priority,cohort\n";
  plpSlugs.forEach(slug => { csvContent += `${slug},global,global,1,\n`; });
  let blob = Utilities.newBlob(csvContent, 'text/csv', 'layout_mapping.csv');
  let url = `${CONFIG.BASE_URL}/api/app/update_layout_widget_mapping/`;
  let payload = { 'page_layout_slug': layoutSlug, 'mapping_file': blob };
  safeApiCall(url, { method: 'post', payload: payload, headers: GLOBAL_HEADERS }, "Map Layout", layoutSlug);
}

function mapLayoutToPage(layoutSlug) {
  let csvContent = "level_tag,level_property\nglobal,global";
  let blob = Utilities.newBlob(csvContent, 'text/csv', 'page_mapping.csv');
  let url = `${CONFIG.BASE_URL}/api/app/update_page_page_layout_mapping/`;
  let payload = { 'page_layout_slug': layoutSlug, 'page_type': 'category_page', 'mapping_file': blob };
  safeApiCall(url, { method: 'post', payload: payload, headers: GLOBAL_HEADERS }, "Map Page", layoutSlug);
}

function logResult(rowIndex, statusMsg, slug) {
  if (SHEET_LOGS[rowIndex]) {
    SHEET_LOGS[rowIndex].status.push(statusMsg);
    if (slug) SHEET_LOGS[rowIndex].slugs.push(slug);
  }
}

function flushLogsToSheet(sheet) {
  let output = SHEET_LOGS.map(row => [row.status.join("\n"), row.slugs.join("\n")]);
  if (output.length > 0) sheet.getRange(2, 13, output.length, 2).setValues(output);
}

function preprocessData(data) {
  let mastheads = {};
  let layouts = {};
  let plps = {};
  let processedRows = [];
  let currMasthead = "", currLayout = "", currPlp = "";

  for (let i = 0; i < data.length; i++) {
    let row = data[i];
    let slugPrefix = row[COL_INDEX.SLUG_PREFIX].toString().trim();
    let mastheadType = row[COL_INDEX.MASTHEAD_TYPE].toString().trim();
    let carouselItem = row[COL_INDEX.CAROUSEL_ITEM].toString().trim();
    let catPage = row[COL_INDEX.CAT_PAGE].toString().trim();
    let subCat = row[COL_INDEX.SUB_CATEGORY].toString().trim();
    let plpWidget = row[COL_INDEX.PLP_WIDGET].toString().trim();
    
    let isMasthead = mastheadType !== "", isPageLayout = catPage !== "", isPlp = plpWidget !== "";
    let isCarousel = carouselItem !== "", isSubCat = subCat !== "";

    if (isMasthead) currMasthead = slugPrefix;
    if (isPageLayout) currLayout = slugPrefix;
    if (isPlp) currPlp = slugPrefix;

    if (isMasthead && slugPrefix) mastheads[slugPrefix] = { row: row, rowIndex: i };
    if (isPageLayout && slugPrefix) layouts[slugPrefix] = { heading: catPage, rowIndex: i };
    if (isPlp && slugPrefix) plps[slugPrefix] = { rowIndex: i };

    let lookAheadLayout = "";
    if (isCarousel && !currLayout) {
       for (let j = i + 1; j < Math.min(i + 5, data.length); j++) {
         let nextRow = data[j];
         let nextSlug = nextRow[COL_INDEX.SLUG_PREFIX].toString().trim();
         let nextCat = nextRow[COL_INDEX.CAT_PAGE].toString().trim();
         if (nextCat !== "" && nextSlug !== "") { lookAheadLayout = nextSlug; break; }
       }
    }

    processedRows.push({
      rawData: row, rowIndex: i, slugPrefix: slugPrefix,
      isCarousel: isCarousel, isSubCat: isSubCat, lookAheadLayout: lookAheadLayout,
      context: { masthead: currMasthead, layout: currLayout, plp: currPlp }
    });
  }
  return { mastheads, layouts, plps, rows: processedRows };
}

function authenticate() {
  const loginUrl = `${CONFIG.BASE_URL}/login/`;
  try {
    let getResp = UrlFetchApp.fetch(loginUrl, { muteHttpExceptions: true });
    let cookies = getResp.getAllHeaders()['Set-Cookie'];
    let csrfToken = extractCookie(cookies, 'csrftoken');
    if (!csrfToken) return false;
    let payload = { 'csrfmiddlewaretoken': csrfToken, 'username': CONFIG.USERNAME, 'password': CONFIG.PASSWORD };
    let postOptions = { 'method': 'post', 'payload': payload, 'headers': { 'Cookie': `csrftoken=${csrfToken}`, 'Referer': loginUrl }, 'followRedirects': false, 'muteHttpExceptions:': true };
    let postResp = UrlFetchApp.fetch(loginUrl, postOptions);
    let newCookies = postResp.getAllHeaders()['Set-Cookie'];
    let sessionId = extractCookie(newCookies, 'sessionid');
    let newCsrf = extractCookie(newCookies, 'csrftoken') || csrfToken;
    if (sessionId) {
      GLOBAL_HEADERS = { 'Cookie': `csrftoken=${newCsrf}; sessionid=${sessionId}`, 'x-csrftoken': newCsrf, 'Referer': CONFIG.BASE_URL };
      return true;
    } 
    return false;
  } catch (e) { Logger.log("Auth Exception: " + e); return false; }
}

function extractCookie(cookieHeader, name) {
  if (Array.isArray(cookieHeader)) cookieHeader = cookieHeader.join(';');
  if (!cookieHeader) return null;
  let match = cookieHeader.match(new RegExp(name + '=([^;]+)'));
  return match ? match[1] : null;
}
function getNowStr() { return Utilities.formatDate(new Date(), "IST", "yyyy-MM-dd HH:mm:ss"); }
function getFutureStr(days) { let d = new Date(); d.setDate(d.getDate() + days); return Utilities.formatDate(d, "IST", "yyyy-MM-dd HH:mm:ss"); }
