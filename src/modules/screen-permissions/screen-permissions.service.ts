import { Injectable } from '@nestjs/common';
import { UserRole } from '../auth/enums/user-role.enum';
import { UpdateRoleScreenPermissionsDto } from './dto/update-role-screen-permissions.dto';

type ScreenPermission = UpdateRoleScreenPermissionsDto['permissions'][number];

type RoleScreenPermissions = {
  role: UserRole;
  permissions: ScreenPermission[];
};

@Injectable()
export class ScreenPermissionsService {
  private permissions: RoleScreenPermissions[] = [
    {
      role: UserRole.ADMIN,
      permissions: [],
    },
    {
      role: UserRole.GESTAO,
      permissions: [],
    },
    {
      role: UserRole.COMERCIAL,
      permissions: [],
    },
  ];

  findAll() {
    return this.permissions;
  }

  updateByRole(role: UserRole, payload: UpdateRoleScreenPermissionsDto) {
    const existingRole = this.permissions.find((item) => item.role === role);

    if (existingRole) {
      existingRole.permissions = payload.permissions;
      return existingRole;
    }

    const newRolePermission: RoleScreenPermissions = {
      role,
      permissions: payload.permissions,
    };

    this.permissions.push(newRolePermission);

    return newRolePermission;
  }
}