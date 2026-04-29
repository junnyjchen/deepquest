import { createClient } from '@supabase/supabase-js';

// 直接硬编码测试
const url = 'https://pcgtwssbclordlnrvori.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZ3R3c3NibGNvcmRsbnJ2b3JpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4MjAyMTQsImV4cCI6MjA2MTM5NjIxNH0.LF8qO8p_PqJdAh6LJF2R5g';

console.log('Testing with key starting:', key.substring(0, 30) + '...');

const supabase = createClient(url, key, {
  db: {
    schema: 'public',
  },
});

async function test() {
  // 测试 users 表
  console.log('\n1. Testing users table...');
  const { data: u1, error: e1 } = await supabase
    .from('users')
    .select('count', { count: 'exact', head: true });
  console.log('users error:', e1);
  console.log('users count:', u1);

  // 测试 deposits 表
  console.log('\n2. Testing deposits table...');
  const { data: d1, error: dErr } = await supabase
    .from('deposits')
    .select('count', { count: 'exact', head: true });
  console.log('deposits error:', dErr);
  console.log('deposits count:', d1);

  // 不带 head 参数测试
  console.log('\n3. Testing without head parameter...');
  const { data, error } = await supabase
    .from('deposits')
    .select('*')
    .limit(1);
  console.log('Full query error:', error);
  console.log('Full query data:', data ? '有数据' : '无数据');

  // 检查 RLS
  console.log('\n4. Testing RLS by using service role...');
  const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZ3R3c3NibGNvcmRsbnJ2b3JpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTgyMDIxNCwiZXhwIjoyMDYxMzk2MjE0fQ.svVPKjlSckeGU7WHaoBeRlF6Df1dQNG8uA5ZyVM4uf4';
  
  const adminSupabase = createClient(url, serviceKey, {
    db: {
      schema: 'public',
    },
  });
  
  const { data: adminData, error: adminErr } = await adminSupabase
    .from('deposits')
    .select('*')
    .limit(1);
  console.log('Admin query error:', adminErr);
  console.log('Admin query data:', adminData);
}

test().catch(console.error);
