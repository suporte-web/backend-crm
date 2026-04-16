import { UserRole } from '../enums/user-role.enum';

export interface AuthUser {
  sub: string;
  email: string;
  role: UserRole;
}

