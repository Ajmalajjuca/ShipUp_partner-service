import { S3Client } from '@aws-sdk/client-s3';
import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';
import { config } from '../infrastructure/config';
import fs from 'fs';

// Initialize S3 client (AWS SDK v3)
const s3Client = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId || '',
    secretAccessKey: config.aws.secretAccessKey || ''
  }
});

// Determine storage method based on configuration
const getStorage = () => {
  // Check if S3 credentials are configured
  if (config.aws.accessKeyId && config.aws.secretAccessKey) {
    console.log('Using S3 storage for file uploads');
    return multerS3({
      s3: s3Client,
      bucket: config.aws.s3.bucket,
      metadata: (req, file, cb) => {
        cb(null, { fieldName: file.fieldname });
      },
      key: (req, file, cb) => {
        const folderPath = getFolderPath(file.fieldname);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const filename = file.fieldname + '-' + uniqueSuffix + ext;
        cb(null, `${folderPath}/${filename}`);
      }
    });
  } else {
    console.log('S3 credentials not found, using local disk storage');
    return getDiskStorage();
  }
};

// Set up disk storage as fallback
const getDiskStorage = () => {
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  return multer.diskStorage({
    destination: (req, file, cb) => {
      const folderPath = path.join(uploadDir, getFolderPath(file.fieldname));
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
      cb(null, folderPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
  });
};

// Configure multer
export const upload = multer({
  storage: getStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only images and PDFs
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const ext = path.extname(file.originalname).toLowerCase();
    const mimetype = file.mimetype;
    
    if (allowedTypes.test(ext) && allowedTypes.test(mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, JPG, PNG, and PDF files are allowed'));
    }
  }
});

/**
 * Determine folder path based on document type
 */
function getFolderPath(fieldname: string): string {
  switch (fieldname) {
    case 'aadhar':
      return 'documents/aadhar';
    case 'pan':
      return 'documents/pan';
    case 'license':
      return 'documents/license';
    case 'insuranceDoc':
      return 'documents/insurance';
    case 'pollutionDoc':
      return 'documents/pollution';
    case 'profilePicture':
    case 'profileImage':
      return 'profiles';
    default:
      return 'documents/other';
  }
}
