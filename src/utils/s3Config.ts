import { S3Client } from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_PARTNER_BUCKET_NAME'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

// After validation, we can safely assert that these environment variables exist
const AWS_REGION = process.env.AWS_REGION as string;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID as string;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY as string;
const AWS_PARTNER_BUCKET_NAME = process.env.AWS_PARTNER_BUCKET_NAME as string;

const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY
  }
});

// Helper function to generate key based on document type
function generateS3Key(req: any, file: Express.Multer.File) {
  const { folder = 'misc', subFolder, driverId } = req.body;
  const timestamp = Date.now();
  const originalName = file.originalname.replace(/\s+/g, '_');

  // Start with base
  let key = '';

  if (folder === 'profile-images') {
    key = `profile-images/${driverId || 'unknown'}-${timestamp}-${originalName}`;
  } else if (folder === 'documents') {
    if (['insuranceDoc', 'pollutionDoc'].includes(subFolder)) {
      key = `documents/${subFolder}/${driverId || 'unknown'}-${timestamp}.pdf`;
    } else if (['license', 'aadhar', 'pan'].includes(subFolder)) {
      const side = req.body.side || 'front';
      key = `documents/${subFolder}/${side}/${driverId || 'unknown'}-${timestamp}-${originalName}`;
    }
  }

  return key || `${folder}/${timestamp}-${originalName}`;
}

// Configure multer-s3
const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: AWS_PARTNER_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      try {
        const s3Key = generateS3Key(req, file);
        cb(null, s3Key);
      } catch (err) {
        cb(new Error('Failed to generate S3 key'));
      }
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/pdf'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and PDF files are allowed.'));
    }
  }
});

export { s3Client, upload };
