import express from 'express';
import { partnerController } from '../controllers/driverController';
import { authMiddleware, adminOnly } from '../middlewares/authMiddleware';
import { upload } from '../../utils/s3Config';

const router = express.Router();

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

// S3 upload route for driver documents
router.post('/s3/upload', authMiddleware, (req: express.Request, res: express.Response): void => {
  // Use dynamic field based on request
  const fieldName = req.query.type === 'profile' ? 'profileImage' : 'file';
  
  upload.single(fieldName)(req, res, (err) => {
    try {
      if (err) {
        console.error('Multer upload error:', err);
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
      
      const s3File = req.file as Express.MulterS3.File;
      
      res.json({ 
        success: true, 
        message: 'File uploaded successfully',
        fileUrl: s3File.location,
        fileType: fieldName === 'profileImage' ? 'profile' : 'document'
      });
    } catch (error) {
      console.error('S3 upload error:', error);
      res.status(500).json({ success: false, error: 'Failed to upload file' });
    }
  });
});

export default router;