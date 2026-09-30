import { Controller, Headers, HttpCode, Post, RawBodyRequest, Req } from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { InboundEmailService } from './inbound-email.service';

@Controller('webhooks')
export class InboundEmailController {
  constructor(private readonly service: InboundEmailService) {}

  // Resend calls this for `email.received` — public, verified by Svix signature.
  @Public()
  @Post('resend')
  @HttpCode(200)
  resend(
    @Req() req: RawBodyRequest<Request>,
    @Headers('svix-id') svixId?: string,
    @Headers('svix-timestamp') svixTimestamp?: string,
    @Headers('svix-signature') svixSignature?: string,
  ) {
    return this.service.handleWebhook(req.rawBody, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    });
  }
}
