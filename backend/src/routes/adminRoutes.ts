import { Router, Response, NextFunction } from 'express';
import { SQLiteUserRepository } from '../infrastructure/database/SQLiteUserRepository';
import { SQLiteDeviceRepository } from '../infrastructure/database/SQLiteDeviceRepository';
import { SQLiteWipeJobRepository } from '../infrastructure/database/SQLiteWipeJobRepository';
import { SQLiteCertificateRepository } from '../infrastructure/database/SQLiteCertificateRepository';
import { authenticateJWT, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { UserRole, VerificationStatus } from '../core/entities/Enums';
import { pool } from '../infrastructure/database/postgres';
import { EnterpriseReportPDFService } from '../infrastructure/reports/EnterpriseReportPDFService';
import crypto from 'crypto';

const router = Router();
const userRepo = new SQLiteUserRepository();
const deviceRepo = new SQLiteDeviceRepository();
const jobRepo = new SQLiteWipeJobRepository();
const certRepo = new SQLiteCertificateRepository();
const reportPdfService = new EnterpriseReportPDFService();

// 1. GET /admin/users (Restricted to ADMIN)
router.get('/admin/users', authenticateJWT, requireRole([UserRole.ADMIN]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const users = await userRepo.findAll();
    const sanitisedUsers = users.map(u => {
      const { passwordHash: _, ...userWithoutHash } = u;
      return userWithoutHash;
    });
    res.json({ success: true, data: { users: sanitisedUsers } });
  } catch (err) {
    next(err);
  }
});

// 2. GET /admin/reports (Overview Analytics - Restricted to ADMIN)
router.get('/admin/reports', authenticateJWT, requireRole([UserRole.ADMIN]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const devices = await deviceRepo.findAll();
    const jobs = await jobRepo.findAll();
    const certs = await certRepo.findAll();

    const totalDevices = devices.length;
    const totalWipeOperations = jobs.length;
    const successfulWipes = jobs.filter(j => j.status === VerificationStatus.PASSED).length;
    const certificatesGenerated = certs.length;

    // Compile analytics charts details
    const recentActivities = jobs.slice(-5).reverse();
    const recentCertificates = certs.slice(-5).reverse();

    res.json({
      success: true,
      data: {
        metrics: {
          totalDevices,
          totalWipeOperations,
          successfulWipes,
          certificatesGenerated
        },
        analytics: {
          recentActivities,
          recentCertificates
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

// 3. GET /admin/enterprise-reports (Restricted to ADMIN)
router.get('/admin/enterprise-reports', authenticateJWT, requireRole([UserRole.ADMIN]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    
    // Fetch requester full name
    const userRes = await pool.query('SELECT full_name FROM users WHERE id = $1', [userId]);
    const adminName = userRes.rows[0]?.full_name || 'System Administrator';

    // 1. Aggregate Report 1: Executive Summary
    const totalWipeJobsRes = await pool.query('SELECT COUNT(*) FROM wipe_jobs');
    const totalWipeJobs = parseInt(totalWipeJobsRes.rows[0].count, 10);

    const totalDevicesProcessedRes = await pool.query('SELECT COUNT(DISTINCT device_id) FROM wipe_jobs');
    const totalDevicesProcessed = parseInt(totalDevicesProcessedRes.rows[0].count, 10);

    const totalUsbWipedRes = await pool.query(`
      SELECT COUNT(*) FROM wipe_jobs j 
      JOIN devices d ON j.device_id = d.id 
      WHERE d.type = 'pendrive' AND j.status = 'PASSED'
    `);
    const totalUsbWiped = parseInt(totalUsbWipedRes.rows[0].count, 10);

    const totalExtHddWipedRes = await pool.query(`
      SELECT COUNT(*) FROM wipe_jobs j 
      JOIN devices d ON j.device_id = d.id 
      WHERE d.type = 'external_hdd' AND j.status = 'PASSED'
    `);
    const totalExtHddWiped = parseInt(totalExtHddWipedRes.rows[0].count, 10);

    const totalIntHddWipedRes = await pool.query(`
      SELECT COUNT(*) FROM wipe_jobs j 
      JOIN devices d ON j.device_id = d.id 
      WHERE d.type = 'internal_hdd' AND j.status = 'PASSED'
    `);
    const totalIntHddWiped = parseInt(totalIntHddWipedRes.rows[0].count, 10);

    const totalSsdsDetectedRes = await pool.query(`
      SELECT COUNT(*) FROM devices 
      WHERE type IN ('internal_sata_ssd', 'nvme_ssd', 'ssd')
    `);
    const totalSsdsDetected = parseInt(totalSsdsDetectedRes.rows[0].count, 10);

    const totalDataWipedRes = await pool.query(`
      SELECT SUM(bytes_wiped) FROM wipe_jobs 
      WHERE status = 'PASSED'
    `);
    const totalDataWipedBytes = Number(totalDataWipedRes.rows[0].sum || 0);

    const successfulWipesRes = await pool.query("SELECT COUNT(*) FROM wipe_jobs WHERE status = 'PASSED'");
    const successfulWipes = parseInt(successfulWipesRes.rows[0].count, 10);

    const failedWipesRes = await pool.query("SELECT COUNT(*) FROM wipe_jobs WHERE status = 'FAILED'");
    const failedWipes = parseInt(failedWipesRes.rows[0].count, 10);

    const successRate = totalWipeJobs > 0 ? (successfulWipes / totalWipeJobs) * 100 : 0;

    const certificatesGeneratedRes = await pool.query('SELECT COUNT(*) FROM certificates');
    const certificatesGenerated = parseInt(certificatesGeneratedRes.rows[0].count, 10);

    const verificationPassed = successfulWipes;
    const verificationFailed = failedWipes;

    const totalCapacityManagedRes = await pool.query('SELECT SUM(capacity) AS total_capacity FROM devices');
    const totalCapacityManaged = Number(totalCapacityManagedRes.rows[0].total_capacity || 0);

    const lastDeviceScanTimeRes = await pool.query('SELECT MAX(updated_at) AS last_scan FROM devices');
    const lastDeviceScanTime = lastDeviceScanTimeRes.rows[0]?.last_scan 
      ? new Date(lastDeviceScanTimeRes.rows[0].last_scan).toLocaleString()
      : 'N/A';

    const dbStatus = 'Connected / Active';
    const version = 'v1.0.0 Enterprise';

    const executiveReport = {
      totalWipeJobs,
      totalDevicesProcessed,
      totalUsbWiped,
      totalExtHddWiped,
      totalIntHddWiped,
      totalSsdsDetected,
      totalDataWipedBytes,
      successfulWipes,
      failedWipes,
      successRate,
      certificatesGenerated,
      verificationPassed,
      verificationFailed,
      totalCapacityManaged,
      lastDeviceScanTime,
      dbStatus,
      version,
      generatedBy: adminName,
      lastUpdated: new Date().toISOString()
    };

    // 2. Aggregate Report 2: Device Summary & Lists
    const devicesRes = await pool.query('SELECT * FROM devices ORDER BY name ASC');
    const devicesList = devicesRes.rows.map(d => ({
      name: d.name,
      type: d.type,
      connectionType: d.connection_type || 'Internal',
      busType: d.bus_type || 'SATA',
      mediaType: d.media_type || 'HDD',
      capacity: Number(d.capacity),
      usedSpace: Number(d.used_space),
      freeSpace: Number(d.free_space),
      connectionStatus: d.connection_status,
      updated_at: d.updated_at
    }));

    const wipedPerDeviceRes = await pool.query(`
      SELECT device_id, SUM(bytes_wiped) as total_wiped 
      FROM wipe_jobs 
      WHERE status = 'PASSED' 
      GROUP BY device_id
    `);
    const dataWipedMap = new Map<string, number>();
    for (const row of wipedPerDeviceRes.rows) {
      dataWipedMap.set(row.device_id, Number(row.total_wiped || 0));
    }

    const categories = [
      { key: 'USB Pen Drives', match: (type: string) => type === 'pendrive' },
      { key: 'External HDDs', match: (type: string) => type === 'external_hdd' },
      { key: 'Internal HDDs', match: (type: string) => type === 'internal_hdd' },
      { key: 'Internal SATA SSDs', match: (type: string) => type === 'internal_sata_ssd' || type === 'ssd' },
      { key: 'Internal NVMe SSDs', match: (type: string) => type === 'nvme_ssd' }
    ];

    const deviceSummary = categories.map(cat => {
      const catDevices = devicesRes.rows.filter(d => cat.match(d.type));
      const deviceCount = catDevices.length;
      let totalCapacity = 0;
      let usedCapacity = 0;
      let freeCapacity = 0;
      let totalDataWiped = 0;
      let connectedCount = 0;
      let disconnectedCount = 0;
      let lastDetectionTime: Date | null = null;

      for (const d of catDevices) {
        totalCapacity += Number(d.capacity || 0);
        usedCapacity += Number(d.used_space || 0);
        freeCapacity += Number(d.free_space || 0);
        totalDataWiped += dataWipedMap.get(d.id) || 0;
        if (d.connection_status === 'connected') {
          connectedCount++;
        } else {
          disconnectedCount++;
        }
        const detectionTime = d.updated_at ? new Date(d.updated_at) : null;
        if (detectionTime) {
          if (!lastDetectionTime || detectionTime > lastDetectionTime) {
            lastDetectionTime = detectionTime;
          }
        }
      }

      const currentStatus = deviceCount > 0 
        ? `${connectedCount} Connected, ${disconnectedCount} Disconnected`
        : 'No Devices Scanned';

      return {
        categoryName: cat.key,
        deviceCount,
        totalCapacity,
        usedCapacity,
        freeCapacity,
        totalDataWiped,
        currentStatus,
        lastDetectionTime: lastDetectionTime ? lastDetectionTime.toISOString() : 'N/A'
      };
    });

    res.json({
      success: true,
      data: {
        executiveReport,
        deviceReport: {
          deviceSummary,
          devicesList
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

// 4. GET /admin/enterprise-reports/pdf (Restricted to ADMIN)
router.get('/admin/enterprise-reports/pdf', authenticateJWT, requireRole([UserRole.ADMIN]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    let reportType = req.query.reportType as string; // 'executive' or 'device'
    if (reportType === 'devices') {
      reportType = 'device';
    }

    if (reportType !== 'executive' && reportType !== 'device') {
      return res.status(400).json({ success: false, error: "Invalid reportType. Specify 'executive' or 'device'." });
    }

    // Fetch requester full name
    const userRes = await pool.query('SELECT full_name FROM users WHERE id = $1', [userId]);
    const adminName = userRes.rows[0]?.full_name || 'System Administrator';

    // 1. Fetch data aggregates
    const totalWipeJobsRes = await pool.query('SELECT COUNT(*) FROM wipe_jobs');
    const totalWipeJobs = parseInt(totalWipeJobsRes.rows[0].count, 10);

    const totalDevicesProcessedRes = await pool.query('SELECT COUNT(DISTINCT device_id) FROM wipe_jobs');
    const totalDevicesProcessed = parseInt(totalDevicesProcessedRes.rows[0].count, 10);

    const totalUsbWipedRes = await pool.query(`
      SELECT COUNT(*) FROM wipe_jobs j 
      JOIN devices d ON j.device_id = d.id 
      WHERE d.type = 'pendrive' AND j.status = 'PASSED'
    `);
    const totalUsbWiped = parseInt(totalUsbWipedRes.rows[0].count, 10);

    const totalExtHddWipedRes = await pool.query(`
      SELECT COUNT(*) FROM wipe_jobs j 
      JOIN devices d ON j.device_id = d.id 
      WHERE d.type = 'external_hdd' AND j.status = 'PASSED'
    `);
    const totalExtHddWiped = parseInt(totalExtHddWipedRes.rows[0].count, 10);

    const totalIntHddWipedRes = await pool.query(`
      SELECT COUNT(*) FROM wipe_jobs j 
      JOIN devices d ON j.device_id = d.id 
      WHERE d.type = 'internal_hdd' AND j.status = 'PASSED'
    `);
    const totalIntHddWiped = parseInt(totalIntHddWipedRes.rows[0].count, 10);

    const totalSsdsDetectedRes = await pool.query(`
      SELECT COUNT(*) FROM devices 
      WHERE type IN ('internal_sata_ssd', 'nvme_ssd', 'ssd')
    `);
    const totalSsdsDetected = parseInt(totalSsdsDetectedRes.rows[0].count, 10);

    const totalDataWipedRes = await pool.query(`
      SELECT SUM(bytes_wiped) FROM wipe_jobs 
      WHERE status = 'PASSED'
    `);
    const totalDataWipedBytes = Number(totalDataWipedRes.rows[0].sum || 0);

    const successfulWipesRes = await pool.query("SELECT COUNT(*) FROM wipe_jobs WHERE status = 'PASSED'");
    const successfulWipes = parseInt(successfulWipesRes.rows[0].count, 10);

    const failedWipesRes = await pool.query("SELECT COUNT(*) FROM wipe_jobs WHERE status = 'FAILED'");
    const failedWipes = parseInt(failedWipesRes.rows[0].count, 10);

    const successRate = totalWipeJobs > 0 ? (successfulWipes / totalWipeJobs) * 100 : 0;

    const certificatesGeneratedRes = await pool.query('SELECT COUNT(*) FROM certificates');
    const certificatesGenerated = parseInt(certificatesGeneratedRes.rows[0].count, 10);

    const verificationPassed = successfulWipes;
    const verificationFailed = failedWipes;

    const totalCapacityManagedRes = await pool.query('SELECT SUM(capacity) AS total_capacity FROM devices');
    const totalCapacityManaged = Number(totalCapacityManagedRes.rows[0].total_capacity || 0);

    const lastDeviceScanTimeRes = await pool.query('SELECT MAX(updated_at) AS last_scan FROM devices');
    const lastDeviceScanTime = lastDeviceScanTimeRes.rows[0]?.last_scan 
      ? new Date(lastDeviceScanTimeRes.rows[0].last_scan).toLocaleString()
      : 'N/A';

    const dbStatus = 'Connected / Active';
    const version = 'v1.0.0 Enterprise';
    const reportId = `REP-${reportType.toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const generatedDate = new Date();

    let pdfBuffer: Buffer;

    if (reportType === 'executive') {
      pdfBuffer = await reportPdfService.generateExecutivePDF({
        totalWipeJobs,
        totalDevicesProcessed,
        totalUsbWiped,
        totalExtHddWiped,
        totalIntHddWiped,
        totalSsdsDetected,
        totalDataWipedBytes,
        successfulWipes,
        failedWipes,
        successRate,
        certificatesGenerated,
        verificationPassed,
        verificationFailed,
        totalCapacityManaged,
        lastDeviceScanTime,
        dbStatus,
        version,
        generatedBy: adminName,
        reportId,
        generatedDate
      });
    } else {
      // Gather device inventory summaries
      const devicesRes = await pool.query('SELECT * FROM devices ORDER BY name ASC');
      const devicesList = devicesRes.rows.map(d => ({
        name: d.name,
        type: d.type,
        connectionType: d.connection_type || 'Internal',
        busType: d.bus_type || 'SATA',
        mediaType: d.media_type || 'HDD',
        capacity: Number(d.capacity),
        usedSpace: Number(d.used_space),
        freeSpace: Number(d.free_space),
        connectionStatus: d.connection_status,
        updated_at: d.updated_at
      }));

      const wipedPerDeviceRes = await pool.query(`
        SELECT device_id, SUM(bytes_wiped) as total_wiped 
        FROM wipe_jobs 
        WHERE status = 'PASSED' 
        GROUP BY device_id
      `);
      const dataWipedMap = new Map<string, number>();
      for (const row of wipedPerDeviceRes.rows) {
        dataWipedMap.set(row.device_id, Number(row.total_wiped || 0));
      }

      const categories = [
        { key: 'USB Pen Drives', match: (type: string) => type === 'pendrive' },
        { key: 'External HDDs', match: (type: string) => type === 'external_hdd' },
        { key: 'Internal HDDs', match: (type: string) => type === 'internal_hdd' },
        { key: 'Internal SATA SSDs', match: (type: string) => type === 'internal_sata_ssd' || type === 'ssd' },
        { key: 'Internal NVMe SSDs', match: (type: string) => type === 'nvme_ssd' }
      ];

      const deviceSummary = categories.map(cat => {
        const catDevices = devicesRes.rows.filter(d => cat.match(d.type));
        const deviceCount = catDevices.length;
        let totalCapacity = 0;
        let usedCapacity = 0;
        let freeCapacity = 0;
        let totalDataWiped = 0;
        let connectedCount = 0;
        let disconnectedCount = 0;
        let lastDetectionTime: Date | null = null;

        for (const d of catDevices) {
          totalCapacity += Number(d.capacity || 0);
          usedCapacity += Number(d.used_space || 0);
          freeCapacity += Number(d.free_space || 0);
          totalDataWiped += dataWipedMap.get(d.id) || 0;
          if (d.connection_status === 'connected') {
            connectedCount++;
          } else {
            disconnectedCount++;
          }
          const detectionTime = d.updated_at ? new Date(d.updated_at) : null;
          if (detectionTime) {
            if (!lastDetectionTime || detectionTime > lastDetectionTime) {
              lastDetectionTime = detectionTime;
            }
          }
        }

        const currentStatus = deviceCount > 0 
          ? `${connectedCount} Connected, ${disconnectedCount} Disconnected`
          : 'No Devices Scanned';

        return {
          categoryName: cat.key,
          deviceCount,
          totalCapacity,
          usedCapacity,
          freeCapacity,
          totalDataWiped,
          currentStatus,
          lastDetectionTime: lastDetectionTime ? lastDetectionTime.toISOString() : 'N/A'
        };
      });

      pdfBuffer = await reportPdfService.generateDevicePDF({
        deviceSummary,
        devicesList,
        dbStatus,
        version,
        generatedBy: adminName,
        reportId,
        generatedDate
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=SecureWipe_${reportType}_report_${reportId}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
});

export default router;

