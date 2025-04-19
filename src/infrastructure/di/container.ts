// infrastructure/di/container.ts
import { PartnerRepositoryImpl } from '../repositories/partnerRepositoryImpl';
import { PartnerRepository } from '../../domain/repositories/partnerRepository';
import { PartnerService } from '../../application/services/partnerService';

// Singleton instances
let partnerRepository: PartnerRepository;
let partnerService: PartnerService;

/**
 * Get Partner Repository instance (singleton)
 */
export const getPartnerRepository = (): PartnerRepository => {
  if (!partnerRepository) {
    partnerRepository = new PartnerRepositoryImpl();
  }
  return partnerRepository;
};

/**
 * Get Partner Service instance (singleton)
 */
export const getPartnerService = (): PartnerService => {
  if (!partnerService) {
    const repository = getPartnerRepository();
    partnerService = new PartnerService(repository);
  }
  return partnerService;
}; 