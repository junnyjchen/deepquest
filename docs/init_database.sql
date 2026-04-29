-- DQProject 数据库初始化脚本
-- 在 Supabase SQL Editor 中执行

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

-- 2. 用户表
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

-- 3. 入金记录表
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

-- 4. 奖励记录表
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

-- 5. 提现记录表
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

-- 6. LP质押记录表
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

-- 7. 爆块记录表
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

-- 8. 资金池表
CREATE TABLE IF NOT EXISTS pools (
    id SERIAL PRIMARY KEY,
    pool_name VARCHAR(30) NOT NULL UNIQUE,
    balance NUMERIC(20, 9) DEFAULT '0' NOT NULL,
    total_distributed NUMERIC(20, 9) DEFAULT '0' NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 9. 合伙人表
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

-- 10. NFT卡牌表
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

-- 11. 地址限制表
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

-- 12. 节点申请记录表
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

-- 初始化默认管理员 (密码: admin123)
INSERT INTO admins (username, password_hash, role) 
VALUES ('admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'super_admin')
ON CONFLICT (username) DO NOTHING;

-- 初始化资金池
INSERT INTO pools (pool_name, balance) VALUES
    ('management', '0'), ('dao', '0'), ('insurance', '0'),
    ('operation', '0'), ('fee', '0'), ('lp', '0')
ON CONFLICT (pool_name) DO NOTHING;

SELECT 'Database initialized successfully!' AS status;
