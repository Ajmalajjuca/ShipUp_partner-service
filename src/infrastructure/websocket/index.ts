import { Server, Socket } from 'socket.io';
import http from 'http';
import { Server as HttpServer } from 'http';
import { driverPool } from '../database/redis';
import { PartnerRepositoryImpl } from '../../infrastructure/repositories/partnerRepositoryImpl';
import { config } from '../config';
import { log } from 'console';

// Create repository instance
const partnerRepository = new PartnerRepositoryImpl();

// Define configuration with proper types
interface WebSocketConfig {
  corsOrigins: string | string[] | boolean;
}

// Add this to your existing config or create a new one
const socketConfig: WebSocketConfig = {
  corsOrigins: config.cors?.origins || '*'
};

// Socket data interfaces
interface AuthData {
  partnerId: string;
  token: string;
}

interface LocationData {
  partnerId: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

interface AvailabilityData {
  partnerId: string;
  isAvailable: boolean;
  location?: {
    latitude: number;
    longitude: number;
  };
}

interface OrderResponseData {
  partnerId: string;
  orderId: string;
  accept: boolean;
}

interface OrderRoomData {
  orderId: string;
  userId: string;
}

interface OrderStatusData {
  partnerId: string;
  orderId: string;
  status: string;
}

interface OrderOtpData {
  orderId: string;
  type: 'pickup' | 'dropoff';
  otp: string;
}

// Define interfaces for tasks
interface TaskItem {
  orderId: string;
}

// Store the socket.io instance
let io: Server;

// Initialize the WebSocket server
export const initializeSocketServer = (server: HttpServer) => {
  // Create Socket.io server with CORS configured
  io = new Server(server, {
    cors: {
      origin: socketConfig.corsOrigins,
      methods: ['GET', 'POST'],
      credentials: true
    },
    path: '/socket'
  });

  // Handle connection
  io.on('connection', (socket: Socket) => {
    console.log('Socket connected:', socket.id);
    
    // Handle authentication - partners must authenticate to join their rooms
    socket.on('authenticate', async (data: AuthData) => {
      try {
        const { partnerId, token } = data;
        
        // Basic validation
        if (!partnerId || !token) {
          socket.emit('authentication_error', { message: 'Missing authentication data' });
          return;
        }
        
        // Validate token (simplified - in production you'd verify the JWT)
        // Here you could make a call to your auth service to validate the token
        // For now we'll just check if the partner exists
        const partner = await partnerRepository.findById(partnerId);
        
        if (!partner) {
          socket.emit('authentication_error', { message: 'Authentication failed' });
          return;
        }
        
        // Join partner's personal room
        socket.join(`partner_${partnerId}`);
        
        // Acknowledge successful authentication
        socket.emit('authenticated', { partnerId });
        
        console.log(`Partner ${partnerId} authenticated on socket ${socket.id}`);
      } catch (error) {
        console.error('Socket authentication error:', error);
        socket.emit('authentication_error', { message: 'Authentication failed' });
      }
    });

    // Allow users to join order-specific rooms for tracking
    socket.on('join_order_room', (data: OrderRoomData) => {
      try {
        const { orderId, userId } = data;
        
        if (!orderId || !userId) {
          socket.emit('room_error', { message: 'Invalid room data' });
          return;
        }
        
        // Join the order-specific room
        socket.join(`order_${orderId}`);
        
        // Also join a user-specific room for direct communication
        socket.join(`user_${userId}`);
        
        socket.emit('room_joined', { room: `order_${orderId}` });
        console.log(`User ${userId} joined order room ${orderId}`);
      } catch (error) {
        console.error('Room join error:', error);
        socket.emit('room_error', { message: 'Failed to join room' });
      }
    });
    
    // Handle order status updates from drivers
    socket.on('order_status_update', (data: OrderStatusData) => {
      try {
        const { partnerId, orderId, status } = data;
        
        if (!partnerId || !orderId || !status) {
          socket.emit('status_error', { message: 'Invalid status update data' });
          return;
        }
        
        console.log(`Partner ${partnerId} updates order ${orderId} status to ${status}`);
        
        // Broadcast to order-specific room
        io.to(`order_${orderId}`).emit('order_status_updated', {
          orderId,
          status,
          timestamp: Date.now()
        });
        
        // Special events for certain statuses
        if (status === 'arrived_pickup') {
          io.to(`order_${orderId}`).emit('driver_arrived_pickup', {
            orderId,
            timestamp: Date.now()
          });
        } else if (status === 'picked_up') {
          io.to(`order_${orderId}`).emit('pickup_verified', {
            orderId,
            timestamp: Date.now()
          });
        } else if (status === 'delivered') {
          io.to(`order_${orderId}`).emit('delivery_completed', {
            orderId,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error('Status update error:', error);
        socket.emit('status_error', { message: 'Failed to update order status' });
      }
    });
    
    // Handle location updates from partners
    socket.on('update_location', async (data: LocationData) => {
      try {
        const { partnerId, location } = data;
        
        if (!partnerId || !location || !location.latitude || !location.longitude) {
          socket.emit('location_error', { message: 'Invalid location data' });
          return;
        }
        
        // Store in Redis and reset expiry
        await driverPool.updateDriverLocation(partnerId, location);
        
        // Acknowledge receipt
        socket.emit('location_updated', { timestamp: Date.now() });
        
        // Broadcast to admin channel for tracking
        io.to('admin').emit('driver_location_updated', {
          partnerId,
          location,
          timestamp: Date.now()
        });
        
        // If driver is currently on a delivery, also broadcast to the order room
        const activeTasks = await getActiveTasksForPartner(partnerId);
        if (activeTasks && activeTasks.length > 0) {
          activeTasks.forEach((task: TaskItem) => {
            io.to(`order_${task.orderId}`).emit('driver_location_updated', {
              partnerId,
              location,
              timestamp: Date.now()
            });
          });
        }
      } catch (error) {
        console.error('Location update error:', error);
        socket.emit('location_error', { message: 'Failed to update location' });
      }
    });
    
    // Handle partner going online/offline manually
    socket.on('set_availability', async (data: AvailabilityData) => {
      try {
        const { partnerId, isAvailable, location } = data;
        
        if (!partnerId || isAvailable === undefined) {
          socket.emit('availability_error', { message: 'Invalid availability data' });
          return;
        }
        
        // Get partner data
        const partner = await partnerRepository.findById(partnerId);
        
        if (!partner) {
          socket.emit('availability_error', { message: 'Partner not found' });
          return;
        }
        
        // Update in database
        await partnerRepository.findByIdAndUpdate(partnerId, {
          isAvailable,
          lastOnline: new Date()
        });
        
        // Update Redis based on availability
        if (isAvailable) {
          // Add to Redis pool
          const driverData = {
            partnerId,
            isAvailable: true,
            lastOnline: new Date().toISOString(),
            vehicleType: partner.vehicleType,
            location: location || { latitude: 0, longitude: 0 },
            status: partner.status,
            timestamp: Date.now()
          };
          
          await driverPool.addDriver(partnerId, driverData);
          
          // Notify partner
          socket.emit('availability_updated', { isAvailable: true });
          
          // Broadcast to admin for monitoring
          io.to('admin').emit('driver_status_changed', {
            partnerId,
            status: 'online',
            timestamp: Date.now()
          });
        } else {
          // Remove from Redis pool
          await driverPool.removeDriver(partnerId, partner.vehicleType);
          
          // Notify partner
          socket.emit('availability_updated', { isAvailable: false });
          
          // Broadcast to admin for monitoring
          io.to('admin').emit('driver_status_changed', {
            partnerId,
            status: 'offline',
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error('Availability update error:', error);
        socket.emit('availability_error', { message: 'Failed to update availability' });
      }
    });
    
    // Handle order acceptance/rejection
    socket.on('respond_to_order', async (data: OrderResponseData) => {
      try {
        const { partnerId, orderId, accept } = data;
        
        if (!partnerId || !orderId || accept === undefined) {
          socket.emit('order_response_error', { message: 'Invalid order response data' });
          return;
        }
        
        // Emit to order service (assuming separate microservice)
        // This would be implemented by calling an API endpoint or emitting to another service
        io.to('order_service').emit('partner_order_response', {
          partnerId,
          orderId,
          accepted: accept,
          timestamp: Date.now()
        });
        
        // Also emit to the order-specific room for the user to get updated
        io.to(`order_${orderId}`).emit('driver_response', {
          partnerId,
          orderId,
          accepted: accept,
          timestamp: Date.now()
        });
        
        // If accepted, update order status to 'driver_assigned' and store as active task
        if (accept) {
          // Store this as an active task for the partner
          await storeActiveTask(partnerId, orderId);
          
          // Update order status to 'driver_assigned'
          io.to(`order_${orderId}`).emit('order_status_updated', {
            orderId,
            status: 'driver_assigned',
            partnerId,
            timestamp: Date.now()
          });
          
          console.log(`Driver ${partnerId} accepted order ${orderId}`);
        } else {
          console.log(`Driver ${partnerId} rejected order ${orderId}`);
          
          // Notify that driver rejected the request
          io.to(`order_${orderId}`).emit('order_status_updated', {
            orderId,
            status: 'driver_rejected',
            partnerId,
            timestamp: Date.now()
          });
          
          // Try to assign the next available driver
          const nextDriverAssigned = await tryNextAvailableDriver(orderId);
          
          if (nextDriverAssigned) {
            console.log(`Order ${orderId} reassigned to next available driver`);
          } else {
            console.log(`No more available drivers for order ${orderId}`);
            
            // Notify that no more drivers are available
            io.to(`order_${orderId}`).emit('order_status_updated', {
              orderId,
              status: 'no_drivers_available',
              timestamp: Date.now()
            });
          }
        }
        
        // Acknowledge receipt
        socket.emit('order_response_received', { orderId, accepted: accept });
      } catch (error) {
        console.error('Order response error:', error);
        socket.emit('order_response_error', { message: 'Failed to process order response' });
      }
    });
    
    // Handle partner going inactive (disconnection)
    socket.on('disconnect', async () => {
      try {
        // In a production system, you would store the partner ID with the socket
        // This is a simplified version
        console.log('Socket disconnected:', socket.id);
        
        // Find rooms this socket was in (to identify the partner)
        const rooms = Array.from(socket.rooms.values());
        
        for (const room of rooms) {
          // Check if this is a partner room
          if (typeof room === 'string' && room.startsWith('partner_')) {
            const partnerId = room.replace('partner_', '');
            
            // No immediate logout - partner might reconnect
            // Logic for auto-offline will be handled by Redis expiry
            console.log(`Partner ${partnerId} socket disconnected`);
            
            // Optional: Update last seen time in database
            await partnerRepository.findByIdAndUpdate(partnerId, {
              lastOnline: new Date()
            });
          }
        }
      } catch (error) {
        console.error('Socket disconnect error:', error);
      }
    });
  });

  return io;
};

// Helper functions for active tasks
async function storeActiveTask(partnerId: string, orderId: string) {
  try {
    const { redisClient } = require('../database/redis');
    
    // Add to partner's active tasks
    await redisClient.sAdd(`partner:${partnerId}:active_tasks`, orderId);
    
    // Store order-to-partner mapping
    await redisClient.set(`order:${orderId}:partner`, partnerId);
    
    console.log(`Added order ${orderId} to partner ${partnerId} active tasks`);
    return true;
  } catch (error) {
    console.error('Error storing active task:', error);
    return false;
  }
}

async function getActiveTasksForPartner(partnerId: string): Promise<TaskItem[]> {
  try {
    const { redisClient } = require('../database/redis');
    
    // Get partner's active orders
    const orderIds: string[] = await redisClient.sMembers(`partner:${partnerId}:active_tasks`);
    
    if (!orderIds || orderIds.length === 0) {
      return [];
    }
    
    // For simplicity, just return the order IDs
    // In a real application, you'd fetch order details from a database
    return orderIds.map((orderId: string) => ({ orderId }));
  } catch (error) {
    console.error('Error getting active tasks:', error);
    return [];
  }
}

// Export the socket server instance
export { io };

// Function to send delivery request to a specific partner
export const sendDeliveryRequest = async (partnerId: string, orderData: any) => {
  console.log(`Sending delivery request to partner ${partnerId}`);
  
  // Check if driver is available in Redis
  const isAvailable = await driverPool.isDriverAvailable(partnerId);
  
  if (!isAvailable) {
    console.log(`Partner ${partnerId} is not available for delivery`);
    return false;
  }
  
  try {
    // Send delivery request to partner without auto-assignment
    io.to(`partner_${partnerId}`).emit('delivery_request', {
      ...orderData,
      expiresIn: 30000 // 30 seconds to respond
    });
    
    console.log(`Delivery request sent to partner ${partnerId}, waiting for acceptance`);
    return true;
  } catch (error) {
    console.error('Send delivery request error:', error);
    return false;
  }
};

// Function to try assigning the next available driver
async function tryNextAvailableDriver(orderId: string): Promise<boolean> {
  try {
    console.log(`Trying to find next available driver for order ${orderId}`);
    const { redisClient } = require('../database/redis');
    
    // Get the next backup driver from Redis
    const nextDriverJson = await redisClient.lPop(`order:${orderId}:backup_drivers`);
    
    if (!nextDriverJson) {
      console.log(`No more backup drivers available for order ${orderId}`);
      return false;
    }
    
    // Parse the driver data
    const nextDriver = JSON.parse(nextDriverJson);
    
    if (!nextDriver || !nextDriver.partnerId) {
      console.log(`Invalid backup driver data for order ${orderId}`);
      return false;
    }
    
    console.log(`Trying next driver ${nextDriver.partnerId} for order ${orderId}`);
    
    // Get order details
    const orderDetails = await getOrderDetails(orderId);
    
    if (!orderDetails) {
      console.log(`Could not get order details for order ${orderId}`);
      return false;
    }
    
    // Send delivery request to the next driver
    const requestSent = await sendDeliveryRequest(
      nextDriver.partnerId,
      {
        orderId,
        pickupLocation: orderDetails.pickupAddress,
        dropLocation: orderDetails.dropoffAddress,
        customerName: orderDetails.customerName || 'Customer',
        amount: orderDetails.totalAmount || 0,
        estimatedTime: orderDetails.estimatedTime,
        paymentMethod: orderDetails.paymentMethod,
        distance: orderDetails.distance || 0,
        expiresIn: 30000 // 30 seconds to respond
      }
    );
    
    return requestSent;
  } catch (error) {
    console.error(`Error trying next available driver for order ${orderId}:`, error);
    return false;
  }
}

// Helper function to get order details
async function getOrderDetails(orderId: string): Promise<any> {
  try {
    // This would typically make an API call to the order service
    // For this implementation, we'll check if we have cached order data in Redis
    const { redisClient } = require('../database/redis');
    
    // Try to get order details from Redis cache
    const orderDetailsJson = await redisClient.get(`order:${orderId}:details`);
    
    if (orderDetailsJson) {
      return JSON.parse(orderDetailsJson);
    }
    
    // If not in Redis, make an API call (this would be replaced with actual implementation)
    // For this example, we'll call an order service endpoint
    const axios = require('axios');
    const response = await axios.get(`http://localhost:3002/api/orders/${orderId}`);
    
    if (response.data && response.data.success) {
      // Cache the order details for 15 minutes
      await redisClient.set(`order:${orderId}:details`, JSON.stringify(response.data.order));
      await redisClient.expire(`order:${orderId}:details`, 900); // 15 minutes
      
      return response.data.order;
    }
    
    return null;
  } catch (error) {
    console.error(`Error getting order details for ${orderId}:`, error);
    return null;
  }
} 