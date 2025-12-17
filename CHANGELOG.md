# 更新日志

## v4.0.7 (2025-12-17) - 🛡️ Robust connection_id Handling

### Improvement

🛡️ **Auto-fallback for invalid connection_id parameter**
  - AI agents may pass invalid `connection_id` values like "默认", "default", "active", etc.
  - Now automatically falls back to the active connection when an invalid value is detected
  - Prevents "Connection 'xxx' does not exist" errors caused by AI hallucination

### Technical Details

**Problem**:
  - AI agents (especially in Langchain) sometimes generate arbitrary `connection_id` values
  - Examples: `"默认"`, `"default"`, `"current"`, or non-existent IDs
  - Server would throw error: `连接 'xxx' 不存在`

**Solution**:
  - Added `normalizeConnectionId()` function to validate and normalize the parameter
  - Invalid values are automatically converted to `undefined` (use active connection)
  - Checks against a list of common invalid values
  - Verifies if the connection ID actually exists before using it

**Invalid Values Handled**:
```typescript
const invalidValues = [
  '默认', 'default', 'active', 'current', 'auto', 
  '当前', '活跃', 'none', 'null', 'undefined'
];
```

**Impact**:
  - More robust handling of AI-generated parameters
  - Graceful fallback instead of hard errors
  - Better user experience with AI assistants

---

## v4.0.6 (2025-12-16) - 🐛 Fix Langchain MCP Client Compatibility

### Bug Fix

🐛 **Fix "No active database connection" error when using Langchain MCP client**
  - Fixed async race condition in database connection initialization
  - Header-configured database connections now properly await completion before session initialization response
  - Ensures connections are fully established before any subsequent tool calls

### Technical Details

**Root Cause**:
  - Used `forEach` with async callback to add database connections in `onsessioninitialized` callback
  - `forEach` does NOT await async callbacks, causing the initialize response to return before connections are established
  - When Langchain client immediately sends `list_connections` request, connections may not be ready yet

**Solution**:
  - Created new `initializeDatabaseConnections()` async function using `for...of` loop
  - Moved database initialization BEFORE transport creation
  - Properly `await` all connection operations before returning initialize response

**Code Change**:
```typescript
// Before (broken) - forEach doesn't await
dbConfigs.forEach(async (config) => {
  await dbManager.addConnection(config);  // NOT awaited!
});

// After (fixed) - for...of properly awaits
for (const config of configs) {
  await dbManager.addConnection(config);  // Properly awaited
}
```

**Impact**:
  - Langchain MCP client now works correctly
  - All MCP clients that send rapid sequential requests after initialize will work reliably
  - No breaking changes to existing functionality

### Affected Users

This fix is specifically for users experiencing issues when:
- Using Langchain framework with MCP client
- Using any MCP client that sends requests immediately after initialization
- Seeing "No active database connection" error despite successful header configuration

---

## v4.0.5 (2025-12-09) - 🔄 连接池优化

### 重大修复

🐛 **修复 "Can't add new command when connection is in closed state" 错误**
  - 使用连接池（Connection Pool）替代单个连接
  - 解决长时间空闲导致连接被 MySQL 服务器关闭的问题
  - 解决网络中断导致连接断开的问题

### 新增功能

✨ **连接保活机制（Keep-Alive）**
  - 自动发送心跳包保持连接活跃
  - 防止 MySQL 服务器因超时关闭连接
  - 配置参数：`enableKeepAlive: true`, `keepAliveInitialDelay: 0`

✨ **自动重连功能**
  - 连接断开时自动创建新连接
  - 用户无感知的连接恢复
  - 提高系统稳定性和可靠性

✨ **并发查询支持**
  - 连接池大小：10 个连接
  - 支持多个查询同时执行
  - 自动队列管理

### 技术细节

**问题根源**:
  - 使用 `mysql.createConnection()` 创建单个连接
  - MySQL 服务器的 `wait_timeout` 和 `interactive_timeout` 会关闭空闲连接
  - 没有连接保活和重连机制
  - 连接关闭后继续使用会报错

**解决方案**:
  - 使用 `mysql.createPool()` 创建连接池
  - 配置连接池参数：
    - `connectionLimit: 10` - 最多 10 个连接
    - `enableKeepAlive: true` - 启用保活
    - `idleTimeout: 60000` - 空闲超时 60 秒
    - `waitForConnections: true` - 等待可用连接
  - 连接池自动管理连接生命周期

**代码变更**:
```typescript
// 旧代码（单连接）
const connection = await mysql.createConnection({...});

// 新代码（连接池）
const pool = mysql.createPool({
  ...config,
  connectionLimit: 10,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  idleTimeout: 60000,
});
```

**影响范围**:
  - 所有数据库查询操作更加稳定
  - 不再出现连接关闭错误
  - 支持更高的并发查询
  - 适合长时间运行的服务

### 配置说明

无需修改配置，连接池功能已内置并自动启用。

如果需要调整连接池大小，可以修改 `src/database.ts` 中的 `connectionLimit` 参数。

---

## v4.0.4 (2025-12-09) - 🔐 安全更新

### 安全修复

🔐 **修复 2 个安全漏洞**
  - **高风险**: 修复 @modelcontextprotocol/sdk < 1.24.0 的 DNS rebinding 保护缺失问题
  - **中等风险**: 修复 body-parser 的 URL 编码拒绝服务漏洞

### 依赖更新

📦 **升级核心依赖**
  - `@modelcontextprotocol/sdk`: 1.12.0 → 1.24.3
  - 其他相关依赖包自动更新

### 技术改进

🔧 **TypeScript 类型兼容性**
  - 适配新版 MCP SDK 的类型定义
  - 优化类型推断以避免编译错误

### 安全说明

此版本包含重要的安全修复，**强烈建议所有用户升级**！

---

## v4.0.3 (2025-12-09) - 🛠️ 优化会话管理

### 修复

🛠️ **修复 SSE 流断开问题 "TypeError: terminated"**
  - 重构会话管理，使用 `onsessioninitialized` 回调正确创建会话
  - 使用 `transport.onclose` 事件处理会话清理
  - 改进 transport 生命周期管理
  - 防止会话意外关闭导致的连接断开

### 技术细节

**问题根源**: 
  - 会话和 transport 的生命周期管理不当
  - 没有正确使用 StreamableHTTPServerTransport 的回调机制
  - SSE 流可能因会话状态问题而被提前终止

**解决方案**:
  - 在 `onsessioninitialized` 回调中创建和注册会话
  - 使用 `transport.onclose` 自动清理数据库连接和会话
  - 确保 transport 和 session 的生命周期同步

**影响范围**: 
  - SSE 连接更加稳定
  - 会话管理更加规范
  - 资源清理更加可靠

### 配置建议

如果仍遇到 SSE 断开问题，可以在 `mcp.json` 中调整超时设置：

```json
{
  "mysql-mcp-http": {
    "type": "streamableHttp",
    "url": "http://localhost:3002/mcp",
    "timeout": 0,  // 0 表示无超时限制
    "headers": { ... }
  }
}
```

---

## v4.0.2 (2025-12-09) - 🔧 修复 SSE 流错误

### 修复

🔧 **修复 "Failed to open SSE stream: Not Found" 错误**
  - 添加 `GET /mcp` 端点以支持 SSE (Server-Sent Events) 流
  - 添加 `DELETE /mcp` 端点以支持会话关闭
  - 完整实现 Streamable HTTP 协议的所有 HTTP 方法

### 技术细节

**问题根源**: 
  - Streamable HTTP 协议需要支持三种 HTTP 方法：
    - `POST /mcp` - 发送请求和接收响应
    - `GET /mcp` - 打开 SSE 流接收服务器推送的通知
    - `DELETE /mcp` - 关闭会话
  - 之前只实现了 POST，导致客户端无法打开 SSE 流

**解决方案**:
  - 实现 `GET /mcp` 处理 SSE 流请求
  - 实现 `DELETE /mcp` 处理会话清理
  - 所有端点都使用 `transport.handleRequest()` 统一处理

**影响范围**: 
  - 消除 "Failed to open SSE stream" 错误
  - 支持服务器主动向客户端推送通知（如果需要）
  - 支持优雅的会话关闭

---

## v4.0.1 (2025-12-09) - 🐛 紧急修复

### 修复

🔧 **修复 "Not connected" 错误**
  - 修复工具列表请求失败的问题
  - 正确实现 StreamableHTTPServerTransport 使用方式
  - 使用 `transport.handleRequest()` 替代错误的 `server.request()` 调用
  - 根据 MCP TypeScript SDK 官方文档重构请求处理逻辑

### 技术细节

**问题根源**: 
  - 错误地使用 `server.request()` 处理客户端请求
  - `server.request()` 是用于服务器向客户端发起请求的方法（如 LLM sampling）
  - 导致 "Not connected" 错误

**解决方案**:
  - 创建 `StreamableHTTPServerTransport` 实例
  - 调用 `server.connect(transport)` 建立连接
  - 使用 `transport.handleRequest()` 自动路由所有请求到对应处理器

**影响范围**: 
  - 所有 MCP 工具调用现在可以正常工作
  - Header 预配置连接功能正常

### 其他改进

📝 **更新 .gitignore**
  - 正确忽略 `node_modules/` 和 `dist/` 目录
  - 忽略日志文件和环境变量文件
  - 避免提交编译产物和敏感信息

---

## v4.0.0 (2025-12-09) - 🔥 全新架构

### 重大变更

- **完全重写代码库** - 采用全新模块化架构
- **简化工具集** - 从 14 个工具精简到 8 个核心工具
- **移除复杂功能** - 去掉事务管理、回滚等功能，专注核心场景

### 新增功能

✨ **模块化架构**
  - `src/tools/` 目录统一管理所有工具
  - `connection.ts` - 连接管理工具
  - `query.ts` - 查询工具
  - 每个工具模块独立维护，易于扩展

✨ **会话隔离**
  - 每个 MCP 会话拥有独立的连接管理器
  - Header 预配置的连接自动添加到会话
  - 会话之间互不干扰

✨ **更清晰的工具命名**
  - `add_connection` - 添加连接（取代 connect_database）
  - `select_database` - 选择数据库（取代 switch_active_connection）
  - 更符合直觉的命名方式

### 改进

⚡ **性能优化**
  - 移除不必要的日志系统依赖
  - 简化数据库连接池管理
  - 减少内存占用

📝 **文档完善**
  - 全新 README.md
  - 新增 QUICK_START.md 快速开始指南
  - 新增 CHANGELOG.md 更新日志

🏗️ **代码质量**
  - TypeScript 严格模式
  - 清晰的类型定义
  - 完善的错误处理
  - 详细的代码注释

### 移除功能

❌ **事务管理**
  - `begin_transaction`
  - `commit_transaction`
  - `rollback_transaction`
  - `show_transaction_history`
  - `rollback_to_step`
  - `full_rollback`

> **原因**: 这些功能在实际使用中场景较少，且增加了系统复杂度。如需事务支持，可在 SQL 中手动使用 `BEGIN`, `COMMIT`, `ROLLBACK`。

### 破坏性变更

⚠️ **工具重命名**
  - `connect_database` → `add_connection`
  - `switch_active_connection` → `select_database`
  - `list_connections` - 保持不变
  - `remove_connection` - 保持不变

⚠️ **返回格式变化**
  - 统一使用 `content: [{ type: 'text', text: '...' }]` 格式
  - 移除冗余的字段

⚠️ **配置变化**
  - 默认端口从 `3000` 改为 `3001`
  - 移除 `stdio` 模式支持（仅支持 HTTP）

### 迁移指南

如果你从 v3.x 升级：

1. **更新配置**
   ```json
   // 旧版本
   "url": "http://localhost:3000/mcp"
   
   // 新版本
   "url": "http://localhost:3001/mcp"
   ```

2. **更新工具调用**
   - 将 `connect_database` 改为 `add_connection`
   - 将 `switch_active_connection` 改为 `select_database`

3. **移除事务相关代码**
   - 如果使用了事务功能，改为手动 SQL 事务

---

## v3.2.1 (2025-10-27)

### 修复

- 🔧 修复连接稳定性问题
- ♻️ 自动重连机制
- 🏥 连接健康检查
- ⚡ 保活机制增强

---

## v3.2.0

### 新增

- 🔢 支持多数据库 Header 预配置

---

## v3.1.0

### 新增

- ✨ 新增 StreamableHTTP 模式
- 🔐 新增 HTTP Headers 预配置

---

## v3.0.0

### 新增

- 🔗 多数据库连接管理
- 🛡️ 事务保护功能
- 📝 完整的日志系统
- 🔄 智能回滚功能

---

## v2.x 及更早版本

详见 Git 历史记录。

