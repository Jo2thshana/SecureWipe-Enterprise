import crypto from 'crypto';
import { AuditLogRepository } from '../../core/services/AuditLogRepository';
import { AuditLog } from '../../core/entities/AuditLog';

const hmacSecret = process.env.HMAC_SECRET || 'hmac_audit_ledger_secret_protection_key_2026';

export interface VerifiedAuditLog extends AuditLog {
  isSignatureVerified: boolean;
}

export class GetAuditLogs {
  constructor(private auditRepo: AuditLogRepository) {}

  public async execute(operatorId: string): Promise<VerifiedAuditLog[]> {
    const logs = await this.auditRepo.findAll();
    
    // Perform cryptographic verification on each ledger entry
    return logs.map(log => {
      const payload = `${log.id}|${log.userId || 'SYSTEM'}|${log.action}|${log.details}|${new Date(log.created_at).toISOString()}`;
      const expectedSignature = crypto.createHmac('sha256', hmacSecret).update(payload).digest('hex');
      
      const isSignatureVerified = log.signature === expectedSignature;

      return {
        ...log,
        isSignatureVerified
      };
    });
  }
}
