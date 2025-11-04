import postgres from 'postgres';
import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  Revenue,
} from './definitions';
import { formatCurrency } from './utils';

const sql = postgres(process.env.DATABASE_URL!, { ssl: false });

export async function fetchRevenue() {
  try {
    // Artificially delay a response for demo purposes.
    // Don't do this in production :)

    // console.log('Fetching revenue data...');
    // await new Promise((resolve) => setTimeout(resolve, 3000));

    const data = await sql<Revenue[]>`SELECT * FROM "Revenue"`;

    // console.log('Data fetch completed after 3 seconds.');

    return data;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

export async function fetchLatestInvoices() {
  try {
    const data = await sql<LatestInvoiceRaw[]>`
      SELECT "Invoice".amount, "Customer".name, "Customer".image_url, "Customer".email, "Invoice".id
      FROM "Invoice"
      JOIN "Customer" ON "Invoice".Customer_id = "Customer".id
      ORDER BY "Invoice".date DESC
      LIMIT 5`;

    const latestInvoices = data.map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
    return latestInvoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}

export async function fetchCardData() {
  try {
    // You can probably combine these into a single SQL query
    // However, we are intentionally splitting them to demonstrate
    // how to initialize multiple queries in parallel with JS.
    const invoiceCountPromise = sql`SELECT COUNT(*) FROM "Invoice" `;
    const customerCountPromise = sql`SELECT COUNT(*) FROM "Customer" `;
    const invoiceStatusPromise = sql`SELECT
         SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
         SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
         FROM "Invoice"`;

    const data = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoiceStatusPromise,
    ]);

    const numberOfInvoices = Number(data[0][0].count ?? '0');
    const numberOfCustomers = Number(data[1][0].count ?? '0');
    const totalPaidInvoices = formatCurrency(data[2][0].paid ?? '0');
    const totalPendingInvoices = formatCurrency(data[2][0].pending ?? '0');

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;
  //to avoid crashing caused query = null or undefined
  const safeQuery = query?.trim();

  try {
    const invoices = await sql<InvoicesTable[]>`
      SELECT
        "Invoice".id,
        "Invoice".amount,
        "Invoice".date,
        "Invoice".status,
        "Customer".name,
        "Customer".email,
        "Customer".image_url
      FROM "Invoice"
      JOIN "Customer" ON "Invoice".Customer_id = "Customer".id
      WHERE
        "Customer".name ILIKE ${`%${safeQuery}%`} OR
        "Customer".email ILIKE ${`%${safeQuery}%`} OR
        "Invoice".amount::text ILIKE ${`%${safeQuery}%`} OR
        "Invoice".date::text ILIKE ${`%${safeQuery}%`} OR
        "Invoice".status ILIKE ${`%${safeQuery}%`}
      ORDER BY "Invoice".date DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    `;

    return invoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

export async function fetchInvoicesPages(query: string) {
  try {
    const data = await sql`SELECT COUNT(*)
    FROM "Invoice"
    JOIN "Customer" ON "Invoice".Customer_id = "Customer".id
    WHERE
      "Customer".name ILIKE ${`%${query}%`} OR
      "Customer".email ILIKE ${`%${query}%`} OR
      "Invoice".amount::text ILIKE ${`%${query}%`} OR
      "Invoice".date::text ILIKE ${`%${query}%`} OR
      "Invoice".status ILIKE ${`%${query}%`}
  `;

    const totalPages = Math.ceil(Number(data[0].count) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}

export async function fetchInvoiceById(id: string) {
  try {
    const data = await sql<InvoiceForm[]>`
      SELECT
        "Invoice".id,
        "Invoice".customer_id,
        "Invoice".amount,
        "Invoice".status
      FROM "Invoice"
      WHERE "Invoice".id = ${id};
    `;

    const invoice = data.map((invoice) => ({
      ...invoice,
      // Convert amount from cents to dollars
      amount: invoice.amount / 100,
    }));

    return invoice[0];
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}

export async function fetchCustomers() {
  try {
    const customers = await sql<CustomerField[]>`
      SELECT
        id,
        name
      FROM "Customers"
      ORDER BY name ASC
    `;

    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}

export async function fetchFilteredCustomers(query: string) {
  try {
    const data = await sql<CustomersTableType[]>`
		SELECT
		  "Customer".id,
		  "Customer".name,
		  "Customer".email,
		  "Customer".image_url,
		  COUNT("Invoice".id) AS total_invoices,
		  SUM(CASE WHEN "Invoice".status = 'pending' THEN "Invoice".amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN "Invoice".status = 'paid' THEN "Invoice".amount ELSE 0 END) AS total_paid
		FROM "Customer"
		LEFT JOIN "Invoice" ON "Customers".id = "Invoice".Customer_id
		WHERE
		  "Customer".name ILIKE ${`%${query}%`} OR
        "Customer".email ILIKE ${`%${query}%`}
		GROUP BY "Customer".id, "Customer".name, "Customer".email, "Customer".image_url
		ORDER BY Customer.name ASC
	  `;

    const customers = data.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer table.');
  }
}
