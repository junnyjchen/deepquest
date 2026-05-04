import { supabase } from '../storage/database/supabase-client';
import { logOperation } from '../routes/logs';

// 简单的管理员验证中间件
function verifyAdmin(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未授权，请先登录' });
  }
  // TODO: 验证 token
  next();
}

// Token 验证中间件（提取并验证 JWT token）
function verifyAdminToken(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未授权，请先登录' });
  }
  const token = authHeader.substring(7);
  // TODO: 验证 JWT token
  (req as any).adminToken = token;
  next();
}

export { supabase, verifyAdmin, verifyAdminToken };
