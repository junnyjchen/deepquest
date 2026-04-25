import { pgTable, serial, timestamp, varchar, integer, numeric, boolean, text, jsonb, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// ============ 管理员表 ============
export const admins = pgTable(
  "admins",
  {
    id: serial().primaryKey(),
    username: varchar("username", { length: 64 }).notNull().unique(),
    password_hash: varchar("password_hash", { length: 255 }).notNull(),
    role: varchar("role", { length: 20 }).notNull().default("admin"), // admin, super_admin
    is_active: boolean("is_active").default(true).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    last_login: timestamp("last_login", { withTimezone: true }),
  }
);

// ============ 地址限制表 ============
export const addressRestrictions = pgTable(
  "address_restrictions",
  {
    id: serial().primaryKey(),
    user_address: varchar("user_address", { length: 64 }).notNull().unique(),
    reason: text("reason"),
    restricted_at: timestamp("restricted_at", { withTimezone: true }).defaultNow().notNull(),
    unrestricted_at: timestamp("unrestricted_at", { withTimezone: true }),
    restricted_by: integer("restricted_by").references(() => admins.id),
    status: varchar("status", { length: 20 }).notNull().default("restricted"), // restricted, unrestricted
    restricted_debt: numeric("restricted_debt", { precision: 20, scale: 9 }).default("0").notNull(), // 限制前的待领取收益
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("restrictions_address_idx").on(table.user_address),
    index("restrictions_status_idx").on(table.status),
  ]
);

// ============ 用户表 ============
export const users = pgTable(
  "users",
  {
    id: serial().primaryKey(),
    wallet_address: varchar("wallet_address", { length: 64 }).notNull().unique(),
    referrer_address: varchar("referrer_address", { length: 64 }),
    direct_count: integer("direct_count").default(0).notNull(),
    level: integer("level").default(0).notNull(), // S1-S6
    total_invest: numeric("total_invest", { precision: 20, scale: 9 }).default("0").notNull(),
    team_invest: numeric("team_invest", { precision: 20, scale: 9 }).default("0").notNull(),
    energy: numeric("energy", { precision: 20, scale: 9 }).default("0").notNull(),
    lp_shares: numeric("lp_shares", { precision: 20, scale: 9 }).default("0").notNull(),
    pending_rewards: numeric("pending_rewards", { precision: 20, scale: 9 }).default("0").notNull(),
    direct_sales: numeric("direct_sales", { precision: 20, scale: 9 }).default("0").notNull(),
    d_level: integer("d_level").default(0).notNull(), // D1-D8
    // 节点达标信息
    qualified_lines: integer("qualified_lines").default(0).notNull(), // 当前达标线数
    is_node_qualified: boolean("is_node_qualified").default(false).notNull(), // 节点是否达标
    highest_card_type: integer("highest_card_type").default(0).notNull(), // 最高卡牌类型
    is_partner: boolean("is_partner").default(false).notNull(),
    partner_order: integer("partner_order"), // 合伙人序号
    card_type: integer("card_type"), // 1=A, 2=B, 3=C
    nft_token_id: integer("nft_token_id"),
    // 地址限制
    is_restricted: boolean("is_restricted").default(false).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("users_wallet_idx").on(table.wallet_address),
    index("users_referrer_idx").on(table.referrer_address),
    index("users_level_idx").on(table.level),
    index("users_partner_idx").on(table.is_partner),
    index("users_node_qualified_idx").on(table.is_node_qualified),
    index("users_created_idx").on(table.created_at),
  ]
);

// ============ 入金记录表 ============
export const deposits = pgTable(
  "deposits",
  {
    id: serial().primaryKey(),
    tx_hash: varchar("tx_hash", { length: 128 }).notNull().unique(),
    user_address: varchar("user_address", { length: 64 }).notNull(),
    amount: numeric("amount", { precision: 20, scale: 9 }).notNull(),
    phase: integer("phase").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("completed"), // pending, completed, failed
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("deposits_user_idx").on(table.user_address),
    index("deposits_created_idx").on(table.created_at),
    index("deposits_tx_idx").on(table.tx_hash),
  ]
);

// ============ 奖励记录表 ============
export const rewards = pgTable(
  "rewards",
  {
    id: serial().primaryKey(),
    user_address: varchar("user_address", { length: 64 }).notNull(),
    reward_type: varchar("reward_type", { length: 30 }).notNull(), // direct, node, management, dao, lp, nft, team
    amount: numeric("amount", { precision: 20, scale: 9 }).notNull(),
    from_address: varchar("from_address", { length: 64 }),
    level: integer("level"), // 奖励发放时的用户等级
    tx_hash: varchar("tx_hash", { length: 128 }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("rewards_user_idx").on(table.user_address),
    index("rewards_type_idx").on(table.reward_type),
    index("rewards_created_idx").on(table.created_at),
  ]
);

// ============ 提现记录表 ============
export const withdrawals = pgTable(
  "withdrawals",
  {
    id: serial().primaryKey(),
    tx_hash: varchar("tx_hash", { length: 128 }).notNull().unique(),
    user_address: varchar("user_address", { length: 64 }).notNull(),
    amount: numeric("amount", { precision: 20, scale: 9 }).notNull(),
    fee: numeric("fee", { precision: 20, scale: 9 }).notNull(),
    withdraw_type: varchar("withdraw_type", { length: 20 }).notNull(), // dynamic, lp, nft, team
    stake_days: integer("stake_days"), // 质押天数（仅单币质押提现）
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, completed, failed
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("withdrawals_user_idx").on(table.user_address),
    index("withdrawals_status_idx").on(table.status),
    index("withdrawals_created_idx").on(table.created_at),
  ]
);

// ============ LP质押记录表 ============
export const lpStakes = pgTable(
  "lp_stakes",
  {
    id: serial().primaryKey(),
    user_address: varchar("user_address", { length: 64 }).notNull(),
    amount: numeric("amount", { precision: 20, scale: 9 }).notNull(),
    stake_days: integer("stake_days").notNull(), // 30, 90, 180, 360
    start_time: timestamp("start_time", { withTimezone: true }).defaultNow().notNull(),
    end_time: timestamp("end_time", { withTimezone: true }),
    reward_amount: numeric("reward_amount", { precision: 20, scale: 9 }).default("0").notNull(),
    is_claimed: boolean("is_claimed").default(false).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("lp_stakes_user_idx").on(table.user_address),
    index("lp_stakes_claimed_idx").on(table.is_claimed),
  ]
);

// ============ 爆块记录表 ============
export const blockRewards = pgTable(
  "block_rewards",
  {
    id: serial().primaryKey(),
    release_amount: numeric("release_amount", { precision: 20, scale: 9 }).notNull(),
    burn_amount: numeric("burn_amount", { precision: 20, scale: 9 }).notNull(),
    burn_rate: numeric("burn_rate", { precision: 5, scale: 2 }).notNull(),
    lp_share: numeric("lp_share", { precision: 20, scale: 9 }).notNull(),
    nft_share: numeric("nft_share", { precision: 20, scale: 9 }).notNull(),
    fund_share: numeric("fund_share", { precision: 20, scale: 9 }).notNull(),
    team_share: numeric("team_share", { precision: 20, scale: 9 }).notNull(),
    block_time: timestamp("block_time", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("block_rewards_time_idx").on(table.block_time),
  ]
);

// ============ 资金池表 ============
export const pools = pgTable(
  "pools",
  {
    id: serial().primaryKey(),
    pool_name: varchar("pool_name", { length: 30 }).notNull().unique(), // management, dao, insurance, operation, fee
    balance: numeric("balance", { precision: 20, scale: 9 }).default("0").notNull(),
    total_distributed: numeric("total_distributed", { precision: 20, scale: 9 }).default("0").notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

// ============ 合伙人表 ============
export const partners = pgTable(
  "partners",
  {
    id: serial().primaryKey(),
    user_address: varchar("user_address", { length: 64 }).notNull().unique(),
    order: integer("order").notNull(),
    personal_invest: numeric("personal_invest", { precision: 20, scale: 9 }).notNull(),
    direct_sales: numeric("direct_sales", { precision: 20, scale: 9 }).notNull(),
    dq_reward: numeric("dq_reward", { precision: 20, scale: 9 }).default("0").notNull(),
    sol_reward: numeric("sol_reward", { precision: 20, scale: 9 }).default("0").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("active"), // active, removed
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("partners_order_idx").on(table.order),
    index("partners_status_idx").on(table.status),
  ]
);

// ============ NFT卡牌表 ============
export const cards = pgTable(
  "cards",
  {
    id: serial().primaryKey(),
    token_id: integer("token_id").notNull().unique(),
    owner_address: varchar("owner_address", { length: 64 }).notNull(),
    card_type: integer("card_type").notNull(), // 1=A, 2=B, 3=C
    mint_price: numeric("mint_price", { precision: 20, scale: 9 }).notNull(),
    dq_reward: numeric("dq_reward", { precision: 20, scale: 9 }).default("0").notNull(),
    fee_reward: numeric("fee_reward", { precision: 20, scale: 9 }).default("0").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("active"), // active, burned
    minted_at: timestamp("minted_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("cards_owner_idx").on(table.owner_address),
    index("cards_type_idx").on(table.card_type),
    index("cards_token_idx").on(table.token_id),
  ]
);

// ============ 团队D级统计表 ============
export const dLevelStats = pgTable(
  "d_level_stats",
  {
    id: serial().primaryKey(),
    user_address: varchar("user_address", { length: 64 }).notNull().unique(),
    d_level: integer("d_level").notNull().default(0), // D1-D8
    valid_addresses: integer("valid_addresses").default(0).notNull(),
    team_invest: numeric("team_invest", { precision: 20, scale: 9 }).default("0").notNull(),
    reward_amount: numeric("reward_amount", { precision: 20, scale: 9 }).default("0").notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("dlevel_user_idx").on(table.user_address),
    index("dlevel_level_idx").on(table.d_level),
  ]
);

// ============ 合约配置表 ============
export const contractConfig = pgTable(
  "contract_config",
  {
    id: serial().primaryKey(),
    config_key: varchar("config_key", { length: 50 }).notNull().unique(),
    config_value: jsonb("config_value").notNull(),
    description: text("description"),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    updated_by: varchar("updated_by", { length: 64 }),
  }
);

// ============ 操作日志表 ============
export const operationLogs = pgTable(
  "operation_logs",
  {
    id: serial().primaryKey(),
    admin_id: integer("admin_id").references(() => admins.id),
    admin_address: varchar("admin_address", { length: 64 }),
    action: varchar("action", { length: 50 }).notNull(),
    target: varchar("target", { length: 100 }),
    details: jsonb("details"),
    ip_address: varchar("ip_address", { length: 45 }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("logs_admin_idx").on(table.admin_id),
    index("logs_action_idx").on(table.action),
    index("logs_created_idx").on(table.created_at),
  ]
);

// ============ 节点申请记录表 ============
export const nodeApplications = pgTable(
  "node_applications",
  {
    id: serial().primaryKey(),
    user_address: varchar("user_address", { length: 64 }).notNull(),
    user_name: varchar("user_name", { length: 100 }), // 用户昵称/名称
    apply_type: varchar("apply_type", { length: 20 }).notNull(), // node_partner, node_delegate
    apply_reason: text("apply_reason"), // 申请理由
    contact_info: varchar("contact_info", { length: 100 }), // 联系方式
    total_invest: numeric("total_invest", { precision: 20, scale: 9 }).default("0").notNull(), // 累计投资额
    team_size: integer("team_size").default(0).notNull(), // 团队人数
    attachment_url: text("attachment_url"), // 附件链接
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, approved, rejected
    reviewer_id: integer("reviewer_id").references(() => admins.id), // 审核人
    reviewer_notes: text("reviewer_notes"), // 审核备注
    reviewed_at: timestamp("reviewed_at", { withTimezone: true }), // 审核时间
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("node_app_user_idx").on(table.user_address),
    index("node_app_status_idx").on(table.status),
    index("node_app_type_idx").on(table.apply_type),
    index("node_app_created_idx").on(table.created_at),
  ]
);

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});
