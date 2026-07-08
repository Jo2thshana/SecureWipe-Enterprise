import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { UserRepository } from '../../core/services/UserRepository';
import { AuditLogRepository } from '../../core/services/AuditLogRepository';
import { User } from '../../core/entities/User';
import { UserRole } from '../../core/entities/Enums';
import { createSignedAuditLog } from '../../utils/audit';

export interface RegisterUserRequest {
  fullName: string;
  email: string;
  passwordHash: string; // Plain password passed from presenter
  role: UserRole;
}

export class RegisterUser {
  constructor(
    private userRepo: UserRepository,
    private auditRepo: AuditLogRepository
  ) {}

  public async execute(request: RegisterUserRequest): Promise<Omit<User, 'passwordHash'>> {
    const { fullName, email, passwordHash: password, role } = request;

    if (!fullName || !email || !password) {
      throw new Error('Full name, email, and password are required.');
    }

    // Check email availability
    const existingUser = await this.userRepo.findByEmail(email);
    if (existingUser) {
      throw new Error('A user with this email address already exists.');
    }

    // Hash password using pure JS bcryptjs
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = new User({
      id: `user-${crypto.randomUUID()}`,
      fullName,
      email,
      role,
      passwordHash
    });

    await this.userRepo.create(user);
    
    // Log registration
    await createSignedAuditLog(
      this.auditRepo,
      user.id,
      'USER_REGISTER',
      `User ${fullName} (${email}) registered successfully as role ${role}.`
    );

    // Return user details without security credential hash
    const { passwordHash: _, ...userWithoutHash } = user;
    return userWithoutHash;
  }
}
