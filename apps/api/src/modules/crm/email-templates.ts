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
  unsubscribeUrl: string;
}

// Physical postal address, required in commercial email (CAN-SPAM). Shown on
// every email; keep in sync with the Terms / Privacy pages on the landing.
const POSTAL_ADDRESS = "C'est La Stay · 10 Auroville Road, Edayanchavadi, Auroville, Tamil Nadu 605101, India";

const SITE_URL = 'https://cestlastay.com';
/** Served by the landing (apps/guest/public/email/logo-mark.png), 192×224. */
const LOGO_URL = `${SITE_URL}/email/logo-mark.png`;

// Brand palette, matching the landing and guest portal ("Earthen").
const C = {
  page: '#f4efe5', // cream
  card: '#fbf8f1',
  sand: '#efe6d6',
  line: '#e3d8c6',
  clay: '#b1542e',
  clayDeep: '#8a3f20',
  ink: '#3a2a1f',
  inkSoft: '#6b5849',
};
// Brand fonts where the mail app loads them (Apple Mail); Gmail and Outlook use the fallbacks.
const SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const SANS = "Jost, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

/** Escape text that came from a guest (names) or the database before it goes into HTML. */
export function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** "UTKARSH" or "utkarsh" → "Utkarsh"; mixed-case names ("McKenzie") are left alone. */
export function displayName(name?: string): string {
  const n = (name ?? '').trim();
  if (!n || (n !== n.toUpperCase() && n !== n.toLowerCase())) return n;
  return n.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

const inr = (amount: number | string) =>
  `₹${Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const day = (d: Date | string, pattern = 'EEE, d MMM yyyy') => format(new Date(d), pattern);

const greeting = (firstName?: string) => {
  const name = displayName(firstName);
  return `<p style="margin:0 0 16px;">${name ? `Dear ${esc(name)},` : 'Hello,'}</p>`;
};

const button = (href: string, label: string) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 8px;">
    <tr><td style="background:${C.clay}; border-radius:2px;">
      <a href="${esc(href)}" style="display:inline-block; padding:14px 28px; font-family:${SANS}; font-size:13px; letter-spacing:2px; text-transform:uppercase; color:#ffffff; text-decoration:none;">${label}</a>
    </td></tr>
  </table>`;

/** Label / value rows, e.g. the booking summary. Values are trusted HTML; escape inputs first. */
const details = (rows: [string, string][]) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0; border-top:1px solid ${C.line};">
    ${rows
      .map(
        ([label, value]) => `
    <tr>
      <td style="padding:12px 0; border-bottom:1px solid ${C.line}; font-size:11px; letter-spacing:2px; text-transform:uppercase; color:${C.inkSoft}; width:38%; vertical-align:top;">${label}</td>
      <td style="padding:12px 0; border-bottom:1px solid ${C.line}; font-size:15px; color:${C.ink}; vertical-align:top;">${value}</td>
    </tr>`,
      )
      .join('')}
  </table>`;

const muted = (html: string) =>
  `<p style="margin:16px 0 0; font-size:13px; line-height:1.6; color:${C.inkSoft};">${html}</p>`;

const SIGN_IN_HINT = muted(
  'Sign in with this email address: choose <em>Email me a code</em>, or use Google, or your booking number and last name.',
);

const SIGN_OFF = `<p style="margin:26px 0 0; font-family:${SERIF}; font-size:19px; font-style:italic; color:${C.ink};">With warmth,<br>C’est La Stay, Auroville</p>`;

/**
 * Shared layout: cream page, logo and serif wordmark, a small clay eyebrow
 * with the email's title, then the body on a warm card. Table-based so it
 * holds up in Gmail and Outlook.
 */
const wrapper = (title: string, body: string, opts: { unsubscribeUrl?: string; preheader?: string } = {}) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light only">
    <title>${esc(title)}</title>
  </head>
  <body style="margin:0; padding:0; background:${C.page}; color:${C.ink}; font-family:${SANS}; -webkit-text-size-adjust:100%;">
    ${opts.preheader ? `<div style="display:none; max-height:0; overflow:hidden; opacity:0;">${esc(opts.preheader)}</div>` : ''}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page};">
      <tr><td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
          <tr><td align="center" style="padding:0 0 22px;">
            <a href="${SITE_URL}" style="text-decoration:none; color:${C.ink};">
              <img src="${LOGO_URL}" width="56" height="65" alt="" style="display:block; margin:0 auto 10px; border:0;">
              <span style="font-family:${SERIF}; font-size:28px; letter-spacing:0.5px; color:${C.ink};">C’est La <em style="color:${C.clay};">Stay</em></span>
            </a>
          </td></tr>
          <tr><td style="background:${C.card}; border:1px solid ${C.line}; border-top:3px solid ${C.clay}; padding:30px 26px 28px; font-size:15px; line-height:1.65; color:${C.ink};">
            <p style="margin:0 0 6px; font-size:11px; letter-spacing:3px; text-transform:uppercase; color:${C.clay};">${esc(title)}</p>
            ${body}
          </td></tr>
          <tr><td align="center" style="padding:22px 12px 0; font-size:12px; line-height:1.6; color:${C.inkSoft};">
            <a href="${SITE_URL}" style="color:${C.inkSoft}; text-decoration:none;">cestlastay.com</a> · <a href="mailto:stay@cestlastay.com" style="color:${C.inkSoft}; text-decoration:none;">stay@cestlastay.com</a><br>
            ${POSTAL_ADDRESS}${
              opts.unsubscribeUrl
                ? `<br>You're receiving this because you stayed with us. <a href="${esc(opts.unsubscribeUrl)}" style="color:${C.inkSoft};">Unsubscribe from offers</a>.`
                : ''
            }
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

const heading = (text: string) =>
  `<h1 style="margin:0 0 20px; font-family:${SERIF}; font-size:30px; font-weight:500; line-height:1.2; color:${C.ink};">${text}</h1>`;

export function bookingConfirmationTemplate(d: BookingEmailData) {
  const subject = `Booking confirmed — ${d.bookingNumber}`;
  const html = wrapper(
    'Booking confirmed',
    `
    ${heading('Your stay is confirmed')}
    ${greeting(d.guestFirstName)}
    <p style="margin:0;">We’re delighted to welcome you to Auroville. Here are your details:</p>
    ${details([
      ['Booking', `<strong style="font-family:Menlo, Consolas, monospace; font-size:14px; white-space:nowrap;">${esc(d.bookingNumber)}</strong>`],
      ['Stay', `${esc(d.roomCategory)} <span style="color:${C.inkSoft};">· Room ${esc(d.roomNumber)}</span>`],
      ['Arrival', day(d.checkInDate)],
      ['Departure', day(d.checkOutDate)],
      ['Total', `<strong>${inr(d.totalAmount)}</strong>`],
    ])}
    <p style="margin:0;">Your guest portal has your booking now, and during your stay you can view your bill and request services there.</p>
    ${button(d.portalUrl, 'Open guest portal')}
    ${SIGN_IN_HINT}
    ${SIGN_OFF}`,
    { preheader: `Booking ${d.bookingNumber}: ${day(d.checkInDate, 'd MMM')} – ${day(d.checkOutDate, 'd MMM yyyy')}` },
  );
  return { subject, html };
}

export function checkInReminderTemplate(d: BookingEmailData) {
  const subject = `Your stay starts tomorrow — ${d.bookingNumber}`;
  const html = wrapper(
    'Check-in reminder',
    `
    ${heading('See you tomorrow')}
    ${greeting(d.guestFirstName)}
    <p style="margin:0;">Your stay with us begins on <strong>${day(d.checkInDate, 'EEEE, d MMMM')}</strong>.</p>
    ${details([
      ['Booking', `<strong style="font-family:Menlo, Consolas, monospace; font-size:14px; white-space:nowrap;">${esc(d.bookingNumber)}</strong>`],
      ['Stay', `${esc(d.roomCategory)} <span style="color:${C.inkSoft};">· Room ${esc(d.roomNumber)}</span>`],
    ])}
    <p style="margin:0;">Need anything before you arrive? Write to us at <a href="mailto:stay@cestlastay.com" style="color:${C.clay};">stay@cestlastay.com</a>.</p>
    ${button(d.portalUrl, 'Open guest portal')}
    ${SIGN_IN_HINT}
    ${SIGN_OFF}`,
    { preheader: `Your stay begins ${day(d.checkInDate, 'EEEE, d MMMM')}` },
  );
  return { subject, html };
}

export function postStayDiscountTemplate(d: DiscountEmailData) {
  const subject = `Thanks for staying with us — here's a gift 🎁`;
  const html = wrapper(
    'A token of thanks',
    `
    ${heading('Until next time')}
    ${greeting(d.guestFirstName)}
    <p style="margin:0 0 14px;">Thank you for staying with us (${esc(d.bookingNumber)}). We hope Auroville was good to you.</p>
    <p style="margin:0;">As a small thank-you, here is a code for your next reservation:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
      <tr><td align="center" style="background:${C.sand}; border:1px dashed ${C.clay}; padding:20px 12px;">
        <div style="font-family:Menlo, Consolas, monospace; font-size:24px; font-weight:bold; letter-spacing:4px; color:${C.clayDeep};">${esc(d.code)}</div>
        <div style="margin-top:8px; font-size:13px; color:${C.inkSoft};">${esc(d.discountLabel)} · valid until ${day(d.validUntil, 'd MMM yyyy')}</div>
      </td></tr>
    </table>
    <p style="margin:0;">We can’t wait to welcome you back.</p>
    ${SIGN_OFF}`,
    { unsubscribeUrl: d.unsubscribeUrl, preheader: `${d.discountLabel} on your next stay` },
  );
  return { subject, html };
}

export function guestLoginCodeTemplate(d: { guestFirstName?: string; code: string; minutes: number }) {
  const subject = `${d.code} is your C'est La Stay sign-in code`;
  const body = (code: string) => `
    ${heading('Your sign-in code')}
    ${greeting(d.guestFirstName)}
    <p style="margin:0;">Enter this code to open your stay in the guest portal:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
      <tr><td align="center" style="background:${C.sand}; border:1px solid ${C.line}; padding:22px 12px;">
        <div style="font-family:Menlo, Consolas, 'Courier New', monospace; font-size:34px; font-weight:bold; letter-spacing:10px; color:${C.clayDeep};">${code}</div>
      </td></tr>
    </table>
    <p style="margin:0;">It expires in ${d.minutes} minutes and works once.</p>
    ${muted("Didn't ask for a code? You can ignore this email; nobody can sign in without it.")}
    ${SIGN_OFF}`;
  return {
    subject,
    html: wrapper('Guest portal', body(d.code), { preheader: `Your code expires in ${d.minutes} minutes.` }),
    // The subject carries the code too, so the log keeps a redacted copy of both.
    logSubject: "Your C'est La Stay sign-in code",
    logBody: wrapper('Guest portal', body('••••••')),
  };
}
