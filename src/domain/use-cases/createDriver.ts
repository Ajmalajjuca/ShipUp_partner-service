// domain/use-cases/createDriver.ts
import { PartnerRepository } from '../repositories/driverRepository';
import { Driver, createDriver } from '../entities/driver';

export class CreateDriver {
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
  }): Promise<{ success: boolean; driver?: Driver; error?: string }> {
    try {
      const existingDriver = await this.partnerRepo.findByEmail(data.email);
      if (existingDriver) {
        return { success: false, error: 'Email already exists' };
      }

      const driver = createDriver(data);

      const createdDriver = await this.partnerRepo.create(driver);
      return { success: true, driver: createdDriver };
    } catch (error) {
      console.error('Create driver error:', error);
      return { success: false, error: 'Failed to create driver' };
    }
  }
}