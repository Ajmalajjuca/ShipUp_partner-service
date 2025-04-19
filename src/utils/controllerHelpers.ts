import { Request, Response } from 'express';
import { ApiResponse, DocumentType, VerificationSection } from '../types/common';

/**
 * Process file uploads from multipart form data
 */
export const processFileUploads = (
  req: Request
): { [key: string]: string } => {
  const fileMap: { [key: string]: string } = {};
  const { profilePicturePath } = req.body;
  
  // Add profilePicturePath if it was passed directly
  if (profilePicturePath) {
    fileMap['profilePicturePath'] = profilePicturePath;
  }
  
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  
  if (files) {
    Object.keys(files).forEach(fieldname => {
      if (files[fieldname] && files[fieldname][0]) {
        const file = files[fieldname][0] as any; // Use any to access non-standard properties
        
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
        
        // Map the field names to the database field names
        if (fieldname === DocumentType.AADHAR) fileMap['aadharPath'] = fileUrl;
        else if (fieldname === DocumentType.PAN) fileMap['panPath'] = fileUrl;
        else if (fieldname === DocumentType.LICENSE) fileMap['licensePath'] = fileUrl;
        else if (fieldname === DocumentType.INSURANCE) fileMap['insuranceDocPath'] = fileUrl;
        else if (fieldname === DocumentType.POLLUTION) fileMap['pollutionDocPath'] = fileUrl;
        else if (fieldname === 'profilePicture') fileMap['profilePicturePath'] = fileUrl;
      }
    });
  }
  
  return fileMap;
};

/**
 * Parse JSON string from form data
 */
export const parseJsonField = <T>(jsonString: string): T | undefined => {
  try {
    if (jsonString && typeof jsonString === 'string') {
      return JSON.parse(jsonString) as T;
    }
  } catch (error) {
    console.error('Error parsing JSON field:', error);
  }
  return undefined;
};

/**
 * Check required fields and return missing fields
 */
export const validateRequiredFields = (
  body: any,
  requiredFields: string[]
): string[] => {
  return requiredFields.filter(field => !body[field]);
};

/**
 * Send error response
 */
export const sendErrorResponse = (
  res: Response,
  statusCode: number,
  error: string
): Response => {
  return res.status(statusCode).json({
    success: false,
    error
  });
};

/**
 * Send success response
 */
export const sendSuccessResponse = <T>(
  res: Response,
  statusCode: number,
  partner: T,
  message?: string
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    partner
  };
  
  if (message) {
    response.message = message;
  }
  
  return res.status(statusCode).json(response);
};

/**
 * Check if all document types in a section are complete
 */
export const areAllDocumentsComplete = (
  section: VerificationSection,
  documents: any
): boolean => {
  const personalDocs = [DocumentType.AADHAR, DocumentType.PAN, DocumentType.LICENSE];
  const vehicleDocs = [
    DocumentType.INSURANCE, 
    DocumentType.POLLUTION, 
    DocumentType.REGISTRATION, 
    DocumentType.PERMIT
  ];
  
  const docsToCheck = section === VerificationSection.PERSONAL_DOCUMENTS ? personalDocs : vehicleDocs;
  
  if (section === VerificationSection.PERSONAL_DOCUMENTS) {
    return docsToCheck.every(doc => 
      documents[doc] && 
      documents[doc].frontUrl && 
      documents[doc].backUrl
    );
  } else {
    return docsToCheck.some(doc => 
      documents[doc] && 
      documents[doc].frontUrl && 
      documents[doc].backUrl
    );
  }
}; 