import { Router, Response, NextFunction } from 'express';
import { SQLiteCertificateRepository } from '../infrastructure/database/SQLiteCertificateRepository';
import { SQLiteWipeJobRepository } from '../infrastructure/database/SQLiteWipeJobRepository';
import { SQLiteAuditLogRepository } from '../infrastructure/database/SQLiteAuditLogRepository';
import { CertificateServiceImpl } from '../infrastructure/reports/CertificateServiceImpl';
import { GenerateCertificate } from '../use-cases/reports/GenerateCertificate';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const certRepo = new SQLiteCertificateRepository();
const jobRepo = new SQLiteWipeJobRepository();
const auditRepo = new SQLiteAuditLogRepository();
const certService = new CertificateServiceImpl();

const generateCertificate = new GenerateCertificate(certRepo, jobRepo, certService, auditRepo);

// 1. GET /certificates
router.get('/certificates', authenticateJWT, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const list = await certRepo.findAll();
    res.json({ success: true, data: { certificates: list } });
  } catch (err) {
    next(err);
  }
});

// 2. GET /certificates/:id (handles both DB ID or public certificateId reference)
router.get('/certificates/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    let cert = await certRepo.findByCertificateId(id);
    if (!cert) {
      // Fallback to find by DB ID
      const all = await certRepo.findAll();
      cert = all.find(c => c.id === id) || null;
    }

    if (!cert) {
      return res.status(404).json({ success: false, error: 'Certificate not found.' });
    }

    res.json({ success: true, data: { certificate: cert } });
  } catch (err) {
    next(err);
  }
});

// 3. POST /generate-certificate
router.post('/generate-certificate', authenticateJWT, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { jobId } = req.body;

    if (!jobId) {
      return res.status(400).json({ success: false, error: 'jobId is required in the body.' });
    }

    const pdfBuffer = await generateCertificate.execute(userId, jobId);
    const cert = await certRepo.findByJobId(jobId);
    const filename = cert ? `SecureWipe_Certificate_${cert.certificateId}.pdf` : `SecureWipe_Certificate_${jobId}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
});

// 4. GET /certificates/:id/json
router.get('/certificates/:id/json', authenticateJWT, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    let cert = await certRepo.findByCertificateId(id);
    if (!cert) {
      const all = await certRepo.findAll();
      cert = all.find(c => c.id === id) || null;
    }

    if (!cert) {
      return res.status(404).json({ success: false, error: 'Certificate not found.' });
    }

    const job = await jobRepo.findById(cert.jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found.' });
    }

    const reportData = {
      certificateId: cert.certificateId,
      issuedAt: cert.wipeDate,
      operatorName: cert.userName,
      device: {
        name: cert.deviceName,
        type: cert.deviceType,
        deviceId: job.deviceId,
        capacity: job.totalBytes
      },
      wipeDetails: {
        jobId: cert.jobId,
        wipeMethod: cert.algorithm_used,
        verificationStatus: cert.verificationStatus,
        confidenceScore: cert.confidence_score,
        totalFilesSelected: job.totalFiles || 0,
        totalFilesSuccessfullyWiped: job.succeededFiles || 0,
        totalFilesFailed: job.failedFiles || 0,
        successPercentage: job.successRate || 0
      },
      declaration: "This certificate confirms that the selected files were securely sanitized using the selected overwrite protocol and successfully verified by the SecureWipe system.",
      securitySignature: cert.qrCodeData
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=SecureWipe_Report_${cert.certificateId}.json`);
    res.json(reportData);
  } catch (err) {
    next(err);
  }
});

export default router;
