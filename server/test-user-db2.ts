import { createClient } from '@supabase/supabase-js';

const url = 'https://pcgtwssbclordlnrvori.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZ3R3c3NibGNvcmRsbnJ2b3JpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4MjAyMTQsImV4cCI6MjA2MTM5NjIxNH0.LF8qO8p_PqJdAh6LJF2R5g';

const supabase = createClient(url, key, {
  db: {
    schema: 'public',
  },
});

async function test() {
  console.log('=== Testing Tables ===\n');
  
  const tables = ['users', 'deposits', 'withdrawals', 'partners', 'cards', 'admin_users'];
  
  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      console.log(`${table}:`);
      console.log(`  Error: ${error ? JSON.stringify(error) : 'none'}`);
      console.log(`  Count: ${count}`);
      console.log(`  Data: ${JSON.stringify(data)}`);
      console.log();
    } catch (err) {
      console.log(`${table}: ERROR - ${err.message}`);
      console.log();
    }
  }
  
  // 测试不带 head 参数
  console.log('=== Without head parameter ===\n');
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .limit(1);
  console.log('users (limit 1):', { data, error });
}

test();
