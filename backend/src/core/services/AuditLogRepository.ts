import { AuditLog } from '../entities/AuditLog';

export interface AuditLogRepository {
  create(log: AuditLog): Promise<void>;
  findAll(): Promise<AuditLog[]>;
}
