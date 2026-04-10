import { Router } from 'express';
import type { Request, Response } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';

const supabase = getSupabaseClient();

// 创建节点申请
export async function createNodeApplication(data: {
  user_address: string;
  user_name?: string;
  apply_type: string;
  apply_reason?: string;
  contact_info?: string;
  total_invest?: string;
  team_size?: number;
  attachment_url?: string;
}) {
  const { data: result, error } = await supabase
    .from('node_applications')
    .insert({
      user_address: data.user_address,
      user_name: data.user_name,
      apply_type: data.apply_type,
      apply_reason: data.apply_reason,
      contact_info: data.contact_info,
      total_invest: data.total_invest || '0',
      team_size: data.team_size || 0,
      attachment_url: data.attachment_url,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return result;
}

// 获取节点申请列表
export async function getNodeApplications(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  apply_type?: string;
  user_address?: string;
  startDate?: string;
  endDate?: string;
}) {
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('node_applications')
    .select('*', { count: 'exact' });

  // 筛选条件
  if (params.status) {
    query = query.eq('status', params.status);
  }
  if (params.apply_type) {
    query = query.eq('apply_type', params.apply_type);
  }
  if (params.user_address) {
    query = query.eq('user_address', params.user_address);
  }
  if (params.startDate) {
    query = query.gte('created_at', params.startDate);
  }
  if (params.endDate) {
    query = query.lte('created_at', params.endDate);
  }

  // 按时间倒序
  query = query.order('created_at', { ascending: false });

  // 分页
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    data: data || [],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

// 获取申请详情
export async function getNodeApplicationById(id: number) {
  const { data, error } = await supabase
    .from('node_applications')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// 审核节点申请
export async function reviewNodeApplication(
  id: number,
  status: 'approved' | 'rejected',
  reviewerId: number,
  reviewerNotes?: string
) {
  const { data, error } = await supabase
    .from('node_applications')
    .update({
      status,
      reviewer_id: reviewerId,
      reviewer_notes: reviewerNotes,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 获取统计数据
export async function getNodeApplicationStats() {
  // 待审核数量
  const { count: pending } = await supabase
    .from('node_applications')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  // 已通过数量
  const { count: approved } = await supabase
    .from('node_applications')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved');

  // 已拒绝数量
  const { count: rejected } = await supabase
    .from('node_applications')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'rejected');

  // 按类型统计
  const { data: byType } = await supabase
    .from('node_applications')
    .select('apply_type, status')
    .order('created_at', { ascending: false })
    .limit(100);

  const typeStats: Record<string, Record<string, number>> = {};
  if (byType) {
    for (const item of byType) {
      if (!typeStats[item.apply_type]) {
        typeStats[item.apply_type] = { pending: 0, approved: 0, rejected: 0 };
      }
      if (typeStats[item.apply_type][item.status] !== undefined) {
        typeStats[item.apply_type][item.status]++;
      }
    }
  }

  return {
    pending: pending || 0,
    approved: approved || 0,
    rejected: rejected || 0,
    total: (pending || 0) + (approved || 0) + (rejected || 0),
    byType: typeStats,
  };
}

// 创建 Express 路由
const router = Router();

// GET /api/v1/node-applications - 获取申请列表
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, pageSize, status, apply_type, user_address, startDate, endDate } = req.query;
    
    const result = await getNodeApplications({
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 20,
      status: status as string,
      apply_type: apply_type as string,
      user_address: user_address as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error fetching node applications:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/node-applications/stats - 获取统计数据
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await getNodeApplicationStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Error fetching node application stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/node-applications/:id - 获取申请详情
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const application = await getNodeApplicationById(parseInt(id));
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json(application);
  } catch (error: any) {
    console.error('Error fetching node application:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/v1/node-applications - 创建申请
router.post('/', async (req: Request, res: Response) => {
  try {
    const { user_address, user_name, apply_type, apply_reason, contact_info, total_invest, team_size, attachment_url } = req.body;

    if (!user_address || !apply_type) {
      return res.status(400).json({ error: 'Missing required fields: user_address and apply_type are required' });
    }

    const application = await createNodeApplication({
      user_address,
      user_name,
      apply_type,
      apply_reason,
      contact_info,
      total_invest,
      team_size,
      attachment_url,
    });

    res.status(201).json(application);
  } catch (error: any) {
    console.error('Error creating node application:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/v1/node-applications/:id/review - 审核申请
router.put('/:id/review', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status, reviewer_id, reviewer_notes } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "approved" or "rejected"' });
    }

    const application = await reviewNodeApplication(
      parseInt(id),
      status,
      reviewer_id || 1,
      reviewer_notes
    );

    res.json(application);
  } catch (error: any) {
    console.error('Error reviewing node application:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
