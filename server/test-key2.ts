import { createClient } from '@supabase/supabase-js';

const url = 'https://fwtswynuhbodlypdhghx.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3dHN3eW51aGJvZGx5cGRoZ2h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NDUxNDgsImV4cCI6MjA5MzAyMTE0OH0.7zRlvZ1rLhN8w7KcQa3dTqV4xS6pB8mWjL9nM2eY1kI';

console.log('Testing...');

const supabase = createClient(url, key, {
  db: { schema: 'public' },
});

async function test() {
  // 直接查询所有数据
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .limit(5);
    
  console.log('users:', JSON.stringify({ data, error }));
  
  // 测试插入
  const { data: insertData, error: insertErr } = await supabase
    .from('users')
    .insert({
      wallet_address: '0xTest001',
      direct_count: 0,
      level: 0,
      total_invest: '0',
      is_restricted: false
    })
    .select();
    
  console.log('insert:', JSON.stringify({ insertData, insertErr }));
}

test().then(() => console.log('Done')).catch(e => console.error('Error:', e));
