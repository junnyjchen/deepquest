-- =============================================
-- DQProject 数据库初始化脚本
-- 在 Supabase SQL Editor 中执行此脚本
-- =============================================

-- 1. 管理员表
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'admin',
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_login TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS admins_username_idx ON admins(username);

-- 2. 地址限制表
CREATE TABLE IF NOT EXISTS address_restrictions (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(64) NOT NULL UNIQUE,
    reason TEXT,
    restricted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    unrestricted_at TIMESTAMPTZ,
    restricted_by INTEGER REFERENCES admins(id),
    status VARCHAR(20) NOT NULL DEFAULT 'restricted',
    restricted_debt NUMERIC(20, 9) DEFAULT '0' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS restrictions_address_idx ON address_restrictions(user_address);
CREATE INDEX IF NOT EXISTS restrictions_status_idx ON address_restrictions(status);

-- 3. 用户表
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

CREATE INDEX IF NOT EXISTS users_wallet_idx ON users(wallet_address);
CREATE INDEX IF NOT EXISTS users_referrer_idx ON users(referrer_address);
CREATE INDEX IF NOT EXISTS users_level_idx ON users(level);
CREATE INDEX IF NOT EXISTS users_partner_idx ON users(is_partner);
CREATE INDEX IF NOT EXISTS users_node_qualified_idx ON users(is_node_qualified);
CREATE INDEX IF NOT EXISTS users_created_idx ON users(created_at);

-- 4. 入金记录表
CREATE TABLE IF NOT EXISTS deposits (
    id SERIAL PRIMARY KEY,
    tx_hash VARCHAR(128) NOT NULL UNIQUE,
    user_address VARCHAR(64) NOT NULL,
    amount NUMERIC(20, 9) NOT NULL,
    phase INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS deposits_user_idx ON deposits(user_address);
CREATE INDEX IF NOT EXISTS deposits_created_idx ON deposits(created_at);
CREATE INDEX IF NOT EXISTS deposits_tx_idx ON deposits(tx_hash);

-- 5. 奖励记录表
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

CREATE INDEX IF NOT EXISTS rewards_user_idx ON rewards(user_address);
CREATE INDEX IF NOT EXISTS rewards_type_idx ON rewards(reward_type);
CREATE INDEX IF NOT EXISTS rewards_created_idx ON rewards(created_at);

-- 6. 提现记录表
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

CREATE INDEX IF NOT EXISTS withdrawals_user_idx ON withdrawals(user_address);
CREATE INDEX IF NOT EXISTS withdrawals_status_idx ON withdrawals(status);
CREATE INDEX IF NOT EXISTS withdrawals_created_idx ON withdrawals(created_at);

-- 7. LP质押记录表
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

CREATE INDEX IF NOT EXISTS lp_stakes_user_idx ON lp_stakes(user_address);
CREATE INDEX IF NOT EXISTS lp_stakes_claimed_idx ON lp_stakes(is_claimed);

-- 8. 爆块记录表
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

CREATE INDEX IF NOT EXISTS block_rewards_time_idx ON block_rewards(block_time);

-- 9. 资金池表
CREATE TABLE IF NOT EXISTS pools (
    id SERIAL PRIMARY KEY,
    pool_name VARCHAR(30) NOT NULL UNIQUE,
    balance NUMERIC(20, 9) DEFAULT '0' NOT NULL,
    total_distributed NUMERIC(20, 9) DEFAULT '0' NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 10. 合伙人表
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

CREATE INDEX IF NOT EXISTS partners_order_idx ON partners("order");
CREATE INDEX IF NOT EXISTS partners_status_idx ON partners(status);

-- 11. NFT卡牌表
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

CREATE INDEX IF NOT EXISTS cards_owner_idx ON cards(owner_address);
CREATE INDEX IF NOT EXISTS cards_type_idx ON cards(card_type);
CREATE INDEX IF NOT EXISTS cards_token_idx ON cards(token_id);

-- 12. 团队D级统计表
CREATE TABLE IF NOT EXISTS d_level_stats (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(64) NOT NULL UNIQUE,
    d_level INTEGER DEFAULT 0 NOT NULL,
    valid_addresses INTEGER DEFAULT 0 NOT NULL,
    team_invest NUMERIC(20, 9) DEFAULT '0' NOT NULL,
    reward_amount NUMERIC(20, 9) DEFAULT '0' NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS dlevel_user_idx ON d_level_stats(user_address);
CREATE INDEX IF NOT EXISTS dlevel_level_idx ON d_level_stats(d_level);

-- 13. 合约配置表
CREATE TABLE IF NOT EXISTS contract_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(50) NOT NULL UNIQUE,
    config_value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_by VARCHAR(64)
);

-- 14. 操作日志表
CREATE TABLE IF NOT EXISTS operation_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admins(id),
    admin_address VARCHAR(64),
    action VARCHAR(50) NOT NULL,
    target VARCHAR(100),
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS logs_admin_idx ON operation_logs(admin_id);
CREATE INDEX IF NOT EXISTS logs_action_idx ON operation_logs(action);
CREATE INDEX IF NOT EXISTS logs_created_idx ON operation_logs(created_at);

-- 15. 节点申请记录表
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
    reviewer_id INTEGER REFERENCES admins(id),
    reviewer_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS node_app_user_idx ON node_applications(user_address);
CREATE INDEX IF NOT EXISTS node_app_status_idx ON node_applications(status);
CREATE INDEX IF NOT EXISTS node_app_created_idx ON node_applications(created_at);

-- =============================================
-- 初始化数据
-- =============================================

-- 创建默认管理员 (密码: admin123)
-- 密码哈希: $2b$10$... 请在生产环境中使用安全的哈希
INSERT INTO admins (username, password_hash, role) 
VALUES ('admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'super_admin')
ON CONFLICT (username) DO NOTHING;

-- 初始化资金池
INSERT INTO pools (pool_name, balance) VALUES
    ('management', '0'),
    ('dao', '0'),
    ('insurance', '0'),
    ('operation', '0'),
    ('fee', '0'),
    ('lp', '0')
ON CONFLICT (pool_name) DO NOTHING;

-- 初始化合约配置
INSERT INTO contract_config (config_key, config_value, description) VALUES
    ('contract_address', '{"address": ""}', '合约部署地址'),
    ('bep20_token', '{"address": "0x570A5D26f7765Ecb712C0924E4De545B89fD43dF"}', 'BEP20代币地址'),
    ('pancake_router', '{"address": "0x10ed43c718714EB63D5AA4B43D3f6452BC7f4ce6"}', 'PancakeSwap Router'),
    ('foundation_wallet', '{"address": ""}', '基金会钱包地址'),
    ('daily_release_rate', '{"rate": 13}', '每日释放率(‰)'),
    ('burn_rate', '{"rate": 80}', '初始销毁率(%)')
ON CONFLICT (config_key) DO NOTHING;

-- =============================================
-- 完成
-- =============================================

SELECT 'Database initialization completed!' AS status;
