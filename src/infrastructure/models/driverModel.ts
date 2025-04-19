import mongoose, { Document, Schema } from 'mongoose';
import { Partner } from '../../domain/entities/partner';

// Create an interface that extends both Driver and Document
export interface IDriver extends Partner, Document {}

const driverSchema = new Schema({
  partnerId: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  mobileNumber: { type: String, required: true },
  dateOfBirth: { type: String, required: true },
  address: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  vehicleType: { type: String, required: true },
  registrationNumber: { type: String, required: true },
  accountHolderName: { type: String, required: true },
  accountNumber: { type: String, required: true },
  ifscCode: { type: String, required: true },
  upiId: { type: String, required: true },
  
  // Legacy document paths (maintained for backward compatibility)
  aadharPath: { type: String },
  panPath: { type: String },
  licensePath: { type: String },
  insuranceDocPath: { type: String },
  pollutionDocPath: { type: String },
  profilePicturePath: { type: String },

  // New document structure with front and back URLs
  vehicleDocuments: {
    aadhar: {
      frontUrl: { type: String },
      backUrl: { type: String }
    },
    pan: {
      frontUrl: { type: String },
      backUrl: { type: String }
    },
    license: {
      frontUrl: { type: String },
      backUrl: { type: String }
    },
    insurance: {
      frontUrl: { type: String },
      backUrl: { type: String }
    },
    pollution: {
      frontUrl: { type: String },
      backUrl: { type: String }
    },
    registration: {
      frontUrl: { type: String },
      backUrl: { type: String }
    },
    permit: {
      frontUrl: { type: String },
      backUrl: { type: String }
    }
  },

  // Status flags
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  status: { type: Boolean, default: true },
  bankDetailsCompleted: { type: Boolean, default: false },
  personalDocumentsCompleted: { type: Boolean, default: false },
  vehicleDetailsCompleted: { type: Boolean, default: false },

  // Order statistics
  totalOrders: { type: Number, default: 0 },
  ongoingOrders: { type: Number, default: 0 },
  completedOrders: { type: Number, default: 0 },
  canceledOrders: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Create and export the model
export const DriverModel = mongoose.model<IDriver>('Driver', driverSchema);