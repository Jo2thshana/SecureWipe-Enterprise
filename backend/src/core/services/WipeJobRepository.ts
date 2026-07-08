import { WipeJob } from '../entities/WipeJob';
import { VerificationStatus } from '../entities/Enums';

export interface WipeJobRepository {
  create(job: WipeJob): Promise<void>;
  findById(id: string): Promise<WipeJob | null>;
  findAllByUserId(userId: string): Promise<WipeJob[]>;
  findAll(): Promise<WipeJob[]>;
  updateStatus(
    id: string, 
    status: VerificationStatus, 
    confidenceScore: number, 
    bytesWiped: number, 
    error: string | null
  ): Promise<void>;
  updateVerificationMetrics?(
    id: string,
    totalFiles: number,
    succeededFiles: number,
    failedFiles: number,
    successRate: number,
    status: VerificationStatus,
    confidenceScore: number,
    error: string | null
  ): Promise<void>;
}
