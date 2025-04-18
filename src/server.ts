import express from 'express';
import cors from 'cors';
// import morgan from 'morgan';
import { config } from './infrastructure/config';
import { errorHandler } from './infrastructure/middleware/errorHandler';
import partnerRoutes from './presentation/routes/driverRoutes';
import { connectDB } from './infrastructure/database/mongoose';
import morgan from 'morgan';
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

connectDB();

// Routes
app.use('/api', partnerRoutes);

// Error handling
app.use(errorHandler);

const PORT = config.server.port || 3003;

app.listen(PORT, () => {
  console.log(`Partner service running on port ${PORT}`);
});