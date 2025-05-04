import { createClient } from 'redis';
import { config } from '../config';

// Create Redis client
const redisClient = createClient({
  url: config.redis?.url || 'redis://localhost:6379',
  password: config.redis?.password || undefined,
});

// Connect to Redis
(async () => {
  try {
    await redisClient.connect();
    console.log('Redis client connected');
    
    // Set up error handler
    redisClient.on('error', (err) => {
      console.error('Redis Error:', err);
    });
  } catch (error) {
    console.error('Redis connection error:', error);
  }
})();

// Helper methods for driver availability and matching pool
const driverPool = {
  // Add driver to the available pool
  addDriver: async (driverId: string, data: any) => {
    try {
      // Store driver data
      await redisClient.hSet(`driver:${driverId}`, 'data', JSON.stringify(data));
      
      // Set expiry for auto-cleanup (5 minutes)
      await redisClient.expire(`driver:${driverId}`, 300);
      
      // If location is provided, add to geo index
      if (data.location && data.location.latitude && data.location.longitude) {
        try {
          // Add to geo index
          await redisClient.sendCommand([
            'GEOADD', 
            'available_drivers_geo', 
            data.location.longitude.toString(), 
            data.location.latitude.toString(), 
            driverId
          ]);
        } catch (geoError) {
          console.error('Redis GEOADD error:', geoError);
        }
      }
      
      // Add to sorted set for quick filtering by vehicle type
      await redisClient.zAdd(`drivers:${data.vehicleType}`, {
        score: Date.now(),
        value: driverId
      });
      
      return true;
    } catch (error) {
      console.error('Redis add driver error:', error);
      return false;
    }
  },
  
  // Remove driver from available pool
  removeDriver: async (driverId: string, vehicleType?: string) => {
    try {
      // Remove from geo index
      await redisClient.zRem('available_drivers_geo', driverId);
      
      // Remove driver data
      await redisClient.del(`driver:${driverId}`);
      
      // Remove from vehicle type index if provided
      if (vehicleType) {
        await redisClient.zRem(`drivers:${vehicleType}`, driverId);
      }
      
      return true;
    } catch (error) {
      console.error('Redis remove driver error:', error);
      return false;
    }
  },
  
  // Update driver location
  updateDriverLocation: async (driverId: string, location: { latitude: number, longitude: number }) => {
    try {
      // Update the geo index
      try {
        // Update geo index using raw command
        await redisClient.sendCommand([
          'GEOADD', 
          'available_drivers_geo', 
          location.longitude.toString(), 
          location.latitude.toString(), 
          driverId
        ]);
      } catch (geoError) {
        console.error('Redis GEOADD error:', geoError);
      }
      
      // Get current driver data
      const driverData = await redisClient.hGet(`driver:${driverId}`, 'data');
      if (driverData) {
        const data = JSON.parse(driverData);
        data.location = location;
        data.lastUpdated = new Date().toISOString();
        
        // Update driver data
        await redisClient.hSet(`driver:${driverId}`, 'data', JSON.stringify(data));
        
        // Reset expiry (5 minutes)
        await redisClient.expire(`driver:${driverId}`, 300);
      }
      
      return true;
    } catch (error) {
      console.error('Redis update location error:', error);
      return false;
    }
  },
  
  // Find nearby drivers (simplified implementation with basic GEORADIUS command)
  findNearbyDrivers: async (location: { latitude: number, longitude: number }, radius: number = 5, unit: string = 'km', limit: number = 10) => {
    try {
      // Use raw command to avoid type issues
      const response = await redisClient.sendCommand([
        'GEORADIUS',
        'available_drivers_geo',
        location.longitude.toString(),
        location.latitude.toString(),
        radius.toString(),
        unit,
        'WITHCOORD',
        'WITHDIST',
        'COUNT',
        limit.toString()
      ]) as any[];
      
      // Format and return the results
      const formattedDrivers = [];
      
      // If we got results
      if (Array.isArray(response)) {
        for (const item of response) {
          if (Array.isArray(item) && item.length >= 3) {
            const driverId = item[0].toString();
            const distance = parseFloat(item[1].toString());
            
            // Get driver data from Redis
            const driverData = await redisClient.hGet(`driver:${driverId}`, 'data');
            
            if (driverData) {
              formattedDrivers.push({
                driverId,
                distance,
                ...JSON.parse(driverData)
              });
            }
          }
        }
      }
      
      return formattedDrivers;
    } catch (error) {
      console.error('Redis find nearby drivers error:', error);
      return [];
    }
  },
  
  // Find drivers by vehicle type
  findDriversByVehicleType: async (vehicleType: string, limit: number = 10) => {
    try {
      // Get drivers of specific vehicle type sorted by timestamp
      const drivers = await redisClient.zRange(`drivers:${vehicleType}`, 0, limit - 1);
      
      // Get data for each driver
      const driverData = [];
      
      for (const driverId of drivers) {
        const data = await redisClient.hGet(`driver:${driverId}`, 'data');
        if (data) {
          driverData.push({
            driverId,
            ...JSON.parse(data)
          });
        }
      }
      
      return driverData;
    } catch (error) {
      console.error('Redis find drivers by vehicle type error:', error);
      return [];
    }
  },
  
  // Check if a driver is online/available
  isDriverAvailable: async (driverId: string) => {
    try {
      const exists = await redisClient.exists(`driver:${driverId}`);
      return exists === 1;
    } catch (error) {
      console.error('Redis check driver availability error:', error);
      return false;
    }
  }
};

export { redisClient, driverPool }; 