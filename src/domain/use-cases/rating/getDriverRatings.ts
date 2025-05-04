import { Rating } from '../../entities/rating';
import { RatingRepository } from '../../repositories/ratingRepository';

export interface GetDriverRatingsInput {
  driverId: string;
}

export interface GetDriverRatingsOutput {
  ratings: Rating[];
  averageRating: number;
  totalRatings: number;
}

export class GetDriverRatingsUseCase {
  constructor(private ratingRepository: RatingRepository) {}

  async execute(input: GetDriverRatingsInput): Promise<GetDriverRatingsOutput> {
    if (!input.driverId) {
      throw new Error('Driver ID is required');
    }

    // Get ratings for this driver
    const ratings = await this.ratingRepository.getByDriverId(input.driverId);
    
    // Get average rating
    const averageRating = await this.ratingRepository.getAverageRatingByDriverId(input.driverId);

    return {
      ratings,
      averageRating,
      totalRatings: ratings.length
    };
  }
} 