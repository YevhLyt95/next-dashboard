import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);

async function testConnection() {
    try {
        const result = await sql`SELECT current_user`;
        console.log('✅ Connected as:', result[0].current_user);
    } catch (err) {
        console.error('❌ Connection failed:', err);
    }
    console.log('DATABASE_URL:', process.env.DATABASE_URL);
}

testConnection();