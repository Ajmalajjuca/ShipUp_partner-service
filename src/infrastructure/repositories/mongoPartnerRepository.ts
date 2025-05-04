import { Partner } from '../../domain/entities/partner';
import { PartnerRepository } from '../../domain/repositories/partnerRepository';
import DriverModel, { IDriverPartner } from '../database/models/driverModel';

export class MongoPartnerRepository implements PartnerRepository {
  async create(partner: Partner): Promise<Partner> {
    const newPartner = await DriverModel.create({
      partnerId: partner.partnerId,
      fullName: partner.fullName,
      mobileNumber: partner.mobileNumber,
      email: partner.email,
      vehicleType: partner.vehicleType,
      registrationNumber: partner.registrationNumber,
      dateOfBirth: partner.dateOfBirth,
      address: partner.address,
      accountHolderName: partner.accountHolderName,
      accountNumber: partner.accountNumber,
      ifscCode: partner.ifscCode,
      upiId: partner.upiId,
      status: partner.status,
      aadharPath: partner.aadharPath,
      panPath: partner.panPath,
      licensePath: partner.licensePath,
      insuranceDocPath: partner.insuranceDocPath,
      pollutionDocPath: partner.pollutionDocPath,
      profilePicturePath: partner.profilePicturePath,
      vehicleDocuments: partner.vehicleDocuments,
      isActive: partner.isActive,
      isVerified: partner.isVerified,
      isAvailable: partner.isAvailable,
      bankDetailsCompleted: partner.bankDetailsCompleted,
      personalDocumentsCompleted: partner.personalDocumentsCompleted,
      vehicleDetailsCompleted: partner.vehicleDetailsCompleted,
      totalOrders: partner.totalOrders,
      ongoingOrders: partner.ongoingOrders,
      completedOrders: partner.completedOrders,
      canceledOrders: partner.canceledOrders,
      averageRating: partner.averageRating,
      totalRatings: partner.totalRatings,
      location: partner.location
    });

    return this.mapToPartner(newPartner);
  }

  async findAll(): Promise<Partner[]> {
    const partners = await DriverModel.find();
    return partners.map(partner => this.mapToPartner(partner));
  }

  async findById(id: string): Promise<Partner | null> {
    const partner = await DriverModel.findById(id);
    if (!partner) return null;
    
    return this.mapToPartner(partner);
  }

  async findByEmail(email: string): Promise<Partner | null> {
    const partner = await DriverModel.findOne({ email });
    if (!partner) return null;
    
    return this.mapToPartner(partner);
  }

  async findByIdAndUpdate(id: string, updateData: Partial<Partner>): Promise<Partner | null> {
    const updatedPartner = await DriverModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!updatedPartner) return null;
    
    return this.mapToPartner(updatedPartner);
  }

  async updateStatus(id: string, status: boolean): Promise<Partner | null> {
    const updatedPartner = await DriverModel.findByIdAndUpdate(
      id,
      { $set: { isAvailable: status, lastOnline: new Date() } },
      { new: true }
    );

    if (!updatedPartner) return null;
    
    return this.mapToPartner(updatedPartner);
  }

  async delete(id: string): Promise<boolean> {
    const result = await DriverModel.findByIdAndDelete(id);
    return !!result;
  }

  async updateDeliveryStats(partnerId: string, status: 'completed' | 'cancelled'): Promise<boolean> {
    const updateFields: any = {};
    
    if (status === 'completed') {
      updateFields.$inc = { 
        completedOrders: 1,
        ongoingOrders: -1
      };
    } else if (status === 'cancelled') {
      updateFields.$inc = {
        canceledOrders: 1,
        ongoingOrders: -1
      };
    }
    
    const result = await DriverModel.updateOne(
      { _id: partnerId },
      updateFields
    );
    
    return result.modifiedCount > 0;
  }

  // Helper method to map database model to domain entity
  private mapToPartner(model: IDriverPartner): Partner {
    return {
      partnerId: model.partnerId,
      fullName: model.fullName || '',
      mobileNumber: model.mobileNumber || model.phone || '',
      dateOfBirth: model.dateOfBirth || '',
      address: model.address || '',
      email: model.email || '',
      vehicleType: model.vehicleType || '',
      registrationNumber: model.registrationNumber || '',
      accountHolderName: model.accountHolderName || '',
      accountNumber: model.accountNumber || '',
      ifscCode: model.ifscCode || '',
      upiId: model.upiId || '',
      status: model.status === undefined ? true : model.status,
      aadharPath: model.aadharPath,
      panPath: model.panPath,
      licensePath: model.licensePath,
      insuranceDocPath: model.insuranceDocPath,
      pollutionDocPath: model.pollutionDocPath,
      profilePicturePath: model.profilePicturePath,
      vehicleDocuments: model.vehicleDocuments,
      isActive: model.isActive === undefined ? true : model.isActive,
      isVerified: model.isVerified === undefined ? false : model.isVerified,
      isAvailable: model.isAvailable === undefined ? false : model.isAvailable,
      lastOnline: model.lastOnline,
      bankDetailsCompleted: model.bankDetailsCompleted === undefined ? false : model.bankDetailsCompleted,
      personalDocumentsCompleted: model.personalDocumentsCompleted === undefined ? false : model.personalDocumentsCompleted,
      vehicleDetailsCompleted: model.vehicleDetailsCompleted === undefined ? false : model.vehicleDetailsCompleted,
      totalOrders: model.totalOrders || 0,
      ongoingOrders: model.ongoingOrders || 0,
      completedOrders: model.completedOrders || 0,
      canceledOrders: model.canceledOrders || 0,
      averageRating: model.averageRating,
      totalRatings: model.totalRatings,
      createdAt: model.createdAt || new Date(),
      updatedAt: model.updatedAt || new Date(),
      location: model.location ? {
        type: model.location.type,
        coordinates: model.location.coordinates.slice(0, 2) as [number, number]
      } : undefined
    };
  }

  // For backward compatibility
  async update(partner: Partner): Promise<Partner> {
    const result = await this.findByIdAndUpdate(partner.partnerId, partner);
    if (!result) {
      throw new Error('Partner not found');
    }
    return result;
  }
} 