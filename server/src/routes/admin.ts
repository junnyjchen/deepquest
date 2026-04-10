import { getSupabaseClient } from '../storage/database/supabase-client';

// 数据库客户端
const supabase = getSupabaseClient();

// 管理员登录
export async function adminLogin(username: string, password: string) {
  const { data, error } = await supabase
    .from('admins')
    .select('*')
    .eq('username', username)
    .eq('is_active', true)
    .maybeSingle();
  
  if (error) throw new Error(`登录失败: ${error.message}`);
  if (!data) throw new Error('用户名或密码错误');
  
  // 简单密码验证（生产环境应使用bcrypt）
  if (data.password_hash !== password) {
    throw new Error('用户名或密码错误');
  }
  
  // 更新最后登录时间
  await supabase
    .from('admins')
    .update({ last_login: new Date().toISOString() })
    .eq('id', data.id);
  
  return {
    id: data.id,
    username: data.username,
    role: data.role,
  };
}

// 创建管理员（仅超级管理员）
export async function createAdmin(username: string, password: string, role: string = 'admin') {
  const { data, error } = await supabase
    .from('admins')
    .insert({
      username,
      password_hash: password,
      role,
      is_active: true,
    })
    .select()
    .single();
  
  if (error) throw new Error(`创建管理员失败: ${error.message}`);
  return data;
}

// 获取管理员列表
export async function getAdmins() {
  const { data, error } = await supabase
    .from('admins')
    .select('id, username, role, is_active, created_at, last_login')
    .order('created_at', { ascending: false });
  
  if (error) throw new Error(`获取管理员列表失败: ${error.message}`);
  return data;
}
