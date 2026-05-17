// backend/src/index.ts
import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { goalsRouter } from './routes/goals';
import { checkinsRouter } from './routes/checkins';
import { adminRouter } from './routes/admin';
import { reportsRouter } from './routes/reports';
import { errorHandler } from './middleware/errorHandler';
import { authenticate } from './middleware/authenticate';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());

// Public routes
app.use('/api/auth', authRouter);

// Protected routes
app.use('/api/goals', authenticate, goalsRouter);
app.use('/api/checkins', authenticate, checkinsRouter);
app.use('/api/admin', authenticate, adminRouter);
app.use('/api/reports', authenticate, reportsRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

app.listen(PORT, () => console.log(`API running on port ${PORT}`));
