const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Define the storage directory for proofs
const proofStorageDir = path.join(__dirname, '..', 'private', 'uploads', 'proofs');

// Ensure the directory exists
if (!fs.existsSync(proofStorageDir)) {
  fs.mkdirSync(proofStorageDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, proofStorageDir);
  },
  filename: (req, file, cb) => {
    // Generate a unique filename to avoid collisions
    const uniqueSuffix = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, `${file.fieldname}-${Date.now()}-${uniqueSuffix}`);
  },
});

// File filter to accept only common image types and PDFs
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, GIF, and PDF are allowed.'), false);
  }
};

// Initialize multer with storage and file filter
const uploadProof = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5, // 5MB file size limit
  },
  fileFilter: fileFilter,
});

module.exports = { uploadProof };
