export enum ErrorMessage {
  // General errors
  INTERNAL_SERVER_ERROR = 'Internal server error',
  VALIDATION_ERROR = 'Validation error',
  UNAUTHORIZED = 'Unauthorized access',
  FORBIDDEN = 'Access forbidden',
  NOT_FOUND = 'Resource not found',
  
  // Driver/Partner errors
  DRIVER_NOT_FOUND = 'Driver not found',
  DRIVER_EXISTS = 'Driver already exists',
  DRIVER_ID_REQUIRED = 'Driver ID is required',
  DRIVER_ID_INVALID = 'Driver ID is invalid',
  
  // File upload errors
  FILE_UPLOAD_ERROR = 'Error uploading file',
  FILE_TYPE_INVALID = 'Invalid file type',
  FILE_SIZE_EXCEEDED = 'File size exceeds maximum limit of 5MB',
  FILE_MISSING = 'No file uploaded',
  
  // Auth validation errors
  AUTH_HEADER_REQUIRED = 'Authorization header is required',
  INVALID_TOKEN = 'Invalid authentication token',
  TOKEN_EXPIRED = 'Authentication token has expired',
  
  // Input validation errors
  MISSING_REQUIRED_FIELDS = 'Missing required fields',
  INVALID_EMAIL_FORMAT = 'Invalid email format',
  INVALID_PHONE_FORMAT = 'Invalid phone number format',
  INVALID_DATE_FORMAT = 'Invalid date format. Use YYYY-MM-DD',
  
  // Document errors
  DOCUMENT_VALIDATION_FAILED = 'Document validation failed',
  DOCUMENT_UPLOAD_FAILED = 'Failed to upload document',
  
  // Vehicle errors
  INVALID_VEHICLE_TYPE = 'Invalid vehicle type',
  INVALID_REGISTRATION_NUMBER = 'Invalid vehicle registration number',
  
  // Bank details errors
  INVALID_ACCOUNT_NUMBER = 'Invalid account number',
  INVALID_IFSC_CODE = 'Invalid IFSC code',
  INVALID_UPI_ID = 'Invalid UPI ID',
  
  // Success messages
  DRIVER_CREATED = 'Driver registered successfully',
  DRIVER_UPDATED = 'Driver updated successfully',
  DRIVER_DELETED = 'Driver deleted successfully',
  PROFILE_UPDATED = 'Profile updated successfully',
  DOCUMENTS_UPDATED = 'Documents updated successfully',
  VEHICLE_INFO_UPDATED = 'Vehicle information updated successfully',
  BANK_INFO_UPDATED = 'Bank information updated successfully',
  STATUS_UPDATED = 'Status updated successfully',
  FILE_UPLOADED = 'File uploaded successfully'
} 