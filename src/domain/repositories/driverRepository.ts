import { Driver } from '../entities/driver';

export interface PartnerRepository {
  create(driver: Driver): Promise<Driver>;
  findById(partnerId: string): Promise<Driver | null>;
  findByEmail(email: string): Promise<Driver | null>;
  findAll(): Promise<Driver[]>;
  update(partnerId: string, data: Partial<Driver>): Promise<Driver | null>;
  delete(partnerId: string): Promise<boolean>;
}