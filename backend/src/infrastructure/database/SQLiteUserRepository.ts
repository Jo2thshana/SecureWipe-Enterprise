import { UserRepository } from '../../core/services/UserRepository';
import { User } from '../../core/entities/User';
import { UserRole } from '../../core/entities/Enums';
import { pool } from './postgres';

export class SQLiteUserRepository implements UserRepository {
  public async create(user: User): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO users (id, full_name, email, password_hash, role, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        user.id,
        user.fullName,
        user.email,
        user.passwordHash,
        user.role,
        user.created_at,
        user.updated_at
      ]);
    } catch (err: any) {
      if (err.code === '23505') { // Postgres Unique Violation
        throw new Error('UNIQUE constraint failed: users.email');
      }
      throw err;
    }
  }

  public async findByEmail(email: string): Promise<User | null> {
    const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const row = res.rows[0];
    if (!row) return null;
    return this.mapToUser(row);
  }

  public async findById(id: string): Promise<User | null> {
    const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    const row = res.rows[0];
    if (!row) return null;
    return this.mapToUser(row);
  }

  public async findAll(): Promise<User[]> {
    const res = await pool.query('SELECT * FROM users');
    return res.rows.map(r => this.mapToUser(r));
  }

  private mapToUser(row: any): User {
    return new User({
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role as UserRole,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    });
  }
}
