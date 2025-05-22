const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Define the storage directory for complaint attachments
const complaintAttachmentStorageDir = path.join(
  __dirname,
  '..',
  'private',
  'uploads',
  'complaint_attachments'
);

// Ensure the directory exists
if (!fs.existsSync(complaintAttachmentStorageDir)) {
  fs.mkdirSync(complaintAttachmentStorageDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, complaintAttachmentStorageDir);
  },
  filename: (req, file, cb) => {
    // Generate a unique filename to avoid collisions
    const uniqueSuffix = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, `complaint-${Date.now()}-${uniqueSuffix}`);
  },
});

// File filter to accept common image types, PDFs, and potentially small document files
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'text/plain', // .txt
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Invalid file type. Only JPG, PNG, GIF, PDF, DOC, DOCX, and TXT are allowed for attachments.'
      ),
      false
    );
  }
};

// Initialize multer with storage and file filter for complaint attachments
// 'attachments' would be the field name in the form-data for multiple files
const uploadComplaintAttachment = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 10, // 10MB file size limit per file
    files: 5, // Maximum 5 files per upload request
  },
  fileFilter: fileFilter,
});

// Note: If using this middleware in a route, it would be like:
// router.post('/', protect, uploadComplaintAttachment.array('attachments', 5), createComplaint);
// And the controller `createComplaint` would then need to access `req.files` (an array of file objects)
// and map them to URLs to be stored in `complaintData.attachments`.
// For example:
// if (req.files && req.files.length > 0) {
//   complaintData.attachments = req.files.map(file => file.path); // Stores relative path
// }
// The current implementation assumes `req.body.attachments` already contains URLs.

module.exports = { uploadComplaintAttachment };
