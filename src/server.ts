import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './infrastructure/config';
import { errorHandler } from './infrastructure/middleware/errorHandler';
import partnerRoutes from './presentation/routes/partnerRoutes';
import { connectDB } from './infrastructure/database/mongoose';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Database connection
connectDB();

// Routes
app.use('/api', partnerRoutes);

// Handle 404s
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handling middleware (must have 4 parameters)
app.use(errorHandler as express.ErrorRequestHandler);

const PORT = config.server.port || 3003;

app.listen(PORT, () => {
  console.log(`Partner service running on port ${PORT}`);
});