import { createClient } from '@supabase/supabase-js';

const url = 'https://pcgtwssbclordlnrvori.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZ3R3c3NibGNvcmRsbnJ2b3JpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4MjAyMTQsImV4cCI6MjA2MTM5NjIxNH0.LF8qO8p_PqJdAh6LJF2R5g';

// 直接硬编码测试
const supabase = createClient(url, key, {
  db: {
    schema: 'public',
  },
});

async function test() {
  console.log('Testing connection to:', url);
  
  try {
    // 测试 deposits 表
    const { data: d1, error: e1 } = await supabase
      .from('deposits')
      .select('count', { count: 'exact', head: true });
    console.log('deposits - Error:', e1);
    console.log('deposits - Count:', d1);
    
    // 测试 users 表
    const { data: d2, error: e2 } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });
    console.log('users - Error:', e2);
    console.log('users - Count:', d2);
    
  } catch (err) {
    console.error('Exception:', err);
  }
}

test();
