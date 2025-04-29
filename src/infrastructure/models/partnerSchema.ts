import mongoose, { Document, Schema } from 'mongoose';

// Create the partner schema interface
export interface IPartner extends Document {
  partnerId: string;
  fullName?: string;
  phone?: string;
  email?: string;
  vehicleType?: string;
  location?: {
    type: string;
    coordinates: number[];
  };
  isAvailable: boolean;
  isActive: boolean;
  isVerified: boolean;
  hasPendingRequest: boolean;
  lastSeen: Date;
  lastRequestTime?: Date;
  lastLocationUpdate?: Date;
  currentOrderId?: string;
  profilePicturePath?: string;
}

// Define the location schema
const locationSchema = new Schema({
  type: { type: String, default: 'Point' },
  coordinates: { type: [Number], index: '2dsphere' }
}, { _id: false });

// Define the partner schema
const partnerSchema = new Schema({
  partnerId: { type: String, required: true, unique: true, index: true },
  fullName: { type: String },
  phone: { type: String },
  email: { type: String },
  vehicleType: { type: String },
  location: { 
    type: locationSchema,
    index: '2dsphere'
  },
  isAvailable: { type: Boolean, default: false, index: true },
  isActive: { type: Boolean, default: true, index: true },
  isVerified: { type: Boolean, default: false },
  hasPendingRequest: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  lastRequestTime: { type: Date },
  lastLocationUpdate: { type: Date },
  currentOrderId: { type: String },
  profilePicturePath: { type: String }
}, { timestamps: true });

// Create a compound index for finding available drivers
partnerSchema.index({ isAvailable: 1, isActive: 1, isVerified: 1 });

// Export the partner model
const Partner = mongoose.model<IPartner>('Partner', partnerSchema);

export default Partner; 