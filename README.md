# MySQL MCP Server 🚀

一个功能强大且易用的 MySQL 数据库 MCP（Model Context Protocol）服务器，让 AI 助手可以安全地操作 MySQL 数据库。

> **🎯 目标用户**: 希望在 Claude Desktop、VSCode Cline 等 MCP 客户端中使用 AI 助手进行 MySQL 数据库操作的开发者

## 📖 快速导航

- [功能特性](#-功能特性)
- [安装教程](#️-安装教程)
- [配置方法](#️-配置方法)
- [工具列表](#-工具列表)
- [使用示例](#-使用示例)

---

## 🌟 功能特性

- 📦 **NPM 包支持**: `npm install -g @xingyuchen/mysql-mcp-server`，即装即用
- 🌐 **双模式部署**: stdio 模式（本地）和 HTTP 模式（服务器）
- 🔐 **安全连接**: HTTP 模式支持 Header 预配置，凭证不暴露给 AI
- 🔗 **多数据库管理**: 同时连接多个数据库，自由切换
- 🔄 **完整 CRUD**: 支持所有 SQL 操作（SELECT、INSERT、UPDATE、DELETE）
- 🛡️ **事务保护**: 自动事务管理，支持回滚
- 📊 **结构查看**: 快速查看表结构和数据
- 📝 **日志系统**: 详细记录所有操作

---

## 🛠️ 安装教程

### 环境要求

- Node.js 18+
- MySQL 5.7+ 或 8.0+
- MCP 客户端（Claude Desktop、VSCode Cline 等）

### 安装方式

```bash
# 全局安装（推荐）
npm install -g @xingyuchen/mysql-mcp-server

# 验证安装
guangxiang-mysql-mcp --help
```

---

## ⚙️ 配置方法

### 方式 1: stdio 模式（本地使用，最简单）

**适合场景**: 个人本地开发、快速测试

编辑 MCP 配置文件：

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`  
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mysql-mcp": {
      "command": "npx",
      "args": ["-y", "@xingyuchen/mysql-mcp-server"]
    }
  }
}
```

> 使用时 AI 会询问你的数据库连接信息，然后建立连接。

---

### 方式 2: HTTP 模式 + Header 预配置（生产环境，最安全）

**适合场景**: 生产部署、远程访问、多用户、凭证保护

#### 步骤 1: 启动 HTTP 服务器

```bash
# 默认端口 3000
npm run start:http

# 或指定端口
PORT=3001 npm run start:http
```

#### 步骤 2: 配置单个数据库

```json
{
  "mcpServers": {
    "mysql-mcp-http": {
      "type": "streamableHttp",
      "url": "http://localhost:3000/mcp",
      "timeout": 600,
      "headers": {
        "X-MySQL-Host": "localhost",
        "X-MySQL-Port": "3306",
        "X-MySQL-User": "your_username",
        "X-MySQL-Password": "your_password",
        "X-MySQL-Database": "your_database"
      }
    }
  }
}
```

#### 步骤 3: 配置多个数据库（可选）

如果需要同时连接多个数据库（如生产、测试、开发），使用编号后缀：

```json
{
  "mcpServers": {
    "mysql-mcp-http": {
      "type": "streamableHttp",
      "url": "http://localhost:3000/mcp",
      "headers": {
        "X-MySQL-Host-1": "prod.mysql.com",
        "X-MySQL-User-1": "prod_user",
        "X-MySQL-Password-1": "prod_password",
        "X-MySQL-Database-1": "production",
        
        "X-MySQL-Host-2": "test.mysql.com",
        "X-MySQL-User-2": "test_user",
        "X-MySQL-Password-2": "test_password",
        "X-MySQL-Database-2": "testing"
      }
    }
  }
}
```

**优势**:
- ✅ 数据库凭证不会暴露给 AI
- ✅ 自动建立连接，开箱即用
- ✅ 支持多数据库同时连接

---

## 🔧 工具列表

本服务器提供 14 个工具，覆盖数据库的所有操作场景：

| 工具名称 | 功能说明 | 使用场景 |
|---------|---------|---------|
| `connect_database` | 连接 MySQL 数据库 | 建立新的数据库连接（支持连接 ID） |
| `list_connections` | 列出所有连接 | 查看当前所有数据库连接及状态 |
| `switch_active_connection` | 切换活跃连接 | 在多个数据库间切换 |
| `remove_connection` | 移除指定连接 | 清理不需要的连接 |
| `show_tables` | 显示所有表 | 快速了解数据库整体结构 |
| `describe_table` | 查看表详情 | 显示表结构、字段类型和样本数据 |
| `execute_query` | 执行 SQL 查询 | 执行任何 SQL 操作（SELECT、INSERT、UPDATE、DELETE、DDL 等） |
| `begin_transaction` | 开始事务 | 手动开启事务 |
| `commit_transaction` | 提交事务 | 确认所有修改 |
| `rollback_transaction` | 回滚事务 | 撤销所有未提交修改 |
| `show_transaction_history` | 查看事务历史 | 显示所有操作记录 |
| `rollback_to_step` | 回滚到指定步骤 | 选择性撤销某个操作 |
| `full_rollback` | 完全回滚 | 撤销所有事务内操作 |
| `disconnect_database` | 断开连接 | 安全关闭数据库连接 |

---

## 🎮 使用示例

### 基础操作

```
# 查看数据库结构
User: 显示数据库中的所有表
AI: [调用 show_tables]

# 查看表详情
User: 请描述 users 表的结构
AI: [调用 describe_table，参数：users]

# 查询数据
User: 查询年龄大于 25 岁的所有用户
AI: [调用 execute_query，SQL: SELECT * FROM users WHERE age > 25]
```

### 数据修改（自动事务保护）

```
# 插入数据
User: 在 users 表中添加一个新用户：张三，邮箱 zhang@example.com
AI: [自动开启事务，执行 INSERT]

# 更新数据
User: 将用户 ID 为 123 的年龄改为 30
AI: [执行 UPDATE，记录到事务历史]

# 确认提交
User: 提交这些修改
AI: [调用 commit_transaction]
```

### 多数据库管理

```
# 查看所有连接
User: 列出所有数据库连接
AI: [调用 list_connections，显示所有连接及来源]

# 切换数据库
User: 切换到测试数据库
AI: [调用 switch_active_connection]

# 在指定连接执行操作
User: 在生产数据库上查询用户总数
AI: [调用 execute_query，指定 connection_id]
```

### 事务回滚

```
# 查看操作历史
User: 显示当前事务的操作历史
AI: [调用 show_transaction_history]

# 回滚到指定步骤
User: 回滚到第 3 步之前
AI: [调用 rollback_to_step，参数：3]

# 完全回滚
User: 撤销所有未提交的修改
AI: [调用 full_rollback]
```

---

## 🔒 安全建议

### 数据库权限配置

为 MCP 创建专用数据库用户，限制权限：

```sql
-- 创建专用用户
CREATE USER 'mcp_user'@'localhost' IDENTIFIED BY 'strong_password';

-- 授予必要权限
GRANT SELECT, INSERT, UPDATE, DELETE ON your_database.* TO 'mcp_user'@'localhost';

-- 生产环境只读用户
GRANT SELECT ON your_database.* TO 'mcp_readonly'@'localhost';
```

### HTTP 模式安全

- ✅ 使用 Header 预配置，避免凭证暴露给 AI
- ✅ 生产环境配合 HTTPS（Nginx 反向代理）
- ✅ 限制访问 IP（防火墙规则）
- ✅ 定期更新数据库密码
- ✅ 监控日志，发现异常访问

---

## ❗ 常见问题

### 1. 连接失败

- 检查 MySQL 服务是否运行
- 确认连接参数正确（Host、Port、User、Password）
- HTTP 模式检查 Headers 配置是否完整
- 查看日志文件获取详细错误信息

### 2. Header 连接未生效

- 确认 Headers 名称正确（`X-MySQL-Host`、`X-MySQL-User` 等）
- 检查所有必填字段（host、user、password、database）
- 重启 HTTP 服务器和 MCP 客户端
- 使用 `list_connections` 查看连接状态

### 3. 权限错误

- 确认数据库用户权限足够
- 检查用户是否可以从当前主机连接
- 查看 MySQL 错误日志

---

## 📦 版本历史

### v3.2.1 (2025-10-27) - 最新版本
- 🔧 修复连接稳定性问题
- ♻️ 自动重连机制
- 🏥 连接健康检查
- ⚡ 保活机制增强

### v3.2.0
- 🔢 支持多数据库 Header 预配置

### v3.1.0
- ✨ 新增 StreamableHTTP 模式
- 🔐 新增 HTTP Headers 预配置

### v3.0.0
- 🔗 多数据库连接管理

---

## 📞 支持与反馈

- 🐛 **问题报告**: [GitHub Issues](https://github.com/guangxiangdebizi/MySQL_MCP/issues)
- 💡 **功能建议**: [GitHub Discussions](https://github.com/guangxiangdebizi/MySQL_MCP/discussions)
- 📧 **联系作者**: guangxiangdebizi@gmail.com
- 📦 **NPM 包**: [@xingyuchen/mysql-mcp-server](https://www.npmjs.com/package/@xingyuchen/mysql-mcp-server)

---

## 📄 License

Apache 2.0 License - 详见 [LICENSE](./LICENSE) 文件

---

**⭐ 如果这个项目对你有帮助，请给个 Star 支持一下！**
