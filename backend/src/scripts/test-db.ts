import { query } from '../config/db';

async function testConnection() {
  try {
    const res = await query('SELECT NOW()');
    console.log('Database connected successfully:', res.rows[0].now);
    
    // Test if tables exist
    const tablesRes = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('Available tables:');
    tablesRes.rows.forEach(row => console.log(`- ${row.table_name}`));
    
    process.exit(0);
  } catch (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
}

testConnection();
