// Service to interact with Google Sheets Backend

// Google Apps Script URL for Queue & Approval (Approval_Automation.gs)
const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbzg-QgCLNP48RStsz_ssawL-EBia0whWkhuub0z_VmnQ1oFfJHoAQLOWbtjLqLjvxLuwA/exec';

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
     */
    updateStatus: async (id, status) => {
        if (!SHEET_API_URL) return;

        console.log("Updating status:", id, status);

        const payload = {
            action: 'update_status',
            id,
            status
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
    }
};
