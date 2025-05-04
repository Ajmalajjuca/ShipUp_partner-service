import { Request, Response } from 'express';
import { CreateRatingUseCase } from '../../domain/use-cases/rating/createRating';
import { GetDriverRatingsUseCase } from '../../domain/use-cases/rating/getDriverRatings';
import { UpdateDriverRatingUseCase } from '../../domain/use-cases/driver/updateDriverRating';
import { MongoRatingRepository } from '../../infrastructure/repositories/mongoRatingRepository';
import { MongoPartnerRepository } from '../../infrastructure/repositories/mongoPartnerRepository';
import mongoose from 'mongoose';

// Create repository instances
const ratingRepository = new MongoRatingRepository();
const partnerRepository = new MongoPartnerRepository();

// Initialize use cases
const createRatingUseCase = new CreateRatingUseCase(ratingRepository);
const getDriverRatingsUseCase = new GetDriverRatingsUseCase(ratingRepository);
const updateDriverRatingUseCase = new UpdateDriverRatingUseCase(partnerRepository);

export const ratingController = {
  /**
   * Creates a new rating for a driver
   */
  async createRating(req: Request, res: Response): Promise<void> {
    try {
      const { driverId, userId, orderId, rating, feedback, quickReviews } = req.body;

      // Validate required fields
      if (!driverId || !userId || !orderId || !rating) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: driverId, userId, orderId, rating'
        });
        return;
      }

      // Validate rating value
      const ratingValue = parseInt(rating);
      if (isNaN(ratingValue) || ratingValue < 1 || ratingValue > 5) {
        res.status(400).json({
          success: false,
          message: 'Rating must be a number between 1 and 5'
        });
        return;
      }

      // Execute use case
      const result = await createRatingUseCase.execute({
        driverId,
        userId,
        orderId,
        rating: ratingValue,
        feedback,
        quickReviews
      });

      // Update driver's average rating
      try {
        await updateDriverRatingUseCase.execute({ driverId });
      } catch (updateError) {
        console.error('Error updating driver rating:', updateError);
        // Continue despite error - the rating was still saved
      }

      // Return success response
      res.status(201).json({
        success: true,
        message: 'Rating created successfully',
        data: result.rating
      });
    } catch (error) {
      console.error('Error creating rating:', error);
      
      // Handle specific errors
      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          message: error.message
        });
        return;
      }
      
      // Generic error response
      res.status(500).json({
        success: false,
        message: 'Failed to create rating',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Gets all ratings for a driver
   */
  async getDriverRatings(req: Request, res: Response): Promise<void> {
    try {
      const { driverId } = req.params;

      if (!driverId) {
        res.status(400).json({
          success: false,
          message: 'Driver ID is required'
        });
        return;
      }

      // Execute use case
      const result = await getDriverRatingsUseCase.execute({ driverId });

      // Return success response
      res.status(200).json({
        success: true,
        data: {
          ratings: result.ratings,
          averageRating: result.averageRating,
          totalRatings: result.totalRatings
        }
      });
    } catch (error) {
      console.error('Error getting driver ratings:', error);
      
      // Generic error response
      res.status(500).json({
        success: false,
        message: 'Failed to get driver ratings',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}; 