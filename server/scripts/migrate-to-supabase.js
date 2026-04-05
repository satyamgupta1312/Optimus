/**
 * One-time migration: ClickHouse (via Forge MCP data) → Supabase.
 *
 * Data was captured from ClickHouse and is embedded below.
 * Run: node server/scripts/migrate-to-supabase.js
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, '..', '.env');

// Load env
let SUPABASE_URL = '', SUPABASE_SERVICE_ROLE_KEY = '';
try {
  const env = fs.readFileSync(ENV_PATH, 'utf-8');
  for (const line of env.split('\n')) {
    let m = line.match(/^SUPABASE_URL=(.+)$/);
    if (m) SUPABASE_URL = m[1].trim();
    m = line.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/);
    if (m) SUPABASE_SERVICE_ROLE_KEY = m[1].trim();
  }
} catch {}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in server/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ── Data from ClickHouse (captured via Forge MCP explore) ──

const canvasWidgets = [
  {
    widget_id: "566855b3-54d1-4745-bfd1-f994603e48ff",
    type: "product_rail",
    slug: "monthly_list_satyam_test_po_spr_sc",
    env: "PROD",
    title: "aalu",
    title_hi: "puazzz",
    status: "APPROVED",
    sort_order: 0,
    pnc: {"rows":1,"is_optimized":true,"has_multimedia":false},
    config: {"stateProducts":{"global":"368,369"},"subCategories":[],"homeRowProducts":{"global":""},"pageType":"product_listing_page","expandPage":false,"plpWidgets":[],"view_all_background_color":"#ffffff","view_all_color":"#000000","start_time":"2026-03-31T00:00:00","end_time":"2026-04-03T23:59:00"},
    products: [],
    author: "manoj.kumar",
    is_deleted: false,
    created_at: "2026-03-31T08:58:41.940Z",
    updated_at: "2026-03-31T08:59:52.447Z",
  },
  {
    widget_id: "8fdc19ec-c233-445f-a348-42650fe17e4b",
    type: "product_rail",
    slug: "test-submit-123",
    env: "PROD",
    title: "Submit Test",
    title_hi: "",
    status: "REJECTED",
    sort_order: 0,
    pnc: {"city":"lucknow"},
    config: {},
    products: ["368","369"],
    author: "test@apnamart.in",
    is_deleted: false,
    created_at: "2026-03-30T09:39:33.035Z",
    updated_at: "2026-04-02T10:21:15.076Z",
  },
  {
    widget_id: "b19bfcbe-3bd0-4624-a743-ad787d56ba75",
    type: "product_rail",
    slug: "testtt_spr_sc_all_masthead_global",
    env: "PROD",
    title: "aalu",
    title_hi: "pyaaz ",
    status: "APPROVED",
    sort_order: 0,
    pnc: {"rows":1,"is_optimized":true,"has_multimedia":false},
    config: {"stateProducts":{"global":"99784, 99783"},"subCategories":[],"homeRowProducts":{"global":""},"pageType":"product_listing_page","expandPage":false,"plpWidgets":[],"view_all_background_color":"#ffffff","view_all_color":"#000000","start_time":"2026-04-02T00:00:00","end_time":"2026-04-05T23:59:00"},
    products: [],
    author: "satyam.gupta@apnamart.in",
    is_deleted: false,
    created_at: "2026-04-02T10:25:25.220Z",
    updated_at: "2026-04-02T10:25:26.785Z",
  },
  {
    widget_id: "21112da3-e0fb-4d20-ae39-47a5c9452f41",
    type: "product_rail",
    slug: "test-submit-flow",
    env: "PROD",
    title: "Test Submit Flow",
    title_hi: "टेस्ट",
    status: "PENDING",
    sort_order: 1,
    pnc: {"city":"lucknow"},
    config: {},
    products: ["368","369","370"],
    author: "test@apnamart.in",
    is_deleted: true,
    created_at: "2026-03-30T09:39:05.908Z",
    updated_at: "2026-03-30T09:39:06.818Z",
  },
];

const submissions = [
  {"dt":"2026-04-02","request_id":"33048be1-be73-405c-b174-9a4a4f8abb5f","widget_id":"b19bfcbe-3bd0-4624-a743-ad787d56ba75","widget_type":"product_rail","slug":"testtt_spr_sc_all_masthead_global","title":"aalu","title_hi":"pyaaz ","item_titles_hi":[],"status":"DEPLOYED","submitted_by":"satyam.gupta@apnamart.in","edited_by":"satyam.gupta@apnamart.in","edited_at":"2026-04-02T10:25:49.265Z","env":"PROD","products_count":0,"pnc":{"rows":1,"is_optimized":true,"has_multimedia":false},"page_slug":"testtt_spr_sc_all_masthead_global_page_p","hierarchy":{"plpWidget":"testtt_spr_sc_all_masthead_global_plp_w","page":"testtt_spr_sc_all_masthead_global_page_p","widget":"testtt_spr_sc_all_masthead_global_spr_opt","scItems":{"global":[{"slug":"testtt_spr_sc_all_masthead_global_sc_wi_global","codes":"99784,99783"}]},"rowItems":{"global":"testtt_spr_sc_all_masthead_global_pr_wi_global"}},"snapshot":{},"rejection_reason":"","header_widgets":{},"request_type":"Homepage Update","sort_order":0,"request_status":"DEPLOYED","submitted_at":"2026-04-02T10:25:25.620Z","result":"","error_msg":""},
  {"dt":"2026-03-31","request_id":"91cb3c45-0b85-46bb-aae8-7dc508463167","widget_id":"566855b3-54d1-4745-bfd1-f994603e48ff","widget_type":"product_rail","slug":"monthly_list_satyam_test_po_spr_sc","title":"aalu","title_hi":"puazzz","item_titles_hi":[],"status":"DEPLOYED","submitted_by":"manoj.kumar","edited_by":"satyam.gupta@apnamart.in","edited_at":"2026-03-31T09:00:01.588Z","env":"PROD","products_count":0,"pnc":{"rows":1,"is_optimized":true,"has_multimedia":false},"page_slug":"monthly_list_satyam_test_po_spr_sc_page_p","hierarchy":{"plpWidget":"monthly_list_satyam_test_po_spr_sc_plp_w","page":"monthly_list_satyam_test_po_spr_sc_page_p","widget":"monthly_list_satyam_test_po_spr_sc_spr_opt","scItems":{"global":[{"slug":"monthly_list_satyam_test_po_spr_sc_sc_wi_global","codes":"368,369"}]},"rowItems":{"global":"monthly_list_satyam_test_po_spr_sc_pr_wi_global"}},"snapshot":{},"rejection_reason":"","header_widgets":{},"request_type":"Homepage Update","sort_order":0,"request_status":"DEPLOYED","submitted_at":"2026-03-31T08:58:42.370Z","result":"","error_msg":""},
  {"dt":"2026-03-18","request_id":"2377e475-d122-41d1-94a8-53980686beb4","widget_id":"83976494-5db6-4458-8cf0-7fb9081e85c5","widget_type":"product_rail","slug":"monthly_list_test_potato_spr_sc_global","title":"Potato","title_hi":"आलू","item_titles_hi":[],"status":"DEPLOYED","submitted_by":"automation","edited_by":"satyam.gupta@apnamart.in","edited_at":"2026-03-18T18:29:32.573Z","env":"PROD","products_count":0,"pnc":{},"page_slug":"monthly_list_test_potato_spr_sc_global_page_p","hierarchy":{},"snapshot":{},"rejection_reason":"","header_widgets":{},"request_type":"Homepage Update","sort_order":0,"request_status":"DEPLOYED","submitted_at":null,"result":"","error_msg":""},
  {"dt":"2026-03-26","request_id":"8ada7038-fe50-4908-b88b-a7be774f273f","widget_id":"e5ddcfec-be31-4650-af0c-e9347ae271c1","widget_type":"product_rail","slug":"kirana_satyam_spr_sc","title":"satyam","title_hi":"s","item_titles_hi":[],"status":"DEPLOYED","submitted_by":"automation","edited_by":"satyam.gupta@apnamart.in","edited_at":"2026-03-26T11:37:22.432Z","env":"PROD","products_count":0,"pnc":{"rows":1,"is_optimized":true,"has_multimedia":false},"page_slug":"kirana_satyam_spr_sc_page_p","hierarchy":{"plpWidget":"kirana_satyam_spr_sc_plp_w","page":"kirana_satyam_spr_sc_page_p","widget":"kirana_satyam_spr_sc_spr_opt","scItems":{"global":[{"slug":"kirana_satyam_spr_sc_sc_wi_global","codes":"368,369,370"}]},"rowItems":{"global":"kirana_satyam_spr_sc_pr_wi_global"}},"snapshot":{},"rejection_reason":"","header_widgets":{},"request_type":"Homepage Update","sort_order":0,"request_status":"DEPLOYED","submitted_at":"2026-03-26T09:20:25.632Z","result":"","error_msg":""},
  {"dt":"2026-03-26","request_id":"9b49bc9e-f4dc-477e-b552-cbf99d9bcf18","widget_id":"ca143679-3e3d-4698-851e-c5db7e538c74","widget_type":"product_rail","slug":"kirana_satyam_ow_spr_sc","title":"sa","title_hi":"w","item_titles_hi":[],"status":"DEPLOYED","submitted_by":"automation","edited_by":"satyam.gupta@apnamart.in","edited_at":"2026-03-26T09:46:18.942Z","env":"PROD","products_count":0,"pnc":{"rows":1,"is_optimized":true,"has_multimedia":false},"page_slug":"kirana_satyam_ow_spr_sc_page_p","hierarchy":{"plpWidget":"kirana_satyam_ow_spr_sc_plp_w","page":"kirana_satyam_ow_spr_sc_page_p","widget":"kirana_satyam_ow_spr_sc_spr_opt","scItems":{"global":[{"slug":"kirana_satyam_ow_spr_sc_sc_wi_global","codes":"368,369,370"}]},"rowItems":{"global":"kirana_satyam_ow_spr_sc_pr_wi_global"}},"snapshot":{},"rejection_reason":"","header_widgets":{},"request_type":"Homepage Update","sort_order":0,"request_status":"DEPLOYED","submitted_at":"2026-03-26T09:34:12.295Z","result":"","error_msg":""},
  {"dt":"2026-03-30","request_id":"a5bae996-ce42-4bc3-852c-28fb558f3e20","widget_id":"8fdc19ec-c233-445f-a348-42650fe17e4b","widget_type":"product_rail","slug":"test-submit-123","title":"Submit Test","title_hi":"","item_titles_hi":[],"status":"REJECTED","submitted_by":"test@apnamart.in","edited_by":"satyam.gupta@apnamart.in","edited_at":"2026-04-02T10:21:14.753Z","env":"PROD","products_count":2,"pnc":{"city":"lucknow"},"page_slug":"test-submit-123_page_p","hierarchy":{"base":"test-submit-123"},"snapshot":{},"rejection_reason":"test","header_widgets":{},"request_type":"Homepage Update","sort_order":0,"request_status":"REJECTED","submitted_at":"2026-03-30T09:39:33.219Z","result":"","error_msg":""},
  {"dt":"2026-03-26","request_id":"a6069d93-d27d-4fd3-942e-045e2bb43934","widget_id":"648ac8cc-4a95-4ff4-8dbe-35c4908cb3f8","widget_type":"product_rail","slug":"ewdefwerf_spr_sc","title":"satyam","title_hi":"","item_titles_hi":[],"status":"REJECTED","submitted_by":"automation","edited_by":"satyam.gupta@apnamart.in","edited_at":"2026-04-02T10:21:27.347Z","env":"PROD","products_count":0,"pnc":{"rows":1,"is_optimized":true,"has_multimedia":false},"page_slug":"ewdefwerf_spr_sc_page_p","hierarchy":{"base":"ewdefwerf_spr_sc"},"snapshot":{},"rejection_reason":"test","header_widgets":{},"request_type":"Homepage Update","sort_order":0,"request_status":"REJECTED","submitted_at":"2026-03-26T09:10:06.403Z","result":"","error_msg":""},
  {"dt":"2026-03-26","request_id":"a8360c1f-4acd-49c2-ae43-242fff233cb3","widget_id":"4c730ea0-beeb-45c3-b820-32d0c8d4020d","widget_type":"product_row","slug":"test_widget","title":"Test Widget","title_hi":"","item_titles_hi":[],"status":"REJECTED","submitted_by":"automation","edited_by":"satyam.gupta@apnamart.in","edited_at":"2026-04-02T10:21:02.962Z","env":"PROD","products_count":0,"pnc":{},"page_slug":"test_widget_page_p","hierarchy":{"page":"test_widget_page_p","plpWidget":"test_widget_plp_w","homeWidget":"test_widget_spr","scItems":[],"rowItems":[]},"snapshot":{},"rejection_reason":"nahi chiye","header_widgets":{},"request_type":"Homepage Update","sort_order":0,"request_status":"REJECTED","submitted_at":"2026-03-26T09:26:03.312Z","result":"","error_msg":""},
  {"dt":"2026-03-19","request_id":"cff491a4-cc43-42c4-8cbb-f844910b01af","widget_id":"b86e91e3-c451-4183-8cd5-add7a21f6056","widget_type":"product_rail","slug":"satyam_test_1_spr_sc","title":"Aalu","title_hi":"bhalu","item_titles_hi":[],"status":"DEPLOYED","submitted_by":"automation","edited_by":"satyam.gupta@apnamart.in","edited_at":"2026-03-19T13:29:02.441Z","env":"PROD","products_count":0,"pnc":{},"page_slug":"satyam_test_1_spr_sc_page_p","hierarchy":{},"snapshot":{},"rejection_reason":"","header_widgets":{},"request_type":"Homepage Update","sort_order":0,"request_status":"DEPLOYED","submitted_at":null,"result":"","error_msg":""},
  {"dt":"2026-03-18","request_id":"d2f57ab0-d972-4c26-b23d-63f4a9554699","widget_id":"f8538dee-0956-421c-aeab-28d0e0079eda","widget_type":"product_rail","slug":"fresh_freshpouqwe_spr_sc","title":"aalu","title_hi":"आलू","item_titles_hi":[],"status":"DEPLOYED","submitted_by":"automation","edited_by":"satyam.gupta@apnamart.in","edited_at":"2026-03-18T19:42:29.736Z","env":"PROD","products_count":0,"pnc":{},"page_slug":"fresh_freshpouqwe_spr_sc_page_p","hierarchy":{},"snapshot":{},"rejection_reason":"","header_widgets":{},"request_type":"Homepage Update","sort_order":0,"request_status":"DEPLOYED","submitted_at":null,"result":"","error_msg":""},
  {"dt":"2026-03-19","request_id":"test-001","widget_id":"test-snapshot-001","widget_type":"product_rail","slug":"test_snapshot_spr","title":"Test Snapshot SPR","title_hi":"","item_titles_hi":[],"status":"REJECTED","submitted_by":"test@test.com","edited_by":"satyam.gupta@apnamart.in","edited_at":"2026-04-02T10:20:52.977Z","env":"PROD","products_count":3,"pnc":{},"page_slug":"","hierarchy":{},"snapshot":{"type":"product_rail","title":"Test SPR"},"rejection_reason":"","header_widgets":{},"request_type":"Homepage Update","sort_order":0,"request_status":"REJECTED","submitted_at":null,"result":"","error_msg":""},
  {"dt":"2026-03-18","request_id":"test-req-001","widget_id":"test-001","widget_type":"single_product_row_v2","slug":"milk_spr_v2_180326","title":"Milk Products","title_hi":"दूध उत्पाद","item_titles_hi":[],"status":"DEPLOYED","submitted_by":"satyam@test.com","edited_by":"test","edited_at":"2026-03-18T17:55:54.064Z","env":"PROD","products_count":5,"pnc":{"rows":1,"is_optimized":true},"page_slug":"milk_spr_v2_180326_page_p","hierarchy":{},"snapshot":{},"rejection_reason":"","header_widgets":{},"request_type":"Homepage Update","sort_order":0,"request_status":"DEPLOYED","submitted_at":null,"result":"","error_msg":""},
  {"dt":"2026-03-26","request_id":"test-req-direct","widget_id":"test-direct-insert","widget_type":"product_rail","slug":"test_slug","title":"Test","title_hi":"","item_titles_hi":[],"status":"APPROVED","submitted_by":"test@test.com","edited_by":"satyam.gupta@apnamart.in","edited_at":"2026-03-26T10:44:06.477Z","env":"PROD","products_count":0,"pnc":{},"page_slug":"","hierarchy":{},"snapshot":{},"rejection_reason":"","header_widgets":{},"request_type":"Homepage Update","sort_order":0,"request_status":"APPROVED","submitted_at":"2026-03-26T10:00:00Z","result":"","error_msg":""},
];

const activityLog = [
  {"dt":"2026-03-26","action":"approve","user_email":"satyam.gupta@apnamart.in","user_name":"satyam.gupta","target_id":"test-req-direct","target_type":"request","details":{"approvedWidgets":1},"env":"PROD","created_at":"2026-03-26T10:44:06.626Z"},
  {"dt":"2026-03-26","action":"submit","user_email":"automation","user_name":"Automation","target_id":"a6069d93-d27d-4fd3-942e-045e2bb43934","target_type":"request","details":{"widgetCount":1},"env":"PROD","created_at":"2026-03-26T09:10:06.614Z"},
  {"dt":"2026-03-26","action":"submit","user_email":"automation","user_name":"Automation","target_id":"a8360c1f-4acd-49c2-ae43-242fff233cb3","target_type":"request","details":{"widgetCount":1},"env":"PROD","created_at":"2026-03-26T09:26:03.558Z"},
  {"dt":"2026-03-26","action":"approve","user_email":"satyam.gupta@apnamart.in","user_name":"satyam.gupta","target_id":"9b49bc9e-f4dc-477e-b552-cbf99d9bcf18","target_type":"request","details":{"approvedWidgets":1},"env":"PROD","created_at":"2026-03-26T09:46:13.723Z"},
  {"dt":"2026-03-26","action":"submit","user_email":"automation","user_name":"Automation","target_id":"8ada7038-fe50-4908-b88b-a7be774f273f","target_type":"request","details":{"widgetCount":1},"env":"PROD","created_at":"2026-03-26T09:20:25.962Z"},
  {"dt":"2026-03-26","action":"approve","user_email":"satyam.gupta@apnamart.in","user_name":"satyam.gupta","target_id":"8ada7038-fe50-4908-b88b-a7be774f273f","target_type":"request","details":{"approvedWidgets":1},"env":"PROD","created_at":"2026-03-26T11:37:19.885Z"},
  {"dt":"2026-03-26","action":"submit","user_email":"automation","user_name":"Automation","target_id":"9b49bc9e-f4dc-477e-b552-cbf99d9bcf18","target_type":"request","details":{"widgetCount":1},"env":"PROD","created_at":"2026-03-26T09:34:12.645Z"},
  {"dt":"2026-03-26","action":"page_submitted","user_email":"automation","user_name":"Automation","target_id":"","target_type":"","details":{"widgetCount":1,"totalWidgets":8,"user":"Automation","autoApproved":false},"env":"PROD","created_at":"2026-03-26T09:34:13.075Z"},
  {"dt":"2026-03-30","action":"","user_email":"","user_name":"","target_id":"","target_type":"","details":{},"env":"PROD","created_at":"2026-03-30T09:39:33.378Z"},
  {"dt":"2026-03-31","action":"approve","user_email":"satyam.gupta@apnamart.in","user_name":"satyam.gupta","target_id":"91cb3c45-0b85-46bb-aae8-7dc508463167","target_type":"request","details":{"approvedWidgets":1},"env":"PROD","created_at":"2026-03-31T08:59:52.767Z"},
  {"dt":"2026-03-31","action":"submit","user_email":"manoj.kumar","user_name":"manoj.kumar","target_id":"91cb3c45-0b85-46bb-aae8-7dc508463167","target_type":"request","details":{"widgetCount":1},"env":"PROD","created_at":"2026-03-31T08:58:42.749Z"},
  {"dt":"2026-03-31","action":"page_submitted","user_email":"manoj.kumar","user_name":"manoj.kumar","target_id":"","target_type":"","details":{"widgetCount":1,"totalWidgets":8,"user":"manoj.kumar","autoApproved":false},"env":"PROD","created_at":"2026-03-31T08:58:43.660Z"},
  {"dt":"2026-04-02","action":"reject","user_email":"satyam.gupta@apnamart.in","user_name":"satyam.gupta","target_id":"a8360c1f-4acd-49c2-ae43-242fff233cb3","target_type":"request","details":{"reason":"nahi chiye","widgetCount":1},"env":"PROD","created_at":"2026-04-02T10:21:03.581Z"},
  {"dt":"2026-04-02","action":"reject","user_email":"satyam.gupta@apnamart.in","user_name":"satyam.gupta","target_id":"test-001","target_type":"request","details":{"reason":"","widgetCount":1},"env":"PROD","created_at":"2026-04-02T10:20:53.756Z"},
  {"dt":"2026-04-02","action":"reject","user_email":"satyam.gupta@apnamart.in","user_name":"satyam.gupta","target_id":"a6069d93-d27d-4fd3-942e-045e2bb43934","target_type":"request","details":{"reason":"test","widgetCount":1},"env":"PROD","created_at":"2026-04-02T10:21:27.982Z"},
  {"dt":"2026-04-02","action":"reject","user_email":"satyam.gupta@apnamart.in","user_name":"satyam.gupta","target_id":"a5bae996-ce42-4bc3-852c-28fb558f3e20","target_type":"request","details":{"reason":"test","widgetCount":1},"env":"PROD","created_at":"2026-04-02T10:21:15.456Z"},
  {"dt":"2026-04-02","action":"submit","user_email":"satyam.gupta@apnamart.in","user_name":"satyam.gupta","target_id":"33048be1-be73-405c-b174-9a4a4f8abb5f","target_type":"request","details":{"widgetCount":1},"env":"PROD","created_at":"2026-04-02T10:25:26.050Z"},
  {"dt":"2026-04-02","action":"approve","user_email":"satyam.gupta@apnamart.in","user_name":"satyam.gupta","target_id":"33048be1-be73-405c-b174-9a4a4f8abb5f","target_type":"request","details":{"approvedWidgets":1,"autoApproved":true},"env":"PROD","created_at":"2026-04-02T10:25:27.098Z"},
  {"dt":"2026-04-02","action":"page_submitted","user_email":"satyam.gupta@apnamart.in","user_name":"satyam.gupta","target_id":"","target_type":"","details":{"widgetCount":1,"totalWidgets":8,"user":"satyam.gupta@apnamart.in","autoApproved":true},"env":"PROD","created_at":"2026-04-02T10:25:28.132Z"},
];

const userRoles = [
  {"email":"aayushi.chhatre2@apnamart.in","name":"Aayushi Chhatre","role":"CHECKER","env":"PROD","is_active":true,"added_at":"2026-02-26T13:05:15.284Z","added_by":"satyam.gupta@apnamart.in"},
  {"email":"satyam.gupta@apnamart.in","name":"satyam.gupta","role":"SUPER_ADMIN","env":"PROD","is_active":true,"added_at":"2026-01-01T00:00:00.000Z","added_by":""},
];

const locations = [
  {"key":"agra","env":"PROD","level_tag":"city","level_property":"agra","slug_suffix":"_agr","label":"Agra","type":"city","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"agra","env":"UAT","level_tag":"city","level_property":"agra","slug_suffix":"_agr","label":"Agra","type":"city","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"ahmedabad","env":"PROD","level_tag":"city","level_property":"ahmedabad","slug_suffix":"_ahm","label":"Ahmedabad","type":"city","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"ahmedabad","env":"UAT","level_tag":"city","level_property":"ahmedabad","slug_suffix":"_ahm","label":"Ahmedabad","type":"city","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"ap","env":"PROD","level_tag":"state","level_property":"andhra pradesh","slug_suffix":"_ap","label":"Andhra Pradesh","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"ap","env":"UAT","level_tag":"state","level_property":"andhra pradesh","slug_suffix":"_ap","label":"Andhra Pradesh","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"as","env":"PROD","level_tag":"state","level_property":"assam","slug_suffix":"_as","label":"Assam","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"as","env":"UAT","level_tag":"state","level_property":"assam","slug_suffix":"_as","label":"Assam","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"bhopal","env":"PROD","level_tag":"city","level_property":"bhopal","slug_suffix":"_bho","label":"Bhopal","type":"city","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"bhopal","env":"UAT","level_tag":"city","level_property":"bhopal","slug_suffix":"_bho","label":"Bhopal","type":"city","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"bhubaneswar","env":"PROD","level_tag":"city","level_property":"bhubaneswar","slug_suffix":"_bbsr","label":"Bhubaneswar","type":"city","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"bhubaneswar","env":"UAT","level_tag":"city","level_property":"bhubaneswar","slug_suffix":"_bbsr","label":"Bhubaneswar","type":"city","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"br","env":"PROD","level_tag":"state","level_property":"bihar","slug_suffix":"_br","label":"Bihar","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"br","env":"UAT","level_tag":"state","level_property":"bihar","slug_suffix":"_br","label":"Bihar","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"cg","env":"PROD","level_tag":"state","level_property":"chhattisgarh","slug_suffix":"_cg","label":"Chhattisgarh","type":"state","is_default":true,"is_enabled":true,"is_custom":false},
  {"key":"cg","env":"UAT","level_tag":"state","level_property":"chhattisgarh","slug_suffix":"_cg","label":"Chhattisgarh","type":"state","is_default":true,"is_enabled":true,"is_custom":false},
  {"key":"chandigarh","env":"PROD","level_tag":"city","level_property":"chandigarh","slug_suffix":"_chd","label":"Chandigarh","type":"city","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"chandigarh","env":"UAT","level_tag":"city","level_property":"chandigarh","slug_suffix":"_chd","label":"Chandigarh","type":"city","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"dl","env":"PROD","level_tag":"state","level_property":"delhi","slug_suffix":"_dl","label":"Delhi","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"dl","env":"UAT","level_tag":"state","level_property":"delhi","slug_suffix":"_dl","label":"Delhi","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"ga","env":"PROD","level_tag":"state","level_property":"goa","slug_suffix":"_ga","label":"Goa","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"ga","env":"UAT","level_tag":"state","level_property":"goa","slug_suffix":"_ga","label":"Goa","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"gj","env":"PROD","level_tag":"state","level_property":"gujarat","slug_suffix":"_gj","label":"Gujarat","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"gj","env":"UAT","level_tag":"state","level_property":"gujarat","slug_suffix":"_gj","label":"Gujarat","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"guwahati","env":"PROD","level_tag":"city","level_property":"guwahati","slug_suffix":"_gwh","label":"Guwahati","type":"city","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"guwahati","env":"UAT","level_tag":"city","level_property":"guwahati","slug_suffix":"_gwh","label":"Guwahati","type":"city","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"hp","env":"PROD","level_tag":"state","level_property":"himachal pradesh","slug_suffix":"_hp","label":"Himachal Pradesh","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"hp","env":"UAT","level_tag":"state","level_property":"himachal pradesh","slug_suffix":"_hp","label":"Himachal Pradesh","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"hr","env":"PROD","level_tag":"state","level_property":"haryana","slug_suffix":"_hr","label":"Haryana","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"hr","env":"UAT","level_tag":"state","level_property":"haryana","slug_suffix":"_hr","label":"Haryana","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"indore","env":"PROD","level_tag":"city","level_property":"indore","slug_suffix":"_ind","label":"Indore","type":"city","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"indore","env":"UAT","level_tag":"city","level_property":"indore","slug_suffix":"_ind","label":"Indore","type":"city","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"jaipur","env":"PROD","level_tag":"city","level_property":"jaipur","slug_suffix":"_jai","label":"Jaipur","type":"city","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"jaipur","env":"UAT","level_tag":"city","level_property":"jaipur","slug_suffix":"_jai","label":"Jaipur","type":"city","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"jh","env":"PROD","level_tag":"state","level_property":"jharkhand","slug_suffix":"_jh","label":"Jharkhand","type":"state","is_default":true,"is_enabled":true,"is_custom":false},
  {"key":"jh","env":"UAT","level_tag":"state","level_property":"jharkhand","slug_suffix":"_jh","label":"Jharkhand","type":"state","is_default":true,"is_enabled":true,"is_custom":false},
  {"key":"ka","env":"PROD","level_tag":"state","level_property":"karnataka","slug_suffix":"_ka","label":"Karnataka","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"ka","env":"UAT","level_tag":"state","level_property":"karnataka","slug_suffix":"_ka","label":"Karnataka","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"kanpur","env":"PROD","level_tag":"city","level_property":"kanpur","slug_suffix":"_knp","label":"Kanpur","type":"city","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"kanpur","env":"UAT","level_tag":"city","level_property":"kanpur","slug_suffix":"_knp","label":"Kanpur","type":"city","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"ke","env":"PROD","level_tag":"state","level_property":"kerala","slug_suffix":"_ke","label":"Kerala","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"ke","env":"UAT","level_tag":"state","level_property":"kerala","slug_suffix":"_ke","label":"Kerala","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"kolkata","env":"PROD","level_tag":"city","level_property":"kolkata","slug_suffix":"_kol","label":"Kolkata","type":"city","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"kolkata","env":"UAT","level_tag":"city","level_property":"kolkata","slug_suffix":"_kol","label":"Kolkata","type":"city","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"lucknow","env":"PROD","level_tag":"city","level_property":"lucknow","slug_suffix":"_lko","label":"Lucknow","type":"city","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"lucknow","env":"UAT","level_tag":"city","level_property":"lucknow","slug_suffix":"_lko","label":"Lucknow","type":"city","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"mh","env":"PROD","level_tag":"state","level_property":"maharashtra","slug_suffix":"_mh","label":"Maharashtra","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"mh","env":"UAT","level_tag":"state","level_property":"maharashtra","slug_suffix":"_mh","label":"Maharashtra","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"ml","env":"PROD","level_tag":"state","level_property":"meghalaya","slug_suffix":"_ml","label":"Meghalaya","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"ml","env":"UAT","level_tag":"state","level_property":"meghalaya","slug_suffix":"_ml","label":"Meghalaya","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"mn","env":"PROD","level_tag":"state","level_property":"manipur","slug_suffix":"_mn","label":"Manipur","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"mn","env":"UAT","level_tag":"state","level_property":"manipur","slug_suffix":"_mn","label":"Manipur","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"mp","env":"PROD","level_tag":"state","level_property":"madhya pradesh","slug_suffix":"_mp","label":"Madhya Pradesh","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"mp","env":"UAT","level_tag":"state","level_property":"madhya pradesh","slug_suffix":"_mp","label":"Madhya Pradesh","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"mumbai","env":"PROD","level_tag":"city","level_property":"mumbai","slug_suffix":"_mum","label":"Mumbai","type":"city","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"mumbai","env":"UAT","level_tag":"city","level_property":"mumbai","slug_suffix":"_mum","label":"Mumbai","type":"city","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"nagpur","env":"PROD","level_tag":"city","level_property":"nagpur","slug_suffix":"_ngp","label":"Nagpur","type":"city","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"nagpur","env":"UAT","level_tag":"city","level_property":"nagpur","slug_suffix":"_ngp","label":"Nagpur","type":"city","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"od","env":"PROD","level_tag":"state","level_property":"odisha","slug_suffix":"_od","label":"Odisha","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"od","env":"UAT","level_tag":"state","level_property":"odisha","slug_suffix":"_od","label":"Odisha","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"patna","env":"PROD","level_tag":"city","level_property":"patna","slug_suffix":"_patna","label":"Patna","type":"city","is_default":true,"is_enabled":true,"is_custom":false},
  {"key":"patna","env":"UAT","level_tag":"city","level_property":"patna","slug_suffix":"_patna","label":"Patna","type":"city","is_default":true,"is_enabled":true,"is_custom":false},
  {"key":"pb","env":"PROD","level_tag":"state","level_property":"punjab","slug_suffix":"_pb","label":"Punjab","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"pb","env":"UAT","level_tag":"state","level_property":"punjab","slug_suffix":"_pb","label":"Punjab","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"pune","env":"PROD","level_tag":"city","level_property":"pune","slug_suffix":"_pun","label":"Pune","type":"city","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"pune","env":"UAT","level_tag":"city","level_property":"pune","slug_suffix":"_pun","label":"Pune","type":"city","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"raipur","env":"PROD","level_tag":"city","level_property":"raipur","slug_suffix":"_rpr","label":"Raipur","type":"city","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"raipur","env":"UAT","level_tag":"city","level_property":"raipur","slug_suffix":"_rpr","label":"Raipur","type":"city","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"ranchi","env":"PROD","level_tag":"city","level_property":"ranchi","slug_suffix":"_rnc","label":"Ranchi","type":"city","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"ranchi","env":"UAT","level_tag":"city","level_property":"ranchi","slug_suffix":"_rnc","label":"Ranchi","type":"city","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"rj","env":"PROD","level_tag":"state","level_property":"rajasthan","slug_suffix":"_rj","label":"Rajasthan","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"rj","env":"UAT","level_tag":"state","level_property":"rajasthan","slug_suffix":"_rj","label":"Rajasthan","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"sk","env":"PROD","level_tag":"state","level_property":"sikkim","slug_suffix":"_sk","label":"Sikkim","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"sk","env":"UAT","level_tag":"state","level_property":"sikkim","slug_suffix":"_sk","label":"Sikkim","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"surat","env":"PROD","level_tag":"city","level_property":"surat","slug_suffix":"_sur","label":"Surat","type":"city","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"surat","env":"UAT","level_tag":"city","level_property":"surat","slug_suffix":"_sur","label":"Surat","type":"city","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"tg","env":"PROD","level_tag":"state","level_property":"telangana","slug_suffix":"_tg","label":"Telangana","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"tg","env":"UAT","level_tag":"state","level_property":"telangana","slug_suffix":"_tg","label":"Telangana","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"tn","env":"PROD","level_tag":"state","level_property":"tamil nadu","slug_suffix":"_tn","label":"Tamil Nadu","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"tn","env":"UAT","level_tag":"state","level_property":"tamil nadu","slug_suffix":"_tn","label":"Tamil Nadu","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"uk","env":"PROD","level_tag":"state","level_property":"uttarakhand","slug_suffix":"_uk","label":"Uttarakhand","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"uk","env":"UAT","level_tag":"state","level_property":"uttarakhand","slug_suffix":"_uk","label":"Uttarakhand","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"up","env":"PROD","level_tag":"state","level_property":"uttar pradesh","slug_suffix":"_up","label":"Uttar Pradesh","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"up","env":"UAT","level_tag":"state","level_property":"uttar pradesh","slug_suffix":"_up","label":"Uttar Pradesh","type":"state","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"varanasi","env":"PROD","level_tag":"city","level_property":"varanasi","slug_suffix":"_vns","label":"Varanasi","type":"city","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"varanasi","env":"UAT","level_tag":"city","level_property":"varanasi","slug_suffix":"_vns","label":"Varanasi","type":"city","is_default":false,"is_enabled":false,"is_custom":false},
  {"key":"wb","env":"PROD","level_tag":"state","level_property":"west bengal","slug_suffix":"_wb","label":"West Bengal","type":"state","is_default":true,"is_enabled":true,"is_custom":false},
  {"key":"wb","env":"UAT","level_tag":"state","level_property":"west bengal","slug_suffix":"_wb","label":"West Bengal","type":"state","is_default":true,"is_enabled":true,"is_custom":false},
];

// ── Migration ──

async function migrate(table, rows, label) {
  if (rows.length === 0) {
    console.log(`  ${label}: 0 rows (skip)`);
    return;
  }
  const { data, error } = await supabase.from(table).insert(rows);
  if (error) {
    console.error(`  ${label}: ERROR — ${error.message}`);
    if (error.details) console.error(`    ${error.details}`);
  } else {
    console.log(`  ${label}: ${rows.length} rows ✓`);
  }
}

async function main() {
  console.log('Migrating ClickHouse → Supabase...\n');

  await migrate('canvas_widgets', canvasWidgets, 'canvas_widgets');
  await migrate('submissions', submissions, 'submissions');
  await migrate('activity_log', activityLog, 'activity_log');
  await migrate('user_roles', userRoles, 'user_roles');
  await migrate('locations', locations, 'locations');

  console.log('\nDone! Total: 126 rows migrated.');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
