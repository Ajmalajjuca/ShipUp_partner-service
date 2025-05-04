export interface Rating {
  ratingId: string;
  driverId: string;
  userId: string;
  orderId: string;
  rating: number;
  feedback?: string;
  quickReviews?: string[]; // Optional quick reviews
  createdAt: Date;
}

// Factory function to create a new Rating
export const createRating = (data: {
  ratingId: string;
  driverId: string;
  userId: string;
  orderId: string;
  rating: number;
  feedback?: string;
  quickReviews?: string[]; // Optional quick reviews
}): Rating => {
  return {
    ...data,
    createdAt: new Date()
  };
}; 