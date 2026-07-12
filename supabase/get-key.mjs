import pg from 'pg';

const client = new pg.Client({
  connectionString: 'postgresql://postgres:Sudarsan123456%23@db.fmoquxhkfgekusbvhigz.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  
  // Try to get the JWT secret and generate/find the anon key
  const queries = [
    `SELECT current_setting('app.settings.jwt_secret', true) as jwt_secret`,
    `SELECT current_setting('request.jwt.claims', true) as claims`,
    `SELECT name, decrypted_secret FROM vault.decrypted_secrets LIMIT 10`,
    `SELECT * FROM supabase_functions.secrets LIMIT 10`,
  ];
  
  for (const q of queries) {
    try {
      const res = await client.query(q);
      if (res.rows.length > 0) {
        console.log(`Query: ${q.slice(0, 60)}...`);
        console.log('Result:', JSON.stringify(res.rows, null, 2));
        console.log('---');
      }
    } catch (e) {
      // skip
    }
  }
  
  await client.end();
}

run();
