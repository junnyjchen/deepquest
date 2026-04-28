import { createClient } from '@supabase/supabase-js';

// 测试 Supabase 连接
const url = process.env.COZE_SUPABASE_URL || 'https://your-project.supabase.co';
const key = process.env.COZE_SUPABASE_ANON_KEY || 'your-anon-key';

console.log('Testing Supabase connection...');
console.log('URL:', url);
console.log('Key length:', key?.length || 0);

const supabase = createClient(url, key, {
  db: {
    schema: 'public',
  },
});

async function test() {
  try {
    const { data, error } = await supabase
      .from('deposits')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('Query error:', error);
    } else {
      console.log('Query result:', data);
    }
  } catch (e) {
    console.error('Exception:', e);
  }
}

test();
