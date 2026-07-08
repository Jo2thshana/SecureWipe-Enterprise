import crypto from 'crypto';
import { DeviceRepository } from '../../core/services/DeviceRepository';
import { WipeJobRepository } from '../../core/services/WipeJobRepository';
import { AuditLogRepository } from '../../core/services/AuditLogRepository';
import { UserRepository } from '../../core/services/UserRepository';
import { CertificateRepository } from '../../core/services/CertificateRepository';
import { WipingService, WipeAlgorithm } from '../../core/services/WipingService';
import { VerificationService } from '../../core/services/VerificationService';
import { CertificateService } from '../../core/services/CertificateService';
import { StartFullWipe } from './StartFullWipe';

export interface SimulationWipeRequest {
  userId: string;
  deviceId: string;
  algorithm: WipeAlgorithm;
}

export class SimulationWipe {
  private fullWipeUseCase: StartFullWipe;

  constructor(
    deviceRepo: DeviceRepository,
    userRepo: UserRepository,
    jobRepo: WipeJobRepository,
    auditRepo: AuditLogRepository,
    certRepo: CertificateRepository,
    wipingService: WipingService,
    verificationService: VerificationService,
    certificateService: CertificateService
  ) {
    this.fullWipeUseCase = new StartFullWipe(
      deviceRepo,
      userRepo,
      jobRepo,
      auditRepo,
      certRepo,
      wipingService,
      verificationService,
      certificateService
    );
  }

  public async execute(request: SimulationWipeRequest): Promise<string> {
    // Delegates directly to StartFullWipe with isSimulation forced to true
    return this.fullWipeUseCase.execute({
      userId: request.userId,
      deviceId: request.deviceId,
      algorithm: request.algorithm,
      isSimulation: true
    });
  }
}
