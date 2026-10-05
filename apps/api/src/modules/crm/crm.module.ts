import { Module } from '@nestjs/common';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';
import { EmailService } from './email.service';

@Module({
  controllers: [CrmController],
  providers: [CrmService, EmailService],
  exports: [CrmService, EmailService],
})
export class CrmModule {}
