import { ConflictException, Logger } from '@nestjs/common';

interface KnownPrismaError {
  code: string;
  meta?: { target?: string[] | string };
}

/**
 * Duck-typed on purpose: `instanceof Prisma.PrismaClientKnownRequestError` is unreliable
 * when more than one @prisma/client copy is resolvable in a monorepo.
 */
export function isUniqueViolation(err: unknown): err is KnownPrismaError {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 'P2002';
}

/**
 * Prisma reports P2002 `meta.target` as column names (['booking_number']), Prisma field
 * names (['bookingNumber']) or the constraint name ('bookings_booking_number_key'),
 * depending on connector/version — normalise and substring-match so all three work.
 */
function normalisedTarget(err: KnownPrismaError): string {
  const t = err.meta?.target;
  return (Array.isArray(t) ? t.join(',') : t ?? '').toLowerCase();
}

export function violates(err: unknown, tokens: string[]): boolean {
  if (!isUniqueViolation(err)) return false;
  const target = normalisedTarget(err);
  return target !== '' && tokens.some((t) => target.includes(t));
}

export const BOOKING_NUMBER_TARGET = ['booking_number', 'bookingnumber'];
export const INVOICE_NUMBER_TARGET = ['invoice_number', 'invoicenumber'];
export const INVOICE_BOOKING_TARGET = ['booking_id', 'bookingid'];

const logger = new Logger('PrismaRetry');
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Widening random offset to add to a freshly read max+1 on retry.
 *
 * Without it every loser of a collision re-reads the same max and re-picks the
 * same number in lockstep, so only one writer can win per round and N concurrent
 * creates need N rounds. Scattering candidates over a widening window lets many
 * succeed per round. Attempt 1 returns 0, so uncontended allocation stays dense;
 * the gaps a retry leaves are harmless in an identifier.
 */
export function sequenceJitter(attempt: number): number {
  return attempt <= 1 ? 0 : Math.floor(Math.random() * 4 * (attempt - 1));
}

/**
 * Sequential numbers (BKG-…, INV-…) are allocated read-max-then-increment, so two
 * concurrent creates can pick the same one and the loser hits a unique constraint.
 * Re-runs `fn` when it fails with a P2002 on the given unique target, passing the
 * 1-based attempt number so the candidate can be spread out via sequenceJitter().
 *
 * `fn` MUST regenerate the candidate number inside itself, and MUST NOT have side
 * effects beyond the single (atomic) create it performs.
 */
export async function retryOnUniqueViolation<T>(
  fn: (attempt: number) => Promise<T>,
  opts: { tokens: string[]; label: string; attempts?: number },
): Promise<T> {
  const attempts = opts.attempts ?? 8;
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      const target = isUniqueViolation(err) ? normalisedTarget(err) : null;
      // Unparseable target ('') → treat as ours; the worst case is a 409 instead of a 500.
      const retryable =
        target !== null && (target === '' || opts.tokens.some((t) => target.includes(t)));
      if (!retryable) throw err;
      if (attempt >= attempts) {
        logger.error(`${opts.label}: gave up after ${attempts} attempts`);
        throw new ConflictException(`Could not allocate a unique ${opts.label}. Please try again.`);
      }
      logger.warn(`${opts.label}: unique collision (attempt ${attempt}), retrying`);
      await sleep(20 * attempt + Math.floor(Math.random() * 40));
    }
  }
}
