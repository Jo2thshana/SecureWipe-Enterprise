import { Device } from '../entities/Device';

export interface DeviceRepository {
  save(device: Device): Promise<void>;
  findById(id: string): Promise<Device | null>;
  findAll(): Promise<Device[]>;
  updateConnection(id: string, status: 'connected' | 'disconnected'): Promise<void>;
  updateSpace(id: string, usedSpace: number, freeSpace: number): Promise<void>;
}
