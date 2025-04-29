# Partner Service

This microservice manages delivery partners for the ShipUp logistics platform, including partner availability, real-time location tracking, and delivery matching.

## Features

- **Partner Management**: Create, update, and delete delivery partners
- **Document Verification**: Handle partner document uploads and verification
- **Real-time Availability**: Track partner online/offline status 
- **Location Tracking**: Real-time partner location updates
- **Matching Pool**: Redis-based pool for efficient delivery matching
- **WebSocket Integration**: Real-time communication with partners
- **Auto-Offlining**: Automatically set inactive partners offline

## Prerequisites

- Node.js (v16+)
- MongoDB
- Redis (for availability pool and geo-indexing)

## Installation

1. Clone the repository
2. Install dependencies:

```bash
cd service/partner-service
npm install
```

3. Create a `.env` file based on `.env.example`:

```
# Server Configuration
PORT=3003
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/partner_service_db

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# Authentication Service
AUTH_SERVICE_URL=http://localhost:3001

# User Service
USER_SERVICE_URL=http://localhost:3002

# CORS
CORS_ORIGINS=*
```

## Running the Service

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

## API Endpoints

### Partner Management

- `POST /api/drivers` - Create a new partner
- `GET /api/drivers` - Get all partners (admin only)
- `GET /api/drivers/:partnerId` - Get partner by ID
- `GET /api/drivers/by-email/:email` - Get partner by email
- `PUT /api/drivers/:partnerId` - Update partner (admin only)
- `DELETE /api/drivers/:partnerId` - Delete partner (admin only)

### Partner Availability

- `PUT /api/drivers/update-availability/:partnerId` - Update partner availability status
- `POST /api/drivers/:partnerId/location` - Update partner location

### Document Management

- `PUT /api/drivers/:partnerId/documents` - Update document URLs
- `PUT /api/drivers/:partnerId/profile-image` - Update profile image

## WebSocket Events

### Authentication

- `authenticate` (client → server): Authenticate with partnerId and token
- `authenticated` (server → client): Authentication successful
- `authentication_error` (server → client): Authentication failed

### Location Updates

- `update_location` (client → server): Update partner location
- `location_updated` (server → client): Location update confirmation
- `location_error` (server → client): Location update failed

### Availability

- `set_availability` (client → server): Update availability status
- `availability_updated` (server → client): Availability update confirmation
- `availability_error` (server → client): Availability update failed
- `auto_offline` (server → client): Partner automatically set offline
- `forced_offline` (server → client): Partner forced offline by admin

### Order Management

- `delivery_request` (server → client): New delivery request
- `respond_to_order` (client → server): Accept/reject delivery
- `order_response_received` (server → client): Order response confirmation
- `order_response_error` (server → client): Order response failed

## Redis Data Structure

### Driver Pool Storage

- `driver:{partnerId}` - Hash containing driver data
- `available_drivers_geo` - Geo spatial index for location-based matching
- `drivers:{vehicleType}` - Sorted set for filtering by vehicle type

## Auto-Offlining

Partners are automatically set offline after 5 minutes of inactivity. This is handled by:

1. Redis key expiry for automatic cleanup
2. A cron job that runs every minute to check for inactive partners
3. WebSocket disconnection events

## Implementation Notes

### Redis Matching Pool

When a partner goes online, they are added to the Redis matching pool:
- Their data is stored in a Redis hash with a 5-minute TTL
- Their location is indexed in a GeoSpatial index for efficient nearby queries

### Location Updates

Partner locations can be updated through:
- REST API endpoint (for HTTP requests)
- WebSocket events (for real-time updates)

Each location update resets the Redis TTL to prevent automatic offlining.

### WebSocket Integration

The service uses Socket.io for real-time communication with partners.
Partners must authenticate with their partner ID and token to establish a connection.

## License

ISC 