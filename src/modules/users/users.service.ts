import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  AuditLogAction,
  AuditLogCategory,
  RoleScreenPermission,
  TimelineEventType,
  UserRole,
} from '@prisma/client';
import type { AuthUser } from '../auth/types/auth-user.type';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { UpdateRoleScreenPermissionsDto } from './dto/update-role-screen-permissions.dto';

const roleScreenPermissionSelect = {
  id: true,
  role: true,
  screenKey: true,
  screenLabel: true,
  isEnabled: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) { }

  private parseOptionalDate(value?: string) {
    if (!value) {
      return undefined;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  private sanitizeClientContacts(dto: CreateUserDto) {
    return (dto.contacts ?? [])
      .map((contact) => ({
        name: contact.name?.trim() || undefined,
        role: contact.role?.trim() || undefined,
        email: contact.email?.trim() || undefined,
        phone: contact.phone?.trim() || undefined,
        notes: contact.notes?.trim() || undefined,
        isPrimary: contact.isPrimary ?? false,
      }))
      .filter(
        (contact) =>
          contact.name ||
          contact.role ||
          contact.email ||
          contact.phone ||
          contact.notes,
      )
      .map((contact, index) => ({
        ...contact,
        isPrimary: index === 0 ? true : contact.isPrimary,
      }));
  }

  private createTechnicalClientEmail() {
    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    return `cliente-${suffix}@sem-acesso.pizzattolog.com`;
  }

  private createTechnicalClientPassword() {
    const suffix = randomUUID().replaceAll('-', '').slice(0, 10);
    return `Cliente@${suffix}1`;
  }

  async create(dto: CreateUserDto, actor?: AuthUser) {
    const isClient = dto.role === UserRole.CLIENTE;
    const email = dto.email?.trim() || (isClient ? this.createTechnicalClientEmail() : undefined);
    const password = dto.password || (isClient ? this.createTechnicalClientPassword() : undefined);

    if (!email) {
      throw new BadRequestException('Informe o e-mail do usuÃ¡rio.');
    }

    if (!password) {
      throw new BadRequestException('Informe a senha do usuÃ¡rio.');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('E-mail já está em uso.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const contacts = this.sanitizeClientContacts(dto);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email,
        passwordHash,
        mustChangePassword: true,
        role: dto.role,
        isActive: dto.isActive ?? (isClient ? false : true),
        clientProfile:
          isClient
            ? {
              create: {
                document: dto.document,
                phone: dto.phone,
                companyName: dto.companyName,
                legalName: dto.legalName,
                tradeName: dto.tradeName,
                cnae: dto.cnae,
                stateRegistration: dto.stateRegistration,
                businessActivity: dto.businessActivity,
                taxRegime: dto.taxRegime,
                address: dto.address,
                city: dto.city,
                bankDetails: dto.bankDetails,
                modality: dto.modality,
                registrationDate: this.parseOptionalDate(
                  dto.registrationDate,
                ),
                paymentMethod: dto.paymentMethod,
                paymentTerm: dto.paymentTerm,
                contractValidity: dto.contractValidity,
                priceAdjustment: dto.priceAdjustment,
                invoiceContactName: dto.invoiceContactName,
                invoiceContactEmail: dto.invoiceContactEmail,
                invoiceContactPhone: dto.invoiceContactPhone,
                commercialTermsNotes: dto.commercialTermsNotes,
                segment: dto.segment,
                status: dto.status ?? 'PENDENTE',
                internalOwnerId: dto.internalOwnerId ?? actor?.sub,
                contacts:
                  contacts.length > 0
                    ? {
                        create: contacts,
                      }
                    : undefined,
                timelineEvents: {
                  create: {
                    type: TimelineEventType.LEAD_CREATED,
                    title: 'Cliente criado',
                    description: `Cadastro inicial criado para ${dto.companyName ?? dto.name}.`,
                    createdById: actor?.sub,
                  },
                },
              },
            }
            : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
        clientProfile: {
          select: {
            id: true,
              document: true,
              phone: true,
              companyName: true,
              legalName: true,
              tradeName: true,
              cnae: true,
              stateRegistration: true,
              businessActivity: true,
              taxRegime: true,
              address: true,
              city: true,
              bankDetails: true,
              modality: true,
              registrationDate: true,
              paymentMethod: true,
              paymentTerm: true,
              contractValidity: true,
              priceAdjustment: true,
              invoiceContactName: true,
              invoiceContactEmail: true,
              invoiceContactPhone: true,
              commercialTermsNotes: true,
              segment: true,
              status: true,
              createdAt: true,
            updatedAt: true,
            internalOwnerId: true,
            contacts: true,
          },
        },
      },
    });

    await this.auditLogsService.create({
      category: AuditLogCategory.USER,
      action: AuditLogAction.USER_CREATED,
      message: `Usuário criado: ${user.name}.`,
      targetType: 'User',
      targetId: user.id,
      userId: actor?.sub,
      details: {
        role: user.role,
        email: user.email,
      },
    });

    return {
      ...user,
      screenPermissions: await this.findRoleScreenPermissions(user.role),
    };
  }

  async findAll() {
    const [users, permissions] = await Promise.all([
      this.prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          mustChangePassword: true,
          createdAt: true,
          updatedAt: true,
          clientProfile: {
            select: {
              id: true,
              document: true,
              phone: true,
              companyName: true,
              legalName: true,
              tradeName: true,
              cnae: true,
              stateRegistration: true,
              businessActivity: true,
              taxRegime: true,
              address: true,
              city: true,
              bankDetails: true,
              modality: true,
              registrationDate: true,
              segment: true,
              status: true,
              internalOwnerId: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.roleScreenPermission.findMany({
        select: roleScreenPermissionSelect,
        orderBy: [{ role: 'asc' }, { screenKey: 'asc' }],
      }),
    ]);

    const permissionsByRole = this.groupScreenPermissionsByRole(permissions);

    return users.map((user) => ({
      ...user,
      screenPermissions: permissionsByRole.get(user.role) ?? [],
    }));
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
        clientProfile: {
          select: {
            id: true,
              document: true,
              phone: true,
              companyName: true,
              legalName: true,
              tradeName: true,
              cnae: true,
              stateRegistration: true,
              businessActivity: true,
              taxRegime: true,
              address: true,
              city: true,
              bankDetails: true,
              modality: true,
              registrationDate: true,
              segment: true,
              status: true,
              internalOwnerId: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return {
      ...user,
      screenPermissions: await this.findRoleScreenPermissions(user.role),
    };
  }



  async setPasswordAfterReset(userId: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
        clientProfile: true,
      },
    });

    await this.auditLogsService.create({
      category: AuditLogCategory.USER,
      action: AuditLogAction.USER_UPDATED,
      message: `Senha redefinida por recuperação de acesso para ${updated.email}.`,
      targetType: 'User',
      targetId: updated.id,
      userId: updated.id,
      details: {
        mustChangePassword: false,
        source: 'forgot-password',
      },
    });

    return {
      ...updated,
      screenPermissions: await this.findRoleScreenPermissions(updated.role),
    };
  }

  async findInternalUsers() {
    return this.prisma.user.findMany({
      where: {
        role: {
          in: [UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { clientProfile: true },
    });
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

   


    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Senha atual invalida.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
        clientProfile: true,
      },
    });

    await this.auditLogsService.create({
      category: AuditLogCategory.USER,
      action: AuditLogAction.USER_UPDATED,
      message: `Senha atualizada por ${updated.email}.`,
      targetType: 'User',
      targetId: updated.id,
      userId: updated.id,
      details: {
        mustChangePassword: false,
      },
    });

    return {
      ...updated,
      screenPermissions: await this.findRoleScreenPermissions(updated.role),
    };
  }

  async update(id: string, dto: UpdateUserDto, actor?: AuthUser) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
      include: { clientProfile: true },
    });

    if (!existingUser) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    if (dto.email) {
      const emailInUse = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (emailInUse && emailInUse.id !== id) {
        throw new BadRequestException('E-mail já está em uso.');
      }
    }

    const shouldManageClientProfile =
      dto.role === UserRole.CLIENTE ||
      existingUser.role === UserRole.CLIENTE ||
      !!existingUser.clientProfile;

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email,
        role: dto.role,
        isActive: dto.isActive,
        clientProfile: shouldManageClientProfile
          ? {
            upsert: {
              create: {
                document: dto.document,
                phone: dto.phone,
                companyName: dto.companyName,
                legalName: dto.legalName,
                tradeName: dto.tradeName,
                cnae: dto.cnae,
                stateRegistration: dto.stateRegistration,
                businessActivity: dto.businessActivity,
                taxRegime: dto.taxRegime,
                address: dto.address,
                city: dto.city,
                bankDetails: dto.bankDetails,
                modality: dto.modality,
                registrationDate: this.parseOptionalDate(
                  dto.registrationDate,
                ),
                paymentMethod: dto.paymentMethod,
                paymentTerm: dto.paymentTerm,
                contractValidity: dto.contractValidity,
                priceAdjustment: dto.priceAdjustment,
                invoiceContactName: dto.invoiceContactName,
                invoiceContactEmail: dto.invoiceContactEmail,
                invoiceContactPhone: dto.invoiceContactPhone,
                commercialTermsNotes: dto.commercialTermsNotes,
                segment: dto.segment,
                status: dto.status,
                internalOwnerId: dto.internalOwnerId,
              },
              update: {
                document: dto.document,
                phone: dto.phone,
                companyName: dto.companyName,
                legalName: dto.legalName,
                tradeName: dto.tradeName,
                cnae: dto.cnae,
                stateRegistration: dto.stateRegistration,
                businessActivity: dto.businessActivity,
                taxRegime: dto.taxRegime,
                address: dto.address,
                city: dto.city,
                bankDetails: dto.bankDetails,
                modality: dto.modality,
                registrationDate: this.parseOptionalDate(
                  dto.registrationDate,
                ),
                paymentMethod: dto.paymentMethod,
                paymentTerm: dto.paymentTerm,
                contractValidity: dto.contractValidity,
                priceAdjustment: dto.priceAdjustment,
                invoiceContactName: dto.invoiceContactName,
                invoiceContactEmail: dto.invoiceContactEmail,
                invoiceContactPhone: dto.invoiceContactPhone,
                commercialTermsNotes: dto.commercialTermsNotes,
                segment: dto.segment,
                status: dto.status,
                internalOwnerId: dto.internalOwnerId,
              },
            },
          }
          : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
        clientProfile: {
          select: {
            id: true,
            document: true,
            phone: true,
            companyName: true,
            legalName: true,
            tradeName: true,
            cnae: true,
            stateRegistration: true,
            businessActivity: true,
            taxRegime: true,
            address: true,
            city: true,
            bankDetails: true,
            modality: true,
            registrationDate: true,
            paymentMethod: true,
            paymentTerm: true,
            contractValidity: true,
            priceAdjustment: true,
            invoiceContactName: true,
            invoiceContactEmail: true,
            invoiceContactPhone: true,
            commercialTermsNotes: true,
            segment: true,
            status: true,
            internalOwnerId: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    await this.auditLogsService.create({
      category: AuditLogCategory.USER,
      action: AuditLogAction.USER_UPDATED,
      message: `Usuário atualizado: ${updatedUser.name}.`,
      targetType: 'User',
      targetId: updatedUser.id,
      userId: actor?.sub,
      details: {
        role: updatedUser.role,
        email: updatedUser.email,
      },
    });

    return {
      ...updatedUser,
      screenPermissions: await this.findRoleScreenPermissions(updatedUser.role),
    };
  }

  async findScreenPermissions() {
    const permissions = await this.prisma.roleScreenPermission.findMany({
      select: roleScreenPermissionSelect,
      orderBy: [{ role: 'asc' }, { screenKey: 'asc' }],
    });
    const permissionsByRole = this.groupScreenPermissionsByRole(permissions);

    return Object.values(UserRole).map((role) => ({
      role,
      screens: permissionsByRole.get(role) ?? [],
    }));
  }

  async findRoleScreenPermissions(role: UserRole) {
    return this.prisma.roleScreenPermission.findMany({
      where: { role },
      select: roleScreenPermissionSelect,
      orderBy: { screenKey: 'asc' },
    });
  }

  async updateRoleScreenPermissions(
    role: UserRole,
    dto: UpdateRoleScreenPermissionsDto,
    actor?: AuthUser,
  ) {
    const screens = dto.screens.map((screen) => ({
      screenKey: screen.screenKey.trim(),
      screenLabel: screen.screenLabel?.trim(),
      isEnabled: screen.isEnabled,
    }));

    const invalidScreen = screens.find((screen) => !screen.screenKey);

    if (invalidScreen) {
      throw new BadRequestException('Chave da tela não pode ser vazia.');
    }

    await this.prisma.$transaction(
      screens.map((screen) =>
        this.prisma.roleScreenPermission.upsert({
          where: {
            role_screenKey: {
              role,
              screenKey: screen.screenKey,
            },
          },
          create: {
            role,
            screenKey: screen.screenKey,
            screenLabel: screen.screenLabel,
            isEnabled: screen.isEnabled,
          },
          update: {
            screenLabel: screen.screenLabel,
            isEnabled: screen.isEnabled,
          },
        }),
      ),
    );

    const updatedPermissions = await this.findRoleScreenPermissions(role);

    await this.auditLogsService.create({
      category: AuditLogCategory.USER,
      action: AuditLogAction.CUSTOM,
      message: `Permissoes de telas atualizadas para o perfil ${role}.`,
      targetType: 'RoleScreenPermission',
      targetId: role,
      userId: actor?.sub,
      details: {
        role,
        screens,
      },
    });

    return {
      role,
      screens: updatedPermissions,
    };
  }

  async remove(id: string, actor?: AuthUser) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    await this.prisma.user.delete({
      where: { id },
    });

    await this.auditLogsService.create({
      category: AuditLogCategory.USER,
      action: AuditLogAction.USER_DELETED,
      message: `Usuário removido: ${existingUser.email}.`,
      targetType: 'User',
      targetId: id,
      userId: actor?.sub,
    });

    return { message: 'Usuário removido com sucesso.' };
  }

  private groupScreenPermissionsByRole(permissions: RoleScreenPermission[]) {
    return permissions.reduce((grouped, permission) => {
      const rolePermissions = grouped.get(permission.role) ?? [];
      rolePermissions.push(permission);
      grouped.set(permission.role, rolePermissions);
      return grouped;
    }, new Map<UserRole, RoleScreenPermission[]>());
  }
}
