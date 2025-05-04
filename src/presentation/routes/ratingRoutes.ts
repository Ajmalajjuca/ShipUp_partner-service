import express from 'express';
import { ratingController } from '../controllers/ratingController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = express.Router();

// Create a new rating
router.post('/ratings', ratingController.createRating);

// Get ratings for a driver
router.get('/drivers/:driverId/ratings', ratingController.getDriverRatings);

export default router; 