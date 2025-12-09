# 更新日志

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

