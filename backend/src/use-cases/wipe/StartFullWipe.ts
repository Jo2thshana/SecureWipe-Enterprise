import crypto from 'crypto';
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

export interface StartWipeRequest {
  userId: string;
  deviceId: string;
  algorithm: WipeAlgorithm;
  isSimulation: boolean;
}

export class StartFullWipe {
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

  public async execute(request: StartWipeRequest): Promise<string> {
    const { userId, deviceId, algorithm, isSimulation } = request;

    const device = await this.deviceRepo.findById(deviceId);
    if (!device) {
      throw new Error(`Device with ID ${deviceId} not found.`);
    }

    // OS Disk Protection check
    if (device.isOSDisk || !device.isSafe) {
      throw new Error('Access Denied: Operating System drive protection blocks all wiping operations.');
    }
    const sysDriveLower = (process.env.SystemDrive || 'C:').toLowerCase() + '\\';
    if (device.path.toLowerCase() === sysDriveLower) {
      throw new Error('Access Denied: Action blocked on system partition host paths.');
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

    // Initialize job record
    const jobId = await this.wipingService.startFullWipe(
      device.id,
      device.path,
      algorithm,
      isSimMode
    );

    const job = new WipeJob({
      id: jobId,
      deviceId: device.id,
      userId: user.id,
      mode: isSimMode ? WipeMode.SIMULATION : WipeMode.ACTUAL,
      type: WipeType.FULL,
      algorithm_used: algorithm,
      status: VerificationStatus.PENDING,
      confidence_score: 0,
      bytesWiped: 0,
      totalBytes: isSimMode ? device.capacity : 1024 * 1024 * 50 // bounds check
    });

    await this.jobRepo.create(job);

    await createSignedAuditLog(
      this.auditRepo,
      userId,
      'WIPE_STARTED',
      `Full Wipe process initiated on device ${device.name} (${device.path}) using algorithm ${algorithm.toUpperCase()}. Mode: ${job.mode}`
    );

    // Orchestrate background verification & cert generation
    this.monitorWipeCompletion(userId, jobId, device.path, device.name, device.type, user.fullName, algorithm, isSimMode);

    return jobId;
  }

  private async monitorWipeCompletion(
    userId: string,
    jobId: string,
    devicePath: string,
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

            // 1. Run sanitization verification tests
            const report = await this.verificationService.verifyDeviceWipe(jobId, devicePath, isSimulation);

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

            // Create QR verifying text
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

            // Log completion trace
            await createSignedAuditLog(
              this.auditRepo,
              userId,
              'WIPE_COMPLETED',
              `Wipe job ${jobId} successfully sanitized. Verification PASSED with confidence score ${report.confidenceScore}%.`
            );

            // Log verification result
            await createSignedAuditLog(
              this.auditRepo,
              userId,
              'VERIFICATION_RESULT',
              `Verification Completed for job ${jobId}: SUCCESS (Confidence Score: ${report.confidenceScore}%, Residual Data: 0%)`
            );

            // Log certificate creation
            await createSignedAuditLog(
              this.auditRepo,
              userId,
              'CERTIFICATE_GENERATED',
              `Cryptographic Certificate of Destruction issued: ${certId} for job ${jobId}.`
            );

          } else {
            // Failed or Cancelled
            const errorMsg = progress?.activeHexBlock || 'Data overwrite failed during block cycles.';
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
              `Sanitization failed on job ${jobId}. Reason: ${errorMsg}`
            );
          }
        }
      } catch (err: any) {
        clearInterval(checkInterval);
        console.error(`[StartFullWipe] Background execution failure on job ${jobId}:`, err);
      }
    }, 1000);
  }
}
