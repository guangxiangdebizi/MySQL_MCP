# 更新日志

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

