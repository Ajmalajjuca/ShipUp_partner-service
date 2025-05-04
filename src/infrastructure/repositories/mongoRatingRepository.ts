import { Rating } from '../../domain/entities/rating';
import { RatingRepository } from '../../domain/repositories/ratingRepository';
import RatingModel, { RatingDocument } from '../database/models/RatingModel';
import mongoose from 'mongoose';

export class MongoRatingRepository implements RatingRepository {
  private mapToEntity(doc: RatingDocument): Rating {
    return {
      ratingId: doc._id.toString(),
      driverId: doc.driverId,
      userId: doc.userId,
      orderId: doc.orderId,
      rating: doc.rating,
      feedback: doc.feedback,
      quickReviews: doc.quickReviews || [], // Default to empty array if not provided
      createdAt: doc.createdAt
    };
  }

  async create(rating: Rating): Promise<Rating> {
    // Generate a new ID if not provided
    const ratingId = rating.ratingId || new mongoose.Types.ObjectId().toString();
    
    // Check if a rating for this order already exists
    const existingRating = await RatingModel.findOne({ orderId: rating.orderId });
    if (existingRating) {
      throw new Error('A rating for this order already exists');
    }
    
    // Create the rating
    const ratingDoc = new RatingModel({
      _id: ratingId,
      driverId: rating.driverId,
      userId: rating.userId,
      orderId: rating.orderId,
      rating: rating.rating,
      feedback: rating.feedback,
      quickReviews: rating.quickReviews || [], // Default to empty array if not provided
      createdAt: rating.createdAt || new Date()
    });
    
    await ratingDoc.save();
    return this.mapToEntity(ratingDoc);
  }

  async getByDriverId(driverId: string): Promise<Rating[]> {
    const ratings = await RatingModel.find({ driverId }).sort({ createdAt: -1 });
    return ratings.map(rating => this.mapToEntity(rating));
  }

  async getByOrderId(orderId: string): Promise<Rating | null> {
    const rating = await RatingModel.findOne({ orderId });
    return rating ? this.mapToEntity(rating) : null;
  }

  async getByUserId(userId: string): Promise<Rating[]> {
    const ratings = await RatingModel.find({ userId }).sort({ createdAt: -1 });
    return ratings.map(rating => this.mapToEntity(rating));
  }

  async getAverageRatingByDriverId(driverId: string): Promise<number> {
    const result = await RatingModel.aggregate([
      { $match: { driverId } },
      { $group: { _id: null, averageRating: { $avg: '$rating' } } }
    ]);
    
    return result.length > 0 ? parseFloat(result[0].averageRating.toFixed(1)) : 0;
  }
} 