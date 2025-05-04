import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../infrastructure/middleware/errorHandler';
import axios from 'axios';
import { config } from '../../infrastructure/config';

/**
 * Extend Express Request interface to include user information
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: string;
      };
    }
  }
}

/**
 * Middleware to verify JWT token with authentication service
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('No token provided', 401));
    }
    
    const token = authHeader.split(' ')[1];
    
    
    // Verify token with auth service
    const response = await axios.post(`${config.services.auth}/auth/verify-token`,{}, { 
      headers: { Authorization: `Bearer ${token}` }
    }
    );
      
     
    
    try {
      
      if (response.data.success) {
        // Set user in request object
        req.user = {
          userId: response.data.user.id,
          role: response.data.user.role
        };
        return next();
      } else {
        return next(new AppError('Invalid token', 401));
      }
    } catch (error) {
      console.log('Error in authMiddleware:', error);
      return next(new AppError('Token verification failed', 401));
    }
  } catch (error) {
    return next(new AppError('Authentication failed', 401));
  }
};

/**
 * Middleware to ensure user has admin role
 */
export const adminOnly = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // First verify the token
  authMiddleware(req, res, (err) => {
    if (err) {
      return next(err);
    }
    
    // Check if user has admin role
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Admin access required', 403));
    }
    
    return next();
  });
};

/**
 * Middleware to ensure user has specific role
 */
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Access denied: Insufficient permissions', 403));
    }

    return next();
  };
}; 