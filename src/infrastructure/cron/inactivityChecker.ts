import cron from 'node-cron';
import { redisClient, driverPool } from '../database/redis';
import { PartnerRepositoryImpl } from '../repositories/partnerRepositoryImpl';
import { io } from '../websocket';

const partnerRepository = new PartnerRepositoryImpl();

/**
 * Cron job to check for inactive partners and automatically set them offline
 * Runs every minute
 */
export const initializeInactivityChecker = () => {
  // Schedule the job to run every minute
  cron.schedule('* * * * *', async () => {
    try {
      console.log('Running inactivity check for partners');
      
      // Get all keys for drivers in Redis
      const driverKeys = await redisClient.keys('driver:*');
      
      for (const key of driverKeys) {
        const driverId = key.replace('driver:', '');
        const driverDataStr = await redisClient.hGet(key, 'data');
        
        if (!driverDataStr) continue;
        
        const driverData = JSON.parse(driverDataStr);
        const lastUpdated = driverData.lastUpdated 
          ? new Date(driverData.lastUpdated).getTime() 
          : driverData.timestamp || 0;
        
        const now = Date.now();
        const inactivityThreshold = 5 * 60 * 1000; // 5 minutes in milliseconds
        
        // Check if the driver has been inactive for too long
        if (now - lastUpdated > inactivityThreshold) {
          console.log(`Partner ${driverId} has been inactive for over 5 minutes, auto-offlining`);
          
          // Remove from Redis
          await driverPool.removeDriver(driverId, driverData.vehicleType);
          
          // Update database status
          await partnerRepository.findByIdAndUpdate(driverId, {
            isAvailable: false,
            lastOnline: new Date()
          });
          
          // Notify admin
          io.to('admin').emit('driver_status_changed', {
            partnerId: driverId,
            status: 'auto-offline',
            reason: 'inactivity',
            timestamp: Date.now()
          });
          
          // Optionally notify the partner if they're still connected
          io.to(`partner_${driverId}`).emit('auto_offline', {
            reason: 'inactivity',
            message: 'You have been set to offline due to inactivity',
            timestamp: Date.now()
          });
        }
      }
    } catch (error) {
      console.error('Error in inactivity checker:', error);
    }
  });
  
  console.log('Inactivity checker initialized');
};

/**
 * Force a partner offline (for admin actions or testing)
 */
export const forcePartnerOffline = async (partnerId: string, reason: string = 'admin_action') => {
  try {
    // Get driver data from Redis
    const driverDataStr = await redisClient.hGet(`driver:${partnerId}`, 'data');
    let vehicleType = '';
    
    if (driverDataStr) {
      const driverData = JSON.parse(driverDataStr);
      vehicleType = driverData.vehicleType;
      
      // Remove from Redis
      await driverPool.removeDriver(partnerId, vehicleType);
    }
    
    // Update database status
    await partnerRepository.findByIdAndUpdate(partnerId, {
      isAvailable: false,
      lastOnline: new Date()
    });
    
    // Notify admin
    io.to('admin').emit('driver_status_changed', {
      partnerId,
      status: 'forced-offline',
      reason,
      timestamp: Date.now()
    });
    
    // Notify the partner
    io.to(`partner_${partnerId}`).emit('forced_offline', {
      reason,
      message: 'You have been set to offline by admin',
      timestamp: Date.now()
    });
    
    return true;
  } catch (error) {
    console.error('Error forcing partner offline:', error);
    return false;
  }
}; 