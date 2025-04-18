import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';

// Define TokenPayload interface
interface TokenPayload {
  userId?: string;
  tempId?: string;
  role: string;
  purpose?: string;
}

// Extend Express Request type to include user
declare global {
  namespace Express {
    // This needs to match all uses of req.user in the application
    interface Request {
      user?: TokenPayload;
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
          res.status(401).json({ 
            success: false, 
            message: 'No authorization token provided' 
          });
          return
        }
        
        // Extract token
        const token = authHeader.split(' ')[1];
        if (!token) {
          res.status(401).json({ 
            success: false, 
            message: 'Invalid token format' 
          });
          return
        }
        
        try {
          // Verify token locally first
          const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
          
          // Handle temporary tokens for document uploads
          if (decoded.purpose === 'document-upload' && decoded.role === 'driver') {
            // Allow temporary tokens for S3 uploads only
            if (req.path.includes('/s3/upload')) {
              req.user = decoded;
              return next();
            }
          }
          
          // Check if user is a driver
          if (decoded.role !== 'driver') {
               res.status(403).json({
                  success: false,
                  message: 'Not authorized as driver'
              });
              return
          }

          // Set user info in request
          req.user = decoded;
          next();
        } catch (error) {
            console.error('Token verification error:');
             res.status(401).json({ 
                success: false, 
                message: 'Invalid token' 
            });
            return
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
         res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
        return
    }
};

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
             res.status(401).json({ 
                success: false, 
                error: 'Authentication token is required' 
            });
            return
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
        req.user = decoded;

        // Check if user has admin role
        if (decoded.role !== 'admin') {
             res.status(403).json({ 
                success: false, 
                error: 'Access denied. Admin privileges required.' 
            });
            return
        }

        next();
    } catch (error) {
         res.status(401).json({ 
            success: false, 
            error: 'Invalid or expired token' 
        });
        return
    }
};

// Optional: Add role-based middleware
export const requireRole = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
             res.status(401).json({ 
                success: false, 
                error: 'Authentication required' 
            });
            return
        }

        if (!roles.includes(req.user.role)) {
             res.status(403).json({ 
                success: false, 
                error: 'Access denied: Insufficient permissions' 
            });
            return
        }

        next();
    };
};

// Optional: Add specific middleware for admin-only routes
export const adminOnly = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    // try {
        
        if (!authHeader) {
             res.status(401).json({ 
                success: false, 
                message: 'No authorization token provided' 
            });
            return
        }

        const response = await axios.post('http://localhost:3001/auth/verify-token', {
            token: token,
            purpose: 'admin-access'
        }, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log('Admin auth response:', response.data);
        

        if (response.data.success && response.data.user.role === 'admin') {
            req.user = response.data.user;
            next();
        } else {
             res.status(403).json({ 
                success: false, 
                message: 'Admin access required' 
            });
            return
        }
    // } catch (error) {
    //     console.error('Admin auth error:', error);
    //      res.status(401).json({ 
    //         success: false, 
    //         message: 'Invalid admin token' 
    //     });
    //     return
    // }
}; 