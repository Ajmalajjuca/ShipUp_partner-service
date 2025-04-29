import { Partner } from '../entities/partner';

export interface PartnerRepository {
  create(partner: Partner): Promise<Partner>;
  findAll(): Promise<Partner[]>;
  findById(id: string): Promise<Partner | null>;
  findByEmail(email: string): Promise<Partner | null>;
  findByIdAndUpdate(id: string, updateData: Partial<Partner>): Promise<Partner | null>;
  updateStatus(id: string, status: boolean): Promise<Partner | null>;
  delete(id: string): Promise<boolean>;
  updateDeliveryStats(partnerId: string, status: 'completed' | 'cancelled'): Promise<boolean>;
}