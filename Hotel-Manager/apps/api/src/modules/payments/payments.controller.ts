import {
  Controller, Get, Post, Body, Param, Headers, RawBodyRequest, Req,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '@hms/shared';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.service.findAll();
  }

  @Get('invoice/:invoiceId')
  getForInvoice(@Param('invoiceId') invoiceId: string) {
    return this.service.getPaymentsForInvoice(invoiceId);
  }

  // Guests call this to get a Stripe clientSecret
  @Post('intent')
  createIntent(@Body() dto: CreatePaymentIntentDto) {
    return this.service.createPaymentIntent(dto.invoiceId);
  }

  // Stripe calls this — must be public and receive raw body
  @Public()
  @Post('webhook')
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string,
  ) {
    return this.service.handleWebhook(req.rawBody!, sig);
  }
}
