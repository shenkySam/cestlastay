import {
  bookingConfirmationTemplate,
  displayName,
  esc,
  guestLoginCodeTemplate,
} from './email-templates';

describe('email templates', () => {
  it('escapes guest-supplied text', () => {
    expect(esc(`<b>"Tom" & 'Jo'</b>`)).toBe('&lt;b&gt;&quot;Tom&quot; &amp; &#39;Jo&#39;&lt;/b&gt;');
  });

  it('tidies all-caps or all-lowercase first names, leaves mixed case alone', () => {
    expect(displayName('UTKARSH')).toBe('Utkarsh');
    expect(displayName('anne-marie')).toBe('Anne-Marie');
    expect(displayName('McKenzie')).toBe('McKenzie');
    expect(displayName('')).toBe('');
  });

  it('booking confirmation is branded, in rupees, and escapes the name', () => {
    const { html } = bookingConfirmationTemplate({
      guestFirstName: '<script>x</script>',
      guestLastName: 'Doe',
      bookingNumber: 'BKG-20261120-0002',
      roomNumber: 'BNY-01',
      roomCategory: 'Banyan Suite',
      checkInDate: '2026-11-20',
      checkOutDate: '2026-11-30',
      totalAmount: 84000,
      portalUrl: 'https://app.cestlastay.com/login?as=guest',
    });
    expect(html).toContain('https://cestlastay.com/email/logo-mark.png');
    expect(html).toContain('₹84,000');
    expect(html).not.toContain('$');
    expect(html).not.toContain('<script>x');
    expect(html).not.toContain('#1e40af');
  });

  it('sign-in code: the code is in the email but not in the logged copy', () => {
    const t = guestLoginCodeTemplate({ guestFirstName: 'Asha', code: '050362', minutes: 10 });
    expect(t.html).toContain('050362');
    expect(t.logBody).not.toContain('050362');
    expect(t.logSubject).not.toContain('050362');
  });
});
