import { Module } from '@nestjs/common';
import { CrmModule } from '../crm/crm.module';
import { GuestOtpService } from './guest-otp.service';

/** Own module so BookingsModule can send codes without importing all of AuthModule. */
@Module({
  imports: [CrmModule],
  providers: [GuestOtpService],
  exports: [GuestOtpService],
})
export class GuestOtpModule {}
