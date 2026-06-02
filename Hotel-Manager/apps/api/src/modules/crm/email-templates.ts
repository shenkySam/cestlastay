import { format } from 'date-fns';

interface BookingEmailData {
  guestFirstName: string;
  guestLastName: string;
  bookingNumber: string;
  roomNumber: string;
  roomCategory: string;
  checkInDate: Date | string;
  checkOutDate: Date | string;
  totalAmount: number | string;
  portalUrl: string;
}

interface DiscountEmailData {
  guestFirstName: string;
  bookingNumber: string;
  code: string;
  discountLabel: string;
  validUntil: Date | string;
}

const wrapper = (title: string, body: string) => `
<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f4f4f5; padding:24px; margin:0;">
    <div style="max-width:560px; margin:0 auto; background:#fff; border-radius:8px; overflow:hidden; border:1px solid #e5e7eb;">
      <div style="background:#1e40af; color:#fff; padding:20px 24px;">
        <h1 style="margin:0; font-size:18px;">🏨 Hotel Manager</h1>
        <p style="margin:4px 0 0 0; font-size:13px; opacity:0.85;">${title}</p>
      </div>
      <div style="padding:24px; color:#1f2937; font-size:14px; line-height:1.55;">
        ${body}
      </div>
      <div style="background:#f9fafb; padding:16px 24px; font-size:12px; color:#6b7280; border-top:1px solid #e5e7eb;">
        Hotel Manager · automated message — please do not reply.
      </div>
    </div>
  </body>
</html>`;

export function bookingConfirmationTemplate(d: BookingEmailData) {
  const subject = `Booking confirmed — ${d.bookingNumber}`;
  const html = wrapper('Booking confirmed', `
    <p>Hi ${d.guestFirstName},</p>
    <p>We're pleased to confirm your reservation. Here are your details:</p>
    <table style="width:100%; border-collapse:collapse; margin:16px 0;">
      <tr><td style="padding:6px 0; color:#6b7280;">Booking #</td><td style="padding:6px 0; font-family:monospace;"><strong>${d.bookingNumber}</strong></td></tr>
      <tr><td style="padding:6px 0; color:#6b7280;">Room</td><td style="padding:6px 0;">${d.roomCategory} (#${d.roomNumber})</td></tr>
      <tr><td style="padding:6px 0; color:#6b7280;">Check-in</td><td style="padding:6px 0;">${format(new Date(d.checkInDate), 'EEE, dd MMM yyyy')}</td></tr>
      <tr><td style="padding:6px 0; color:#6b7280;">Check-out</td><td style="padding:6px 0;">${format(new Date(d.checkOutDate), 'EEE, dd MMM yyyy')}</td></tr>
      <tr><td style="padding:6px 0; color:#6b7280;">Total</td><td style="padding:6px 0;"><strong>$${Number(d.totalAmount).toFixed(2)}</strong></td></tr>
    </table>
    <p>Access your guest portal to view your bill, request services, or check out:</p>
    <p><a href="${d.portalUrl}" style="display:inline-block; background:#1e40af; color:#fff; text-decoration:none; padding:10px 18px; border-radius:6px; font-weight:500;">Open guest portal</a></p>
    <p style="margin-top:24px;">We look forward to hosting you.</p>
  `);
  return { subject, html };
}

export function checkInReminderTemplate(d: BookingEmailData) {
  const subject = `Your stay starts tomorrow — ${d.bookingNumber}`;
  const html = wrapper('Check-in reminder', `
    <p>Hi ${d.guestFirstName},</p>
    <p>This is a friendly reminder — your stay with us begins <strong>${format(new Date(d.checkInDate), 'EEEE, dd MMM yyyy')}</strong>.</p>
    <table style="width:100%; border-collapse:collapse; margin:16px 0;">
      <tr><td style="padding:6px 0; color:#6b7280;">Booking #</td><td style="padding:6px 0; font-family:monospace;"><strong>${d.bookingNumber}</strong></td></tr>
      <tr><td style="padding:6px 0; color:#6b7280;">Room</td><td style="padding:6px 0;">${d.roomCategory} (#${d.roomNumber})</td></tr>
    </table>
    <p>Need anything before you arrive? Use the guest portal to message us.</p>
    <p><a href="${d.portalUrl}" style="display:inline-block; background:#1e40af; color:#fff; text-decoration:none; padding:10px 18px; border-radius:6px; font-weight:500;">Open guest portal</a></p>
  `);
  return { subject, html };
}

export function postStayDiscountTemplate(d: DiscountEmailData) {
  const subject = `Thanks for staying with us — here's a gift 🎁`;
  const html = wrapper('A token of thanks', `
    <p>Hi ${d.guestFirstName},</p>
    <p>Thank you for choosing us for your recent stay (${d.bookingNumber}). We hope it was wonderful.</p>
    <p>As a token of appreciation, here's a discount code valid for your next reservation:</p>
    <div style="text-align:center; margin:24px 0;">
      <div style="display:inline-block; padding:14px 24px; background:#fef3c7; border:2px dashed #f59e0b; border-radius:8px; font-family:monospace; font-size:20px; font-weight:bold; letter-spacing:2px; color:#92400e;">
        ${d.code}
      </div>
      <p style="margin-top:8px; color:#6b7280; font-size:13px;">${d.discountLabel} · valid until ${format(new Date(d.validUntil), 'dd MMM yyyy')}</p>
    </div>
    <p>We can't wait to welcome you back.</p>
  `);
  return { subject, html };
}
