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
import { PartnerService } from '../../domain/use-cases/partnerService';
import { LocationCoordinates } from '../../domain/entities/location';

// Use dependency injection for services
const partnerRepository = new PartnerRepositoryImpl();
const createPartner = new CreatePartner(partnerRepository);
const partnerService = new PartnerService(); // Assuming this is a function that returns the partner service instance
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
      console.log('vehicleType:', vehicleType);
      

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
  },

  // Update driver availability status
  async updateAvailability(req: Request, res: Response) {
    try {
      const { partnerId } = req.params;
      const { isAvailable, location } = req.body;

      // Validate input
      if (isAvailable === undefined || typeof isAvailable !== 'boolean') {
        sendErrorResponse(res, 400, 'isAvailable must be a boolean value');
        return;
      }

      // Optional location validation if provided
      if (location && (!location.latitude || !location.longitude)) {
        sendErrorResponse(res, 400, 'If location is provided, it must include latitude and longitude');
        return;
      }

      // Check if partner exists
      const partner = await partnerRepository.findById(partnerId);
      if (!partner) {
        sendErrorResponse(res, 404, 'Partner not found');
        return;
      }

      // Prepare update data
      const updateData: PartnerUpdateFields = {
        isAvailable: isAvailable,
        lastOnline: new Date() // Always update lastOnline timestamp
      };

      // Add location to update data if provided
      if (location) {
        updateData.location = {
          type: 'Point',
          coordinates: [location.longitude, location.latitude]
        };
        updateData.lastLocationUpdate = new Date();
      }

      // Update the partner's availability status in MongoDB
      const updatedPartner = await partnerRepository.findByIdAndUpdate(partnerId, updateData);

      if (!updatedPartner) {
        sendErrorResponse(res, 500, 'Failed to update availability status');
        return;
      }

      // If partner is going online, add them to the Redis matching pool
      if (isAvailable) {
        try {
          // Import Redis client
          const { redisClient } = require('../../infrastructure/database/redis');
          
          // Create a driver entry for the matching pool
          const driverPoolData = {
            partnerId: updatedPartner.partnerId,
            isAvailable: true,
            lastOnline: new Date().toISOString(),
            location: location || { latitude: 0, longitude: 0 }, // Use provided location or default
            vehicleType: updatedPartner.vehicleType,
            status: updatedPartner.status,
            timestamp: Date.now()
          };
          
          // Add to Redis geo set if location is provided
          if (location) {
            await redisClient.sendCommand([
              'GEOADD',
              'available_drivers_geo',
              location.longitude.toString(),
              location.latitude.toString(),
              partnerId.toString()
            ]);
          }
          
          // Store detailed driver info in Redis hash
          await redisClient.hSet(
            `driver:${partnerId}`,
            'data',
            JSON.stringify(driverPoolData)
          );
          
          // Set expiry for automatic cleanup (5 minutes = 300 seconds)
          await redisClient.expire(`driver:${partnerId}`, 300);
          
          console.log(`Partner ${partnerId} added to matching pool`);
        } catch (redisError) {
          console.error('Redis error:', redisError);
          // Continue with the response - Redis is considered non-critical for the response
        }
        
        // Emit socket event for going online (if using Socket.io)
        try {
          const { io } = require('../../infrastructure/websocket');
          io.to(`admin`).emit('driver_status_changed', {
            partnerId,
            status: 'online',
            timestamp: Date.now()
          });
        } catch (socketError) {
          console.error('Socket error:', socketError);
          // Continue with response - Socket is non-critical
        }
      } else {
        // If partner is going offline, remove them from Redis matching pool
        try {
          const { redisClient } = require('../../infrastructure/database/redis');
          
          // Remove from Redis geo set
          await redisClient.sendCommand(['ZREM', 'available_drivers_geo', partnerId]);
          
          // Delete detailed driver info
          await redisClient.del(`driver:${partnerId}`);
          
          console.log(`Partner ${partnerId} removed from matching pool`);
          
          // Emit socket event for going offline
          const { io } = require('../../infrastructure/websocket');
          io.to(`admin`).emit('driver_status_changed', {
            partnerId,
            status: 'offline',
            timestamp: Date.now()
          });
        } catch (redisError) {
          console.error('Redis error:', redisError);
          // Continue with the response
        }
      }

      sendSuccessResponse(
        res, 
        200, 
        { 
          partnerId, 
          isAvailable,
          lastOnline: updateData.lastOnline,
          location: location || null,
          message: `Partner is now ${isAvailable ? 'available' : 'unavailable'} for deliveries`
        }
      );
      return;
    } catch (error) {
      console.error('Update availability error:', error);
      sendErrorResponse(res, 500, 'Internal server error');
      return;
    }
  },

  // Update driver location
  async updateLocation(req: Request, res: Response) {
    try {
      const { partnerId } = req.params;
      const { location } = req.body;
      console.log('Location==>:', location);
      

      // Validate location data
      if (!location || !location.latitude || !location.longitude) {
        sendErrorResponse(res, 400, 'Valid location with latitude and longitude is required');
        return;
      }

      // Check if partner exists
      const partner = await partnerRepository.findById(partnerId);
      if (!partner) {
        sendErrorResponse(res, 404, 'Partner not found');
        return;
      }

      // Import Redis driver pool
      try {
        const { driverPool } = require('../../infrastructure/database/redis');
        
        // Update driver location in Redis
        await driverPool.updateDriverLocation(partnerId, location);
        
        // Only update the database occasionally (not on every location update)
        // This reduces database load for high-frequency updates
        const updateDatabase = Math.random() < 0.1; // 10% chance to update DB
        
        if (updateDatabase) {
          // Update last online timestamp in database
          await partnerRepository.findByIdAndUpdate(partnerId, {
            lastOnline: new Date()
          });
        }
        
        // Emit WebSocket event if needed
        try {
          const { io } = require('../../infrastructure/websocket');
          io.to('admin').emit('driver_location_updated', {
            partnerId,
            location,
            timestamp: Date.now()
          });
        } catch (socketError) {
          console.error('Socket error in location update:', socketError);
          // Non-critical, continue with response
        }
      } catch (redisError) {
        console.error('Redis error in location update:', redisError);
        // Even if Redis fails, we can still respond success to the partner
      }

      sendSuccessResponse(
        res, 
        200, 
        { 
          partnerId, 
          location,
          timestamp: Date.now()
        }
      );
      return;
    } catch (error) {
      console.error('Update location error:', error);
      sendErrorResponse(res, 500, 'Internal server error');
      return;
    }
  },

   async assignDriverToOrder(req: Request, res: Response) {
      try {
        const assignDriverDto = req.body;
        console.log('assignDriverDto:', assignDriverDto);
        
        const { orderId, pickupLocation, vehicleType = 'any', maxDistance = 10, maxWaitTime = 60 } = assignDriverDto;
        
        if (!orderId || !pickupLocation) {
           res.status(400).json({
            success: false,
            message: 'Order ID and pickup location are required',
          });
          return;
        }
        
        // Validate pickup location
        if (!pickupLocation.latitude || !pickupLocation.longitude) {
           res.status(400).json({
            success: false,
            message: 'Pickup location requires valid latitude and longitude',
          });
          return;
        }
        
        // Get available drivers near the pickup location
        const availableDrivers = await partnerService.findAvailableDriversNearLocation(
          pickupLocation as LocationCoordinates,
          maxDistance,
          vehicleType
        );

        console.log('Available drivers near location:', availableDrivers);
        
        if (availableDrivers.length === 0) {
           res.status(404).json({
            success: false,
            message: 'No available drivers found near the pickup location',
          });
          return;
        }
        
        // Take the closest driver but keep all available drivers for possible retry
        const closestDriver = availableDrivers[0];
        
        // Get order details
        const orderDetails = await partnerService.getOrderDetails(orderId);
        if (!orderDetails) {
           res.status(404).json({
            success: false,
            message: 'Order details not found',
          });
          return;
        }
        console.log('Order details:', orderDetails);
        
        // Store order details in Redis for future driver assignment attempts
        try {
          const { redisClient } = require('../../infrastructure/database/redis');
          
          // Store order details with 15 minute expiry
          await redisClient.set(`order:${orderId}:details`, JSON.stringify(orderDetails));
          await redisClient.expire(`order:${orderId}:details`, 900); // 15 minutes
          
          console.log(`Stored order details for order ${orderId} in Redis`);
        } catch (error) {
          console.error('Error storing order details in Redis:', error);
          // Continue even if storing order details fails
        }
        
        // Send delivery request to the driver via WebSocket
        // Note: This only sends a request - driver must accept to be assigned
        const deliveryRequestSent = await partnerService.sendDeliveryRequest(
          closestDriver.partnerId,
          {
            orderId,
            pickupLocation: orderDetails.pickupAddress,
            dropLocation: orderDetails.dropoffAddress,
            customerName: orderDetails.customerName || 'Customer',
            amount: orderDetails.totalAmount || 0,
            estimatedTime: orderDetails.estimatedTime,
            paymentMethod: orderDetails.paymentMethod, 
            distance: orderDetails.distance || 0,
            expiresIn: 30000, // 30 seconds to respond
          }
        );
        
        if (!deliveryRequestSent) {
           res.status(500).json({
            success: false,
            message: 'Failed to send delivery request to driver',
          });
          return;
        }
        
        // Store all available drivers in Redis so we can try the next one if needed
        try {
          const { redisClient } = require('../../infrastructure/database/redis');
          
          // Store all available drivers in a list for this order
          // Only include drivers that aren't the current one we're trying
          if (availableDrivers.length > 1) {
            const backupDrivers = availableDrivers
              .slice(1) // Skip the first driver who already got the request
              .map(driver => JSON.stringify({
                partnerId: driver.partnerId,
                distance: driver.distance
              }));
              
            if (backupDrivers.length > 0) {
              // Store backup drivers with 15 minute expiry
              await redisClient.lPush(`order:${orderId}:backup_drivers`, ...backupDrivers);
              await redisClient.expire(`order:${orderId}:backup_drivers`, 900); // 15 minutes
              
              console.log(`Stored ${backupDrivers.length} backup drivers for order ${orderId}`);
            }
          }
        } catch (error) {
          console.error('Error storing backup drivers:', error);
          // Continue even if storing backup drivers fails
        }
        
         res.status(200).json({
          success: true,
          message: 'Delivery request sent to driver, waiting for driver acceptance',
          driverId: closestDriver.partnerId,
          driverDistance: closestDriver.distance,
          status: 'pending_driver_acceptance',
          availableDriversCount: availableDrivers.length
        });
        return;
      } catch (error) {
        console.error('Error finding driver for order:', error);
         res.status(500).json({
          success: false,
          message: 'Failed to find driver for order',
          error: (error as any).message,
        });
        return;
      }
    },

  // Store OTP for order verification
  async storeOrderOtp(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      const { type, otp } = req.body;
      
      if (!orderId || !type || !otp) {
         res.status(400).json({
          success: false,
          message: 'Order ID, type, and OTP are required'
        });
        return;
      }
      
      if (type !== 'pickup' && type !== 'dropoff') {
         res.status(400).json({
          success: false,
          message: 'Type must be either pickup or dropoff'
        });
        return
      }
      
      // Import Redis client for storing OTP
      const { redisClient } = require('../../infrastructure/database/redis');
      
      // Store OTP in Redis with 1-hour expiry
      await redisClient.hSet(`order:${orderId}:otp`, type, otp);
      await redisClient.expire(`order:${orderId}:otp`, 3600); // 1 hour in seconds
      
      // Emit to socket server about new OTP generation
      try {
        const { io } = require('../../infrastructure/websocket');
        io.to(`partner_${req.body.partnerId}`).emit('order_otp_generated', {
          orderId,
          type,
          timestamp: Date.now()
          // Note: We don't send the actual OTP via socket for security
        });
      } catch (socketError) {
        console.error('Socket error in OTP storage:', socketError);
        // Non-critical, continue with response
      }
      
       res.status(200).json({
        success: true,
        message: `${type.charAt(0).toUpperCase() + type.slice(1)} OTP stored successfully`
      });
      return;
    } catch (error) {
      console.error('Error storing order OTP:', error);
       res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
      return;
    }
  },
  
  // Verify OTP for order
  async verifyOrderOtp(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      const { type, otp, partnerId } = req.body;
      
      if (!orderId || !type || !otp || !partnerId) {
         res.status(400).json({
          success: false,
          message: 'Order ID, type, OTP and partner ID are required'
        });
        return
      }
      
      if (type !== 'pickup' && type !== 'dropoff') {
         res.status(400).json({
          success: false,
          message: 'Type must be either pickup or dropoff'
        });
        return
      }
      
      // Import Redis client for fetching stored OTP
      const { redisClient } = require('../../infrastructure/database/redis');
      
      // Get the stored OTP for this order and type
      const storedOtp = await redisClient.hGet(`order:${orderId}:otp`, type);
      
      if (!storedOtp) {
         res.status(404).json({
          success: false,
          message: `No ${type} OTP found for this order`
        });
        return;
      }
      
      // Compare OTPs
      if (storedOtp !== otp) {
         res.status(400).json({
          success: false,
          message: 'Invalid OTP'
        });
        return;
      }
      
      // OTP is valid, update order status
      const newStatus = type === 'pickup' ? 'picked_up' : 'delivered';
      
      // Store verification in Redis
      await redisClient.hSet(`order:${orderId}:verified`, type, 'true');
      
      // Emit to socket server about verification
      try {
        const { io } = require('../../infrastructure/websocket');
        
        // Emit to order room
        io.to(`order_${orderId}`).emit(type === 'pickup' ? 'pickup_verified' : 'delivery_completed', {
          orderId,
          partnerId,
          timestamp: Date.now()
        });
      } catch (socketError) {
        console.error('Socket error in OTP verification:', socketError);
        // Non-critical, continue with response
      }
      
      // For dropoff verification, we also update the partner's statistics
      if (type === 'dropoff') {
        try {
          // Update partner statistics in DB
          await partnerRepository.updateDeliveryStats(partnerId, 'completed');
        } catch (dbError) {
          console.error('Error updating partner stats:', dbError);
          // Non-critical, continue with response
        }
      }
      
       res.status(200).json({
        success: true,
        message: `${type.charAt(0).toUpperCase() + type.slice(1)} verified successfully`,
        status: newStatus
      });
      return;
    } catch (error) {
      console.error('Error verifying order OTP:', error);
       res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
      return
    }
  },
  
  // Update order status via socket
  async updateOrderStatus(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      const { status, partnerId } = req.body;
      
      if (!orderId || !status || !partnerId) {
         res.status(400).json({
          success: false,
          message: 'Order ID, status and partner ID are required'
        });
        return;
      }
      
      // Valid statuses
      const validStatuses = ['assigned', 'heading_to_pickup', 'arrived_pickup', 'picked_up', 'delivering', 'arrived_dropoff', 'delivered', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
         res.status(400).json({
          success: false,
          message: 'Invalid status'
        });
        return;
      }
      
      // Emit to socket server about status update
      try {
        const { io } = require('../../infrastructure/websocket');
        
        // Emit to order room
        io.to(`order_${orderId}`).emit('order_status_updated', {
          orderId,
          partnerId,
          status,
          timestamp: Date.now()
        });
        
        // Special handling for certain statuses
        if (status === 'arrived_pickup') {
          io.to(`order_${orderId}`).emit('driver_arrived_pickup', {
            orderId,
            partnerId,
            timestamp: Date.now()
          });
        } else if (status === 'arrived_dropoff') {
          io.to(`order_${orderId}`).emit('driver_arrived_dropoff', {
            orderId,
            partnerId,
            timestamp: Date.now()
          });
        }
        
        // Update in database or other services as needed
        // ...
        
      } catch (socketError) {
        console.error('Socket error in status update:', socketError);
         res.status(500).json({
          success: false,
          message: 'Failed to send status update'
        });
        return;
      }
      
       res.status(200).json({
        success: true,
        message: 'Order status updated successfully'
      });
      return;
    } catch (error) {
      console.error('Error updating order status:', error);
       res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
      return;
    }
  }
};