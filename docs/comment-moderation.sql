-- ============================================================
-- 评论审核机制：数据库侧变更
-- 配套前端改动：游客评论写入 status='pending'，后台「评论管理」审核通过后转 visible
-- 执行位置：WorkBuddy 云服务控制台的 SQL 编辑器
-- 影响范围：仅 comments 表，可回滚（见文件末尾）
-- ============================================================

-- 1. 新评论默认进入待审核状态
--    前端已显式传 status='pending'，这里改默认值是「防御性兜底」：
--    任何绕过前端直接写库的路径（脚本、后台任务）也会走审核流程。
ALTER TABLE comments ALTER COLUMN status SET DEFAULT 'pending';


-- 2. 约束 status 的取值范围，避免写入拼错的枚举值
--    先确认现有数据都在合法取值内，否则加约束会失败：
--    SELECT DISTINCT status FROM comments;
ALTER TABLE comments
  ADD CONSTRAINT comments_status_check
  CHECK (status IN ('pending', 'visible', 'hidden'));


-- ============================================================
-- 3. 重要：确认 RLS 策略没有「固定」status 字段
-- ============================================================
-- 前端提交评论时会显式带上 status，如果 INSERT 策略的 WITH CHECK 里写死了
-- status = 'visible'（或类似条件），带 status 的写入会被拒绝。
-- 前端已做兜底（被拒后退回不传 status），但最好还是确认一下策略内容。
--
-- 查看 comments 表当前的 RLS 策略：
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'comments';

-- 期望结果：INSERT 策略的 with_check 只校验归属与内容（如 owner_id / guest_name /
-- content 长度 / 文章是否存在），不出现 status = '...' 这样的固定条件。
-- 若确实固定了 status，请把该条件删掉，让 status 由前端和默认值决定。


-- ============================================================
-- 4. 验证
-- ============================================================
-- 改完后，在文章页以游客身份发一条评论，然后执行：
-- SELECT id, status, guest_name, left(content, 20) FROM comments ORDER BY id DESC LIMIT 5;
-- 新评论的 status 应为 pending，且前台不可见、后台「待审核」列表可见。


-- ============================================================
-- 回滚
-- ============================================================
-- ALTER TABLE comments ALTER COLUMN status SET DEFAULT 'visible';
-- ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_status_check;
-- 注意：回滚只恢复默认值，已置为 pending 的历史评论需要另行处理，例如：
-- UPDATE comments SET status = 'visible' WHERE status = 'pending';
