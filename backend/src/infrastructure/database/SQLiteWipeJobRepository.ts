import { WipeJobRepository } from '../../core/services/WipeJobRepository';
import { WipeJob } from '../../core/entities/WipeJob';
import { WipeMode, WipeType, VerificationStatus } from '../../core/entities/Enums';
import { pool } from './postgres';

export class SQLiteWipeJobRepository implements WipeJobRepository {
  public async create(job: WipeJob): Promise<void> {
    await pool.query(`
      INSERT INTO wipe_jobs (
        id, device_id, user_id, mode, type, algorithm_used, status, 
        confidence_score, bytes_wiped, total_bytes, total_files, 
        succeeded_files, failed_files, success_rate, error, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    `, [
      job.id,
      job.deviceId,
      job.userId,
      job.mode,
      job.type,
      job.algorithm_used,
      job.status,
      job.confidence_score,
      job.bytesWiped,
      job.totalBytes,
      job.totalFiles,
      job.succeededFiles,
      job.failedFiles,
      job.successRate,
      job.error,
      job.created_at,
      job.updated_at
    ]);
  }

  public async findById(id: string): Promise<WipeJob | null> {
    const res = await pool.query('SELECT * FROM wipe_jobs WHERE id = $1', [id]);
    const row = res.rows[0];
    if (!row) return null;
    return this.mapToJob(row);
  }

  public async findAllByUserId(userId: string): Promise<WipeJob[]> {
    const res = await pool.query('SELECT * FROM wipe_jobs WHERE user_id = $1', [userId]);
    return res.rows.map(r => this.mapToJob(r));
  }

  public async findAll(): Promise<WipeJob[]> {
    const res = await pool.query('SELECT * FROM wipe_jobs');
    return res.rows.map(r => this.mapToJob(r));
  }

  public async updateStatus(
    id: string, 
    status: VerificationStatus, 
    confidenceScore: number, 
    bytesWiped: number, 
    error: string | null
  ): Promise<void> {
    await pool.query(`
      UPDATE wipe_jobs 
      SET status = $1, confidence_score = $2, bytes_wiped = $3, error = $4, updated_at = $5 
      WHERE id = $6
    `, [
      status, 
      confidenceScore, 
      bytesWiped, 
      error, 
      new Date(), 
      id
    ]);
  }

  public async updateVerificationMetrics(
    id: string,
    totalFiles: number,
    succeededFiles: number,
    failedFiles: number,
    successRate: number,
    status: VerificationStatus,
    confidenceScore: number,
    error: string | null
  ): Promise<void> {
    await pool.query(`
      UPDATE wipe_jobs 
      SET total_files = $1, succeeded_files = $2, failed_files = $3, success_rate = $4, status = $5, confidence_score = $6, error = $7, updated_at = $8 
      WHERE id = $9
    `, [
      totalFiles,
      succeededFiles,
      failedFiles,
      successRate,
      status,
      confidenceScore,
      error,
      new Date(),
      id
    ]);
  }

  private mapToJob(row: any): WipeJob {
    return new WipeJob({
      id: row.id,
      deviceId: row.device_id,
      userId: row.user_id,
      mode: row.mode as WipeMode,
      type: row.type as WipeType,
      algorithm_used: row.algorithm_used,
      status: row.status as VerificationStatus,
      confidence_score: Number(row.confidence_score),
      bytesWiped: Number(row.bytes_wiped),
      totalBytes: Number(row.total_bytes),
      totalFiles: row.total_files !== null ? Number(row.total_files) : null,
      succeededFiles: row.succeeded_files !== null ? Number(row.succeeded_files) : null,
      failedFiles: row.failed_files !== null ? Number(row.failed_files) : null,
      successRate: row.success_rate !== null ? Number(row.success_rate) : null,
      error: row.error,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    });
  }
}
