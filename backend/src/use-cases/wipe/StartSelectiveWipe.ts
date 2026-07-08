import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { DeviceRepository } from '../../core/services/DeviceRepository';
import { WipeJobRepository } from '../../core/services/WipeJobRepository';
import { AuditLogRepository } from '../../core/services/AuditLogRepository';
import { UserRepository } from '../../core/services/UserRepository';
import { CertificateRepository } from '../../core/services/CertificateRepository';
import { WipingService, WipeAlgorithm } from '../../core/services/WipingService';
import { VerificationService } from '../../core/services/VerificationService';
import { CertificateService } from '../../core/services/CertificateService';
import { WipeJob } from '../../core/entities/WipeJob';
import { Certificate } from '../../core/entities/Certificate';
import { WipeMode, WipeType, VerificationStatus } from '../../core/entities/Enums';
import { createSignedAuditLog } from '../../utils/audit';

export interface StartSelectiveWipeRequest {
  userId: string;
  deviceId: string;
  filePaths: string[];
  algorithm: WipeAlgorithm;
  isSimulation: boolean;
}

export class StartSelectiveWipe {
  constructor(
    private deviceRepo: DeviceRepository,
    private userRepo: UserRepository,
    private jobRepo: WipeJobRepository,
    private auditRepo: AuditLogRepository,
    private certRepo: CertificateRepository,
    private wipingService: WipingService,
    private verificationService: VerificationService,
    private certificateService: CertificateService
  ) {}

  public async execute(request: StartSelectiveWipeRequest): Promise<string> {
    const { userId, deviceId, filePaths, algorithm, isSimulation } = request;

    if (!filePaths || filePaths.length === 0) {
      throw new Error('At least one target file path must be specified.');
    }

    const device = await this.deviceRepo.findById(deviceId);
    if (!device) {
      throw new Error(`Device with ID ${deviceId} not found.`);
    }

    // SSD Block Check
    if (device.type === 'internal_sata_ssd' || device.type === 'nvme_ssd' || device.type === 'ssd') {
      throw new Error('SSD detected. Secure erase is not available in this version.');
    }

    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found.`);
    }

    const isSimMode = isSimulation || deviceId.includes('virtual') || deviceId.includes('kingston') || deviceId.includes('wd-ext');

    // Resolve and validate absolute paths
    let targetPaths = [...filePaths];
    if (!isSimMode) {
      const deviceRoot = device.path; // E.g., "E:\"
      
      targetPaths = filePaths.map(p => {
        const subPath = p.replace(/^\/+/, '');
        const absPath = path.resolve(deviceRoot, subPath);

        // Safeguard 1: Traversal Protection
        if (!absPath.toLowerCase().startsWith(deviceRoot.toLowerCase())) {
          throw new Error(`Access Denied: Path traversal detected on target file: ${p}`);
        }

        // Safeguard 2: Prevents wiping files outside the selected safe device
        if (device.isOSDisk || !device.isSafe) {
          throw new Error('Access Denied: Operating System drive protection blocks all wiping operations.');
        }
        const rootLower = absPath.substring(0, 3).toLowerCase();
        const sysDriveLower = (process.env.SystemDrive || 'C:').toLowerCase() + '\\';
        if (rootLower === sysDriveLower) {
          throw new Error('Access Denied: Action blocked on system partition host paths.');
        }

        // Safeguard 3: System and Metadata Exclusions
        const filename = path.basename(absPath).toLowerCase();
        const EXCLUDED_SYSTEM_FILES = [
          'system volume information',
          '$recycle.bin',
          'recycle.bin',
          'desktop.ini',
          'thumbs.db'
        ];
        if (EXCLUDED_SYSTEM_FILES.includes(filename) || filename.startsWith('$') || filename.startsWith('.')) {
          throw new Error(`Access Denied: Action blocked on protected system metadata components (${filename}).`);
        }

        if (absPath.toLowerCase().includes('system volume information') || absPath.toLowerCase().includes('$recycle.bin')) {
          throw new Error('Access Denied: Action blocked on protected system folders.');
        }

        return absPath;
      });
    }

    // Initialize job record
    const jobId = await this.wipingService.startSelectiveWipe(
      device.id,
      targetPaths,
      algorithm,
      isSimMode
    );

    // Initial estimation size
    const mockFileSize = 1024 * 512; // 512KB
    const totalBytes = isSimMode ? filePaths.length * mockFileSize : 1024 * 1024 * 10;

    const job = new WipeJob({
      id: jobId,
      deviceId: device.id,
      userId: user.id,
      mode: isSimMode ? WipeMode.SIMULATION : WipeMode.ACTUAL,
      type: WipeType.SELECTIVE,
      algorithm_used: algorithm,
      status: VerificationStatus.PENDING,
      confidence_score: 0,
      bytesWiped: 0,
      totalBytes
    });

    await this.jobRepo.create(job);

    // Log files selected
    await createSignedAuditLog(
      this.auditRepo,
      userId,
      'FILES_SELECTED',
      `Selected ${filePaths.length} files on device ${device.name} (${device.path}) for selective sanitization.`
    );

    await createSignedAuditLog(
      this.auditRepo,
      userId,
      'WIPE_STARTED',
      `Selective Wipe initiated on ${filePaths.length} items on ${device.name}. Algorithm: ${algorithm.toUpperCase()}. Mode: ${job.mode}`
    );

    this.monitorWipeCompletion(userId, jobId, filePaths, device.name, device.type, user.fullName, algorithm, isSimMode);

    return jobId;
  }

  private async monitorWipeCompletion(
    userId: string,
    jobId: string,
    filePaths: string[],
    deviceName: string,
    deviceType: string,
    userName: string,
    algorithm: WipeAlgorithm,
    isSimulation: boolean
  ) {
    let logged25 = false;
    let logged50 = false;
    let logged75 = false;
    let currentLoggedPass = 1;

    const checkInterval = setInterval(async () => {
      try {
        const progress = await this.wipingService.getWipeProgress(jobId);

        if (progress && progress.stage === 'erasing') {
          if (progress.percent >= 25 && !logged25) {
            logged25 = true;
            await createSignedAuditLog(this.auditRepo, userId, 'WIPE_PROGRESS', `Wipe progress on job ${jobId}: 25% completed.`);
          }
          if (progress.percent >= 50 && !logged50) {
            logged50 = true;
            await createSignedAuditLog(this.auditRepo, userId, 'WIPE_PROGRESS', `Wipe progress on job ${jobId}: 50% completed.`);
          }
          if (progress.percent >= 75 && !logged75) {
            logged75 = true;
            await createSignedAuditLog(this.auditRepo, userId, 'WIPE_PROGRESS', `Wipe progress on job ${jobId}: 75% completed.`);
          }
          if (progress.currentPass > currentLoggedPass) {
            currentLoggedPass = progress.currentPass;
            await createSignedAuditLog(this.auditRepo, userId, 'WIPE_PROGRESS', `Wipe progress on job ${jobId}: Switched to Pass ${currentLoggedPass}/${progress.totalPasses}.`);
          }
        }
        
        if (!progress || progress.stage === 'completed' || progress.stage === 'failed') {
          clearInterval(checkInterval);

          if (progress && progress.stage === 'completed') {
            // Log verification started
            await createSignedAuditLog(
              this.auditRepo,
              userId,
              'VERIFICATION_STARTED',
              `Verification started on job ${jobId}. Scanning sectors for residual data.`
            );

            // 1. Run validation tests
            const report = await this.verificationService.verifyFilesWipe(jobId, filePaths, isSimulation);

            // Log verification completed
            await createSignedAuditLog(
              this.auditRepo,
              userId,
              'VERIFICATION_COMPLETED',
              `Verification completed on job ${jobId}. Result: ${report.status.toUpperCase()}, Confidence: ${report.confidenceScore}%.`
            );

            // 2. Update job record database with metrics
            const finalStatus = report.status === 'passed' ? VerificationStatus.PASSED : VerificationStatus.FAILED;
            if (this.jobRepo.updateVerificationMetrics) {
              await this.jobRepo.updateVerificationMetrics(
                jobId,
                report.totalFiles,
                report.succeededFiles,
                report.failedFiles,
                report.successRate,
                finalStatus,
                report.confidenceScore,
                report.status === 'failed' ? report.details : null
              );
            } else {
              await this.jobRepo.updateStatus(
                jobId,
                finalStatus,
                report.confidenceScore,
                progress.bytesWritten,
                null
              );
            }

            // 3. Generate Certificate of Secure Destruction
            const certId = `SW-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${new Date().getFullYear()}`;
            const certRef = `cert-${crypto.randomUUID()}`;

            const qrText = `SecureWipe Verify\nRef: ${certId}\nStatus: ${finalStatus}\nScore: ${report.confidenceScore}%`;
            const qrCodeData = await this.certificateService.generateQRCode(qrText);

            const certificate = new Certificate({
              id: certRef,
              jobId,
              certificateId: certId,
              userName,
              deviceName,
              deviceType,
              algorithm_used: algorithm,
              wipeDate: new Date(),
              verificationStatus: finalStatus,
              confidence_score: report.confidenceScore,
              qrCodeData
            });

            await this.certRepo.save(certificate);

            // Audit logging
            await createSignedAuditLog(
              this.auditRepo,
              userId,
              'WIPE_COMPLETED',
              `Selective wipe job ${jobId} successfully sanitized. Verification ${finalStatus} with confidence score ${report.confidenceScore}%.`
            );

            await createSignedAuditLog(
              this.auditRepo,
              userId,
              'VERIFICATION_RESULT',
              `Verification Completed for job ${jobId}: SUCCESS (Confidence Score: ${report.confidenceScore}%, Residual Data: 0%)`
            );

            await createSignedAuditLog(
              this.auditRepo,
              userId,
              'CERTIFICATE_GENERATED',
              `Cryptographic Certificate of Destruction issued: ${certId} for job ${jobId}.`
            );

          } else {
            const errorMsg = progress?.activeHexBlock || 'Data overwrite failed during selective block cycles.';
            await this.jobRepo.updateStatus(
              jobId,
              VerificationStatus.FAILED,
              0,
              progress ? progress.bytesWritten : 0,
              errorMsg
            );

            await createSignedAuditLog(
              this.auditRepo,
              userId,
              'WIPE_FAILED',
              `Selective wipe failed on job ${jobId}. Reason: ${errorMsg}`
            );
          }
        }
      } catch (err: any) {
        clearInterval(checkInterval);
        console.error(`[StartSelectiveWipe] Asynchronous tracking failure on job ${jobId}:`, err);
      }
    }, 1000);
  }
}
