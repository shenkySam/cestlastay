import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from './email.service';

function setup(env: Record<string, string> = {}) {
  const log = { id: 'log1' };
  const prisma = {
    emailLog: {
      create: jest.fn(async () => log),
      update: jest.fn(async () => log),
    },
  };
  const service = new EmailService(prisma as unknown as PrismaService, new ConfigService(env));
  return { service, prisma };
}

const email = {
  to: 'guest@example.com',
  type: 'GUEST_LOGIN_CODE' as const,
  subject: '123456 is your code',
  html: '<p>123456</p>',
  logSubject: 'Your code',
  logBody: '<p>••••••</p>',
};

describe('EmailService', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('logs only (stub mode) when RESEND_API_KEY is missing', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    const { service, prisma } = setup();
    await service.send(email);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(prisma.emailLog.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'SENT' }) }),
    );
  });

  it('sends through Resend from EMAIL_FROM and stores the message id', async () => {
    const fetchMock = jest.fn(async () => new Response(JSON.stringify({ id: 'msg_1' }), { status: 200 }));
    global.fetch = fetchMock as unknown as typeof fetch;
    const { service, prisma } = setup({ RESEND_API_KEY: 're_test', EMAIL_FROM: 'Stay <stay@cestlastay.com>' });

    await service.send(email);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer re_test');
    expect(JSON.parse(init.body as string)).toMatchObject({
      from: 'Stay <stay@cestlastay.com>',
      to: ['guest@example.com'],
      subject: email.subject,
      html: email.html,
    });
    // The log keeps the redacted copy, never the code
    expect(prisma.emailLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ subject: 'Your code', body: '<p>••••••</p>' }),
    });
    expect(prisma.emailLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'SENT', providerMessageId: 'msg_1' }),
      }),
    );
  });

  it('marks the log FAILED with Resend’s reason when the send is rejected', async () => {
    global.fetch = jest.fn(
      async () =>
        new Response(JSON.stringify({ message: 'The cestlastay.com domain is not verified' }), { status: 403 }),
    ) as unknown as typeof fetch;
    const { service, prisma } = setup({ RESEND_API_KEY: 're_test' });

    await service.send(email);

    expect(prisma.emailLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'FAILED', errorMessage: 'The cestlastay.com domain is not verified' },
      }),
    );
  });
});
