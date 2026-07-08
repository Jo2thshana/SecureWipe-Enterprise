import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { initPostgres } from './infrastructure/database/postgres';
import { requestLogger } from './middleware/logging';
import { errorHandler } from './middleware/error';
import authRoutes from './routes/authRoutes';
import deviceRoutes from './routes/deviceRoutes';
import wipeRoutes from './routes/wipeRoutes';
import certificateRoutes from './routes/certificateRoutes';
import logRoutes from './routes/logRoutes';
import adminRoutes from './routes/adminRoutes';

dotenv.config();

// Initialize PostgreSQL database and run schema generation
initPostgres().catch(err => {
  console.error('[App] Failed to initialize database server:', err);
});

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: 'http://localhost:5173', // Vite standard React port
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP Request logging
app.use(requestLogger);

// Mounting Routes
app.use('/api', authRoutes);
app.use('/api', deviceRoutes);
app.use('/api', wipeRoutes);
app.use('/api', certificateRoutes);
app.use('/api', logRoutes);
app.use('/api', adminRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'SecureWipe Backend', timestamp: new Date() });
});

// Global Error Handler
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  const startServer = (port: number | string, retries = 3) => {
    const server = app.listen(port);
    
    server.on('listening', () => {
      console.log(`[SecureWipe] Server listening on port ${port}`);
    });
    
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[SecureWipe] Port ${port} is currently busy.`);
        if (retries > 0) {
          console.log(`[SecureWipe] Retrying connection in 1s... (${retries} retries left)`);
          setTimeout(() => {
            server.close();
            startServer(port, retries - 1);
          }, 1000);
        } else {
          const fallbackPort = Number(port) === 5000 ? 5001 : Number(port) + 1;
          console.log(`[SecureWipe] Port ${port} remains busy. Automatically switching to fallback port ${fallbackPort}...`);
          startServer(fallbackPort, 0);
        }
      } else {
        console.error('[SecureWipe] Server startup error:', err);
      }
    });
  };

  startServer(PORT);
}

export default app;
