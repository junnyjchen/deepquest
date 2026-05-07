# 链上同步状态持久化系统

## 概述

链上用户数据的增量同步需要记录上次同步到的用户索引位置。如果服务器重启，内存中的索引会丢失，导致：
- 下次启动时重新从 0 开始扫描
- 浪费 RPC 配额和计算资源
- 无法快速追踪链上最新数据

本系统通过将同步状态保存到文件中，确保服务重启后能够继续从上次位置同步。

## 实现方案

### 架构

```
sync-chain-service.ts (核心同步逻辑)
    ↓
sync-state.ts (持久化模块)
    ↓
.sync-state.json (状态文件)
```

### 存储方式

- **存储位置**: 项目根目录的 `.sync-state.json`
- **格式**: JSON 文件
- **文件内容示例**:
```json
{
  "lastSyncedIndex": 12450,
  "lastSyncTime": "2024-12-01T10:30:45.123Z",
  "lastError": null,
  "totalSyncedCount": 12450,
  "version": 1
}
```

## 核心 API

### 1. loadSyncState()
从文件加载同步状态，若文件不存在返回默认状态。
```typescript
const state = loadSyncState();
console.log(state.lastSyncedIndex); // 上次同步到的索引
```

### 2. saveSyncState(state)
保存同步状态到文件。
```typescript
saveSyncState({ lastSyncedIndex: 100, ... });
```

### 3. getLastSyncedIndex()
获取上次同步到的用户索引。
```typescript
const index = getLastSyncedIndex();
console.log(`继续从索引 ${index} 开始同步`);
```

### 4. updateLastSyncedIndex(index, syncedCount, error)
更新同步索引和统计信息。
```typescript
updateLastSyncedIndex(12500, 50, null); // 索引+50, 累计同步数+50, 错误清空
```

### 5. resetSyncState()
重置所有同步状态（重新开始完整同步）。
```typescript
resetSyncState(); // 清除所有进度
```

### 6. getFullSyncState()
获取完整的同步状态信息。
```typescript
const state = getFullSyncState();
console.log(state.totalSyncedCount); // 累计同步用户总数
```

### 7. updateSyncError(error)
记录最近的同步错误。
```typescript
updateSyncError("RPC 连接超时"); // 记录错误信息
```

### 8. initSyncStateFile()
初始化状态文件（如果不存在）。
```typescript
initSyncStateFile(); // 在服务启动时调用
```

## 集成方式

### 在 sync-chain-service.ts 中的使用

1. **初始化** (已自动执行):
```typescript
initSyncStateFile(); // 模块加载时自动调用
```

2. **增量同步**:
```typescript
export async function syncChainDataIncremental(fields?: string[]) {
  // 获取上次同步的索引
  const startIndex = getLastSyncedIndex();
  
  // ... 执行同步
  
  // 成功后更新索引
  const newIndex = startIndex + newUsers;
  updateLastSyncedIndex(newIndex, syncedUsers, null);
}
```

3. **查询状态**:
```typescript
export function getSyncStatus() {
  const state = getFullSyncState();
  return {
    lastSyncedIndex: state.lastSyncedIndex,
    totalSyncedCount: state.totalSyncedCount,
    // ...
  };
}
```

4. **重置进度**:
```typescript
export function resetSyncIndex() {
  resetSyncState();
  // 清除其他内存状态
}
```

## API 接口

### 触发增量同步
```bash
POST /api/v1/dapp/sync/incremental
Content-Type: application/json
X-API-Key: your-secret-key (可选)

请求体:
{
  "fields": ["level", "total_invest"] // 可选，要同步的字段
}

响应:
{
  "code": 0,
  "message": "增量同步完成",
  "data": {
    "success": true,
    "newUsers": 150,
    "syncedUsers": 148,
    "failedUsers": 2,
    "duration": 3456
  }
}
```

### 获取同步状态
```bash
GET /api/v1/dapp/sync/status

响应:
{
  "code": 0,
  "message": "success",
  "data": {
    "inProgress": false,
    "lastSyncTime": "2024-12-01T10:30:45.123Z",
    "lastError": null,
    "lastSyncedIndex": 12450,
    "totalSyncedCount": 12450
  }
}
```

### 重置同步索引
```bash
DELETE /api/v1/dapp/sync/index
X-API-Key: your-secret-key (可选)

响应:
{
  "code": 0,
  "message": "同步索引已重置，下次增量同步将从头开始"
}
```

## 使用场景

### 场景 1: 常规外部定时任务

定时器每小时调用一次增量同步：
```bash
# 使用 cron 或其他定时工具
0 * * * * curl -X POST http://localhost:5000/api/v1/dapp/sync/incremental \
  -H "Content-Type: application/json" \
  -H "X-API-Key: secret-key"
```

**好处**:
- 即使服务重启，下次同步从上次位置继续
- 只同步新增用户，节省资源
- 快速追踪链上最新状态

### 场景 2: 链上数据异常恢复

如果发现数据不同步，重置索引后完整重新同步：
```bash
# 1. 重置索引
curl -X DELETE http://localhost:5000/api/v1/dapp/sync/index \
  -H "X-API-Key: secret-key"

# 2. 触发完整同步
curl -X POST http://localhost:5000/api/v1/dapp/sync \
  -H "X-API-Key: secret-key"
```

### 场景 3: 服务器重启恢复

服务启动时自动：
1. 加载 `.sync-state.json` 中的索引
2. 从保存的位置继续增量同步
3. 无需手动干预

## 监控建议

### 1. 定期检查同步状态
```bash
curl http://localhost:5000/api/v1/dapp/sync/status
```

### 2. 监控日志输出
```
[SyncState] 加载同步状态: { lastSyncedIndex: 12450, ... }
[ChainSync] 新增用户: 150, 成功: 148, 失败: 2
[SyncState] 同步状态已保存
```

### 3. 设置告警
- 如果 `lastError` 非空，表示上次同步失败
- 如果 `lastSyncTime` 超过 2 小时，表示长时间未同步

## 故障排除

### 问题 1: 服务重启后索引重置到 0
**原因**: `.sync-state.json` 文件不存在或损坏

**解决**:
1. 检查文件是否存在: `ls -la .sync-state.json`
2. 手动创建文件:
```bash
echo '{"lastSyncedIndex":12450,"lastSyncTime":"2024-12-01T10:30:45Z","lastError":null,"totalSyncedCount":12450,"version":1}' > .sync-state.json
```

### 问题 2: 无法写入状态文件
**原因**: 文件权限不足

**解决**:
```bash
# 检查权限
ls -la .sync-state.json

# 修改权限（使用部署用户）
chmod 644 .sync-state.json
```

### 问题 3: 同步后状态未保存
**原因**: 同步过程中出错

**检查**:
1. 查看日志中是否有 `[SyncState] 保存状态文件失败` 错误
2. 检查磁盘空间是否充足
3. 检查文件系统权限

## 性能考虑

- **文件大小**: `.sync-state.json` 通常 < 500 字节，可忽略
- **I/O 开销**: 每次同步时只写入一次，不会频繁 I/O
- **并发安全**: 目前单进程部署，无并发问题

## 备份建议

生产环境建议定期备份 `.sync-state.json`:
```bash
# 每天备份一次
0 1 * * * cp .sync-state.json .sync-state.backup.$(date +\%Y\%m\%d).json
```

## 环境变量配置

### SYNC_API_KEY
增量同步接口的可选 API 密钥验证：
```bash
# 在 .env 中配置
SYNC_API_KEY=your-secret-key-here
```

如果配置了，所有同步相关接口都需要在请求头中包含正确的密钥：
```bash
curl -H "X-API-Key: your-secret-key-here" http://localhost:5000/api/v1/dapp/sync/incremental
```

## 总结

持久化系统确保了：
✅ 服务重启后同步进度不丢失
✅ 减少重复同步的资源消耗
✅ 快速追踪链上最新数据
✅ 便于运维和监控
✅ 支持外部定时任务集成
