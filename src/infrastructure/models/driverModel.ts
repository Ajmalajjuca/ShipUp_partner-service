import mongoose, { Document, Schema } from 'mongoose';

export interface IDriverPartner extends Document {
  partnerId: string;
  fullName: string;
  phone?: string;
  mobileNumber?: string;
  email: string;
  vehicleType?: string;
  vehicleId?: string;
  registrationNumber?: string;
  dateOfBirth?: string;
  address?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  location?: {
    type: string;
    coordinates: number[];
  };
  isAvailable: boolean;
  isActive: boolean;
  isVerified: boolean;
  status?: boolean;
  hasPendingRequest?: boolean;
  lastSeen?: Date;
  lastRequestTime?: Date;
  lastLocationUpdate?: Date;
  lastOnline?: Date;
  currentOrderId?: string;
  profilePicturePath?: string;
  bankDetailsCompleted?: boolean;
  personalDocumentsCompleted?: boolean;
  vehicleDetailsCompleted?: boolean;

  // Legacy paths
  aadharPath?: string;
  panPath?: string;
  licensePath?: string;
  insuranceDocPath?: string;
  pollutionDocPath?: string;

  // New structured documents
  vehicleDocuments?: {
    aadhar?: { frontUrl?: string; backUrl?: string };
    pan?: { frontUrl?: string; backUrl?: string };
    license?: { frontUrl?: string; backUrl?: string };
    insurance?: { frontUrl?: string; backUrl?: string };
    pollution?: { frontUrl?: string; backUrl?: string };
    registration?: { frontUrl?: string; backUrl?: string };
    permit?: { frontUrl?: string; backUrl?: string };
  };

  // Order stats
  totalOrders?: number;
  ongoingOrders?: number;
  completedOrders?: number;
  canceledOrders?: number;
}

const locationSchema = new Schema({
  type: { type: String, default: 'Point' },
  coordinates: { type: [Number], index: '2dsphere' }
}, { _id: false });

const driverSchema = new Schema({
  partnerId: { type: String, required: true, unique: true, index: true },
  fullName: { type: String, required: true },
  phone: { type: String },
  mobileNumber: { type: String },
  email: { type: String, required: true, unique: true },
  vehicleType: { type: String },
  vehicleId: { type: String },
  registrationNumber: { type: String },
  dateOfBirth: { type: String },
  address: { type: String },
  accountHolderName: { type: String },
  accountNumber: { type: String },
  ifscCode: { type: String },
  upiId: { type: String },

  // Legacy paths
  aadharPath: { type: String },
  panPath: { type: String },
  licensePath: { type: String },
  insuranceDocPath: { type: String },
  pollutionDocPath: { type: String },
  profilePicturePath: { type: String },

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

  // Location
  location: { type: locationSchema, index: '2dsphere' },

  // Status & activity
  isAvailable: { type: Boolean, default: false, index: true },
  isActive: { type: Boolean, default: true, index: true },
  isVerified: { type: Boolean, default: false },
  status: { type: Boolean, default: true },
  hasPendingRequest: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  lastRequestTime: { type: Date },
  lastLocationUpdate: { type: Date },
  lastOnline: { type: Date },
  currentOrderId: { type: String },
  bankDetailsCompleted: { type: Boolean, default: false },
  personalDocumentsCompleted: { type: Boolean, default: false },
  vehicleDetailsCompleted: { type: Boolean, default: false },

  // Order stats
  totalOrders: { type: Number, default: 0 },
  ongoingOrders: { type: Number, default: 0 },
  completedOrders: { type: Number, default: 0 },
  canceledOrders: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Index for geospatial + availability
driverSchema.index({ isAvailable: 1, isActive: 1, isVerified: 1 });

const DriverModel = mongoose.model<IDriverPartner>('drivers', driverSchema);
export default DriverModel;
