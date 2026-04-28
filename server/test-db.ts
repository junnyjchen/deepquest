import 'dotenv/config';
import { getSupabaseClient } from './src/storage/database/supabase-client.ts';

async function test() {
  try {
    const supabase = getSupabaseClient();
    console.log('Supabase client created');
    
    const { data, error } = await supabase
      .from('deposits')
      .select('count', { count: 'exact', head: true });
    
    console.log('Error:', error);
    console.log('Count:', data);
  } catch (e) {
    console.error('Exception:', e);
  }
}

test();
