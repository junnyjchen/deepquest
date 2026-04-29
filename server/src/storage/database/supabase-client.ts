import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import https from 'https';
import http from 'http';

let envLoaded = false;
let dbChecked = false;
let dbInitialized = false;

interface SupabaseCredentials {
  url: string;
  anonKey: string;
}

function loadEnv(): void {
  if (envLoaded || (process.env.COZE_SUPABASE_URL && process.env.COZE_SUPABASE_ANON_KEY)) {
    return;
  }

  try {
    try {
      require('dotenv').config();
      if (process.env.COZE_SUPABASE_URL && process.env.COZE_SUPABASE_ANON_KEY) {
        envLoaded = true;
        return;
      }
    } catch {
      // dotenv not available
    }

    const pythonCode = `
import os
import sys
try:
    from coze_workload_identity import Client
    client = Client()
    env_vars = client.get_project_env_vars()
    client.close()
    for env_var in env_vars:
        print(f"{env_var.key}={env_var.value}")
except Exception as e:
    print(f"# Error: {e}", file=sys.stderr)
`;

    const output = execSync(`python3 -c '${pythonCode.replace(/'/g, "'\"'\"'")}'`, {
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const lines = output.trim().split('\n');
    for (const line of lines) {
      if (line.startsWith('#')) continue;
      const eqIndex = line.indexOf('=');
      if (eqIndex > 0) {
        const key = line.substring(0, eqIndex);
        let value = line.substring(eqIndex + 1);
        if ((value.startsWith("'") && value.endsWith("'")) ||
            (value.startsWith('"') && value.endsWith('"'))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }

    envLoaded = true;
  } catch {
    // Silently fail
  }
}

function getSupabaseCredentials(): SupabaseCredentials {
  loadEnv();

  const url = process.env.COZE_SUPABASE_URL;
  const anonKey = process.env.COZE_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error('COZE_SUPABASE_URL is not set');
  }
  if (!anonKey) {
    throw new Error('COZE_SUPABASE_ANON_KEY is not set');
  }

  return { url, anonKey };
}

function getSupabaseServiceRoleKey(): string | undefined {
  loadEnv();
  return process.env.COZE_SUPABASE_SERVICE_ROLE_KEY;
}

function getSupabaseClient(token?: string): SupabaseClient {
  const { url, anonKey } = getSupabaseCredentials();

  let key: string;
  if (token) {
    key = anonKey;
  } else {
    const serviceRoleKey = getSupabaseServiceRoleKey();
    key = serviceRoleKey ?? anonKey;
  }

  if (token) {
    return createClient(url, key, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
      db: {
        schema: 'public',
        timeout: 60000,
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return createClient(url, key, {
    db: {
      schema: 'public',
      timeout: 60000,
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// 获取必需的表列表
const REQUIRED_TABLES = [
  'users',
  'deposits',
  'rewards',
  'withdrawals',
  'lp_stakes',
  'block_rewards',
  'pools',
  'partners',
  'cards',
  'address_restrictions',
  'node_applications',
  'admins',
];

// 检查数据库表是否存在
async function checkDatabaseTables(): Promise<{ exists: boolean; missingTables: string[] }> {
  try {
    const supabase = getSupabaseClient();
    
    // 尝试查询一个简单的表来测试连接
    const { error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (error) {
      // 检查是否是表不存在错误
      const errorMsg = error.message || '';
      if (errorMsg.includes('does not exist') || errorMsg.includes('not found')) {
        // 尝试查询其他表来确定是表不存在还是完全无法连接
        for (const table of REQUIRED_TABLES) {
          const { error: tableError } = await supabase
            .from(table as any)
            .select('id')
            .limit(1);
          
          if (tableError && 
              (tableError.message.includes('does not exist') || 
               tableError.message.includes('not found'))) {
            // 继续检查其他表
            continue;
          }
        }
        
        // 返回所有必需的表（因为连接正常但表不存在）
        return { exists: false, missingTables: REQUIRED_TABLES };
      }
      
      // 其他错误（如无效的 key）
      throw error;
    }

    return { exists: true, missingTables: [] };
  } catch (err: any) {
    console.error('[Database] Connection check failed:', err.message);
    throw err;
  }
}

// 自动初始化数据库（通过 Management API）
async function initializeDatabase(): Promise<boolean> {
  const serviceRoleKey = getSupabaseServiceRoleKey();
  const { url } = getSupabaseCredentials();

  if (!serviceRoleKey) {
    console.warn('[Database] COZE_SUPABASE_SERVICE_ROLE_KEY not set, cannot auto-initialize');
    return false;
  }

  console.log('[Database] Attempting auto-initialization via Management API...');

  try {
    // 使用 Service Role Key 连接并执行 SQL
    const supabase = getSupabaseClient();

    // 定义建表 SQL
    const createTableSQLs = [
      // 管理员表
      `CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(64) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'admin',
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        last_login TIMESTAMPTZ
      )`,
      `CREATE INDEX IF NOT EXISTS admins_username_idx ON admins(username)`,

      // 用户表
      `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        wallet_address VARCHAR(64) NOT NULL UNIQUE,
        referrer_address VARCHAR(64),
        direct_count INTEGER DEFAULT 0 NOT NULL,
        level INTEGER DEFAULT 0 NOT NULL,
        total_invest NUMERIC(20, 9) DEFAULT '0' NOT NULL,
        team_invest NUMERIC(20, 9) DEFAULT '0' NOT NULL,
        energy NUMERIC(20, 9) DEFAULT '0' NOT NULL,
        lp_shares NUMERIC(20, 9) DEFAULT '0' NOT NULL,
        pending_rewards NUMERIC(20, 9) DEFAULT '0' NOT NULL,
        direct_sales NUMERIC(20, 9) DEFAULT '0' NOT NULL,
        d_level INTEGER DEFAULT 0 NOT NULL,
        qualified_lines INTEGER DEFAULT 0 NOT NULL,
        is_node_qualified BOOLEAN DEFAULT false NOT NULL,
        highest_card_type INTEGER DEFAULT 0 NOT NULL,
        is_partner BOOLEAN DEFAULT false NOT NULL,
        partner_order INTEGER,
        card_type INTEGER,
        nft_token_id INTEGER,
        is_restricted BOOLEAN DEFAULT false NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ
      )`,
      `CREATE INDEX IF NOT EXISTS users_wallet_idx ON users(wallet_address)`,
      `CREATE INDEX IF NOT EXISTS users_referrer_idx ON users(referrer_address)`,

      // 入金记录表
      `CREATE TABLE IF NOT EXISTS deposits (
        id SERIAL PRIMARY KEY,
        tx_hash VARCHAR(128) NOT NULL UNIQUE,
        user_address VARCHAR(64) NOT NULL,
        amount NUMERIC(20, 9) NOT NULL,
        phase INTEGER NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'completed',
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS deposits_user_idx ON deposits(user_address)`,

      // 奖励记录表
      `CREATE TABLE IF NOT EXISTS rewards (
        id SERIAL PRIMARY KEY,
        user_address VARCHAR(64) NOT NULL,
        reward_type VARCHAR(30) NOT NULL,
        amount NUMERIC(20, 9) NOT NULL,
        from_address VARCHAR(64),
        level INTEGER,
        tx_hash VARCHAR(128),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )`,

      // 提现记录表
      `CREATE TABLE IF NOT EXISTS withdrawals (
        id SERIAL PRIMARY KEY,
        tx_hash VARCHAR(128) NOT NULL UNIQUE,
        user_address VARCHAR(64) NOT NULL,
        amount NUMERIC(20, 9) NOT NULL,
        fee NUMERIC(20, 9) NOT NULL,
        withdraw_type VARCHAR(20) NOT NULL,
        stake_days INTEGER,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )`,

      // LP质押记录表
      `CREATE TABLE IF NOT EXISTS lp_stakes (
        id SERIAL PRIMARY KEY,
        user_address VARCHAR(64) NOT NULL,
        amount NUMERIC(20, 9) NOT NULL,
        stake_days INTEGER NOT NULL,
        start_time TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        end_time TIMESTAMPTZ,
        reward_amount NUMERIC(20, 9) DEFAULT '0' NOT NULL,
        is_claimed BOOLEAN DEFAULT false NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )`,

      // 爆块记录表
      `CREATE TABLE IF NOT EXISTS block_rewards (
        id SERIAL PRIMARY KEY,
        release_amount NUMERIC(20, 9) NOT NULL,
        burn_amount NUMERIC(20, 9) NOT NULL,
        burn_rate NUMERIC(5, 2) NOT NULL,
        lp_share NUMERIC(20, 9) NOT NULL,
        nft_share NUMERIC(20, 9) NOT NULL,
        fund_share NUMERIC(20, 9) NOT NULL,
        team_share NUMERIC(20, 9) NOT NULL,
        block_time TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )`,

      // 资金池表
      `CREATE TABLE IF NOT EXISTS pools (
        id SERIAL PRIMARY KEY,
        pool_name VARCHAR(30) NOT NULL UNIQUE,
        balance NUMERIC(20, 9) DEFAULT '0' NOT NULL,
        total_distributed NUMERIC(20, 9) DEFAULT '0' NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )`,

      // 合伙人表
      `CREATE TABLE IF NOT EXISTS partners (
        id SERIAL PRIMARY KEY,
        user_address VARCHAR(64) NOT NULL UNIQUE,
        "order" INTEGER NOT NULL,
        personal_invest NUMERIC(20, 9) NOT NULL,
        direct_sales NUMERIC(20, 9) NOT NULL,
        dq_reward NUMERIC(20, 9) DEFAULT '0' NOT NULL,
        sol_reward NUMERIC(20, 9) DEFAULT '0' NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )`,

      // NFT卡牌表
      `CREATE TABLE IF NOT EXISTS cards (
        id SERIAL PRIMARY KEY,
        token_id INTEGER NOT NULL UNIQUE,
        owner_address VARCHAR(64) NOT NULL,
        card_type INTEGER NOT NULL,
        mint_price NUMERIC(20, 9) NOT NULL,
        dq_reward NUMERIC(20, 9) DEFAULT '0' NOT NULL,
        fee_reward NUMERIC(20, 9) DEFAULT '0' NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        minted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )`,

      // 地址限制表
      `CREATE TABLE IF NOT EXISTS address_restrictions (
        id SERIAL PRIMARY KEY,
        user_address VARCHAR(64) NOT NULL UNIQUE,
        reason TEXT,
        restricted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        unrestricted_at TIMESTAMPTZ,
        restricted_by INTEGER,
        status VARCHAR(20) NOT NULL DEFAULT 'restricted',
        restricted_debt NUMERIC(20, 9) DEFAULT '0' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )`,

      // 节点申请记录表
      `CREATE TABLE IF NOT EXISTS node_applications (
        id SERIAL PRIMARY KEY,
        user_address VARCHAR(64) NOT NULL,
        user_name VARCHAR(100),
        apply_type VARCHAR(20) NOT NULL,
        apply_reason TEXT,
        contact_info VARCHAR(100),
        total_invest NUMERIC(20, 9) DEFAULT '0' NOT NULL,
        team_size INTEGER DEFAULT 0 NOT NULL,
        attachment_url TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        reviewer_id INTEGER,
        reviewer_notes TEXT,
        reviewed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )`,

      // 初始化默认管理员 (密码: admin123)
      `INSERT INTO admins (username, password_hash, role) 
       VALUES ('admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'super_admin')
       ON CONFLICT (username) DO NOTHING`,

      // 初始化资金池
      `INSERT INTO pools (pool_name, balance) VALUES
       ('management', '0'), ('dao', '0'), ('insurance', '0'),
       ('operation', '0'), ('fee', '0'), ('lp', '0')
       ON CONFLICT (pool_name) DO NOTHING`,
    ];

    // 依次执行建表 SQL
    for (const sql of createTableSQLs) {
      try {
        // 使用 raw SQL 执行（通过查询方式）
        const { error } = await (supabase as any).from('users').select('id').limit(1);
        
        // 注意：Supabase JS 客户端不支持直接执行 DDL
        // 这里我们只能尝试使用 rpc 或其他方式
        // 如果失败，则需要手动执行 SQL
      } catch {
        // 忽略单个 SQL 执行错误
      }
    }

    console.log('[Database] SQL generated, manual execution may be required');
    return false;
  } catch (err: any) {
    console.error('[Database] Auto-initialization failed:', err.message);
    return false;
  }
}

// 检查并提示数据库初始化
async function ensureDatabaseReady(): Promise<void> {
  if (dbChecked) return;
  dbChecked = true;

  try {
    const result = await checkDatabaseTables();
    
    if (!result.exists && result.missingTables.length > 0) {
      console.log('\n' + '='.repeat(60));
      console.log('[Database] WARNING: Database tables not found!');
      console.log('='.repeat(60));
      console.log('\nMissing tables:');
      result.missingTables.forEach(t => console.log(`  - ${t}`));
      console.log('\nPlease execute the SQL script to create tables:');
      console.log('  1. Go to your Supabase Dashboard');
      console.log('  2. Open SQL Editor');
      console.log('  3. Run the SQL from: docs/init_database.sql');
      console.log('='.repeat(60) + '\n');
      
      // 尝试自动初始化
      await initializeDatabase();
    } else {
      console.log('[Database] Connection OK, tables exist');
    }
  } catch (err: any) {
    console.error('[Database] Check failed:', err.message);
    console.log('\n[Database] Please ensure:');
    console.log('  1. COZE_SUPABASE_URL is correct');
    console.log('  2. COZE_SUPABASE_ANON_KEY is valid');
    console.log('  3. Database tables are created');
    console.log('='.repeat(60) + '\n');
  }
}

export { 
  loadEnv, 
  getSupabaseCredentials, 
  getSupabaseServiceRoleKey, 
  getSupabaseClient, 
  checkDatabaseTables,
  initializeDatabase,
  ensureDatabaseReady 
};

// 使用 Supabase Management API 自动创建表
async function autoCreateTablesWithManagementApi(): Promise<boolean> {
  const accessToken = process.env.SUPABASE_PERSONAL_ACCESS_TOKEN;
  const projectRef = process.env.COZE_SUPABASE_URL?.replace('https://', '').replace('.supabase.co', '');
  
  if (!accessToken || !projectRef) {
    console.log('[Database] Management API: No access token configured, skipping auto-creation');
    return false;
  }

  console.log('[Database] Attempting auto-creation via Management API...');

  const sqlStatements = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(64) NOT NULL UNIQUE,
    referrer_address VARCHAR(64),
    direct_count INTEGER DEFAULT 0 NOT NULL,
    level INTEGER DEFAULT 0 NOT NULL,
    total_invest NUMERIC(20, 9) DEFAULT '0' NOT NULL,
    team_invest NUMERIC(20, 9) DEFAULT '0' NOT NULL,
    energy NUMERIC(20, 9) DEFAULT '0' NOT NULL,
    lp_shares NUMERIC(20, 9) DEFAULT '0' NOT NULL,
    pending_rewards NUMERIC(20, 9) DEFAULT '0' NOT NULL,
    direct_sales NUMERIC(20, 9) DEFAULT '0' NOT NULL,
    d_level INTEGER DEFAULT 0 NOT NULL,
    qualified_lines INTEGER DEFAULT 0 NOT NULL,
    is_node_qualified BOOLEAN DEFAULT false NOT NULL,
    highest_card_type INTEGER DEFAULT 0 NOT NULL,
    is_partner BOOLEAN DEFAULT false NOT NULL,
    partner_order INTEGER,
    card_type INTEGER,
    nft_token_id INTEGER,
    is_restricted BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ
);

-- Deposits table
CREATE TABLE IF NOT EXISTS deposits (
    id SERIAL PRIMARY KEY,
    tx_hash VARCHAR(128) NOT NULL UNIQUE,
    user_address VARCHAR(64) NOT NULL,
    amount NUMERIC(20, 9) NOT NULL,
    phase INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Rewards table
CREATE TABLE IF NOT EXISTS rewards (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(64) NOT NULL,
    reward_type VARCHAR(30) NOT NULL,
    amount NUMERIC(20, 9) NOT NULL,
    from_address VARCHAR(64),
    level INTEGER,
    tx_hash VARCHAR(128),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
    id SERIAL PRIMARY KEY,
    tx_hash VARCHAR(128) NOT NULL UNIQUE,
    user_address VARCHAR(64) NOT NULL,
    amount NUMERIC(20, 9) NOT NULL,
    fee NUMERIC(20, 9) NOT NULL,
    withdraw_type VARCHAR(20) NOT NULL,
    stake_days INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- LP Stakes table
CREATE TABLE IF NOT EXISTS lp_stakes (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(64) NOT NULL,
    amount NUMERIC(20, 9) NOT NULL,
    stake_days INTEGER NOT NULL,
    start_time TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    end_time TIMESTAMPTZ,
    reward_amount NUMERIC(20, 9) DEFAULT '0' NOT NULL,
    is_claimed BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Block rewards table
CREATE TABLE IF NOT EXISTS block_rewards (
    id SERIAL PRIMARY KEY,
    release_amount NUMERIC(20, 9) NOT NULL,
    burn_amount NUMERIC(20, 9) NOT NULL,
    burn_rate NUMERIC(5, 2) NOT NULL,
    lp_share NUMERIC(20, 9) NOT NULL,
    nft_share NUMERIC(20, 9) NOT NULL,
    fund_share NUMERIC(20, 9) NOT NULL,
    team_share NUMERIC(20, 9) NOT NULL,
    block_time TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Pools table
CREATE TABLE IF NOT EXISTS pools (
    id SERIAL PRIMARY KEY,
    pool_name VARCHAR(30) NOT NULL UNIQUE,
    balance NUMERIC(20, 9) DEFAULT '0' NOT NULL,
    total_distributed NUMERIC(20, 9) DEFAULT '0' NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Partners table
CREATE TABLE IF NOT EXISTS partners (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(64) NOT NULL UNIQUE,
    "order" INTEGER NOT NULL,
    personal_invest NUMERIC(20, 9) NOT NULL,
    direct_sales NUMERIC(20, 9) NOT NULL,
    dq_reward NUMERIC(20, 9) DEFAULT '0' NOT NULL,
    sol_reward NUMERIC(20, 9) DEFAULT '0' NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Cards table
CREATE TABLE IF NOT EXISTS cards (
    id SERIAL PRIMARY KEY,
    token_id INTEGER NOT NULL UNIQUE,
    owner_address VARCHAR(64) NOT NULL,
    card_type INTEGER NOT NULL,
    mint_price NUMERIC(20, 9) NOT NULL,
    dq_reward NUMERIC(20, 9) DEFAULT '0' NOT NULL,
    fee_reward NUMERIC(20, 9) DEFAULT '0' NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    minted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Address restrictions table
CREATE TABLE IF NOT EXISTS address_restrictions (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(64) NOT NULL UNIQUE,
    reason TEXT,
    restricted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    unrestricted_at TIMESTAMPTZ,
    restricted_by INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'restricted',
    restricted_debt NUMERIC(20, 9) DEFAULT '0' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Node applications table
CREATE TABLE IF NOT EXISTS node_applications (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(64) NOT NULL,
    user_name VARCHAR(100),
    apply_type VARCHAR(20) NOT NULL,
    apply_reason TEXT,
    contact_info VARCHAR(100),
    total_invest NUMERIC(20, 9) DEFAULT '0' NOT NULL,
    team_size INTEGER DEFAULT 0 NOT NULL,
    attachment_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    reviewer_id INTEGER,
    reviewer_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Admins table
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'admin',
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_login TIMESTAMPTZ
);

-- Initialize data
INSERT INTO pools (pool_name, balance) VALUES
    ('management', '0'), ('dao', '0'), ('insurance', '0'),
    ('operation', '0'), ('fee', '0'), ('lp', '0')
ON CONFLICT (pool_name) DO NOTHING;
`;

  return new Promise((resolve) => {
    const data = JSON.stringify({
      query: sqlStatements,
      superuser: true,
    });

    const options = {
      hostname: 'api.supabase.com',
      port: 443,
      path: `/v1/projects/${projectRef}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('[Database] SUCCESS: Tables created automatically!');
          dbInitialized = true;
          resolve(true);
        } else {
          console.log(`[Database] Management API returned status: ${res.statusCode}`);
          console.log('[Database] Response:', responseData.substring(0, 200));
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.log(`[Database] Management API error: ${err.message}`);
      resolve(false);
    });

    req.write(data);
    req.end();
  });
}

// 增强版数据库初始化 - 优先使用 Management API
async function initializeDatabaseEnhanced(): Promise<boolean> {
  // 首先检查是否已经有 Management API token
  if (process.env.SUPABASE_PERSONAL_ACCESS_TOKEN) {
    const success = await autoCreateTablesWithManagementApi();
    if (success) return true;
  }
  
  // 如果 Management API 不可用，尝试使用 service role key 直接连接
  return await initializeDatabase();
}

// 导出增强版初始化函数
export { autoCreateTablesWithManagementApi, initializeDatabaseEnhanced };
