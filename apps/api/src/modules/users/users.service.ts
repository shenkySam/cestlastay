import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SYSTEM_USER_EMAIL } from '../../common/system-user';
import {
  retryOnUniqueViolation,
  sequenceJitter,
  EMPLOYEE_ID_TARGET,
} from '../../common/prisma-retry';
import { UpdateUserDto, UpdateUserRoleDto, UpdateUserStatusDto } from './dto/update-user.dto';
import { CreateStaffUserDto } from './dto/create-staff-user.dto';
import { UserRole } from '@hms/shared';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async createStaffUser(dto: CreateStaffUserDto) {
    // Sign-in matches this email case-insensitively, so store it normalized
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    if (existing) throw new ConflictException('Email already in use');

    // No password: the user signs in with the Google / Apple account for this email
    const user = await this.prisma.user.create({
      data: {
        email,
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
      await retryOnUniqueViolation(
        async (attempt) =>
          this.prisma.staff.create({
            data: {
              userId: user.id,
              employeeId: await this.nextEmployeeId(this.prisma, attempt),
              department: dto.department ?? 'General',
              position: dto.position ?? 'Staff',
              hireDate: new Date(),
            },
          }),
        { tokens: EMPLOYEE_ID_TARGET, label: 'employee ID' },
      );
      return this.findOne(user.id);
    }

    return user;
  }

  /**
   * Promote STAFF → ADMIN or demote ADMIN → STAFF. Promotion keeps the staff
   * profile (tasks and service requests reference it); demotion creates one if
   * the user never had it. Access changes at once: every request reloads the
   * role from the database (JwtStrategy), so no tokens need revoking.
   */
  async changeRole(id: string, dto: UpdateUserRoleDto, actorId: string) {
    // Admins can't demote themselves, so the requester always remains an admin
    if (id === actorId) throw new ForbiddenException("You can't change your own role");

    const target = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true },
    });
    if (!target) throw new NotFoundException('User not found');
    if (target.role === UserRole.GUEST || target.email.toLowerCase() === SYSTEM_USER_EMAIL) {
      throw new BadRequestException("This account's role can't be changed");
    }
    if (target.role === dto.role) return this.findOne(id);

    const department = dto.department?.trim() || undefined;
    const position = dto.position?.trim() || undefined;

    try {
      await retryOnUniqueViolation(
        (attempt) =>
          this.prisma.$transaction(
            async (tx) => {
              await tx.user.update({ where: { id }, data: { role: dto.role as any } });

              if (dto.role === UserRole.STAFF) {
                const profile = await tx.staff.findUnique({ where: { userId: id }, select: { id: true } });
                if (profile) {
                  // Profile left over from before a promotion: reuse it
                  if (department || position) {
                    await tx.staff.update({ where: { userId: id }, data: { department, position } });
                  }
                } else {
                  await tx.staff.create({
                    data: {
                      userId: id,
                      employeeId: await this.nextEmployeeId(tx, attempt),
                      department: department ?? 'General',
                      position: position ?? 'Staff',
                      hireDate: new Date(),
                    },
                  });
                }
              }

              // Only reachable when two admins demote each other at once; Serializable
              // makes one of them fail rather than both commit and leave no admin.
              const admins = await tx.user.count({
                where: { role: 'ADMIN' as any, status: 'ACTIVE' as any },
              });
              if (admins === 0) throw new ConflictException('At least one active admin is required');
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
          ),
        { tokens: EMPLOYEE_ID_TARGET, label: 'employee ID' },
      );
    } catch (err) {
      // P2034: serialization failure against a concurrent change
      if ((err as { code?: unknown })?.code === 'P2034') {
        throw new ConflictException('Someone else changed the team at the same time. Please try again.');
      }
      throw err;
    }

    // The role change is committed: from here on, failures are logged rather than
    // returned, so the admin isn't told it failed when it didn't.
    await this.prisma.auditLog
      .create({
        data: {
          userId: actorId,
          action: 'ROLE_CHANGED',
          entity: 'User',
          entityId: id,
          changes: { from: target.role, to: dto.role },
        },
      })
      .catch((err) => this.logger.warn(`Audit log for role change of ${id} failed: ${err.message}`));

    // Their open tabs pick this up and reload the session (NotificationContext)
    await this.notifications
      .notifyUser(id, {
        type: 'SYSTEM',
        title: 'Your access changed',
        message: dto.role === UserRole.ADMIN ? 'You are now an admin.' : 'You are now a staff member.',
        metadata: { kind: 'ROLE_CHANGED', role: dto.role },
      })
      .catch((err) => this.logger.warn(`Role change notification for ${id} failed: ${err.message}`));

    return this.findOne(id);
  }

  /**
   * Next EMP### after the highest one in use. Not the row count, which hands out
   * an existing ID again once anyone has been deleted.
   */
  private async nextEmployeeId(db: Prisma.TransactionClient, attempt = 1): Promise<string> {
    const rows = await db.staff.findMany({
      where: { employeeId: { startsWith: 'EMP' } },
      select: { employeeId: true },
    });
    // Parse every ID: string order breaks once a number outgrows its padding (EMP1000 < EMP999)
    const max = rows.reduce((m, r) => Math.max(m, parseInt(r.employeeId.slice(3), 10) || 0), 0);
    // On a retry, scatter the candidate so concurrent writers stop colliding in lockstep.
    return `EMP${String(max + 1 + sequenceJitter(attempt)).padStart(3, '0')}`;
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
