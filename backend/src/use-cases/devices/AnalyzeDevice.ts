import { DeviceDetectionService } from '../../core/services/DeviceDetectionService';
import { DeviceRepository } from '../../core/services/DeviceRepository';
import { AuditLogRepository } from '../../core/services/AuditLogRepository';
import { createSignedAuditLog } from '../../utils/audit';

export interface DeviceAnalysisResult {
  deviceId: string;
  totalFolders: number;
  totalFiles: number;
  totalStorageUsed: number;
  documentsCount: number;
  imagesCount: number;
  videosCount: number;
  audioCount: number;
  archivesCount: number;
  executablesCount: number;
  databasesCount: number;
  credentialsCount: number;
  sensitiveFilesCount: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export class AnalyzeDevice {
  constructor(
    private detectionService: DeviceDetectionService,
    private deviceRepo: DeviceRepository,
    private auditRepo: AuditLogRepository
  ) {}

  public async execute(userId: string, deviceId: string): Promise<DeviceAnalysisResult> {
    const device = await this.deviceRepo.findById(deviceId);
    if (!device) {
      throw new Error(`Device with ID ${deviceId} is not registered or connected.`);
    }

    if (device.isOSDisk || !device.isSafe) {
      throw new Error('Access Denied: Analysis is blocked on system-protected drives.');
    }

    // Run structural indexing
    const analysis = await this.detectionService.analyzeDeviceData(deviceId);

    // Persist updated risk status
    device.risk_level = analysis.riskLevel;
    await this.deviceRepo.save(device);

    await createSignedAuditLog(
      this.auditRepo,
      userId,
      'DEVICE_SELECTED',
      `Device selected: ${device.name} (${device.path}).`
    );

    await createSignedAuditLog(
      this.auditRepo,
      userId,
      'ANALYSIS_COMPLETED',
      `Analysis completed on device ${device.name} (${device.path}). Threat risk assessment: ${analysis.riskLevel.toUpperCase()}`
    );

    return {
      deviceId,
      totalFolders: analysis.totalFolders,
      totalFiles: analysis.totalFiles,
      totalStorageUsed: analysis.totalStorageUsed,
      documentsCount: analysis.documentsCount,
      imagesCount: analysis.imagesCount,
      videosCount: analysis.videosCount,
      audioCount: analysis.audioCount,
      archivesCount: analysis.archivesCount,
      executablesCount: analysis.executablesCount,
      databasesCount: analysis.databasesCount,
      credentialsCount: analysis.credentialsCount,
      sensitiveFilesCount: analysis.sensitiveFilesCount,
      riskLevel: analysis.riskLevel
    };
  }
}
