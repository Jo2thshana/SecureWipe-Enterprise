import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../../core/services/UserRepository';
import { AuditLogRepository } from '../../core/services/AuditLogRepository';
import { createSignedAuditLog } from '../../utils/audit';

export interface LoginUserRequest {
  email: string;
  passwordHash: string; // Plain password passed from controller
}

export interface LoginUserResponse {
  token: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
}

export class LoginUser {
  private jwtSecret = process.env.JWT_SECRET || 'enterprise_grade_security_jwt_secret_key_2026';

  constructor(
    private userRepo: UserRepository,
    private auditRepo: AuditLogRepository
  ) {}

  public async execute(request: LoginUserRequest): Promise<LoginUserResponse> {
    const { email, passwordHash: password } = request;

    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password.');
    }

    // Verify password hash
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password.');
    }

    // Generate JWT token (expires in 24 hours)
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      this.jwtSecret,
      { expiresIn: '24h' }
    );

    // Audit trail creation
    await createSignedAuditLog(
      this.auditRepo,
      user.id,
      'USER_LOGIN',
      `User ${user.fullName} (${user.email}) logged in successfully.`
    );

    return {
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role
      }
    };
  }
}
