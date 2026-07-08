import { UserRole } from './Enums';

export class User {
  public id: string;
  public fullName: string;
  public email: string;
  public passwordHash: string;
  public role: UserRole;
  public created_at: Date;
  public updated_at: Date;

  constructor(data: {
    id: string;
    fullName: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    created_at?: Date;
    updated_at?: Date;
  }) {
    this.id = data.id;
    this.fullName = data.fullName;
    this.email = data.email;
    this.passwordHash = data.passwordHash;
    this.role = data.role;
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();
  }
}
