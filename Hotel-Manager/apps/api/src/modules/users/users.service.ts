import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto, UpdateUserStatusDto } from './dto/update-user.dto';
import { CreateStaffUserDto } from './dto/create-staff-user.dto';
import { UserRole } from '@hms/shared';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createStaffUser(dto: CreateStaffUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: dto.role as any,
        status: 'ACTIVE' as any,
      },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        phone: true, role: true, status: true, createdAt: true,
        staff: { select: { id: true, employeeId: true, department: true, position: true } },
      },
    });

    if (dto.role === UserRole.STAFF) {
      const count = await this.prisma.staff.count();
      const employeeId = `EMP${String(count + 1).padStart(3, '0')}`;
      await this.prisma.staff.create({
        data: {
          userId: user.id,
          employeeId,
          department: dto.department ?? 'General',
          position: dto.position ?? 'Staff',
          hireDate: new Date(),
        },
      });
      return this.findOne(user.id);
    }

    return user;
  }

  // Minimal staff listing for assignment dropdowns — accessible to STAFF role
  async findStaffList() {
    return this.prisma.user.findMany({
      where: { role: 'STAFF' as any, status: 'ACTIVE' as any },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        staff: { select: { id: true, department: true, position: true } },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
  }

  async findAll(role?: UserRole) {
    return this.prisma.user.findMany({
      where: role ? { role } : undefined,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        profileImageUrl: true,
        lastLoginAt: true,
        createdAt: true,
        staff: { select: { employeeId: true, department: true, position: true } },
        guest: { select: { id: true, loyaltyPoints: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        profileImageUrl: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        staff: {
          select: { id: true, employeeId: true, department: true, position: true, hireDate: true },
        },
        guest: {
          select: { id: true, loyaltyPoints: true, loyaltyTier: true },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: UpdateUserDto, requestingUserId: string, requestingRole: UserRole) {
    // Users can only update themselves; admins can update anyone
    if (requestingRole !== UserRole.ADMIN && requestingUserId !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }

    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        profileImageUrl: true,
        updatedAt: true,
      },
    });
  }

  async updateStatus(id: string, dto: UpdateUserStatusDto) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { status: dto.status },
      select: { id: true, status: true, updatedAt: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });
    return { message: 'User deleted successfully' };
  }
}
