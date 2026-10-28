import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './db';
import { User } from './models/User';
import { seedDatabase } from './seed';
import authRouter from './routes/auth';
import roomsRouter from './routes/rooms';
import tenantsRouter from './routes/tenants';
import rentRouter from './routes/rent';
import paymentsRouter from './routes/payments';
import complaintsRouter from './routes/complaints';
import dashboardRouter from './routes/dashboard';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    database: 'MongoDB',
    timestamp: new Date().toISOString(),
    service: 'StayHaven Property Management API',
  });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/tenants', tenantsRouter);
app.use('/api/rent', rentRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/complaints', complaintsRouter);
app.use('/api/dashboard', dashboardRouter);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error', message: err?.message || 'Unknown error' });
});

if (process.env.NODE_ENV !== 'test') {
  connectDB()
    .then(async () => {
      // Auto-seed if database is empty (ensures immediate ready-to-use evaluation)
      const count = await User.countDocuments();
      if (count === 0) {
        console.log('Database is empty. Running initial seed...');
        await seedDatabase(false);
      }
      app.listen(PORT, () => {
        console.log(`⚡ StayHaven API Server running on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('Fatal: Failed to connect to MongoDB', err);
      process.exit(1);
    });
}

export default app;
