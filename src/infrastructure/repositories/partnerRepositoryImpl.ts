import { PartnerRepository } from '../../domain/repositories/partnerRepository';
import { Partner } from '../../domain/entities/partner';
import DriverModel, { IDriverPartner } from '../database/models/driverModel';

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
  isAvailable: boolean;
  lastOnline?: Date;
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
  /**
   * Maps a MongoDB document to a Partner domain entity
   */
  private mapToPartner(document: any): Partner {
    const partnerData = document.toObject();
    return {
      partnerId: partnerData.partnerId,
      fullName: partnerData.fullName,
      mobileNumber: partnerData.mobileNumber || partnerData.phone || '',
      dateOfBirth: partnerData.dateOfBirth || '',
      address: partnerData.address || '',
      email: partnerData.email,
      vehicleType: partnerData.vehicleType || '',
      registrationNumber: partnerData.registrationNumber || '',
      accountHolderName: partnerData.accountHolderName || '',
      accountNumber: partnerData.accountNumber || '',
      ifscCode: partnerData.ifscCode || '',
      upiId: partnerData.upiId || '',
      status: partnerData.status ?? true,
      isActive: partnerData.isActive,
      isVerified: partnerData.isVerified,
      isAvailable: partnerData.isAvailable,
      lastOnline: partnerData.lastOnline,
      bankDetailsCompleted: partnerData.bankDetailsCompleted ?? false,
      personalDocumentsCompleted: partnerData.personalDocumentsCompleted ?? false,
      vehicleDetailsCompleted: partnerData.vehicleDetailsCompleted ?? false,
      totalOrders: partnerData.totalOrders ?? 0,
      ongoingOrders: partnerData.ongoingOrders ?? 0,
      completedOrders: partnerData.completedOrders ?? 0,
      canceledOrders: partnerData.canceledOrders ?? 0,
      profilePicturePath: partnerData.profilePicturePath,
      aadharPath: partnerData.aadharPath,
      panPath: partnerData.panPath,
      licensePath: partnerData.licensePath,
      insuranceDocPath: partnerData.insuranceDocPath,
      pollutionDocPath: partnerData.pollutionDocPath,
      vehicleDocuments: partnerData.vehicleDocuments,
      createdAt: partnerData.createdAt,
      updatedAt: partnerData.updatedAt,
      location: partnerData.location,
      
    };
  }

  async create(partner: Partner): Promise<Partner> {
    const newPartner = new DriverModel(partner);
    await newPartner.save();
    return this.mapToPartner(newPartner);
  }

  async findAll(): Promise<Partner[]> {
    const partners = await DriverModel.find().sort({ createdAt: -1 });    
    return partners.map(partner => this.mapToPartner(partner));
  }

  async findById(id: string): Promise<Partner | null> {
    const partner = await DriverModel.findOne({ partnerId: id });
    return partner ? this.mapToPartner(partner) : null;
  }

  async findByEmail(email: string): Promise<Partner | null> {
    const partner = await DriverModel.findOne({ email });
    return partner ? this.mapToPartner(partner) : null;
  }

  async findByIdAndUpdate(id: string, updateData: Partial<Partner>): Promise<Partner | null> {
    const updatedPartner = await DriverModel.findOneAndUpdate(
      { partnerId: id },
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );
    return updatedPartner ? this.mapToPartner(updatedPartner) : null;
  }

  async updateStatus(id: string, status: boolean): Promise<Partner | null> {
    const updatedPartner = await DriverModel.findOneAndUpdate(
      { partnerId: id },
      { status, updatedAt: new Date() },
      { new: true }
    );
    return updatedPartner ? this.mapToPartner(updatedPartner) : null;
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

      return this.mapToPartner(updatedPartner);
    } catch (error) {
      console.error('Error in findByIdAndUpdate:', error);
      throw error;
    }
  }

  // Update delivery statistics for a partner
  async updateDeliveryStats(partnerId: string, status: 'completed' | 'cancelled'): Promise<boolean> {
    try {
      const updateFields: any = {
        lastUpdated: new Date()
      };
      
      // Increment the appropriate counter based on status
      if (status === 'completed') {
        updateFields.$inc = { 
          totalOrders: 1,
          completedOrders: 1,
          totalEarnings: 0 // This would normally be the order amount
        };
        updateFields.$set = { lastOrderCompletionDate: new Date() };
      } else if (status === 'cancelled') {
        updateFields.$inc = { 
          totalOrders: 1,
          canceledOrders: 1
        };
      }
      
      await DriverModel.findOneAndUpdate(
        { partnerId },
        updateFields,
        { new: true }
      );
      
      return true;
    } catch (error) {
      console.error('Error updating delivery stats:', error);
      return false;
    }
  }
}