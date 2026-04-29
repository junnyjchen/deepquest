import { createClient } from '@supabase/supabase-js';

const url = 'https://fwtswynuhbodlypdhghx.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3dHN3eW51aGJvZGx5cGRoZ2h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NDUxNDgsImV4cCI6MjA5MzAyMTE0OH0.7zRlvZ1rLhN8w7KcQa3dTqV4xS6pB8mWjL9nM2eY1kI';

const supabase = createClient(url, key, {
  db: { schema: 'public' },
});

async function test() {
  console.log('Testing Supabase connection...');
  
  // 测试 users 表
  const { data: users, error: usersErr } = await supabase
    .from('users')
    .select('count', { count: 'exact', head: true });
  console.log('users:', usersErr ? usersErr.message : 'OK, count=' + users);
  
  // 测试 deposits 表
  const { data: deposits, error: depErr } = await supabase
    .from('deposits')
    .select('count', { count: 'exact', head: true });
  console.log('deposits:', depErr ? depErr.message : 'OK, count=' + deposits);
}

test().catch(console.error);
