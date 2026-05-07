# 链上同步状态持久化 - 快速启动指南

## 📋 核心改动

| 组件 | 文件 | 变更 |
|------|------|------|
| 状态管理 | `server/src/utils/sync-state.ts` | ✨ 新建 - 文件持久化模块 |
| 同步服务 | `server/src/utils/sync-chain-service.ts` | 🔄 修改 - 集成状态管理 |
| API 路由 | `server/src/routes/dapp.ts` | ➕ 新增 - 重置索引端点 |
| 配置 | `.gitignore` | 📝 更新 - 排除状态文件 |
| 文档 | `server/docs/sync-state-persistence.md` | 📖 新建 - 完整使用指南 |

## 🚀 立即使用

### 1. 验证代码
```bash
# 检查编译错误
pnpm -w lint:all
```

### 2. 启动服务
```bash
# 首次启动会自动创建 .sync-state.json
coze dev
```

### 3. 测试增量同步
```bash
# 触发增量同步（无需认证）
curl -X POST http://localhost:5000/api/v1/dapp/sync/incremental \
  -H "Content-Type: application/json"

# 查看同步状态
curl http://localhost:5000/api/v1/dapp/sync/status
```

### 4. （可选）配置 API Key
```bash
# 在 server/.env 中添加
SYNC_API_KEY=your-secret-key-here
```

然后在请求时包含密钥：
```bash
curl -X POST http://localhost:5000/api/v1/dapp/sync/incremental \
  -H "X-API-Key: your-secret-key-here"
```

## 📊 验证效果

### 查看状态文件
```bash
# 服务启动后会自动创建
cat .sync-state.json

# 输出示例
{
  "lastSyncedIndex": 12450,
  "lastSyncTime": "2024-12-01T10:30:45.123Z",
  "lastError": null,
  "totalSyncedCount": 12450,
  "version": 1
}
```

### 监控日志
```
[SyncState] 初始化同步状态文件
[SyncState] 加载同步状态: {...}
[ChainSync] 新增用户: 150, 成功: 148, 失败: 2
[SyncState] 同步状态已保存
```

### 服务重启测试
```bash
# 1. 查看当前状态
curl http://localhost:5000/api/v1/dapp/sync/status
# 记录 lastSyncedIndex 值，例如: 12450

# 2. 停止服务并重启
# 按 Ctrl+C 停止，然后 coze dev

# 3. 再次查看状态
curl http://localhost:5000/api/v1/dapp/sync/status
# 应该看到 lastSyncedIndex 仍为 12450 ✅（状态已恢复）
```

## 🔧 常用操作

### 重置同步进度
```bash
# 清除所有进度，从头开始扫描
curl -X DELETE http://localhost:5000/api/v1/dapp/sync/index \
  -H "X-API-Key: secret-key"
```

### 完整同步
```bash
# 同步所有用户（覆盖数据库）
curl -X POST http://localhost:5000/api/v1/dapp/sync
```

### 增量同步（推荐）
```bash
# 只同步新增用户（快速、节省资源）
curl -X POST http://localhost:5000/api/v1/dapp/sync/incremental
```

## ⏰ 设置定时任务

### 方案 1: Linux Cron

编辑 crontab:
```bash
crontab -e
```

添加每小时执行一次:
```cron
# 每小时第 0 分钟执行增量同步
0 * * * * curl -X POST http://localhost:5000/api/v1/dapp/sync/incremental \
  -H "X-API-Key: secret-key"
```

### 方案 2: Docker Compose

创建同步服务:
```yaml
services:
  sync-scheduler:
    image: curlimages/curl:latest
    entrypoint: sh -c
    command: |
      while true; do
        sleep 3600  # 每小时执行
        curl -X POST http://server:5000/api/v1/dapp/sync/incremental \
          -H "X-API-Key: secret-key"
      done
    depends_on:
      - server
```

### 方案 3: systemd Timer (Linux)

创建 service 文件：`/etc/systemd/system/dq-sync.service`
```ini
[Unit]
Description=DeepQuest Chain Sync
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/bin/curl -X POST http://localhost:5000/api/v1/dapp/sync/incremental \
  -H "X-API-Key: secret-key"
User=deepquest
```

创建 timer 文件：`/etc/systemd/system/dq-sync.timer`
```ini
[Unit]
Description=Run DeepQuest Chain Sync hourly
Requires=dq-sync.service

[Timer]
OnCalendar=hourly
Persistent=true

[Install]
WantedBy=timers.target
```

启用:
```bash
sudo systemctl enable dq-sync.timer
sudo systemctl start dq-sync.timer
```

## 📈 监控建议

### 定期检查同步状态
```bash
# 每 10 分钟检查一次（可用 cron 或其他工具）
*/10 * * * * curl http://localhost:5000/api/v1/dapp/sync/status | \
  tee -a sync-monitor.log
```

### 设置告警规则

**告警 1: 同步失败**
```bash
if lastError is not null
  → 发送通知
```

**告警 2: 长时间未同步**
```bash
if (now - lastSyncTime) > 2 hours
  → 发送通知
```

**告警 3: 同步缓慢**
```bash
if (failedUsers / totalUsers) > 5%
  → 发送通知
```

## 📋 检查清单

- [ ] 已验证代码无编译错误
- [ ] 服务成功启动，`.sync-state.json` 已创建
- [ ] 增量同步接口可正常调用
- [ ] 服务重启后状态正确恢复
- [ ] （可选）已设置 API Key 认证
- [ ] （可选）已配置定时任务
- [ ] （可选）已设置监控告警

## 🐛 故障排除

### Q: 重启后索引重置为 0？
A: 检查 `.sync-state.json` 文件是否存在和可读:
```bash
ls -la .sync-state.json
cat .sync-state.json
```

### Q: 状态文件无法写入？
A: 检查目录权限:
```bash
ls -ld $(pwd)
chmod 755 $(pwd)
```

### Q: 增量同步一直说"无新增用户"？
A: 这是正常的。检查链上是否真有新用户:
```bash
# 查询链上总用户数
curl 'https://bsc-dataseed.binance.org/' \
  -X POST \
  -H 'Content-Type: application/json' \
  --data '{...}'  # 调用合约查询
```

## 📚 更多信息

完整文档见: [sync-state-persistence.md](sync-state-persistence.md)

## 🎯 下一步

1. ✅ 核心功能已完成
2. ⏳ 配置外部定时任务
3. 📊 监控同步状态
4. 🔄 定期备份 `.sync-state.json`

---

**关键特性**: 服务重启后自动从上次位置继续同步，无需手动干预！ 🎉
