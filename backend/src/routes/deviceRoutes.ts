import { Router, Response } from 'express';
import { SQLiteDeviceRepository } from '../infrastructure/database/SQLiteDeviceRepository';
import { SQLiteAuditLogRepository } from '../infrastructure/database/SQLiteAuditLogRepository';
import { DeviceDetectionServiceImpl } from '../infrastructure/file-system/DeviceDetectionServiceImpl';
import { DetectDevices } from '../use-cases/devices/DetectDevices';
import { AnalyzeDevice } from '../use-cases/devices/AnalyzeDevice';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const deviceRepo = new SQLiteDeviceRepository();
const auditRepo = new SQLiteAuditLogRepository();
const detectionService = new DeviceDetectionServiceImpl();

const detectDevices = new DetectDevices(detectionService, deviceRepo, auditRepo);
const analyzeDevice = new AnalyzeDevice(detectionService, deviceRepo, auditRepo);

// 1. GET /devices
router.get('/devices', authenticateJWT, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.id;
    const devices = await detectDevices.execute(userId);
    res.json({ success: true, data: { devices } });
  } catch (err) {
    next(err);
  }
});

// 2. GET /devices/:id
router.get('/devices/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const device = await deviceRepo.findById(id);
    if (!device) {
      return res.status(404).json({ success: false, error: 'Device not found.' });
    }
    res.json({ success: true, data: { device } });
  } catch (err) {
    next(err);
  }
});

// 3. POST /devices/analyze
router.post('/devices/analyze', authenticateJWT, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.id;
    const { deviceId } = req.body;
    if (!deviceId) {
      return res.status(400).json({ success: false, error: 'deviceId is required in request body.' });
    }

    const report = await analyzeDevice.execute(userId, deviceId);
    res.json({ success: true, message: 'Device analysis completed successfully.', data: { report } });
  } catch (err) {
    next(err);
  }
});

// 4. GET /devices/:id/files
router.get('/devices/:id/files', authenticateJWT, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const dirPath = req.query.path as string | undefined;
    const files = await detectionService.getDeviceFiles(id, dirPath);
    res.json({ success: true, data: { files } });
  } catch (err) {
    next(err);
  }
});

export default router;
