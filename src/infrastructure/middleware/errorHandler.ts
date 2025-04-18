import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  if (err.name === 'ValidationError') {
     res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: err.message
    });
    return
  }

  if (err.name === 'UnauthorizedError') {
     res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
    return
  }

  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: 'Something went wrong'
  });
}; 