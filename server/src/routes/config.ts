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
  
  // 如果是字符串，尝试多种解析方式
  if (typeof value === 'string') {
    // 尝试 JSON 解析（处理 {"key": "value"} 格式）
    try {
      const parsed = JSON.parse(value);
      return parsed;
    } catch {}
    
    // 尝试解析 map[...] 格式
    if (value.startsWith('map[')) {
      return parseMapValue(value);
    }
    
    // 尝试解析纯数字
    if (/^\d+$/.test(value)) {
      return parseInt(value);
    }
  }
  
  return value;
}

// 初始化默认配置
router.post('/init', async (req, res) => {
  try {
    // 检查是否已有数据
    const { data: existing } = await supabase
      .from('contract_config')
      .select('id')
      .limit(1);

    if (existing && existing.length > 0) {
      return res.json({ message: '配置已存在，无需初始化', count: existing.length });
    }

    const defaultConfigs = [
      { config_key: 'contract_address', config_value: '{"address": "0x1F45f166Dc74C0FAb7a1A5C3Eb1Ff2b0DA68c906"}', description: '主合约地址' },
      { config_key: 'dqtoken_address', config_value: '{"address": ""}', description: 'DQ代币地址' },
      { config_key: 'dqcard_address', config_value: '{"address": ""}', description: 'NFT卡牌地址' },
      { config_key: 'invest_min', config_value: '{"unit": "SOL", "value": "1", "editable": false}', description: '最小投资金额（固定）' },
      { config_key: 'invest_max_start', config_value: '{"unit": "SOL", "value": "10", "editable": true}', description: '初始最大投资金额' },
      { config_key: 'invest_max_step', config_value: '{"unit": "SOL", "value": "10", "editable": true}', description: '每阶段最大投资增加量' },
      { config_key: 'invest_max_final', config_value: '{"unit": "SOL", "value": "200", "editable": true}', description: '最终最大投资金额' },
      { config_key: 'phase_duration', config_value: '{"unit": "days", "value": "15", "editable": true}', description: '每阶段持续天数' },
      { config_key: 'level_thresholds', config_value: '{"labels": ["S1", "S2", "S3", "S4", "S5", "S6"], "rewards": [5, 10, 15, 20, 25, 30], "thresholds": [100, 200, 600, 2000, 6000, 20000], "editable": false}', description: '等级晋级门槛' },
      { config_key: 'd_level_thresholds', config_value: '{"labels": ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"], "thresholds": [30, 120, 360, 1000, 4000, 10000, 15000, 30000], "editable": false}', description: 'D级门槛' },
      { config_key: 'card_config', config_value: '{"cards": {"A": {"price": 500, "total": 1000, "remaining": 1000, "unit": "USDT", "reward_weight": 4}, "B": {"price": 1500, "total": 500, "remaining": 500, "unit": "USDT", "reward_weight": 5}, "C": {"price": 5000, "total": 100, "remaining": 100, "unit": "USDT", "reward_weight": 6}}, "requirements": {"A": 5, "B": 10, "C": 20}, "editable": false}', description: 'NFT卡牌配置' },
      { config_key: 'partner_requirements', config_value: '{"first_phase": {"direct_sales": 30000, "personal_invest": 5000}, "second_phase": {"direct_sales": 50000, "personal_invest": 5000}, "total_limit": 50, "editable": true}', description: '合伙人资格要求' },
      { config_key: 'stake_config', config_value: '{"periods": [30, 90, 180, 360], "rates": [5, 10, 15, 20], "unit": "days", "editable": false}', description: '质押配置' },
      { config_key: 'reward_distribution', config_value: '{"deposit_split": {"dynamic": 50, "lp": 50}, "dynamic_split": {"dao": 10, "direct": 30, "insurance": 7, "management": 30, "node": 15, "operation": 8}, "editable": false}', description: '奖励分配比例' },
      { config_key: 'withdraw_fee', config_value: '{"rate": 10, "split": {"foundation": 30, "nft": 40, "partner": 30}, "editable": false}', description: '提现手续费' },
      { config_key: 'lp_remove_fee', config_value: '{"rules": [{"days": "<60", "rate": 20}, {"days": "60-180", "rate": 10}, {"days": ">180", "rate": 0}], "editable": false}', description: 'LP赎回手续费规则' },
    ];

    const { error } = await supabase.from('contract_config').insert(defaultConfigs);

    if (error) {
      return res.status(500).json({ error: `初始化失败: ${error.message}` });
    }

    res.json({ message: '配置初始化成功', count: defaultConfigs.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

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
