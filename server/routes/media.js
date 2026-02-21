import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { uploadToDrive, isDriveAvailable } from '../services/DriveService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

const router = Router();

// ── POST /media/upload ──
// 1. multer saves file to server/uploads/ (temp)
// 2. If Google Drive credentials exist → uploads to Drive → returns Drive URL
// 3. If no credentials → falls back to local server URL
router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const localFilePath = path.join(UPLOADS_DIR, req.file.filename);
  const localViewUrl = `/api/local/media/files/${req.file.filename}`;

  // Try Google Drive upload
  try {
    const driveResult = await uploadToDrive(
      localFilePath,
      req.file.originalname,
      req.file.mimetype
    );

    if (driveResult) {
      // Drive upload succeeded — delete local temp file
      fs.unlink(localFilePath, (err) => {
        if (err) console.warn('[media] Failed to delete temp file:', err.message);
      });

      console.log('[media] Uploaded to Drive:', driveResult.fileId);

      return res.json({
        success: true,
        storage: 'drive',
        fileId: driveResult.fileId,
        fileName: driveResult.fileName,
        viewUrl: driveResult.directUrl,     // Direct image URL for <img> tags
        driveViewUrl: driveResult.viewUrl,   // Google Drive viewer URL
        driveFileId: driveResult.fileId,
      });
    }
  } catch (err) {
    console.error('[media] Drive upload failed, falling back to local:', err.message);
  }

  // Fallback: local server storage
  res.json({
    success: true,
    storage: 'local',
    fileId: req.file.filename,
    fileName: req.file.originalname,
    viewUrl: localViewUrl,
  });
});

// ── GET /media/files/:filename ──
// Serves locally uploaded files
router.get('/files/:filename', (req, res) => {
  const filePath = path.join(UPLOADS_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  res.sendFile(filePath);
});

// ── GET /media/status ──
// Check if Google Drive is configured
router.get('/status', (_req, res) => {
  res.json({
    driveConfigured: isDriveAvailable(),
    localUploadDir: UPLOADS_DIR,
  });
});

export default router;
