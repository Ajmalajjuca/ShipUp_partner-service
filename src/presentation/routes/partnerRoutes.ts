import express from 'express';
import { partnerController } from '../controllers/driverController';
import { authMiddleware, adminOnly } from '../middlewares/authMiddleware';
import { upload } from '../../utils/s3Config';
import path from 'path';

const router = express.Router();

// Add interface for S3 file type
interface MulterS3File extends Express.Multer.File {
  location?: string;
}

// Serve uploaded files statically
router.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Public routes
router.post('/drivers', 
  upload.fields([
    { name: 'aadhar', maxCount: 1 },
    { name: 'pan', maxCount: 1 },
    { name: 'license', maxCount: 1 },
    { name: 'insuranceDoc', maxCount: 1 },
    { name: 'pollutionDoc', maxCount: 1 },
    { name: 'profilePicture', maxCount: 1 }
  ]),
  partnerController.create
);

// Routes that accept both admin and partner tokens
router.get('/drivers/verify-doc', authMiddleware, partnerController.verifyDoc);

// Admin-only routes
router.get('/drivers', adminOnly, partnerController.getAll);
router.put('/drivers/:partnerId/status', adminOnly, partnerController.updateStatus);
router.delete('/drivers/:partnerId', adminOnly, partnerController.delete);
router.get('/drivers/:partnerId', partnerController.getById);
router.put('/drivers/:partnerId/verification', adminOnly, partnerController.updateVerificationStatus);
router.put('/drivers/:partnerId', adminOnly, partnerController.update);

// Add this route
router.get('/drivers/by-email/:email', partnerController.getByEmail);

// Add these new routes for profile updates
router.put('/drivers/:partnerId/personal', authMiddleware, partnerController.updatePersonalInfo);
router.put('/drivers/:partnerId/vehicle', authMiddleware, partnerController.updateVehicleInfo);
router.put('/drivers/:partnerId/bank', authMiddleware, partnerController.updateBankInfo);
router.put('/drivers/:partnerId/profile-image', 
  authMiddleware,
  upload.single('profileImage'),
  partnerController.updateProfileImage
);

// New route for updating document URLs directly
router.put('/drivers/:partnerId/documents', 
  authMiddleware,
  partnerController.updateDocumentUrls
);

// File upload route
router.post('/s3/upload', authMiddleware, (req: express.Request, res: express.Response): void => {
  // Use dynamic field based on request
  const fieldName = req.query.type === 'profile' ? 'profileImage' : 'file';
  console.log('Field name:', fieldName);
  
  upload.single(fieldName)(req, res, (err) => {
    try {
      if (err) {
        console.error('Upload error:', err);
        res.status(400).json({ 
          success: false, 
          error: 'Error uploading file: ' + err.message 
        });
        return;
      }
      
      if (!req.file) {
        res.status(400).json({ success: false, error: 'No file uploaded' });
        return;
      }
      
      const file = req.file as MulterS3File;
      let fileUrl = '';
      
      // Check if using S3 or local disk storage
      if (file.location) {
        // S3 storage - use the location property directly
        fileUrl = file.location;
      } else if (file.destination) {
        // Local disk storage - construct path based on destination and filename
        fileUrl = `/api/uploads/${file.destination.split('uploads/')[1]}/${file.filename}`;
      } else {
        // Fallback
        fileUrl = `/api/uploads/${file.filename}`;
      }
      
      res.json({ 
        success: true, 
        message: 'File uploaded successfully',
        fileUrl: fileUrl,
        fileType: fieldName === 'profileImage' ? 'profile' : 'document',
        originalname: file.originalname,
        filename: file.filename,
        path: file.path || file.location || ''
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ success: false, error: 'Failed to upload file' });
    }
  });
});

export default router;