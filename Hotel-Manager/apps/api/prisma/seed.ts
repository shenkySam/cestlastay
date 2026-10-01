import { PrismaClient } from '@prisma/client';
import { SYSTEM_USER_EMAIL } from '../src/common/system-user';

const prisma = new PrismaClient();

// Sign-in is Google / Apple only, matched by email — set this to the Google or
// Apple account you'll sign in with to get an admin login on a fresh database.
const ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL || 'admin@hotel.com').trim().toLowerCase();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Room categories ─────────────────────────────────────────────────────────
  const categories = await Promise.all([
    prisma.roomCategory.upsert({
      where: { name: 'Standard Single' },
      update: {},
      create: {
        name: 'Standard Single',
        type: 'SINGLE',
        description: 'Cozy room for solo travelers',
        basePrice: 80,
        maxOccupancy: 1,
        amenities: ['WiFi', 'TV', 'AC', 'Hot Water'],
        images: [],
      },
    }),
    prisma.roomCategory.upsert({
      where: { name: 'Deluxe Double' },
      update: {},
      create: {
        name: 'Deluxe Double',
        type: 'DOUBLE',
        description: 'Spacious room with king bed',
        basePrice: 150,
        maxOccupancy: 2,
        amenities: ['WiFi', 'TV', 'AC', 'Minibar', 'Hot Water', 'Balcony'],
        images: [],
      },
    }),
    prisma.roomCategory.upsert({
      where: { name: 'Executive Suite' },
      update: {},
      create: {
        name: 'Executive Suite',
        type: 'SUITE',
        description: 'Luxury suite with separate living area',
        basePrice: 300,
        maxOccupancy: 3,
        amenities: ['WiFi', 'TV', 'AC', 'Minibar', 'Hot Tub', 'Lounge', 'Room Service'],
        images: [],
      },
    }),
  ]);

  console.log(`✅ Created ${categories.length} room categories`);

  // ── Rooms ────────────────────────────────────────────────────────────────────
  const [single, deluxe, suite] = categories;

  const roomsData = [
    { roomNumber: '101', categoryId: single.id, floor: 1, status: 'AVAILABLE' },
    { roomNumber: '102', categoryId: single.id, floor: 1, status: 'AVAILABLE' },
    { roomNumber: '201', categoryId: deluxe.id, floor: 2, status: 'AVAILABLE' },
    { roomNumber: '202', categoryId: deluxe.id, floor: 2, status: 'OCCUPIED' },
    { roomNumber: '203', categoryId: deluxe.id, floor: 2, status: 'CLEANING' },
    { roomNumber: '301', categoryId: suite.id, floor: 3, status: 'AVAILABLE' },
    { roomNumber: '302', categoryId: suite.id, floor: 3, status: 'MAINTENANCE' },
  ] as const;

  for (const r of roomsData) {
    await prisma.room.upsert({
      where: { roomNumber: r.roomNumber },
      update: {},
      create: r,
    });
  }

  console.log(`✅ Created ${roomsData.length} rooms`);

  // ── Admin user ───────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      email: ADMIN_EMAIL,
      firstName: 'Hotel',
      lastName: 'Admin',
      phone: '+1000000001',
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
    },
  });

  console.log(`✅ Admin: ${admin.email}`);

  // ── System user (creator for public / self-service bookings) ───────────────────
  await prisma.user.upsert({
    where: { email: SYSTEM_USER_EMAIL },
    update: {},
    create: {
      // Non-interactive account — AuthService refuses to sign it in.
      email: SYSTEM_USER_EMAIL,
      firstName: 'Online',
      lastName: 'Bookings',
      role: 'STAFF',
      status: 'ACTIVE',
      emailVerified: true,
    },
  });

  console.log(`✅ System: ${SYSTEM_USER_EMAIL} (online-booking creator)`);

  // ── Staff user ────────────────────────────────────────────────────────────────
  const staffUser = await prisma.user.upsert({
    where: { email: 'staff@hotel.com' },
    update: {},
    create: {
      email: 'staff@hotel.com',
      firstName: 'Front',
      lastName: 'Desk',
      phone: '+1000000002',
      role: 'STAFF',
      status: 'ACTIVE',
      emailVerified: true,
    },
  });

  await prisma.staff.upsert({
    where: { userId: staffUser.id },
    update: {},
    create: {
      userId: staffUser.id,
      employeeId: 'EMP001',
      department: 'Front Desk',
      position: 'Receptionist',
      hireDate: new Date('2024-01-15'),
    },
  });

  console.log(`✅ Staff: ${staffUser.email}`);

  // ── Housekeeping staff ────────────────────────────────────────────────────────
  const hkUser = await prisma.user.upsert({
    where: { email: 'housekeeping@hotel.com' },
    update: {},
    create: {
      email: 'housekeeping@hotel.com',
      firstName: 'Maria',
      lastName: 'Santos',
      phone: '+1000000003',
      role: 'STAFF',
      status: 'ACTIVE',
      emailVerified: true,
    },
  });

  await prisma.staff.upsert({
    where: { userId: hkUser.id },
    update: {},
    create: {
      userId: hkUser.id,
      employeeId: 'EMP002',
      department: 'Housekeeping',
      position: 'Housekeeper',
      hireDate: new Date('2024-03-01'),
    },
  });

  // ── Guest user ────────────────────────────────────────────────────────────────
  const guestUser = await prisma.user.upsert({
    where: { email: 'guest@hotel.com' },
    update: {},
    create: {
      email: 'guest@hotel.com',
      firstName: 'John',
      lastName: 'Smith',
      phone: '+1000000010',
      role: 'GUEST',
      status: 'ACTIVE',
      emailVerified: true,
    },
  });

  const guestProfile = await prisma.guest.upsert({
    where: { userId: guestUser.id },
    update: {},
    create: {
      userId: guestUser.id,
      firstName: 'John',
      lastName: 'Smith',
      email: 'guest@hotel.com',
      phone: '+1000000010',
      city: 'New York',
      country: 'USA',
      loyaltyPoints: 150,
      loyaltyTier: 'Silver',
    },
  });

  console.log(`✅ Guest: ${guestUser.email}`);

  // ── Sample booking ────────────────────────────────────────────────────────────
  const room201 = await prisma.room.findUnique({ where: { roomNumber: '201' } });
  if (room201) {
    const booking = await prisma.booking.upsert({
      where: { bookingNumber: 'BKG-20260501-0001' },
      update: {},
      create: {
        bookingNumber: 'BKG-20260501-0001',
        guestId: guestProfile.id,
        checkInDate: new Date('2026-05-01'),
        checkOutDate: new Date('2026-05-05'),
        numberOfGuests: 2,
        status: 'CONFIRMED',
        source: 'DIRECT',
        totalAmount: 600,
        createdById: admin.id,
        rooms: {
          create: [{ roomId: room201.id, roomRate: 150 }],
        },
      },
    });

    // Create invoice for the booking
    await prisma.invoice.upsert({
      where: { bookingId: booking.id },
      update: {},
      create: {
        invoiceNumber: 'INV-20260501-0001',
        bookingId: booking.id,
        status: 'DRAFT',
        subtotal: 600,
        taxAmount: 60,
        discountAmount: 0,
        totalAmount: 660,
        paidAmount: 0,
        balanceDue: 660,
        dueDate: new Date('2026-05-05'),
        items: {
          create: {
            description: 'Deluxe Double — 4 nights',
            quantity: 4,
            unitPrice: 150,
            totalPrice: 600,
          },
        },
      },
    });

    console.log(`✅ Sample booking: ${booking.bookingNumber}`);
  }

  console.log('\n🎉 Seed complete!\n');
  console.log(`Admin sign-in: Google / Apple account ${ADMIN_EMAIL}`);
  if (!process.env.SEED_ADMIN_EMAIL) {
    console.log('  (set SEED_ADMIN_EMAIL to your own Google / Apple email to be able to sign in)');
  }
  console.log('\nGuest Portal: bookingNumber=BKG-20260501-0001, lastName=Smith');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => prisma.$disconnect());
