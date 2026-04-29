import { createClient } from '@supabase/supabase-js';

const url = 'https://fwtswynuhbodlypdhghx.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3dHN3eW51aGJvZGx5cGRoZ2h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NDUxNDgsImV4cCI6MjA5MzAyMTE0OH0.7zRlvZ1rLhN8w7KcQa3dTqV4xS6pB8mWjL9nM2eY1kI';

const supabase = createClient(url, key, {
  db: { schema: 'public' },
});

async function test() {
  console.log('Testing...');
  
  const { data, error, count } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });
    
  console.log('Result:', JSON.stringify({ data, error, count }));
}

test().then(() => console.log('Done')).catch(e => console.error('Error:', e));
