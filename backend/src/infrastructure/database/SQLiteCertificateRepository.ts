import { CertificateRepository } from '../../core/services/CertificateRepository';
import { Certificate } from '../../core/entities/Certificate';
import { VerificationStatus } from '../../core/entities/Enums';
import { pool } from './postgres';

export class SQLiteCertificateRepository implements CertificateRepository {
  public async save(cert: Certificate): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO certificates (
          id, job_id, certificate_id, user_name, device_name, device_type, 
          algorithm_used, wipe_date, verification_status, confidence_score, 
          qr_code_data, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        cert.id,
        cert.jobId,
        cert.certificateId,
        cert.userName,
        cert.deviceName,
        cert.deviceType,
        cert.algorithm_used,
        cert.wipeDate,
        cert.verificationStatus,
        cert.confidence_score,
        cert.qrCodeData,
        cert.created_at,
        cert.updated_at
      ]);
    } catch (err: any) {
      if (err.code === '23505') { // Postgres Unique Violation
        throw new Error('UNIQUE constraint failed: certificates.jobId or certificates.certificateId');
      }
      throw err;
    }
  }

  public async findByJobId(jobId: string): Promise<Certificate | null> {
    const res = await pool.query('SELECT * FROM certificates WHERE job_id = $1', [jobId]);
    const row = res.rows[0];
    if (!row) return null;
    return this.mapToCert(row);
  }

  public async findByCertificateId(certId: string): Promise<Certificate | null> {
    const res = await pool.query('SELECT * FROM certificates WHERE certificate_id = $1', [certId]);
    const row = res.rows[0];
    if (!row) return null;
    return this.mapToCert(row);
  }

  public async findAll(): Promise<Certificate[]> {
    const res = await pool.query('SELECT * FROM certificates');
    return res.rows.map(r => this.mapToCert(r));
  }

  private mapToCert(row: any): Certificate {
    return new Certificate({
      id: row.id,
      jobId: row.job_id,
      certificateId: row.certificate_id,
      userName: row.user_name,
      deviceName: row.device_name,
      deviceType: row.device_type,
      algorithm_used: row.algorithm_used,
      wipeDate: new Date(row.wipe_date),
      verificationStatus: row.verification_status as VerificationStatus,
      confidence_score: Number(row.confidence_score),
      qrCodeData: row.qr_code_data,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    });
  }
}
