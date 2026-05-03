import { Router } from 'express';
import { supabase } from '../storage/database/supabase-client';
import { logOperation } from './logs';

const router = Router();

// 简单的管理员验证中间件（后续可扩展）
function verifyAdmin(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未授权，请先登录' });
  }
  // TODO: 验证 token
  next();
}

// 类型定义
interface ConfigItem {
  id: number;
  config_key: string;
  config_value: string;
  description?: string;
  updated_at?: string;
  updated_by?: string;
}

// 辅助函数：解析 map 格式的 config_value
function parseMapValue(value: string): any {
  if (!value) return null;
  try {
    const mapMatch = value.match(/^map\[(.*)\]$/);
    if (mapMatch) {
      const result: any = {};
      const content = mapMatch[1];
      const pairs = content.split(/,(?=(?:[^[\]]*\[[^\]]*\])*[^[\]]*$)/);
      for (const pair of pairs) {
        const colonIndex = pair.indexOf(':');
        if (colonIndex > 0) {
          const key = pair.substring(0, colonIndex).trim();
          let val = pair.substring(colonIndex + 1).trim();
          
          if (val.startsWith('map[')) {
            val = parseMapValue(val);
          } else if (val.startsWith('[') && val.endsWith(']')) {
            const arr = val.slice(1, -1).split(/\s+/).filter(v => v);
            val = arr as any;
          } else if (val.startsWith('{') && val.endsWith('}')) {
            const inner = val.replace(/^{|}$/g, '');
            const objPairs = inner.split(/\s+/);
            const obj: any = {};
            for (const objPair of objPairs) {
              const objColonIndex = objPair.indexOf(':');
              if (objColonIndex > 0) {
                obj[objPair.substring(0, objColonIndex).trim()] = objPair.substring(objColonIndex + 1).trim();
              }
            }
            val = obj;
          }
          
          result[key] = val;
        }
      }
      return result;
    }
    return value;
  } catch {
    return value;
  }
}

function parseConfigValue(value: any): any {
  if (!value) return value;
  
  // 如果已经是对象，直接返回
  if (typeof value === 'object' && value !== null) {
    return value;
  }
  
  // 如果是字符串，尝试解析 map[...] 格式
  if (typeof value === 'string' && value.startsWith('map[')) {
    return parseMapValue(value);
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return parseInt(value);
  }
  return value;
}

// 获取所有配置
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('contract_config')
      .select('*')
      .order('id');

    if (error) {
      if (error.code === '42P01') {
        return res.status(500).json({
          error: `❌ 数据表 'contract_config' 不存在！

请在 Supabase SQL Editor 执行以下 SQL 创建表：

CREATE TABLE contract_config (
    id BIGSERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by VARCHAR(100)
);

CREATE INDEX idx_contract_config_key ON contract_config(config_key);`
        });
      }
      if (error.code === '42501' || error.message?.includes('permission denied')) {
        return res.status(500).json({
          error: `❌ 数据库权限不足！

请在 Supabase SQL Editor 执行：
ALTER TABLE contract_config DISABLE ROW LEVEL SECURITY;
或
CREATE POLICY "public_read" ON contract_config FOR SELECT USING (true);`
        });
      }
      return res.status(500).json({ error: `获取配置失败: ${error.message}` });
    }

    const formatted = data?.map((item: ConfigItem) => ({
      id: item.id,
      key: item.config_key,
      value: parseConfigValue(item.config_value),
      rawValue: item.config_value,
      description: item.description,
      updatedAt: item.updated_at,
      updatedBy: item.updated_by
    })) || [];

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 获取单个配置
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { data, error } = await supabase
      .from('contract_config')
      .select('*')
      .eq('config_key', key)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: `配置 '${key}' 不存在` });
      }
      return res.status(500).json({ error: error.message });
    }

    const item = data as ConfigItem;
    res.json({
      id: item.id,
      key: item.config_key,
      value: parseConfigValue(item.config_value),
      rawValue: item.config_value,
      description: item.description,
      updatedAt: item.updated_at,
      updatedBy: item.updated_by
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 更新配置
router.put('/:key', verifyAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: '缺少 value 参数' });
    }

    // 检查配置是否可编辑
    const { data: existing } = await supabase
      .from('contract_config')
      .select('config_value')
      .eq('config_key', key)
      .single();

    if (existing) {
      const parsed = parseConfigValue(existing.config_value);
      if (parsed && typeof parsed === 'object' && parsed.editable === false) {
        return res.status(403).json({ error: `配置 '${key}' 为固定参数，不可修改` });
      }
    }

    // 格式化 value 为 map 格式存储
    let formattedValue = value;
    if (typeof value === 'object') {
      const pairs = Object.entries(value)
        .map(([k, v]) => `${k}:${typeof v === 'string' ? v : JSON.stringify(v)}`)
        .join(' ');
      formattedValue = `map[${pairs}]`;
    }

    const { error } = await supabase
      .from('contract_config')
      .update({
        config_value: formattedValue,
        description: description || undefined,
        updated_at: new Date().toISOString()
      })
      .eq('config_key', key);

    if (error) {
      return res.status(500).json({ error: `更新失败: ${error.message}` });
    }

    await logOperation({
      adminId: (req as any).admin?.id,
      action: 'UPDATE_CONFIG',
      target: key,
      details: { value },
      ipAddress: req.ip
    });

    res.json({ success: true, message: '配置已更新' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 批量更新配置
router.post('/batch-update', verifyAdmin, async (req, res) => {
  try {
    const { configs } = req.body;

    if (!Array.isArray(configs)) {
      return res.status(400).json({ error: 'configs 必须是数组' });
    }

    const results = [];
    for (const config of configs) {
      const { key, value, description } = config;
      
      let formattedValue = value;
      if (typeof value === 'object') {
        const pairs = Object.entries(value)
          .map(([k, v]) => `${k}:${typeof v === 'string' ? v : JSON.stringify(v)}`)
          .join(' ');
        formattedValue = `map[${pairs}]`;
      }

      const { error } = await supabase
        .from('contract_config')
        .update({
          config_value: formattedValue,
          description: description || undefined,
          updated_at: new Date().toISOString()
        })
        .eq('config_key', key);

      results.push({ key, success: !error, error: error?.message });
    }

    await logOperation({
      adminId: (req as any).admin?.id,
      action: 'BATCH_UPDATE_CONFIG',
      target: 'multiple',
      details: { configs },
      ipAddress: req.ip
    });

    res.json({ success: true, results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
