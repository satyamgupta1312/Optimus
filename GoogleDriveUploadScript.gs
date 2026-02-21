// Google Apps Script - Google Drive File Upload Web App
// Deploy as a Web App with "Execute as" set to your Google account
// and "Who has access" set to "Anyone"

// Configuration
const DRIVE_FOLDER_ID = '1sSv358Psa57WaA6KKY84TQf4LQFvL19N';

/**
 * Main entry point for handling POST requests
 */
function doPost(e) {
  try {
    // Check if request contains file data
    if (!e.parameter || (!e.parameter.fileName && !e.fileBlob)) {
      return createResponse(false, 'No file provided', null);
    }

    // Handle two upload methods:
    // 1. multipart/form-data with fileBlob
    // 2. base64 encoded file in parameter

    let fileName, fileBlob;

    if (e.fileBlob) {
      // Method 1: File uploaded as multipart/form-data
      // The file should be sent in form field named 'file'
      const keys = Object.keys(e.fileBlob);
      if (keys.length === 0) {
        return createResponse(false, 'No file blob found in request', null);
      }

      fileName = e.parameter.fileName || e.fileBlob[keys[0]].getName();
      fileBlob = e.fileBlob[keys[0]];
    } else if (e.parameter.fileBase64 && e.parameter.fileName) {
      // Method 2: File sent as base64 encoded string
      fileName = e.parameter.fileName;
      const base64Data = e.parameter.fileBase64;

      try {
        const decodedBlob = Utilities.newBlob(
          Utilities.base64Decode(base64Data),
          e.parameter.mimeType || 'application/octet-stream'
        );
        fileBlob = decodedBlob.setName(fileName);
      } catch (error) {
        return createResponse(false, 'Invalid base64 data: ' + error.message, null);
      }
    } else {
      return createResponse(false, 'Invalid request format', null);
    }

    // Validate file name
    if (!fileName || fileName.trim() === '') {
      return createResponse(false, 'File name is required', null);
    }

    // Get the target folder
    const targetFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);

    // Create the file in Google Drive
    const file = targetFolder.createFile(fileBlob);

    // Make the file publicly viewable
    file.setSharing(
      DriveApp.Access.ANYONE,
      DriveApp.Permission.VIEW
    );

    // Generate URLs
    const fileId = file.getId();
    const viewUrl = `https://drive.google.com/file/d/${fileId}/view`;
    const directUrl = `https://drive.google.com/uc?id=${fileId}&export=download`;

    // Log the upload (optional)
    Logger.log(`File uploaded: ${fileName} (ID: ${fileId})`);

    // Return success response
    return createResponse(true, 'File uploaded successfully', {
      fileId: fileId,
      fileName: file.getName(),
      mimeType: file.getMimeType(),
      viewUrl: viewUrl,
      directUrl: directUrl,
      size: file.getSize(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    Logger.log('Error in doPost: ' + error.message);
    return createResponse(false, 'Server error: ' + error.message, null);
  }
}

/**
 * Optional: Handle GET requests (for testing and health check)
 */
function doGet(e) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Google Drive Upload API</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; }
          .container { border: 1px solid #ddd; padding: 20px; border-radius: 5px; }
          h1 { color: #1f2937; }
          .section { margin: 20px 0; padding: 15px; background: #f9fafb; border-left: 4px solid #3b82f6; }
          code { background: #f3f4f6; padding: 2px 5px; border-radius: 3px; }
          pre { background: #1f2937; color: #f3f4f6; padding: 15px; border-radius: 5px; overflow-x: auto; }
          .endpoint { color: #0891b2; font-weight: bold; }
          .success { color: #059669; }
          .error { color: #dc2626; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Google Drive Upload API</h1>
          <p>This Web App provides an API for uploading files to Google Drive.</p>

          <div class="section">
            <h2>Endpoint Status</h2>
            <p><span class="success">✓ Running</span> - API is active</p>
          </div>

          <div class="section">
            <h2>Upload Methods</h2>

            <h3>Method 1: Multipart Form Data (Recommended)</h3>
            <pre>curl -X POST -F "file=@/path/to/file.pdf" \\
  "${e.source.getUrl()}"</pre>

            <h3>Method 2: Base64 Encoded</h3>
            <pre>curl -X POST \\
  -d "fileBase64=BASE64_ENCODED_DATA&fileName=file.pdf&mimeType=application/pdf" \\
  "${e.source.getUrl()}"</pre>
          </div>

          <div class="section">
            <h2>Response Format</h2>
            <pre>{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "fileId": "...",
    "fileName": "...",
    "mimeType": "...",
    "viewUrl": "https://drive.google.com/file/d/.../view",
    "directUrl": "https://drive.google.com/uc?id=...&export=download",
    "size": 12345,
    "timestamp": "2026-02-21T..."
  }
}</pre>
          </div>

          <div class="section">
            <h2>Target Folder</h2>
            <p>Folder ID: <code>${DRIVE_FOLDER_ID}</code></p>
          </div>
        </div>
      </body>
    </html>
  `;
  return HtmlService.createHtmlOutput(html);
}

/**
 * Helper function to create standardized response
 */
function createResponse(success, message, data) {
  const response = {
    success: success,
    message: message
  };

  if (data !== null) {
    response.data = data;
  }

  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Optional: Test function to verify the script works
 * Run this from the Apps Script editor to test basic functionality
 */
function testUpload() {
  try {
    // Create a simple test file
    const testContent = 'This is a test file created at ' + new Date().toISOString();
    const testBlob = Utilities.newBlob(testContent, 'text/plain', 'test.txt');

    // Get the target folder
    const targetFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);

    // Create the file
    const file = targetFolder.createFile(testBlob);

    // Make it public
    file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);

    const fileId = file.getId();
    console.log('Test file created successfully!');
    console.log('File ID: ' + fileId);
    console.log('View URL: https://drive.google.com/file/d/' + fileId + '/view');

  } catch (error) {
    console.log('Test failed: ' + error.message);
  }
}
