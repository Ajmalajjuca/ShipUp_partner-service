import mongoose, { Schema, Document } from 'mongoose';
import { Rating } from '../../../domain/entities/rating';

export interface RatingDocument extends Document, Omit<Rating, 'ratingId'> {
  _id: string;
}

const RatingSchema = new Schema({
  driverId: { 
    type: String, 
    required: true, 
    index: true 
  },
  userId: { 
    type: String, 
    required: true, 
    index: true 
  },
  orderId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  rating: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 5 
  },
  feedback: { 
    type: String, 
    required: false 
  },
  quickReviews: { 
    type: [String], 
    required: false, 
    default: [] 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: false,
  versionKey: false,
  toJSON: {
    transform: (_, ret) => {
      ret.ratingId = ret._id;
      delete ret._id;
      return ret;
    }
  }
});

// Create index for better lookup
RatingSchema.index({ driverId: 1, createdAt: -1 });

export default mongoose.model<RatingDocument>('Rating', RatingSchema);