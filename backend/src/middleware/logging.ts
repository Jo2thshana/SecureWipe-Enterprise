import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[HTTP] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - IP: ${ip} - Duration: ${duration}ms`);
  });

  next();
}
