import { AuditLogRepository } from '../../core/services/AuditLogRepository';
import { AuditLog } from '../../core/entities/AuditLog';
import { pool } from './postgres';

export class SQLiteAuditLogRepository implements AuditLogRepository {
  public async create(log: AuditLog): Promise<void> {
    await pool.query(`
      INSERT INTO audit_logs (id, user_id, action, details, signature, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      log.id,
      log.userId,
      log.action,
      log.details,
      log.signature,
      log.created_at,
      log.updated_at
    ]);
  }

  public async findAll(): Promise<AuditLog[]> {
    const res = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC');
    return res.rows.map(r => new AuditLog({
      id: r.id,
      userId: r.user_id,
      action: r.action,
      details: r.details,
      signature: r.signature,
      created_at: new Date(r.created_at),
      updated_at: new Date(r.updated_at)
    }));
  }
}
