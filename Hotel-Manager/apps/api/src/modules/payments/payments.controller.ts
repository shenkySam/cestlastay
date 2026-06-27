import {
  Controller, Get, Post, Body, Param, Headers, RawBodyRequest, Req,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { RecordManualPaymentDto } from './dto/record-manual-payment.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '@hms/shared';

type AuthedUser = {
  id: string;
  role: string;
  bookingId?: string;
};

@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.service.findAll();
  }

  @Get('invoice/:invoiceId')
  getForInvoice(@CurrentUser() user: AuthedUser, @Param('invoiceId') invoiceId: string) {
    const guestBookingId = user.role === UserRole.GUEST ? user.bookingId : undefined;
    return this.service.getPaymentsForInvoice(invoiceId, guestBookingId);
  }

  // Staff record manual cash/card/bank payments against an invoice
  @Post('manual')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  recordManual(@Body() dto: RecordManualPaymentDto) {
    return this.service.recordManualPayment(dto);
  }

  // Guests call this to get a Stripe clientSecret
  @Post('intent')
  createIntent(@CurrentUser() user: AuthedUser, @Body() dto: CreatePaymentIntentDto) {
    const guestBookingId = user.role === UserRole.GUEST ? user.bookingId : undefined;
    return this.service.createPaymentIntent(dto.invoiceId, guestBookingId);
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
