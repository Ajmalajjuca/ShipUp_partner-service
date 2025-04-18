# Partner Service API Documentation

This document provides comprehensive information about the Partner Service API endpoints, their request/response formats, and usage guidelines.

## Table of Contents

- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [API Endpoints](#api-endpoints)
  - [Driver Management](#driver-management)
  - [Document Management](#document-management)
  - [Vehicle Management](#vehicle-management)
  - [Order Management](#order-management)
  - [File Upload](#file-upload)

## Overview

The Partner Service provides APIs for managing delivery partners (drivers), their documents, vehicles, and related operations.

## Base URL

```
http://localhost:3003/api
```

## Authentication

Most endpoints require authentication via JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your_token>
```

## Error Handling

All API responses follow a consistent format:

### Success Response

```json
{
  "success": true,
  "message": "Operation completed successfully",
  // Additional data specific to the endpoint
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message"
}
```

## API Endpoints

### Driver Management

#### Create Driver

Create a new delivery partner (driver) profile.

- **URL:** `/drivers`
- **Method:** `POST`
- **Auth Required:** No
- **Request Body:**

```json
{
  "partnerId": "DRV-abc123",
  "email": "driver@example.com",
  "fullName": "John Driver",
  "phone": "+919876543210",
  "address": "123 Driver St, City, Country"
}
```

- **Success Response:**

```json
{
  "success": true,
  "partner": {
    "partnerId": "DRV-abc123",
    "email": "driver@example.com",
    "fullName": "John Driver",
    "phone": "+919876543210",
    "address": "123 Driver St, City, Country",
    "onlineStatus": false,
    "isVerified": false,
    "status": true,
    "profileImage": null,
    "bankDetails": null,
    "vehicleDetails": null,
    "drivingLicense": null,
    "vehicleDocuments": null
  }
}
```

#### Get Driver

Get driver profile by ID.

- **URL:** `/drivers/:partnerId`
- **Method:** `GET`
- **Auth Required:** Yes
- **Success Response:**

```json
{
  "success": true,
  "partner": {
    "partnerId": "DRV-abc123",
    "email": "driver@example.com",
    "fullName": "John Driver",
    "phone": "+919876543210",
    "address": "123 Driver St, City, Country",
    "onlineStatus": true,
    "isVerified": true,
    "status": true,
    "profileImage": "https://example.com/profile.jpg",
    "bankDetails": {
      "accountNumber": "XXXX1234",
      "bankName": "Example Bank",
      "branchCode": "EXB001",
      "accountHolderName": "John Driver"
    },
    "vehicleDetails": {
      "vehicleType": "Bike",
      "vehicleNumber": "XY12A3456",
      "model": "Honda Activa",
      "year": "2020"
    },
    "drivingLicense": {
      "front": "https://example.com/license-front.jpg",
      "back": "https://example.com/license-back.jpg"
    },
    "vehicleDocuments": {
      "registration": {
        "front": "https://example.com/registration-front.jpg",
        "back": "https://example.com/registration-back.jpg"
      },
      "insurance": {
        "front": "https://example.com/insurance-front.jpg",
        "back": "https://example.com/insurance-back.jpg"
      }
    }
  }
}
```

#### Get Driver By Email

Get driver profile by email.

- **URL:** `/drivers/by-email/:email`
- **Method:** `GET`
- **Auth Required:** Yes
- **Success Response:**

Same as Get Driver endpoint.

#### Update Driver

Update driver profile details.

- **URL:** `/drivers/:partnerId`
- **Method:** `PUT`
- **Auth Required:** Yes
- **Request Body:**

```json
{
  "fullName": "John Smith Driver",
  "phone": "+919876543211",
  "address": "456 Driver Ave, City, Country"
}
```

- **Success Response:**

```json
{
  "success": true,
  "partner": {
    "partnerId": "DRV-abc123",
    "fullName": "John Smith Driver",
    "phone": "+919876543211",
    "address": "456 Driver Ave, City, Country",
    // ... other driver properties
  }
}
```

#### Delete Driver

Delete a driver.

- **URL:** `/drivers/:partnerId`
- **Method:** `DELETE`
- **Auth Required:** Yes
- **Success Response:**

```json
{
  "success": true,
  "message": "Driver deleted successfully"
}
```

#### Get All Drivers

Get all drivers in the system.

- **URL:** `/drivers`
- **Method:** `GET`
- **Auth Required:** Yes
- **Success Response:**

```json
{
  "success": true,
  "partners": [
    {
      "partnerId": "DRV-abc123",
      "email": "driver@example.com",
      "fullName": "John Driver",
      // ... other driver properties
    },
    // ... more drivers
  ]
}
```

#### Update Driver Status

Update driver status (active/inactive).

- **URL:** `/drivers/:partnerId/status`
- **Method:** `PUT`
- **Auth Required:** Yes
- **Request Body:**

```json
{
  "status": false
}
```

- **Success Response:**

```json
{
  "success": true,
  "message": "Driver status updated successfully",
  "partner": {
    "partnerId": "DRV-abc123",
    "status": false,
    // ... other driver properties
  }
}
```

#### Update Online Status

Update driver's online/offline status.

- **URL:** `/drivers/:partnerId/online-status`
- **Method:** `PUT`
- **Auth Required:** Yes
- **Request Body:**

```json
{
  "onlineStatus": true
}
```

- **Success Response:**

```json
{
  "success": true,
  "message": "Online status updated successfully",
  "partner": {
    "partnerId": "DRV-abc123",
    "onlineStatus": true,
    // ... other driver properties
  }
}
```

### Document Management

#### Update Documents

Update driver's documents.

- **URL:** `/drivers/:partnerId/documents`
- **Method:** `PUT`
- **Auth Required:** Yes
- **Request Body:**

```json
{
  "drivingLicense": {
    "front": "https://example.com/license-front.jpg",
    "back": "https://example.com/license-back.jpg"
  },
  "vehicleDocuments": {
    "registration": {
      "front": "https://example.com/registration-front.jpg",
      "back": "https://example.com/registration-back.jpg"
    },
    "insurance": {
      "front": "https://example.com/insurance-front.jpg",
      "back": "https://example.com/insurance-back.jpg"
    }
  }
}
```

- **Success Response:**

```json
{
  "success": true,
  "message": "Documents updated successfully",
  "partner": {
    "partnerId": "DRV-abc123",
    "drivingLicense": {
      "front": "https://example.com/license-front.jpg",
      "back": "https://example.com/license-back.jpg"
    },
    "vehicleDocuments": {
      "registration": {
        "front": "https://example.com/registration-front.jpg",
        "back": "https://example.com/registration-back.jpg"
      },
      "insurance": {
        "front": "https://example.com/insurance-front.jpg",
        "back": "https://example.com/insurance-back.jpg"
      }
    },
    // ... other driver properties
  }
}
```

### Vehicle Management

#### Update Vehicle Details

Update driver's vehicle details.

- **URL:** `/drivers/:partnerId/vehicle`
- **Method:** `PUT`
- **Auth Required:** Yes
- **Request Body:**

```json
{
  "vehicleType": "Car",
  "vehicleNumber": "XY12A3457",
  "model": "Maruti Swift",
  "year": "2021"
}
```

- **Success Response:**

```json
{
  "success": true,
  "message": "Vehicle details updated successfully",
  "partner": {
    "partnerId": "DRV-abc123",
    "vehicleDetails": {
      "vehicleType": "Car",
      "vehicleNumber": "XY12A3457",
      "model": "Maruti Swift",
      "year": "2021"
    },
    // ... other driver properties
  }
}
```

### Bank Details

#### Update Bank Details

Update driver's bank details.

- **URL:** `/drivers/:partnerId/bank`
- **Method:** `PUT`
- **Auth Required:** Yes
- **Request Body:**

```json
{
  "accountNumber": "XXXX5678",
  "bankName": "New Bank",
  "branchCode": "NB001",
  "accountHolderName": "John Smith Driver"
}
```

- **Success Response:**

```json
{
  "success": true,
  "message": "Bank details updated successfully",
  "partner": {
    "partnerId": "DRV-abc123",
    "bankDetails": {
      "accountNumber": "XXXX5678",
      "bankName": "New Bank",
      "branchCode": "NB001",
      "accountHolderName": "John Smith Driver"
    },
    // ... other driver properties
  }
}
```

### Order Management

#### Get Driver Orders

Get orders assigned to a driver.

- **URL:** `/drivers/:partnerId/orders`
- **Method:** `GET`
- **Auth Required:** Yes
- **Query Parameters:**
  - `status`: Filter by order status (optional)
  - `startDate`: Filter by start date (optional, format: YYYY-MM-DD)
  - `endDate`: Filter by end date (optional, format: YYYY-MM-DD)
- **Success Response:**

```json
{
  "success": true,
  "orders": [
    {
      "orderId": "ORD-123456",
      "userId": "USR-abc123",
      "partnerId": "DRV-abc123",
      "status": "delivered",
      "deliveryAddress": "123 Delivery St, City, Country",
      "pickupAddress": "456 Pickup St, City, Country",
      "amount": 250.00,
      "paymentStatus": "paid",
      "createdAt": "2023-05-01T10:30:00Z",
      "deliveredAt": "2023-05-01T11:30:00Z"
    },
    // ... more orders
  ]
}
```

### File Upload

#### S3 Upload

Upload a file to S3.

- **URL:** `/s3/upload`
- **Method:** `POST`
- **Auth Required:** Yes (token or temporary token)
- **Content-Type:** `multipart/form-data`
- **Query Parameters:**
  - `type`: Document type (e.g., `license`, `registration`, `insurance`, `profile`)
  - `side`: Document side (`front` or `back`, for documents only)
- **Request Body:**

```
file: (file)
```

- **Success Response:**

```json
{
  "success": true,
  "message": "File uploaded successfully",
  "fileUrl": "https://example.com/uploaded-file.jpg",
  "fileType": "license",
  "side": "front"
}
```

## Status Codes

- `200 OK`: The request was successful
- `201 Created`: The resource was successfully created
- `400 Bad Request`: The request was invalid
- `401 Unauthorized`: Authentication failed
- `403 Forbidden`: The user does not have permission
- `404 Not Found`: The requested resource was not found
- `500 Internal Server Error`: An error occurred on the server

## Error Messages

- `Missing required fields`: One or more required fields are missing
- `Invalid phone number format`: Phone number format is invalid
- `Driver not found`: The requested driver does not exist
- `Internal server error`: An unexpected error occurred on the server
- `Invalid token`: The provided authentication token is invalid
- `No file uploaded`: File upload was expected but no file was provided 