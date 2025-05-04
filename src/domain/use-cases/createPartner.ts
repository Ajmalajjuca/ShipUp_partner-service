// domain/use-cases/createPartner.ts
import { PartnerRepository } from '../repositories/partnerRepository';
import { Partner, createPartner } from '../entities/partner';

export class CreatePartner {
  constructor(private partnerRepo: PartnerRepository) {}

  async execute(data: {
    partnerId: string;
    fullName: string;
    mobileNumber: string;
    dateOfBirth: string;
    address: string;
    email: string;
    vehicleType: string;
    registrationNumber: string;
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    upiId: string;
    aadharPath?: string;
    panPath?: string;
    licensePath?: string;
    insuranceDocPath?: string;
    pollutionDocPath?: string;
    profilePicturePath?: string;
    vehicleDocuments?: {
      aadhar?: { frontUrl?: string; backUrl?: string };
      pan?: { frontUrl?: string; backUrl?: string };
      license?: { frontUrl?: string; backUrl?: string };
      insurance?: { frontUrl?: string; backUrl?: string };
      pollution?: { frontUrl?: string; backUrl?: string };
      registration?: { frontUrl?: string; backUrl?: string };
      permit?: { frontUrl?: string; backUrl?: string };
    };
  }): Promise<{ success: boolean; partner?: Partner; error?: string }> {
    try {
      const existingPartner = await this.partnerRepo.findByEmail(data.email);
      if (existingPartner) {
        return { success: false, error: 'Email already exists' };
      }

      const partner = createPartner(data);

      const createdPartner = await this.partnerRepo.create(partner);
      return { success: true, partner: createdPartner };
    } catch (error) {
      console.error('Create partner error:', error);
      return { success: false, error: 'Failed to create partner' };
    }
  }
}