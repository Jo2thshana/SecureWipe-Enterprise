import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../core/entities/Enums';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

const jwtSecret = process.env.JWT_SECRET || 'enterprise_grade_security_jwt_secret_key_2026';

export function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ success: false, error: 'Authorization token not provided.' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ success: false, error: 'Token format is invalid. Use Bearer <token>.' });
  }

  const token = parts[1];

  jwt.verify(token, jwtSecret, (err, decoded: any) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, error: 'Access token has expired.' });
      }
      return res.status(403).json({ success: false, error: 'Access token is invalid or tampered.' });
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role as UserRole
    };
    
    next();
  });
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'User authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Insufficient security clearances.' });
    }

    next();
  };
}
