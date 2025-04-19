import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export const config = {
  server: {
    port: process.env.PORT || '3003',
    env: process.env.NODE_ENV || 'development',
  },
  database: {
    url: process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/partner_service_db',
  },
  services: {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    user: process.env.USER_SERVICE_URL || 'http://localhost:3002',
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1',
    s3: {
      bucket: process.env.AWS_S3_BUCKET || process.env.AWS_PARTNER_BUCKET_NAME || 'shipup-partners',
    },
  }
}; 