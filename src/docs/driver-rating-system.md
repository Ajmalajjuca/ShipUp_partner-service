# Driver Rating System

This document explains the driver rating functionality in the ShipUp service partner system.

## Overview

The driver rating system allows users to rate drivers after delivery completion. These ratings help maintain quality service and provide feedback to drivers about their performance.

## Features

1. Users can rate drivers on a scale of 1-5 stars
2. Users can provide optional feedback with their ratings
3. Each order can only be rated once
4. Driver profiles display their average rating and total number of ratings
5. Ratings are stored and can be retrieved for analysis

## API Endpoints

### Create a Rating

**Endpoint:** `POST /api/ratings`

**Request body:**
```json
{
  "driverId": "string",
  "userId": "string",
  "orderId": "string",
  "rating": number,
  "feedback": "string" // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Rating created successfully",
  "data": {
    "ratingId": "string",
    "driverId": "string",
    "userId": "string",
    "orderId": "string", 
    "rating": number,
    "feedback": "string",
    "createdAt": "date"
  }
}
```

### Get Driver Ratings

**Endpoint:** `GET /api/drivers/:driverId/ratings`

**Response:**
```json
{
  "success": true,
  "data": {
    "ratings": [
      {
        "ratingId": "string",
        "driverId": "string",
        "userId": "string",
        "orderId": "string",
        "rating": number,
        "feedback": "string",
        "createdAt": "date"
      }
    ],
    "averageRating": number,
    "totalRatings": number
  }
}
```

## Implementation Details

The rating system is implemented with the following components:

1. **Database Model**: `RatingModel` in MongoDB
2. **Entities**: `Rating` entity in the domain layer
3. **Repository**: `RatingRepository` interface and `MongoRatingRepository` implementation
4. **Use Cases**:
   - `CreateRatingUseCase`: For creating new ratings
   - `GetDriverRatingsUseCase`: For retrieving driver ratings
   - `UpdateDriverRatingUseCase`: For updating driver's average rating

## Integration with Driver Profiles

When a new rating is submitted, the system:

1. Saves the rating in the database
2. Calculates the new average rating for the driver
3. Updates the driver's profile with the new average rating and total ratings count

Driver profiles include `averageRating` and `totalRatings` fields that are returned when driver information is requested.

## Frontend Integration

The frontend allows users to rate drivers after a delivery is completed. The rating UI appears on the order completion screen, prompting users to rate their experience.

The rating component includes:
- A 5-star rating selector
- An optional feedback text area
- Submit and Skip buttons 