import { getSupabaseClient } from '../storage/database/supabase-client';

const supabase = getSupabaseClient();

// 记录操作日志
export async function logOperation(params: {
  adminId?: number;
  adminAddress?: string;
  action: string;
  target?: string;
  details?: any;
  ipAddress?: string;
}) {
  const { data, error } = await supabase
    .from('operation_logs')
    .insert({
      admin_id: params.adminId,
      admin_address: params.adminAddress,
      action: params.action,
      target: params.target,
      details: params.details,
      ip_address: params.ipAddress,
    })
    .select()
    .single();
  
  if (error) throw new Error(`记录操作日志失败: ${error.message}`);
  return data;
}

// 获取操作日志列表
export async function getOperationLogs(params: {
  page?: number;
  pageSize?: number;
  adminId?: number;
  action?: string;
  startDate?: string;
  endDate?: string;
}) {
  const { page = 1, pageSize = 20, adminId, action, startDate, endDate } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  
  let query = supabase
    .from('operation_logs')
    .select('*', { count: 'exact' });
  
  if (adminId) {
    query = query.eq('admin_id', adminId);
  }
  
  if (action) {
    query = query.eq('action', action);
  }
  
  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  
  if (endDate) {
    query = query.lte('created_at', endDate);
  }
  
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);
  
  // 检测表不存在错误
  if (error) {
    if (error.message.includes('does not exist') || error.code === '42P01') {
      throw new Error(`❌ 数据表 'operation_logs' 不存在！\n\n请先在数据库中执行以下 SQL 创建表：\n\nCREATE TABLE IF NOT EXISTS operation_logs (\n    id BIGSERIAL PRIMARY KEY,\n    admin_id INTEGER REFERENCES admins(id),\n    admin_address VARCHAR(255),\n    action VARCHAR(100) NOT NULL,\n    target VARCHAR(255),\n    details TEXT,\n    ip_address VARCHAR(50),\n    created_at TIMESTAMP DEFAULT NOW()\n);\n\nCREATE INDEX IF NOT EXISTS idx_operation_logs_created_at ON operation_logs(created_at DESC);\nCREATE INDEX IF NOT EXISTS idx_operation_logs_admin_id ON operation_logs(admin_id);`);
    }
    throw new Error(`获取操作日志失败: ${error.message}`);
  }
  
  return {
    data,
    total: count || 0,
    page,
    pageSize,
  };
}
