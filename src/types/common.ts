/**
 * Common types used across the partner service
 */

export enum PartnerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  SUSPENDED = 'suspended'
}

export enum DocumentType {
  AADHAR = 'aadhar',
  PAN = 'pan',
  LICENSE = 'license',
  INSURANCE = 'insurance',
  POLLUTION = 'pollution',
  REGISTRATION = 'registration',
  PERMIT = 'permit',
  PROFILE = 'profile'
}

export enum VerificationSection {
  BANK_DETAILS = 'bankDetailsCompleted',
  PERSONAL_DOCUMENTS = 'personalDocumentsCompleted',
  VEHICLE_DETAILS = 'vehicleDetailsCompleted'
}

export interface ApiResponse<T = any> {
  success: boolean;
  status?: string;
  message?: string;
  error?: string;
  partner?: T;
  token?: string;
}

export interface VehicleDocument {
  frontUrl?: string;
  backUrl?: string;
}

export interface VehicleDocuments {
  aadhar?: VehicleDocument;
  pan?: VehicleDocument;
  license?: VehicleDocument;
  insurance?: VehicleDocument;
  pollution?: VehicleDocument;
  registration?: VehicleDocument;
  permit?: VehicleDocument;
}

export interface PartnerUpdateFields {
  fullName?: string;
  mobileNumber?: string;
  dateOfBirth?: string;
  address?: string;
  email?: string;
  vehicleType?: string;
  registrationNumber?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  profilePicturePath?: string;
  status?: boolean;
  bankDetailsCompleted?: boolean;
  personalDocumentsCompleted?: boolean;
  vehicleDetailsCompleted?: boolean;
  vehicleDocuments?: VehicleDocuments;
} 