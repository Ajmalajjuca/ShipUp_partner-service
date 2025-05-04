import { Rating } from '../entities/rating';

export interface RatingRepository {
  create(rating: Rating): Promise<Rating>;
  getByDriverId(driverId: string): Promise<Rating[]>;
  getByOrderId(orderId: string): Promise<Rating | null>;
  getByUserId(userId: string): Promise<Rating[]>;
  getAverageRatingByDriverId(driverId: string): Promise<number>;
} 