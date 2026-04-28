import { createClient } from '@supabase/supabase-js';

const url = 'https://br-dear-deer-4238dd23.supabase2.aidap-global.cn-beijing.volces.com';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjMzNTYzMjE1MjgsInJvbGUiOiJhbm9uIn0.svVPKjlSckeGU7WHaoBeRlF6Df1dQNG8uA5ZyVM4uf4';

console.log('Testing Supabase connection...');

const supabase = createClient(url, key, {
  db: {
    schema: 'public',
  },
});

async function test() {
  try {
    const { data, error, count } = await supabase
      .from('deposits')
      .select('*', { count: 'exact', head: true });
    
    console.log('Error:', error);
    console.log('Data:', data);
    console.log('Count:', count);
    
    // 也测试直接查询
    const { data: data2, error: error2 } = await supabase
      .from('deposits')
      .select('id');
    
    console.log('Full query - Error:', error2);
    console.log('Full query - Data:', data2);
  } catch (e) {
    console.error('Exception:', e);
  }
}

test();
