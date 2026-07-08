import { Certificate } from '../entities/Certificate';

export interface CertificateRepository {
  save(cert: Certificate): Promise<void>;
  findByJobId(jobId: string): Promise<Certificate | null>;
  findByCertificateId(certId: string): Promise<Certificate | null>;
  findAll(): Promise<Certificate[]>;
}
