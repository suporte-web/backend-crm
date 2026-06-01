export class UpdateRoleScreenPermissionsDto {
  permissions: Array<{
    screen: string;
    canView: boolean;
    canCreate?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
  }>;
}