import { DeviceRepository } from '../../core/services/DeviceRepository';
import { Device } from '../../core/entities/Device';
import { pool } from './postgres';

export class SQLiteDeviceRepository implements DeviceRepository {
  public async save(device: Device): Promise<void> {
    // Upsert equivalent in PostgreSQL (INSERT ... ON CONFLICT (id) DO UPDATE)
    await pool.query(`
      INSERT INTO devices (
        id, name, type, capacity, used_space, free_space, connection_status, 
        path, risk_level, is_os_disk, is_safe, created_at, updated_at, 
        bus_type, connection_type, media_type
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        capacity = EXCLUDED.capacity,
        used_space = EXCLUDED.used_space,
        free_space = EXCLUDED.free_space,
        connection_status = EXCLUDED.connection_status,
        path = EXCLUDED.path,
        risk_level = EXCLUDED.risk_level,
        is_os_disk = EXCLUDED.is_os_disk,
        is_safe = EXCLUDED.is_safe,
        updated_at = EXCLUDED.updated_at,
        bus_type = EXCLUDED.bus_type,
        connection_type = EXCLUDED.connection_type,
        media_type = EXCLUDED.media_type
    `, [
      device.id,
      device.name,
      device.type,
      device.capacity,
      device.usedSpace,
      device.freeSpace,
      device.connectionStatus,
      device.path,
      device.risk_level,
      device.isOSDisk,
      device.isSafe,
      device.created_at,
      device.updated_at,
      device.busType,
      device.connectionType,
      device.mediaType
    ]);
  }

  public async findById(id: string): Promise<Device | null> {
    const res = await pool.query('SELECT * FROM devices WHERE id = $1', [id]);
    const row = res.rows[0];
    if (!row) return null;
    return this.mapToDevice(row);
  }

  public async findAll(): Promise<Device[]> {
    const res = await pool.query('SELECT * FROM devices');
    return res.rows.map(r => this.mapToDevice(r));
  }

  public async updateConnection(id: string, status: 'connected' | 'disconnected'): Promise<void> {
    await pool.query('UPDATE devices SET connection_status = $1, updated_at = $2 WHERE id = $3', [status, new Date(), id]);
  }

  public async updateSpace(id: string, usedSpace: number, freeSpace: number): Promise<void> {
    await pool.query('UPDATE devices SET used_space = $1, free_space = $2, updated_at = $3 WHERE id = $4', [usedSpace, freeSpace, new Date(), id]);
  }

  private mapToDevice(row: any): Device {
    return new Device({
      id: row.id,
      name: row.name,
      type: row.type as any,
      capacity: Number(row.capacity),
      usedSpace: Number(row.used_space),
      freeSpace: Number(row.free_space),
      connectionStatus: row.connection_status as any,
      path: row.path,
      risk_level: row.risk_level as any,
      isOSDisk: row.is_os_disk,
      isSafe: row.is_safe,
      busType: row.bus_type,
      connectionType: row.connection_type as any,
      mediaType: row.media_type as any,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    });
  }
}
