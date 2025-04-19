// presentation/controllers/partnerController.ts
import { Request, Response } from 'express';
import { CreatePartner } from '../../domain/use-cases/createPartner';
import { PartnerRepositoryImpl } from '../../infrastructure/repositories/partnerRepositoryImpl';
import { getPartnerService } from '../../infrastructure/di/container';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { config } from '../../infrastructure/config';
import {
  processFileUploads,
  parseJsonField,
  validateRequiredFields,
  sendErrorResponse,
  sendSuccessResponse,
  areAllDocumentsComplete
} from '../../utils/controllerHelpers';
import { PartnerUpdateFields, VerificationSection, VehicleDocuments } from '../../types/common';
import { send } from 'process';

// Use dependency injection for services
const partnerRepository = new PartnerRepositoryImpl();
const createPartner = new CreatePartner(partnerRepository);
// Uncomment this when all DI components are fixed
// const partnerService = getPartnerService();

export const partnerController = {
  // Create a new partner
  async create(req: Request, res: Response) {
    try {
      const {
        fullName,
        mobileNumber,
        dateOfBirth,
        address,
        email,
        vehicleType,
        registrationNumber,
        accountHolderName,
        accountNumber,
        ifscCode,
        upiId,
        vehicleDocuments: vehicleDocumentsStr,
      } = req.body;

      // Parse vehicleDocuments from form data
      const vehicleDocuments = parseJsonField<VehicleDocuments>(vehicleDocumentsStr);
      
      // Process file uploads
      const fileMap = processFileUploads(req);
      
      // Validate required fields
      const requiredFields = [
        'fullName', 'mobileNumber', 'dateOfBirth', 'address', 'email',
        'vehicleType', 'registrationNumber', 'accountHolderName', 'accountNumber',
        'ifscCode', 'upiId'
      ];

      const missingFields = validateRequiredFields(req.body, requiredFields);

      if (missingFields.length > 0) {
         sendErrorResponse(
          res, 
          400, 
          `Missing required fields: ${missingFields.join(', ')}`
        );
        return
      }

      // Generate partner ID
      const partnerId = `PTR-${uuidv4()}`;

      // Register with auth service
      try {
        const authResponse = await axios.post(`${config.services.auth}/auth/register-driver`, {
          email,
          role: 'partner',
          partnerId,
        });
        
        if (!authResponse.data.success) {
           sendErrorResponse(
            res, 
            400,
            authResponse.data.error || 'Authentication registration failed'
          );
          return
        }
        
        // Create the partner with file paths and vehicle documents
        const result = await createPartner.execute({
          partnerId,
          fullName,
          mobileNumber,
          dateOfBirth,
          address,
          email,
          vehicleType,
          registrationNumber,
          accountHolderName,
          accountNumber,
          ifscCode,
          upiId,
          ...fileMap,
          vehicleDocuments,
        });
        
        if (!result.success) {
          // Rollback auth service registration if partner creation fails
          await axios.delete(`${config.services.auth}/auth/delete/${partnerId}`);
           sendErrorResponse(res, 400, result.error || 'Failed to create partner');
           return
        }
        
        // Generate a JWT token for the newly registered partner
        const tokenResult = await axios.post(`${config.services.auth}/auth/temp-token`, {
          userId: partnerId,
          email,
          role: 'partner'
        });
        
        const token = tokenResult.data.token;
        
        // res.status(201).json({
        //   success: true,
        //   status: 'success',
        //   message: 'Partner registered successfully.',
        //   driver: { email, partnerId },
        //   token
        // });
        sendSuccessResponse(res, 201, { email, partnerId }, 'Partner created successfully', token);
        return
      } catch (error) {
        console.error('Auth service error:', (error as any).response.data.error);
        sendErrorResponse(
          res, 
          500, 
          (error as any).response.data.error||'Failed to register with authentication service'
        );
        return
      }
    } catch (error) {
      console.error('Create partner error:', error);
      sendErrorResponse(res, 500, 'Internal server error');
      return
    }
  },

  // Verify partner documents
  async verifyDoc(req: Request, res: Response) {
    try {
      const { email } = req.query;
      
      if (!email || typeof email !== 'string') {
        sendErrorResponse(res, 400, 'Email query parameter is required');
        return
      }

      // Fetch partner by email
      const partner = await partnerRepository.findByEmail(email);
      if (!partner) {
        sendErrorResponse(res, 404, 'Partner not found');
        return
      }

      // Define verification status based on document presence
      const verificationData = {
        BankDetails: partner.bankDetailsCompleted,
        PersonalDocuments: partner.personalDocumentsCompleted,
        VehicleDetails: partner.vehicleDetailsCompleted
      };

      sendSuccessResponse(res, 200, verificationData);
      return
    } catch (error) {
      console.error('Verify document error:', error);
      sendErrorResponse(res, 500, 'Internal server error');
      return
    }
  },

  // Get all partners
  async getAll(req: Request, res: Response) {
    try {
      const partners = await partnerRepository.findAll();
      
      // Transform partner data for response
      const transformedPartners = partners.map(partner => ({
        partnerId: partner.partnerId,
        fullName: partner.fullName,
        email: partner.email,
        phone: partner.mobileNumber,
        profileImage: partner.profilePicturePath || null,
        createdAt: partner.createdAt,
        totalOrders: partner.totalOrders || 0,
        ongoing: partner.ongoingOrders || 0,
        canceled: partner.canceledOrders || 0,
        completed: partner.completedOrders || 0,
        status: partner.status || false,
        bankDetailsCompleted: partner.bankDetailsCompleted || false,
        personalDocumentsCompleted: partner.personalDocumentsCompleted || false,
        vehicleDetailsCompleted: partner.vehicleDetailsCompleted || false,
        vehicleDocuments: partner.vehicleDocuments || null
      }));

      
      sendSuccessResponse(res, 200, transformedPartners);
      return
    } catch (error) {
      console.error('Get all partners error:', error);
      sendErrorResponse(res, 500, 'Internal server error');
      return
    }
  },

  // Update partner status
  async updateStatus(req: Request, res: Response) {
    try {
      const { partnerId } = req.params;
      const newStatus = req.body.status;

      if (newStatus === undefined || typeof newStatus !== 'boolean') {
        sendErrorResponse(res, 400, 'Status must be a boolean value');
        return
      }

      const updatedPartner = await partnerRepository.updateStatus(partnerId, newStatus);

      if (!updatedPartner) {
        sendErrorResponse(res, 404, 'Partner not found');
        return
      }

      sendSuccessResponse(
        res, 
        200, 
        { ...updatedPartner, status: updatedPartner.status },
        'Partner status updated successfully'
      );
      return
    } catch (error) {
      console.error('Update partner status error:', error);
      sendErrorResponse(res, 500, 'Internal server error');
      return
    }
  },

  // Delete a partner
  async delete(req: Request, res: Response) {
    try {
      const { partnerId } = req.params;
      const deleted = await partnerRepository.delete(partnerId);

      if (!deleted) {
        sendErrorResponse(res, 404, 'Partner not found');
        return
      }

      // Also delete from auth service
      try {
        await axios.delete(`${config.services.auth}/auth/delete/${partnerId}`);
      } catch (error) {
        console.error('Failed to delete from auth service:', error);
      }

      sendSuccessResponse(res, 200, null, 'Partner deleted successfully');
      return
    } catch (error) {
      console.error('Delete partner error:', error);
      sendErrorResponse(res, 500, 'Internal server error');
      return
    }
  },

  // Get partner by ID
  async getById(req: Request, res: Response) {
    try {
      const { partnerId } = req.params;
      const partner = await partnerRepository.findById(partnerId);

      if (!partner) {
        sendErrorResponse(res, 404, 'Partner not found');
        return
      }

      // Transform paths for response
      const transformedPartner = {
        ...partner,
        profilePicturePath: partner.profilePicturePath || null,
        aadharPath: partner.aadharPath || null,
        panPath: partner.panPath || null,
        licensePath: partner.licensePath || null,
        insuranceDocPath: partner.insuranceDocPath || null,
        pollutionDocPath: partner.pollutionDocPath || null,
        vehicleDocuments: partner.vehicleDocuments || null
      };
      
      sendSuccessResponse(res, 200, transformedPartner);
      return
    } catch (error) {
      console.error('Get partner error:', error);
      sendErrorResponse(res, 500, 'Internal server error');
      return
    }
  },

  // Update verification status
  async updateVerificationStatus(req: Request, res: Response) {
    try {
      const { partnerId } = req.params;
      const { bankDetailsCompleted, personalDocumentsCompleted, vehicleDetailsCompleted } = req.body;

      // Only update fields that were provided
      const updateData: PartnerUpdateFields = {};
      if (bankDetailsCompleted !== undefined) updateData.bankDetailsCompleted = bankDetailsCompleted;
      if (personalDocumentsCompleted !== undefined) updateData.personalDocumentsCompleted = personalDocumentsCompleted;
      if (vehicleDetailsCompleted !== undefined) updateData.vehicleDetailsCompleted = vehicleDetailsCompleted;

      const updatedPartner = await partnerRepository.findByIdAndUpdate(partnerId, updateData);

      if (!updatedPartner) {
        sendErrorResponse(res, 404, 'Partner not found');
        return
      }

      sendSuccessResponse(res, 200, updatedPartner);
      return
    } catch (error) {
      console.error('Update verification status error:', error);
      sendErrorResponse(res, 500, 'Internal server error');
      return
    }
  },

  // Update partner information
  async update(req: Request, res: Response) {
    try {
      const { partnerId } = req.params;
      const { fullName, email, phone } = req.body;

      // Validate that at least one field is provided
      if (!fullName && !email && !phone) {
        sendErrorResponse(
          res, 
          400, 
          'At least one field (fullName, email, or phone) is required for update'
        );
        return
      }

      // Create update object with only provided fields
      const updateData: PartnerUpdateFields = {};
      if (fullName) updateData.fullName = fullName;
      if (email) updateData.email = email;
      if (phone) updateData.mobileNumber = phone;

      // Update partner
      const updatedPartner = await partnerRepository.findByIdAndUpdate(partnerId, updateData);

      if (!updatedPartner) {
        sendErrorResponse(res, 404, 'Partner not found');
        return
      }

      // If email was updated, update it in auth service as well
      if (email) {
        try {
          await axios.put(`${config.services.auth}/auth/update-email/${partnerId}`, {
            email: email
          });
        } catch (error) {
          console.error('Failed to update email in auth service:', error);
        }
      }

      // Return transformed partner data
      const transformedPartner = {
        partnerId: updatedPartner.partnerId,
        fullName: updatedPartner.fullName,
        email: updatedPartner.email,
        phone: updatedPartner.mobileNumber,
        status: updatedPartner.status,
        profileImage: updatedPartner.profilePicturePath || null,
        totalOrders: updatedPartner.totalOrders || 0,
        completedOrders: updatedPartner.completedOrders || 0,
        canceledOrders: updatedPartner.canceledOrders || 0,
        bankDetailsCompleted: updatedPartner.bankDetailsCompleted,
        personalDocumentsCompleted: updatedPartner.personalDocumentsCompleted,
        vehicleDetailsCompleted: updatedPartner.vehicleDetailsCompleted
      };

      sendSuccessResponse(
        res, 
        200, 
        transformedPartner, 
        'Partner updated successfully'
      );
      return
    } catch (error) {
      console.error('Update partner error:', error);
      sendErrorResponse(res, 500, 'Internal server error');
      return
    }
  },

  // Get partner by email
  async getByEmail(req: Request, res: Response) {
    try {
      const { email } = req.params;
      
      const partner = await partnerRepository.findByEmail(email);
      
      if (!partner) {
        sendErrorResponse(res, 404, 'Partner not found');
        return
      }

      const partnerData = {
        partnerId: partner.partnerId,
        email: partner.email,
        status: partner.status
      };

      sendSuccessResponse(res, 200, { partnerInfo: partnerData, partnerDetails: partner });
      return
    } catch (error) {
      console.error('Get partner by email error:', error);
      sendErrorResponse(res, 500, 'Internal server error');
      return
    }
  },

  // Update personal information
  async updatePersonalInfo(req: Request, res: Response) {
    try {
      const { partnerId } = req.params;
      const { fullName, mobileNumber, address, dateOfBirth } = req.body;

      // Validate required fields
      const requiredFields = ['fullName', 'mobileNumber', 'address', 'dateOfBirth'];
      const missingFields = validateRequiredFields(req.body, requiredFields);

      if (missingFields.length > 0) {
        sendErrorResponse(
          res, 
          400, 
          'All personal information fields are required'
        );
        return
      }

      const updateData: PartnerUpdateFields = {
        fullName,
        mobileNumber,
        address,
        dateOfBirth
      };

      const updatedPartner = await partnerRepository.findByIdAndUpdate(partnerId, updateData);
      
      if (!updatedPartner) {
        sendErrorResponse(res, 404, 'Partner not found');
        return
      }

      sendSuccessResponse(
        res, 
        200, 
        updatedPartner, 
        'Personal information updated successfully'
      );
      return
    } catch (error) {
      console.error('Update personal info error:', error);
      sendErrorResponse(res, 500, 'Internal server error');
      return
    }
  },

  // Update vehicle information
  async updateVehicleInfo(req: Request, res: Response) {
    try {
      const { partnerId } = req.params;
      const { vehicleType, registrationNumber } = req.body;

      // Validate required fields
      if (!vehicleType || !registrationNumber) {
        sendErrorResponse(
          res, 
          400, 
          'All vehicle information fields are required'
        );
        return
      }

      const updateData: PartnerUpdateFields = {
        vehicleType,
        registrationNumber
      };

      const updatedPartner = await partnerRepository.findByIdAndUpdate(partnerId, updateData);

      if (!updatedPartner) {
        sendErrorResponse(res, 404, 'Partner not found');
        return
      }

      sendSuccessResponse(
        res, 
        200, 
        updatedPartner, 
        'Vehicle information updated successfully'
      );
      return
    } catch (error) {
      console.error('Update vehicle info error:', error);
      sendErrorResponse(res, 500, 'Internal server error');
      return
    }
  },

  // Update bank information
  async updateBankInfo(req: Request, res: Response) {
    try {
      const { partnerId } = req.params;
      const { accountHolderName, accountNumber, ifscCode, upiId } = req.body;

      // Validate required fields
      const requiredFields = ['accountHolderName', 'accountNumber', 'ifscCode', 'upiId'];
      const missingFields = validateRequiredFields(req.body, requiredFields);

      if (missingFields.length > 0) {
        sendErrorResponse(
          res, 
          400, 
          'All bank information fields are required'
        );
        return
      }

      const updateData: PartnerUpdateFields = {
        accountHolderName,
        accountNumber,
        ifscCode,
        upiId,
        bankDetailsCompleted: true // Mark bank details as completed
      };

      const updatedPartner = await partnerRepository.findByIdAndUpdate(partnerId, updateData);

      if (!updatedPartner) {
        sendErrorResponse(res, 404, 'Partner not found');
        return
      }

      sendSuccessResponse(
        res, 
        200, 
        updatedPartner, 
        'Bank information updated successfully'
      );
      return
    } catch (error) {
      console.error('Update bank info error:', error);
      sendErrorResponse(res, 500, 'Internal server error');
      return
    }
  },

  // Update profile image
  async updateProfileImage(req: Request, res: Response) {
    try {
      const { partnerId } = req.params;
      const file = req.file as any;

      if (!file) {
        sendErrorResponse(res, 400, 'No image file provided');
        return;
      }

      let fileUrl;
      // Check if using S3 or local storage
      if (file.location) {
        // S3 storage - use the location property directly
        fileUrl = file.location;
      } else if (file.destination) {
        // Local disk storage - construct path based on destination and filename
        fileUrl = `/api/uploads/${file.destination.split('uploads/')[1]}/${file.filename}`;
      } else {
        // Fallback to just the filename if neither property exists
        fileUrl = `/api/uploads/${file.filename}`;
      }

      const updateData: PartnerUpdateFields = {
        profilePicturePath: fileUrl
      };

      const updatedPartner = await partnerRepository.findByIdAndUpdate(partnerId, updateData);

      if (!updatedPartner) {
        sendErrorResponse(res, 404, 'Partner not found');
        return;
      }

      sendSuccessResponse(
        res, 
        200, 
        { ...updatedPartner, profilePicturePath: fileUrl },
        'Profile image updated successfully'
      );
      return;
    } catch (error) {
      console.error('Update profile image error:', error);
      sendErrorResponse(res, 500, 'Internal server error');
      return;
    }
  },

  // Update document URLs
  async updateDocumentUrls(req: Request, res: Response) {
    try {
      const { partnerId } = req.params;
      const { vehicleDocuments } = req.body;

      if (!vehicleDocuments || typeof vehicleDocuments !== 'object') {
        sendErrorResponse(res, 400, 'vehicleDocuments object is required');
        return
      }

      // Check if partner exists
      const partner = await partnerRepository.findById(partnerId);
      if (!partner) {
        sendErrorResponse(res, 404, 'Partner not found');
        return
      }

      // Update the partner with new document URLs
      const updatedPartner = await partnerRepository.findByIdAndUpdate(
        partnerId,
        { vehicleDocuments }
      );

      // Update document completion flags
      const updateFlags: PartnerUpdateFields = {};
      
      // Check if personal documents are complete
      if (areAllDocumentsComplete(VerificationSection.PERSONAL_DOCUMENTS, vehicleDocuments)) {
        updateFlags.personalDocumentsCompleted = true;
      }
      
      // Check if vehicle documents are complete
      if (areAllDocumentsComplete(VerificationSection.VEHICLE_DETAILS, vehicleDocuments)) {
        updateFlags.vehicleDetailsCompleted = true;
      }

      // Update flags if any were set
      if (Object.keys(updateFlags).length > 0) {
        await partnerRepository.findByIdAndUpdate(partnerId, updateFlags);
      }

      sendSuccessResponse(
        res, 
        200, 
        { ...updatedPartner, vehicleDocuments },
        'Document URLs updated successfully'
      );
      return
    } catch (error) {
      console.error('Update document URLs error:', error);
      sendErrorResponse(res, 500, 'Internal server error');
      return
    }
  }
};