import { Router, Response, NextFunction } from 'express';
import { SQLiteAuditLogRepository } from '../infrastructure/database/SQLiteAuditLogRepository';
import { GetAuditLogs } from '../use-cases/reports/GetAuditLogs';
import { authenticateJWT, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { UserRole } from '../core/entities/Enums';

const router = Router();
const auditRepo = new SQLiteAuditLogRepository();
const getAuditLogs = new GetAuditLogs(auditRepo);

// Deprecated legacy route (maintains backward compatibility by returning operator's own logs or all logs if admin)
router.get('/activity-logs', authenticateJWT, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const operatorId = req.user!.id;
    const isAdmin = req.user!.role === UserRole.ADMIN;
    const allLogs = await getAuditLogs.execute(operatorId);
    
    if (isAdmin) {
      return res.json({ success: true, data: { logs: allLogs } });
    }
    
    // Non-admin: only own logs
    const filtered = allLogs.filter(l => l.userId === operatorId);
    res.json({ success: true, data: { logs: filtered } });
  } catch (err) {
    next(err);
  }
});

// 1. GET /logs/me
router.get('/logs/me', authenticateJWT, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const operatorId = req.user!.id;
    const allLogs = await getAuditLogs.execute(operatorId);
    const logs = allLogs.filter(l => l.userId === operatorId);
    res.json({ success: true, data: { logs } });
  } catch (err) {
    next(err);
  }
});

// 2. GET /logs/operator/:id
router.get('/logs/operator/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const operatorId = req.params.id;
    const requesterId = req.user!.id;
    const isRequesterAdmin = req.user!.role === UserRole.ADMIN;

    if (requesterId !== operatorId && !isRequesterAdmin) {
      return res.status(403).json({ success: false, error: 'Access denied. You cannot inspect another operator\'s audit ledger.' });
    }

    const allLogs = await getAuditLogs.execute(requesterId);
    const logs = allLogs.filter(l => l.userId === operatorId);
    res.json({ success: true, data: { logs } });
  } catch (err) {
    next(err);
  }
});

// 3. GET /logs/admin/all
router.get('/logs/admin/all', authenticateJWT, requireRole([UserRole.ADMIN]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const requesterId = req.user!.id;
    const logs = await getAuditLogs.execute(requesterId);
    res.json({ success: true, data: { logs } });
  } catch (err) {
    next(err);
  }
});

export default router;
