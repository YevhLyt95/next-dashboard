import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';
import { users, customers, invoices, revenue } from './app/lib/placeholder-data';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...');
    console.log('🔗 DATABASE_URL:', process.env.DATABASE_URL);

    // Users
    await prisma.user.createMany({
        data: users as Prisma.UserCreateManyInput[],
        skipDuplicates: true,
    });
    console.log(`👤 Seeded ${users.length} users`);

    // Customers
    await prisma.customer.createMany({
        data: customers as Prisma.CustomerCreateManyInput[],
        skipDuplicates: true,
    });
    console.log(`🏢 Seeded ${customers.length} customers`);

    //seed invoices with date conversion
    const typedInvoices: Prisma.InvoiceCreateManyInput[] = invoices.map(
        (invoice): Prisma.InvoiceCreateManyInput => ({
            ...invoice,
            date: new Date(invoice.date),
        })
    );

    // Invoices
    await prisma.invoice.createMany({
        data: typedInvoices,
    });
    console.log(`📄 Seeded ${invoices.length} invoices`);

    // Revenue
    await prisma.revenue.createMany({
        data: revenue as Prisma.RevenueCreateManyInput[],
    });
    console.log(`💰 Seeded ${revenue.length} revenue records`);
}

main()
    .then(() => {
        console.log('✅ Seeding complete');
    })
    .catch((error) => {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    })
    .finally(() => {
        prisma.$disconnect();
    });