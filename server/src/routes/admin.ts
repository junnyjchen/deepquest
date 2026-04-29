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

// 初始化默认管理员（如果不存在）
export async function initDefaultAdmin() {
  // 检查是否已存在管理员
  const { data: existingAdmins, error: checkError } = await supabase
    .from('admins')
    .select('id')
    .limit(1);
  
  if (checkError) {
    console.error('[Admin] 检查管理员失败:', checkError.message);
    return null;
  }
  
  // 如果已存在管理员，不创建默认账户
  if (existingAdmins && existingAdmins.length > 0) {
    console.log('[Admin] 管理员已存在，跳过初始化');
    return null;
  }
  
  // 创建默认管理员
  const defaultUsername = process.env.ADMIN_USERNAME || 'admin';
  const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';
  
  const { data, error } = await supabase
    .from('admins')
    .insert({
      username: defaultUsername,
      password_hash: defaultPassword,
      role: 'super_admin',
      is_active: true,
    })
    .select()
    .single();
  
  if (error) {
    console.error('[Admin] 初始化默认管理员失败:', error.message);
    return null;
  }
  
  console.log(`[Admin] 默认管理员已创建: ${defaultUsername} / ${defaultPassword}`);
  return data;
}
