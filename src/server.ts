import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './infrastructure/config';
import { errorHandler } from './infrastructure/middleware/errorHandler';
import partnerRoutes from './presentation/routes/partnerRoutes';
import { connectDB } from './infrastructure/database/mongoose';
import { initializeSocketServer } from './infrastructure/websocket';
import { initializeInactivityChecker } from './infrastructure/cron/inactivityChecker';

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
connectDB();

// Routes
app.use('/api', partnerRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'partner-service' });
});

// Create HTTP server to attach WebSocket server
const server = http.createServer(app);

// Initialize WebSocket server
const io = initializeSocketServer(server);

// Initialize inactivity checker
initializeInactivityChecker();

// Handle 404s
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found` 
  });
});

// Error handling middleware (must have 4 parameters)
app.use(errorHandler as express.ErrorRequestHandler);

// Start the server
const PORT = config.server.port || 3003;
server.listen(PORT, () => {
  console.log(`Partner service running on port ${PORT}`);
});