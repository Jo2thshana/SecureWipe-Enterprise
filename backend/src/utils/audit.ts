import crypto from 'crypto';
import { AuditLog } from '../core/entities/AuditLog';
import { AuditLogRepository } from '../core/services/AuditLogRepository';

const hmacSecret = process.env.HMAC_SECRET || 'hmac_audit_ledger_secret_protection_key_2026';

export async function createSignedAuditLog(
  repo: AuditLogRepository,
  userId: string | null,
  action: string,
  details: string
): Promise<AuditLog> {
  const id = `log-${crypto.randomUUID()}`;
  const created_at = new Date();
  
  // Create cryptographic signature payload
  const payload = `${id}|${userId || 'SYSTEM'}|${action}|${details}|${created_at.toISOString()}`;
  const signature = crypto.createHmac('sha256', hmacSecret).update(payload).digest('hex');

  const log = new AuditLog({
    id,
    userId,
    action,
    details,
    signature,
    created_at,
    updated_at: created_at
  });

  await repo.create(log);
  return log;
}
