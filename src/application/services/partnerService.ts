import { Partner } from '../../domain/entities/partner';
import { PartnerRepository } from '../../domain/repositories/partnerRepository';
import { CreatePartner } from '../../domain/use-cases/createPartner';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../infrastructure/config';

export class PartnerService {
  private createPartner: CreatePartner;
  
  constructor(private partnerRepository: PartnerRepository) {
    this.createPartner = new CreatePartner(partnerRepository);
  }
  
  /**
   * Register a new partner with both partner and auth services
   */
  async registerPartner(partnerData: any): Promise<{ success: boolean; partner?: any; token?: string; error?: string }> {
    try {
      // Generate partner ID
      const partnerId = `PTR-${uuidv4()}`;
      
      // Register with auth service
      const authResponse = await axios.post(`${config.services.auth}/auth/register-partner`, {
        email: partnerData.email,
        role: 'partner',
        partnerId,
      });
      
      if (!authResponse.data.success) {
        return { 
          success: false, 
          error: authResponse.data.error || 'Authentication registration failed' 
        };
      }
      
      // Create partner in partner service
      const result = await this.createPartner.execute({
        ...partnerData,
        partnerId
      });
      
      if (!result.success) {
        // Rollback auth service registration if partner creation fails
        await axios.delete(`${config.services.auth}/auth/delete/${partnerId}`);
        return { 
          success: false, 
          error: result.error || 'Failed to create partner' 
        };
      }
      
      // Generate a temporary token for the new partner
      const tokenResult = await axios.post(`${config.services.auth}/auth/temp-token`, {
        userId: partnerId,
        email: partnerData.email,
        role: 'partner'
      });
      
      const token = tokenResult.data.token;
      
      return {
        success: true,
        partner: {
          email: partnerData.email,
          partnerId
        },
        token
      };
    } catch (error) {
      console.error('Partner registration error:', error);
      return {
        success: false,
        error: 'Failed to complete partner registration'
      };
    }
  }
  
  /**
   * Get all partners
   */
  async getAllPartners(): Promise<{ success: boolean; partners?: any[]; error?: string }> {
    try {
      const partners = await this.partnerRepository.findAll();
      
      // Transform partner data for the response
      const transformedPartners = partners.map(partner => ({
        partnerId: partner.partnerId,
        fullName: partner.fullName,
        email: partner.email,
        phone: partner.mobileNumber,
        profileImage: partner.profilePicturePath || null,
        createdAt: partner.createdAt,
        totalOrders: partner.totalOrders || 0,
        ongoing: partner.ongoingOrders || 0,
        canceled: partner.canceledOrders || 0,
        completed: partner.completedOrders || 0,
        status: partner.status || false,
        bankDetailsCompleted: partner.bankDetailsCompleted || false,
        personalDocumentsCompleted: partner.personalDocumentsCompleted || false,
        vehicleDetailsCompleted: partner.vehicleDetailsCompleted || false,
        vehicleDocuments: partner.vehicleDocuments || null
      }));
      
      return {
        success: true,
        partners: transformedPartners
      };
    } catch (error) {
      console.error('Get all partners error:', error);
      return {
        success: false,
        error: 'Failed to fetch partners'
      };
    }
  }
  
  /**
   * Get partner by ID
   */
  async getPartnerById(partnerId: string): Promise<{ success: boolean; partner?: any; error?: string }> {
    try {
      const partner = await this.partnerRepository.findById(partnerId);
      
      if (!partner) {
        return {
          success: false,
          error: 'Partner not found'
        };
      }
      
      return {
        success: true,
        partner
      };
    } catch (error) {
      console.error('Get partner by ID error:', error);
      return {
        success: false,
        error: 'Failed to fetch partner'
      };
    }
  }
  
  /**
   * Update partner status
   */
  async updatePartnerStatus(partnerId: string, status: boolean): Promise<{ success: boolean; partner?: any; error?: string }> {
    try {
      const updatedPartner = await this.partnerRepository.updateStatus(partnerId, status);
      
      if (!updatedPartner) {
        return {
          success: false,
          error: 'Partner not found'
        };
      }
      
      return {
        success: true,
        partner: updatedPartner
      };
    } catch (error) {
      console.error('Update partner status error:', error);
      return {
        success: false,
        error: 'Failed to update partner status'
      };
    }
  }
} 