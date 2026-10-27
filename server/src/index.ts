import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'StayHaven PG & Hostel API',
  });
});

// Register routers
app.use('/api/auth', authRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/tenants', tenantsRouter);
app.use('/api/rent', rentRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/complaints', complaintsRouter);
app.use('/api/dashboard', dashboardRouter);

// Global 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err?.message || 'Unknown error' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 StayHaven Server running on http://localhost:${PORT}`);
  });
}

export default app;
