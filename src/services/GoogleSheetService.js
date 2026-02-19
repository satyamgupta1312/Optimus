// Service to interact with Google Sheets Backend

// Google Apps Script URL for Queue & Approval (Approval_Automation.gs)
const SHEET_ID = 'AKfycbwGI4r4nDqo5iKIYubUGpAUTaDN-Z1Su_fsD8EmQ7bxIP3XB0HmEdfXFG89hk0uMVZfBQ';
const SHEET_API_URL = import.meta.env.DEV
    ? '/api/google-sheet'
    : `https://script.google.com/macros/s/${SHEET_ID}/exec`;

// Note: Primary Masthead uses a SEPARATE backend (Primary_Masthead_Backend.gs)
// This is only kept for reference but NOT USED now since Master Key is manual input

export const GoogleSheetService = {
    /**
     * Fetch all pending requests
     */
    getRequests: async () => {
        if (!SHEET_API_URL) return [];
        try {
            console.log("Fetching requests from:", SHEET_API_URL);
            const res = await fetch(SHEET_API_URL, {
                method: 'GET',
                redirect: 'follow'
            });
            const text = await res.text();
            try {
                return JSON.parse(text);
            } catch (e) {
                console.error("Failed to parse Sheet response:", text);
                return [];
            }
        } catch (error) {
            console.error("Sheet API Error:", error);
            return [];
        }
    },

    /**
     * Create a new request (Maker submits)
     */
    createRequest: async (requestData) => {
        if (!SHEET_API_URL) {
            console.warn("No Sheet URL provided.");
            return;
        }

        console.log("Creating request:", requestData);

        const payload = {
            action: 'create',
            ...requestData
        };

        // Key Fixes:
        // 1. redirect: 'follow' (Apps Script redirects)
        // 2. Content-Type: text/plain (Avoids CORS Preflight)
        // 3. body: JSON.stringify (Apps Script parses this)
        // 4. mode: 'no-cors' (Ignores response but sends data successfully)
        await fetch(SHEET_API_URL, {
            method: 'POST',
            mode: 'no-cors',
            redirect: 'follow',
            headers: {
                "Content-Type": "text/plain;charset=utf-8",
            },
            body: JSON.stringify(payload)
        });
    },

    /**
     * Approve or Reject a request
     * @param {string} id - Request ID
     * @param {string} status - New status ('APPROVED' | 'REJECTED')
     * @param {string} [rejectionReason] - Optional reason shown to Maker on rejection
     */
    updateStatus: async (id, status, rejectionReason = '') => {
        if (!SHEET_API_URL) return;

        console.log('Updating status:', id, status, rejectionReason ? `(reason: ${rejectionReason})` : '');

        const payload = {
            action: 'update_status',
            id,
            status,
            ...(rejectionReason ? { rejectionReason } : {})
        };

        await fetch(SHEET_API_URL, {
            method: 'POST',
            mode: 'no-cors',
            redirect: 'follow',
            headers: {
                "Content-Type": "text/plain;charset=utf-8",
            },
            body: JSON.stringify(payload)
        });
    },

    /**
     * Fetch product details by item codes from Google Sheets
     */
    fetchProductsByItemCodes: async (itemCodes) => {
        if (!SHEET_API_URL) {
            console.warn("No Sheet URL provided.");
            return [];
        }

        console.log("Fetching products for item codes:", itemCodes);

        const payload = {
            action: 'fetch_products',
            item_codes: Array.isArray(itemCodes) ? itemCodes : [itemCodes]
        };

        try {
            const res = await fetch(SHEET_API_URL, {
                method: 'POST',
                redirect: 'follow',
                headers: {
                    "Content-Type": "text/plain;charset=utf-8",
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            console.log("Products fetched from Google Sheets:", data);
            return data.products || [];
        } catch (error) {
            console.error("Error fetching products from Sheet:", error);
            return [];
        }
    },

    /**
     * Approve request and trigger widget creation automation
     */
    approveRequest: async (requestId, widgets, headerWidgets) => {
        if (!SHEET_API_URL) {
            console.warn("No Sheet URL provided.");
            return { success: false, error: "No API URL" };
        }

        console.log("[GoogleSheetService] Triggering approval automation for:", requestId);

        const payload = {
            action: 'approve',
            id: requestId,
            widgets: widgets,
            headerWidgets: headerWidgets
        };

        try {
            const res = await fetch(SHEET_API_URL, {
                method: 'POST',
                mode: 'cors',
                redirect: 'follow',
                headers: {
                    "Content-Type": "text/plain;charset=utf-8",
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            console.log("[GoogleSheetService] Approval response:", data);
            return data;
        } catch (error) {
            console.error("[GoogleSheetService] Approval failed:", error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Create Primary Masthead widget via separate backend
     */
    createPrimaryMasthead: async (widgetData) => {
        if (!PRIMARY_MASTHEAD_API_URL) {
            console.warn("[GoogleSheetService] Primary Masthead backend URL not configured");
            return { success: false, error: "Backend URL not configured. Please deploy Primary_Masthead_Backend.gs first." };
        }

        console.log("[GoogleSheetService] Creating Primary Masthead:", widgetData);

        try {
            const res = await fetch(PRIMARY_MASTHEAD_API_URL, {
                method: 'POST',
                mode: 'cors',
                redirect: 'follow',
                headers: {
                    "Content-Type": "text/plain;charset=utf-8",
                },
                body: JSON.stringify(widgetData)
            });


            const data = await res.json();
            console.log("[GoogleSheetService] Primary Masthead response:", data);
            return data;
        } catch (error) {
            console.error("[GoogleSheetService] Primary Masthead creation failed:", error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Fetch all approval users (checkers) from Google Sheet
     */
    getApprovalUsers: async () => {
        if (!SHEET_API_URL) return [];
        try {
            const res = await fetch(SHEET_API_URL, {
                method: 'POST',
                redirect: 'follow',
                headers: {
                    "Content-Type": "text/plain;charset=utf-8",
                },
                body: JSON.stringify({ action: 'get_approval_users' })
            });
            const data = await res.json();
            return data.users || [];
        } catch (error) {
            console.error("[GoogleSheetService] Failed to fetch approval users:", error);
            return [];
        }
    },

    /**
     * Add a user to the approval (checker) list
     */
    addApprovalUser: async (email, name) => {
        if (!SHEET_API_URL) return { success: false, error: "No API URL" };
        try {
            const res = await fetch(SHEET_API_URL, {
                method: 'POST',
                redirect: 'follow',
                headers: {
                    "Content-Type": "text/plain;charset=utf-8",
                },
                body: JSON.stringify({ action: 'add_approval_user', email, name })
            });
            const data = await res.json();
            return data;
        } catch (error) {
            console.error("[GoogleSheetService] Failed to add approval user:", error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Remove a user from the approval (checker) list
     */
    removeApprovalUser: async (email) => {
        if (!SHEET_API_URL) return { success: false, error: "No API URL" };
        try {
            const res = await fetch(SHEET_API_URL, {
                method: 'POST',
                redirect: 'follow',
                headers: {
                    "Content-Type": "text/plain;charset=utf-8",
                },
                body: JSON.stringify({ action: 'remove_approval_user', email })
            });
            const data = await res.json();
            return data;
        } catch (error) {
            console.error("[GoogleSheetService] Failed to remove approval user:", error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Upload media file to Google Drive
     * Returns the Drive URL for the uploaded file
     */
    uploadMediaToDrive: async (file) => {
        if (!SHEET_API_URL) {
            console.warn("[GoogleSheetService] No Sheet URL provided.");
            return { success: false, error: "No API URL" };
        }

        console.log("[GoogleSheetService] Uploading media to Drive:", file.name);

        try {
            // Convert file to base64
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    // Remove the data URL prefix (data:image/jpeg;base64,)
                    const result = reader.result.split(',')[1];
                    resolve(result);
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const payload = {
                action: 'uploadMedia',
                fileName: file.name,
                mimeType: file.type,
                fileData: base64
            };

            console.log("[GoogleSheetService] Sending upload request...");

            const res = await fetch(SHEET_API_URL, {
                method: 'POST',
                mode: 'cors',
                redirect: 'follow',
                headers: {
                    "Content-Type": "text/plain;charset=utf-8",
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            console.log("[GoogleSheetService] Upload response:", data);
            return data;
        } catch (error) {
            console.error("[GoogleSheetService] Upload failed:", error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Append an audit log entry to the Google Sheet.
     * Feature 8: Activity Log / Audit Trail
     * Wiki Reference: wiki/Backend-work-flow.md — Audit Trail
     *
     * Only called for significant actions: submit, approve, reject.
     * Minor UI actions (add widget, update field) stay in-memory only.
     */
    appendAuditLog: async ({ action, user, widgetId = null, details = {}, timestamp }) => {
        if (!SHEET_API_URL) return;
        const payload = {
            action: 'audit_log',
            log: {
                action,
                user,
                widgetId,
                details,
                timestamp: timestamp || new Date().toISOString(),
            }
        };
        try {
            await fetch(SHEET_API_URL, {
                method: 'POST',
                mode: 'no-cors',
                redirect: 'follow',
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(payload)
            });
        } catch (e) {
            console.warn('[GoogleSheetService] appendAuditLog failed (non-blocking):', e.message);
        }
    },

    /**
     * Fetch persisted audit log entries from the Google Sheet.
     * Feature 8: Activity Log / Audit Trail — Load from Sheet
     */
    fetchAuditLog: async () => {
        if (!SHEET_API_URL) return [];
        try {
            const res = await fetch(SHEET_API_URL, {
                method: 'POST',
                redirect: 'follow',
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ action: 'get_audit_log' })
            });
            const data = await res.json();
            return data.logs || [];
        } catch (error) {
            console.warn('[GoogleSheetService] fetchAuditLog failed:', error.message);
            return [];
        }
    }
};
