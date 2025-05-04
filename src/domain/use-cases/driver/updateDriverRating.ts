import { MongoRatingRepository } from '../../../infrastructure/repositories/mongoRatingRepository';
import { PartnerRepository } from '../../repositories/partnerRepository';

export interface UpdateDriverRatingInput {
  driverId: string;
}

export interface UpdateDriverRatingOutput {
  success: boolean;
  averageRating: number;
  totalRatings: number;
}

export class UpdateDriverRatingUseCase {
  constructor(
    private partnerRepository: PartnerRepository,
    private ratingRepository = new MongoRatingRepository()
  ) {}

  async execute(input: UpdateDriverRatingInput): Promise<UpdateDriverRatingOutput> {
    if (!input.driverId) {
      throw new Error('Driver ID is required');
    }

    // Get current partner
    const partner = await this.partnerRepository.findById(input.driverId);
    if (!partner) {
      throw new Error('Driver not found');
    }

    // Fetch ratings for this driver
    const ratings = await this.ratingRepository.getByDriverId(input.driverId);
    const averageRating = await this.ratingRepository.getAverageRatingByDriverId(input.driverId);

    // Update the partner with new rating information
    const updatedPartner = {
      ...partner,
      averageRating,
      totalRatings: ratings.length
    };

    // Save the updated partner
    await this.partnerRepository.findByIdAndUpdate(input.driverId, {
      averageRating,
      totalRatings: ratings.length
    });

    return {
      success: true,
      averageRating,
      totalRatings: ratings.length
    };
  }
} 