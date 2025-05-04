import { Rating, createRating } from '../../entities/rating';
import { RatingRepository } from '../../repositories/ratingRepository';
import mongoose from 'mongoose';

export interface CreateRatingInput {
  driverId: string;
  userId: string;
  orderId: string;
  rating: number;
  feedback?: string;
  quickReviews?: string[]; // Optional quick reviews
}

export interface CreateRatingOutput {
  rating: Rating;
}

export class CreateRatingUseCase {
  constructor(private ratingRepository: RatingRepository) {}

  async execute(input: CreateRatingInput): Promise<CreateRatingOutput> {
    // Validate input
    if (!input.driverId || !input.userId || !input.orderId) {
      throw new Error('Driver ID, User ID, and Order ID are required');
    }

    if (input.rating < 1 || input.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Check if rating already exists for this order
    const existingRating = await this.ratingRepository.getByOrderId(input.orderId);
    if (existingRating) {
      throw new Error('A rating for this order already exists');
    }

    // Create the rating entity
    const rating = createRating({
      ratingId: new mongoose.Types.ObjectId().toString(),
      driverId: input.driverId,
      userId: input.userId,
      orderId: input.orderId,
      rating: input.rating,
      feedback: input.feedback,
      quickReviews: input.quickReviews || [], // Default to empty array if not provided
    });

    // Save to repository
    const savedRating = await this.ratingRepository.create(rating);

    return { rating: savedRating };
  }
} 