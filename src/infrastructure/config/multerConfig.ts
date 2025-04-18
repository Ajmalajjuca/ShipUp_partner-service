import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../../uploads');
const profileImagesDir = path.join(uploadsDir, 'profile-images');
const documentsDir = path.join(uploadsDir, 'documents');

[uploadsDir, profileImagesDir, documentsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = uploadsDir;

    // Determine the appropriate subdirectory based on fieldname
    if (file.fieldname === 'profilePicture') {
      uploadPath = profileImagesDir;
    } else if (['aadhar', 'pan', 'license', 'insuranceDoc', 'pollutionDoc'].includes(file.fieldname)) {
      uploadPath = documentsDir;
    }

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp and original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allow only images for profile pictures
  if (file.fieldname === 'profilePicture') {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed for profile pictures!'));
    }
  }

  // Allow images and PDFs for documents
  if (['aadhar', 'pan', 'license', 'insuranceDoc', 'pollutionDoc'].includes(file.fieldname)) {
    if (!file.mimetype.startsWith('image/') && file.mimetype !== 'application/pdf') {
      return cb(new Error('Only image or PDF files are allowed for documents!'));
    }
  }

  cb(null, true);
};

// Configure multer
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB file size limit
  }
});

// Export the upload paths for use in other parts of the application
export const uploadPaths = {
  uploadsDir,
  profileImagesDir,
  documentsDir
}; 