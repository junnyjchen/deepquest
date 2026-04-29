import { createClient } from '@supabase/supabase-js';

const url = 'https://fwtswynuhbodlypdhghx.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3dHN3eW51aGJvZGx5cGRoZ2h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NDUxNDgsImV4cCI6MjA5MzAyMTE0OH0.7zRlvZ1rLhN8w7KcQa3dTqV4xS6pB8mWjL9nM2eY1kI';

const supabase = createClient(url, key, {
  db: { schema: 'public' },
});

async function test() {
  // 不带 head 参数
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .limit(1);
    
  console.log('users (limit 1):', JSON.stringify({ data, error }));
  
  // 直接插入测试数据
  const { data: insertData, error: insertErr } = await supabase
    .from('users')
    .insert({
      wallet_address: '0xTest123456789',
      referrer_address: null,
      direct_count: 0,
      level: 0,
      total_invest: '0',
      team_invest: '0',
      energy: '0',
      lp_shares: '0',
      pending_rewards: '0',
      direct_sales: '0',
      d_level: 0,
      qualified_lines: 0,
      is_node_qualified: false,
      highest_card_type: 0,
      is_partner: false,
      is_restricted: false
    })
    .select();
    
  console.log('insert:', JSON.stringify({ insertData, insertErr }));
}

test().then(() => console.log('Done')).catch(e => console.error('Error:', e));
