/**
 * DriveService — Google Drive upload via Google Apps Script Web App.
 *
 * How it works:
 *   1. multer saves file locally (temp)
 *   2. This service reads the file, converts to base64
 *   3. POSTs to deployed Apps Script → creates file in Drive folder
 *   4. Apps Script makes file publicly viewable → returns Drive URLs
 *   5. Local temp file is deleted
 *
 * Setup (one-time, 5 minutes):
 *   1. Go to https://script.google.com → New Project
 *   2. Paste the code from GoogleDriveUploadScript.gs
 *   3. Deploy → Web App → Execute as "Me" → Access "Anyone"
 *   4. Copy the deployment URL
 *   5. Create server/.env with: GOOGLE_APPS_SCRIPT_URL=<your-url>
 *
 * Target folder: 1sSv358Psa57WaA6KKY84TQf4LQFvL19N
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from server/ directory
const ENV_PATH = path.join(__dirname, '..', '.env');
let APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL || '';

// Simple .env loader (no dotenv dependency needed)
try {
  if (fs.existsSync(ENV_PATH)) {
    const envContent = fs.readFileSync(ENV_PATH, 'utf-8');
    for (const line of envContent.split('\n')) {
      const match = line.match(/^GOOGLE_APPS_SCRIPT_URL=(.+)$/);
      if (match) APPS_SCRIPT_URL = match[1].trim();
    }
  }
} catch { /* ignore */ }

if (APPS_SCRIPT_URL) {
  console.log('[DriveService] Apps Script URL configured ✓');
} else {
  console.warn('[DriveService] No GOOGLE_APPS_SCRIPT_URL — will use local storage only.');
}

/**
 * Upload a file to Google Drive via Apps Script.
 *
 * @param {string} filePath - Absolute path to the local file
 * @param {string} originalName - Original filename
 * @param {string} mimeType - MIME type (e.g. 'image/jpeg')
 * @returns {{ fileId, viewUrl, directUrl }} or null if Drive is unavailable
 */
export async function uploadToDrive(filePath, originalName, mimeType) {
  if (!APPS_SCRIPT_URL) return null;

  // Read file and convert to base64
  const fileBuffer = fs.readFileSync(filePath);
  const base64Data = fileBuffer.toString('base64');

  // POST to Apps Script with base64 payload
  const params = new URLSearchParams({
    fileBase64: base64Data,
    fileName: originalName,
    mimeType: mimeType,
  });

  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    redirect: 'follow', // Apps Script redirects on deploy
  });

  if (!res.ok) {
    throw new Error(`Apps Script returned HTTP ${res.status}`);
  }

  const result = await res.json();

  if (!result.success) {
    throw new Error(result.message || 'Apps Script upload failed');
  }

  const data = result.data;
  return {
    fileId: data.fileId,
    fileName: data.fileName,
    viewUrl: data.viewUrl,
    // Direct URL that works in <img> tags
    directUrl: `https://lh3.googleusercontent.com/d/${data.fileId}`,
  };
}

/**
 * Check if Drive upload is available.
 */
export function isDriveAvailable() {
  return !!APPS_SCRIPT_URL;
}
