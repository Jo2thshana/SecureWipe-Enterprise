import { DeviceDetectionService } from '../../core/services/DeviceDetectionService';
import { DeviceRepository } from '../../core/services/DeviceRepository';
import { AuditLogRepository } from '../../core/services/AuditLogRepository';
import { Device } from '../../core/entities/Device';
import { createSignedAuditLog } from '../../utils/audit';

export class DetectDevices {
  constructor(
    private detectionService: DeviceDetectionService,
    private deviceRepo: DeviceRepository,
    private auditRepo: AuditLogRepository
  ) {}

  public async execute(userId: string): Promise<Device[]> {
    // Detect from service
    const rawDevices = await this.detectionService.detectDevices();
    const activeDevices: Device[] = [];

    for (const raw of rawDevices) {
      // Analyze data to find sensitive files/risk level
      const analysis = await this.detectionService.analyzeDeviceData(raw.id);

      const device = new Device({
        id: raw.id,
        name: raw.name,
        type: raw.type,
        capacity: raw.capacity,
        usedSpace: raw.usedSpace,
        freeSpace: raw.freeSpace,
        connectionStatus: raw.connectionStatus,
        path: raw.path,
        risk_level: analysis.riskLevel,
        isOSDisk: raw.isOSDisk,
        isSafe: raw.isSafe,
        busType: raw.busType,
        connectionType: raw.connectionType,
        mediaType: raw.mediaType
      });

      // Save/persist to database
      await this.deviceRepo.save(device);
      activeDevices.push(device);
    }

    // Create discovery audit logs
    if (activeDevices.length > 0) {
      const deviceNames = activeDevices.map(d => `${d.name} (${d.path})`).join(', ');
      await createSignedAuditLog(
        this.auditRepo,
        userId,
        'DEVICE_DETECTION',
        `Storage media scanning complete. Found: ${deviceNames}.`
      );
    }

    return activeDevices;
  }
}
