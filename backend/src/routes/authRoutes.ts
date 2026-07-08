import { Router, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { SQLiteUserRepository } from '../infrastructure/database/SQLiteUserRepository';
import { SQLiteAuditLogRepository } from '../infrastructure/database/SQLiteAuditLogRepository';
import { SQLiteWipeJobRepository } from '../infrastructure/database/SQLiteWipeJobRepository';
import { RegisterUser } from '../use-cases/auth/RegisterUser';
import { LoginUser } from '../use-cases/auth/LoginUser';
import { validateRegister, validateLogin } from '../middleware/validation';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth';
import { createSignedAuditLog } from '../utils/audit';

const router = Router();
const userRepo = new SQLiteUserRepository();
const auditRepo = new SQLiteAuditLogRepository();
const jobRepo = new SQLiteWipeJobRepository();

const registerUser = new RegisterUser(userRepo, auditRepo);
const loginUser = new LoginUser(userRepo, auditRepo);

const jwtSecret = process.env.JWT_SECRET || 'enterprise_grade_security_jwt_secret_key_2026';

// 1. POST /register
router.post('/register', validateRegister, async (req, res, next) => {
  try {
    const { fullName, email, password, role } = req.body;
    const user = await registerUser.execute({
      fullName,
      email,
      passwordHash: password, // use-case does the hashing
      role: role || 'USER'
    });
    
    res.status(201).json({ success: true, message: 'User registered successfully.', data: { user } });
  } catch (err: any) {
    res.status(400);
    next(err);
  }
});

// 2. POST /login
router.post('/login', validateLogin, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const authResult = await loginUser.execute({ email, passwordHash: password });

    // Generate refresh token (valid for 7 days)
    const refreshToken = jwt.sign(
      { id: authResult.user.id, purpose: 'refresh' },
      jwtSecret,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        accessToken: authResult.token,
        refreshToken,
        user: authResult.user
      }
    });
  } catch (err: any) {
    res.status(401);
    next(err);
  }
});

// 3. POST /refresh-token
router.post('/refresh-token', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ success: false, error: 'Refresh token is required.' });
    }

    // Verify token
    jwt.verify(refreshToken, jwtSecret, async (err: any, decoded: any) => {
      if (err || decoded.purpose !== 'refresh') {
        return res.status(403).json({ success: false, error: 'Refresh token is invalid or expired.' });
      }

      const user = await userRepo.findById(decoded.id);
      if (!user) {
        return res.status(403).json({ success: false, error: 'User associated with token no longer exists.' });
      }

      // Generate a new access token (valid for 15 minutes)
      const accessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        jwtSecret,
        { expiresIn: '15m' }
      );

      res.json({
        success: true,
        data: {
          accessToken
        }
      });
    });
  } catch (err) {
    next(err);
  }
});

// 4. GET /profile
router.get('/profile', authenticateJWT, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const user = await userRepo.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User profile not found.' });
    }

    const { passwordHash: _, ...profile } = user;
    res.json({ success: true, data: { user: profile } });
  } catch (err) {
    next(err);
  }
});

// 5. POST /forgot-password (Structure implementation)
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email address is required.' });
    }

    const user = await userRepo.findByEmail(email);
    if (!user) {
      // Security best practice: don't reveal user existence
      return res.json({
        success: true,
        message: 'If the email matches an active account, a password reset link has been dispatched.'
      });
    }

    // Create temporary password reset token
    const resetToken = crypto.randomBytes(24).toString('hex');
    // For demonstration, we print this reset token payload to the system logs, simulating email dispatch
    console.log(`\n[SMTP Simulation] PASSWORD RESET LINK FOR ${email}: http://localhost:5173/reset-password?token=${resetToken}\n`);

    await createSignedAuditLog(
      auditRepo,
      user.id,
      'PASSWORD_RESET_REQUESTED',
      `Password reset link compiled for ${email}. Link printed to server console logs.`
    );

    res.json({
      success: true,
      message: 'If the email matches an active account, a password reset link has been dispatched.'
    });
  } catch (err) {
    next(err);
  }
});

// 6. POST /logout
router.post('/logout', authenticateJWT, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    await createSignedAuditLog(
      auditRepo,
      userId,
      'LOGOUT',
      `Operator logged out successfully.`
    );
    res.json({ success: true, message: 'Logout successful.' });
  } catch (err) {
    next(err);
  }
});

// 7. GET /operator/profile/:id
router.get('/operator/profile/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const operatorId = req.params.id;
    const user = await userRepo.findById(operatorId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Operator profile not found.' });
    }
    const { passwordHash: _, ...profile } = user;
    res.json({ success: true, data: { user: profile } });
  } catch (err) {
    next(err);
  }
});

// 8. GET /operators/recent
router.get('/operators/recent', authenticateJWT, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const users = await userRepo.findAll();
    const logs = await auditRepo.findAll();
    const jobs = await jobRepo.findAll();

    const recentOperators = users.map(user => {
      const userLogs = logs.filter(l => l.userId === user.id);
      const userJobs = jobs.filter(j => j.userId === user.id);
      const lastActiveLog = userLogs[0]; // logs are pre-sorted descending

      return {
        id: user.id,
        fullName: user.fullName,
        role: user.role,
        totalWipes: userJobs.length,
        lastActivityTime: lastActiveLog ? lastActiveLog.created_at : user.created_at
      };
    });

    // Sort by last activity time descending
    recentOperators.sort((a, b) => new Date(b.lastActivityTime).getTime() - new Date(a.lastActivityTime).getTime());

    res.json({ success: true, data: { operators: recentOperators.slice(0, 5) } });
  } catch (err) {
    next(err);
  }
});

export default router;
