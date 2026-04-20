import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: dto.role,
        clientProfile:
          dto.role === UserRole.CLIENTE
            ? {
                create: {
                  document: dto.document,
                  phone: dto.phone,
                  companyName: dto.companyName,
                },
              }
            : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        clientProfile: {
          select: {
            id: true,
            document: true,
            phone: true,
            companyName: true,
            segment: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        clientProfile: {
          select: {
            id: true,
            document: true,
            phone: true,
            companyName: true,
            segment: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
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
        createdAt: true,
        updatedAt: true,
        clientProfile: {
          select: {
            id: true,
            document: true,
            phone: true,
            companyName: true,
            segment: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
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

  async update(id: string, dto: UpdateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
      include: { clientProfile: true },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    if (dto.email) {
      const emailInUse = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (emailInUse && emailInUse.id !== id) {
        throw new BadRequestException('Email already in use');
      }
    }

    const shouldManageClientProfile =
      dto.role === UserRole.CLIENTE ||
      existingUser.role === UserRole.CLIENTE ||
      !!existingUser.clientProfile;

    return this.prisma.user.update({
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
                },
                update: {
                  document: dto.document,
                  phone: dto.phone,
                  companyName: dto.companyName,
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
        createdAt: true,
        updatedAt: true,
        clientProfile: {
          select: {
            id: true,
            document: true,
            phone: true,
            companyName: true,
            segment: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return { message: 'User deleted successfully' };
  }
}