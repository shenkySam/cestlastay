import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { UserRole, UserStatus } from '@hms/shared';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  profileImageUrl?: string;
}

export class UpdateUserStatusDto {
  @IsEnum(UserStatus)
  status: UserStatus;
}

export class UpdateUserRoleDto {
  // Staff ↔ admin only; guests are never promoted or demoted
  @IsIn([UserRole.ADMIN, UserRole.STAFF])
  role: UserRole.ADMIN | UserRole.STAFF;

  // Only used when demoting to STAFF: sets the staff profile
  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  position?: string;
}
