import pg from 'pg';
import { readFileSync } from 'fs';

const client = new pg.Client({
  connectionString: 'postgresql://postgres:Sudarsan123456%23@db.fmoquxhkfgekusbvhigz.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('Connected to database');
  
  const sql = readFileSync('./supabase/schema.sql', 'utf8');
  
  try {
    await client.query(sql);
    console.log('Schema applied successfully!');
  } catch (err) {
    console.error('Error applying schema:', err.message);
    if (err.detail) console.error('Detail:', err.detail);
  } finally {
    await client.end();
  }
}

run();
