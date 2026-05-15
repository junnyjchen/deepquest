-- DQProject 数据库升级脚本 v1.1
-- 在 Supabase SQL Editor 中执行
-- 用途：为链上 getUser 新增字段补齐 users 表结构

BEGIN;

-- 1) users: 增加 valid_address_count（链上 getUser 返回值 validAddressCount）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'valid_address_count'
  ) THEN
    ALTER TABLE public.users
      ADD COLUMN valid_address_count INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 2) 可选索引：按 valid_address_count 做筛选/排序时使用
-- 注意：如果你确认不需要，可以删除本段
CREATE INDEX IF NOT EXISTS users_valid_address_count_idx ON public.users(valid_address_count);

COMMENT ON COLUMN public.users.valid_address_count IS '链上 getUser 返回的 validAddressCount：有效地址数/有效团队线数（按合约定义）';

COMMIT;

SELECT 'Database upgraded to v1.1 successfully!' AS status;
