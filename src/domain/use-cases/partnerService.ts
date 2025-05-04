import axios from 'axios';
import DriverModel from '../../infrastructure/database/models/driverModel';
import { Order } from '../entities/order';
import { LocationCoordinates } from '../entities/location';

// Add a declaration for the global io socket object
declare global {
  var io: any;
}

// Define driver location result type
interface DriverWithDistance {
  partnerId: string;
  distance: number;
  fullName?: string;
  phone?: string;
  vehicleType?: string;
}

export class PartnerService {
  /**
   * Find available drivers near a location within a given radius
   */
  async findAvailableDriversNearLocation(
    location: LocationCoordinates,
    maxDistance: number = 10, // default to 10 km
    vehicleType: string = 'any'
  ): Promise<DriverWithDistance[]> {
    try {
      // Log search parameters
      console.log('Searching for drivers with params:', {
        location,
        maxDistance,
        vehicleType
      });

      // First check if any drivers are available at all
      const allDrivers = await DriverModel.find({}).exec();
      console.log(`Total drivers in database: ${allDrivers.length}`);
      
      // Count drivers with each condition to find which condition is failing
      const availableDrivers = await DriverModel.find({ isAvailable: true }).exec();
      console.log(`Drivers with isAvailable=true: ${availableDrivers.length}`);
      
      const activeDrivers = await DriverModel.find({ isActive: true }).exec();
      console.log(`Drivers with isActive=true: ${activeDrivers.length}`);
      
      const driversWithLocation = await DriverModel.find({ 'location.coordinates': { $exists: true } }).exec();
      console.log(`Drivers with location.coordinates: ${driversWithLocation.length}`);

      // Modified query - only use the essential fields for initial driver search
      const availableDriversQuery: Record<string, any> = {
        isAvailable: true,
        isActive: true,
        'location.coordinates': { $exists: true }
      };
      
      console.log('Final query:', JSON.stringify(availableDriversQuery, null, 2));
      
      const driversFound = await DriverModel.find(availableDriversQuery).exec();

      console.log(`Found ${driversFound.length} available drivers`);
      console.log(`Found ${driversFound.length} available drivers`);
      
      // Calculate distance for each driver and filter by maxDistance and vehicle type
      const driversWithDistance = driversFound
        .filter(driver => 
          driver.location && 
          driver.location.coordinates && 
          driver.location.coordinates.length === 2
        )
        .map(driver => {
          // We know location exists because we filtered for it
          const driverLocation = driver.location as { coordinates: number[] };
          const driverLng = driverLocation.coordinates[0];
          const driverLat = driverLocation.coordinates[1];
          
          // Extract vehicle information from driver
          const driverVehicleType = driver.vehicleType || '';
          const driverVehicleId = driver.vehicleId || '';
          
          // Log driver coordinates and vehicle info
          console.log(`Driver ${driver.partnerId} coordinates:`, driverLocation.coordinates);
          console.log(`Driver ${driver.partnerId} vehicle info:`, { 
            vehicleId: driverVehicleId, 
            vehicleType: driverVehicleType 
          });
          
          // Calculate distance using haversine formula
          const distance = this.calculateDistance(
            location.latitude, 
            location.longitude, 
            driverLat, 
            driverLng
          );
          
          console.log(`Driver ${driver.partnerId} distance: ${distance} km`);
          
          return {
            partnerId: driver.partnerId,
            fullName: driver.fullName,
            phone: driver.phone || driver.mobileNumber,
            vehicleType: driverVehicleType || driverVehicleId,
            distance,
            // Add original vehicle data for filtering
            originalVehicleType: driverVehicleType,
            originalVehicleId: driverVehicleId
          };
        })
        .filter(driver => {
          // Always filter by distance
          const meetsDistanceRequirement = driver.distance <= maxDistance;
          
          // Only apply vehicle filter if a specific type was requested
          if (vehicleType === 'any') {
            return meetsDistanceRequirement;
          }
          
          // Try to match against multiple possible vehicle identifiers
          const vehicleMatches = 
            // Match by vehicle type if it exists
            (driver.originalVehicleType && 
             driver.originalVehicleType.toLowerCase() === vehicleType.toLowerCase()) ||
            // Match by vehicle ID if it contains the vehicle type as a substring (helpful for MongoDB ObjectIDs)
            (driver.originalVehicleId && 
             driver.originalVehicleId.toLowerCase().includes(vehicleType.toLowerCase()));
          
          console.log(`Driver ${driver.partnerId} vehicle match: ${vehicleMatches}`);
          
          return meetsDistanceRequirement && vehicleMatches;
        })
        .sort((a, b) => a.distance - b.distance); // Sort by distance (closest first)

      console.log(`Found ${driversWithDistance.length} drivers within ${maxDistance} km matching vehicle type ${vehicleType}`);
      
      return driversWithDistance.map(({ partnerId, fullName, phone, vehicleType, distance }) => ({
        partnerId, fullName, phone, vehicleType, distance
      }));
    } catch (error) {
      console.error('Error finding available drivers:', error);
      return [];
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  /**
   * Get order details from order service
   */
  async getOrderDetails(orderId: string): Promise<Order | null> {
    try {
      const response = await axios.get(`${process.env.ORDER_SERVICE_URL || 'http://localhost:3004'}/api/orders/${orderId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting order details:', error);
      return null;
    }
  }

  /**
   * Send delivery request to a partner via WebSocket
   */
  async sendDeliveryRequest(
    partnerId: string,
    orderData: {
      orderId: string;
      pickupLocation: any;
      dropLocation: any;
      customerName: string;
      amount: number;
      estimatedTime: string;
      paymentMethod: string;
      distance: number;
      expiresIn: number;
    }
  ): Promise<boolean> {
    try {
      // Try to get WebSocket server from the exported module
      let io: any = null;
      
      try {
        // Import the io object directly from the websocket module
        const websocketModule = require('../../infrastructure/websocket');
        io = websocketModule.io;
        
        if (io) {
          console.log('WebSocket server instance found');
        }
      } catch (wsError) {
        console.error('Error importing WebSocket module:', wsError);
      }
      
      if (!io) {
        console.error('WebSocket server not initialized');
        
        // Fallback: Try to update the driver with the request in the database
        try {
          console.log(`Fallback: Updating driver ${partnerId} with pending request in database`);
          await DriverModel.updateOne(
            { partnerId },
            { 
              $set: { 
                hasPendingRequest: true, 
                lastRequestTime: new Date(),
                pendingOrderData: orderData 
              } 
            }
          ).exec();
          
          // Return true even though WebSocket failed - we saved the request to database
          console.log(`Successfully updated driver ${partnerId} with pending request in database`);
          return true;
        } catch (dbError) {
          console.error('Database fallback also failed:', dbError);
          return false;
        }
      }
      
      // Send delivery request to the partner
      const partnerRoom = `partner_${partnerId}`;
      console.log(`Sending delivery request to ${partnerRoom}:`, orderData);
      
      io.to(partnerRoom).emit('delivery_request', {
        ...orderData,
        timestamp: new Date(),
      });
      
      // Mark the partner as having a pending request
      await DriverModel.updateOne(
        { partnerId },
        { $set: { hasPendingRequest: true, lastRequestTime: new Date() } }
      ).exec();
      
      return true;
    } catch (error) {
      console.error('Error sending delivery request:', error);
      return false;
    }
  }
} 