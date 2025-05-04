import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;
  
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handling middleware
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  // Log the error for server-side debugging
  console.error('Error:', err);
  
  // Handle operational vs programming errors
  if (err instanceof AppError) {
    // Operational errors - send the error message
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message
    });
  }
  
  // For programming errors or unknown errors, don't leak error details
  return res.status(500).json({
    success: false,
    status: 'error',
    message: 'Something went wrong'
  });
};