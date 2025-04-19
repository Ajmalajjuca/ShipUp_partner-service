import { PartnerRepository } from '../../domain/repositories/partnerRepository';
import { Partner } from '../../domain/entities/partner';
import {DriverModel} from '../models/driverModel';

// Define PartnerDocument interface
interface PartnerDocument {
  _id: string;
  partnerId: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  dateOfBirth: string;
  address: string;
  vehicleType: string;
  registrationNumber: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  bankDetailsCompleted: boolean;
  personalDocumentsCompleted: boolean;
  vehicleDetailsCompleted: boolean;
  isActive: boolean;
  status: boolean;
  totalOrders?: number;
  ongoingOrders?: number;
  canceledOrders?: number;
  completedOrders?: number;
  profilePicturePath?: string;
  aadharPath?: string;
  panPath?: string;
  licensePath?: string;
  insuranceDocPath?: string;
  pollutionDocPath?: string;
  vehicleDocuments?: {
    aadhar?: { frontUrl?: string; backUrl?: string };
    pan?: { frontUrl?: string; backUrl?: string };
    license?: { frontUrl?: string; backUrl?: string };
    insurance?: { frontUrl?: string; backUrl?: string };
    pollution?: { frontUrl?: string; backUrl?: string };
    registration?: { frontUrl?: string; backUrl?: string };
    permit?: { frontUrl?: string; backUrl?: string };
  };
  createdAt: Date;
  updatedAt: Date;
}

export class PartnerRepositoryImpl implements PartnerRepository {
  async create(partner: Partner): Promise<Partner> {
    const newPartner = new DriverModel(partner);
    await newPartner.save();
    return newPartner.toObject();
  }

  async findAll(): Promise<Partner[]> {
    const partners = await DriverModel.find().sort({ createdAt: -1 });
    return partners.map(partner => partner.toObject());
  }

  async findById(id: string): Promise<Partner | null> {
    const partner = await DriverModel.findOne({ partnerId: id });
    return partner ? partner.toObject() : null;
  }

  async findByEmail(email: string): Promise<Partner | null> {
    const partner = await DriverModel.findOne({ email });
    return partner ? partner.toObject() : null;
  }

  async findByIdAndUpdate(id: string, updateData: Partial<Partner>): Promise<Partner | null> {
    const updatedPartner = await DriverModel.findOneAndUpdate(
      { partnerId: id },
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );
    return updatedPartner ? updatedPartner.toObject() : null;
  }

  async updateStatus(id: string, status: boolean): Promise<Partner | null> {
    const updatedPartner = await DriverModel.findOneAndUpdate(
      { partnerId: id },
      { status, updatedAt: new Date() },
      { new: true }
    );
    return updatedPartner ? updatedPartner.toObject() : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await DriverModel.deleteOne({ partnerId: id });
    return result.deletedCount > 0;
  }

  async findByIdAndUpdatePartnerDocument(partnerId: string, updateData: Partial<PartnerDocument>) {
    try {
      
      const updatedPartner = await DriverModel.findOneAndUpdate(
        { partnerId: partnerId },
        { $set: updateData },
        { new: true }
      );
      

      if (!updatedPartner) {
        return null;
      }

      const partnerData = updatedPartner.toObject();

      return {
        ...partnerData,
        profilePicturePath: partnerData.profilePicturePath 
          ? `${partnerData.profilePicturePath}`
          : null,
        aadharPath: partnerData.aadharPath 
          ? `${partnerData.aadharPath}`
          : null,
        panPath: partnerData.panPath 
          ? `${partnerData.panPath}`
          : null,
        licensePath: partnerData.licensePath 
          ? `${partnerData.licensePath}`
          : null,
        insuranceDocPath: partnerData.insuranceDocPath 
          ? `${partnerData.insuranceDocPath}`
          : null,
        pollutionDocPath: partnerData.pollutionDocPath 
          ? `${partnerData.pollutionDocPath}`
          : null,
        vehicleDocuments: partnerData.vehicleDocuments || null,
      };
    } catch (error) {
      console.error('Error in findByIdAndUpdate:', error);
      throw error;
    }
  }
}