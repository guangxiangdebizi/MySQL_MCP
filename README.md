# MySQL MCP Server 3.2 🚀

一个功能强大且易用的MySQL数据库MCP（Model Context Protocol）服务器，让你的AI助手可以安全地进行完整的数据库操作。**v3.2 支持多数据库 Header 预配置，一次性配置多个数据库连接，连接信息不会暴露给 AI！**

> **🎯 目标用户**: 希望在 Claude Desktop、VSCode Cline 等 MCP 客户端中使用 AI 助手进行 MySQL 数据库操作的开发者

## 📖 目录

- [🌟 功能特性](#-功能特性)
- [🆕 v3.1 新特性](#-v31-新特性)
- [🔧 工具概览](#-工具概览)
- [🛠️ 安装教程](#️-安装教程)
- [⚙️ 配置方法](#️-配置方法)
- [🎮 使用指南](#-使用指南)
- [🔄 事务管理](#-事务管理)
- [📊 日志系统](#-日志系统)
- [❗ 故障排除](#-故障排除)
- [💡 使用技巧](#-使用技巧)
- [🔒 安全说明](#-安全说明)

---

## 🌟 功能特性

### ✨ 核心功能
- 📦 **NPM包支持**: 一键安装 `npm install -g @xingyuchen/mysql-mcp-server`，即装即用
- 🌐 **双模式部署**: 支持 stdio 模式（本地）和 StreamableHTTP 模式（服务器）
- 🔐 **Header 预配置**: 通过 HTTP Headers 传递数据库连接信息，不暴露给 AI
- 🔗 **多数据库连接**: 同时管理多个 MySQL 数据库连接，无需频繁切换
- 🎯 **智能连接管理**: 支持连接标识、活跃连接切换和连接状态监控
- 🔄 **完整CRUD操作**: 支持 INSERT、UPDATE、DELETE、SELECT 等所有 SQL 操作
- 🛡️ **自动事务管理**: 修改操作自动开启事务，支持智能回滚
- 📊 **增强表查看**: 显示表结构概览、行数统计和样本数据
- 📝 **智能日志系统**: 详细记录所有操作，支持错误追踪和性能分析
- 🔙 **历史回滚功能**: 查看操作历史，选择性回滚到任意步骤

### 🎯 使用场景
- ✅ 完整的数据库 CRUD 操作（增删改查）
- ✅ 数据库结构分析和优化建议
- ✅ 批量数据处理和迁移
- ✅ 事务安全的数据修改
- ✅ 数据备份前的安全测试
- ✅ 复杂查询的构建和调试
- ✅ 远程服务器数据库管理（HTTP 模式）

---

## 🆕 v3.2 新特性

### 🔢 多数据库 Header 预配置

**一次性配置多个数据库**，通过 Headers 中的编号后缀（-1, -2, -3...）预配置多个数据库连接：

```json
{
  "mcpServers": {
    "mysql-mcp-http": {
      "type": "streamableHttp",
      "url": "http://localhost:3000/mcp",
      "headers": {
        "X-MySQL-Host-1": "prod.mysql.com",
        "X-MySQL-User-1": "prod_user",
        "X-MySQL-Password-1": "prod_pass",
        "X-MySQL-Database-1": "production",
        
        "X-MySQL-Host-2": "test.mysql.com",
        "X-MySQL-User-2": "test_user",
        "X-MySQL-Password-2": "test_pass",
        "X-MySQL-Database-2": "testing",
        
        "X-MySQL-Host-3": "dev.mysql.com",
        "X-MySQL-User-3": "dev_user",
        "X-MySQL-Password-3": "dev_pass",
        "X-MySQL-Database-3": "development"
      }
    }
  }
}
```

**优点：**
- ✅ 一次配置多个数据库（生产、测试、开发等）
- ✅ 所有数据库凭证都不会暴露给 AI
- ✅ 自动创建连接 ID：`header_db_1`, `header_db_2`, `header_db_3`
- ✅ 使用 `list_connections` 查看所有连接
- ✅ 使用 `switch_active_connection` 在数据库间切换

### 🌐 StreamableHTTP 模式（v3.1）

全新的 HTTP 服务器模式，支持远程部署和多用户访问：

```bash
# 启动 HTTP 服务器
npm run start:http

# 服务运行在 http://localhost:3000/mcp
```

### 🔐 Header 预配置连接

**单数据库配置**（v3.1，仍然支持）：

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

**多数据库配置**（v3.2，推荐）：

```json
{
  "mcpServers": {
    "mysql-mcp-http": {
      "type": "streamableHttp",
      "url": "http://localhost:3000/mcp",
      "headers": {
        "X-MySQL-Host-1": "prod.mysql.com",
        "X-MySQL-User-1": "prod_user",
        "X-MySQL-Password-1": "prod_pass",
        "X-MySQL-Database-1": "production",
        
        "X-MySQL-Host-2": "test.mysql.com",
        "X-MySQL-User-2": "test_user",
        "X-MySQL-Password-2": "test_pass",
        "X-MySQL-Database-2": "testing"
      }
    }
  }
}
```

**优点：**
- ✅ 数据库凭证不会暴露给 AI
- ✅ 预先配置，无需每次连接
- ✅ 支持多数据库（v3.2+）
- ✅ 自动建立连接，开箱即用

### 🔧 兼容原有工具参数连接

保留原有的 `connect_database` 工具，AI 可以询问用户后动态连接：

```json
{
  "mcpServers": {
    "mysql-mcp": {
      "command": "npx",
      "args": ["-y", "@neigezhujiayi/mysql-mcp-server"]
    }
  }
}
```

### 📋 两种模式对比

| 特性 | stdio 模式 | HTTP 模式 + Header 预配置 |
|------|-----------|--------------------------|
| **适用场景** | 本地使用 | 服务器部署 / 远程访问 |
| **启动方式** | `npx -y @xingyuchen/mysql-mcp-server` | `npm run start:http` |
| **数据库连接** | AI询问用户后连接 | Headers预配置,自动连接 |
| **安全性** | 中等（需告知AI） | 高（凭证不暴露给AI） |
| **配置复杂度** | 简单 | 中等（需配置Headers） |
| **推荐用途** | 个人开发、快速测试 | 生产部署、多用户、远程访问 |

### 🔍 连接来源标识

使用 `list_connections` 工具可以清楚地看到连接来源：

```
📋 数据库连接列表

📊 总连接数: 4

1. 🔗 header_db_1 🔐(Header预配置) 🎯(活跃)
   📍 主机: prod.mysql.com:3306
   🗄️ 数据库: production
   👤 用户: prod_user
   ⏰ 连接时间: 2025-10-20 10:30:00

2. 🔗 header_db_2 🔐(Header预配置)
   📍 主机: test.mysql.com:3306
   🗄️ 数据库: testing
   👤 用户: test_user
   ⏰ 连接时间: 2025-10-20 10:30:01

3. 🔗 header_db_3 🔐(Header预配置)
   📍 主机: dev.mysql.com:3306
   🗄️ 数据库: development
   👤 用户: dev_user
   ⏰ 连接时间: 2025-10-20 10:30:02

4. 🔗 localhost_test_1729401234 🔧(工具参数)
   📍 主机: localhost:3306
   🗄️ 数据库: test_db
   👤 用户: test_user
   ⏰ 连接时间: 2025-10-20 10:35:00
```

**AI 使用示例：**
```
User: 切换到测试数据库
AI: [调用 switch_active_connection，参数：header_db_2]

User: 在生产数据库上查询用户总数
AI: [调用 execute_query，参数：connection_id=header_db_1]
```

---

## 🔧 工具概览

### 核心工具 (14个)

| 工具名称 | 功能描述 | 使用场景 |
|---------|----------|----------|
| `connect_database` | 连接MySQL数据库 | 建立数据库连接（支持连接ID） |
| `execute_query` | **万能SQL执行工具** | 执行任何SQL操作（CRUD、DDL等） |
| `show_tables` | 显示所有表及结构概览 | 快速了解数据库整体结构 |
| `describe_table` | 显示表详细结构和样本数据 | 深入了解特定表的结构和内容 |
| `begin_transaction` | 开始事务 | 手动控制事务开始 |
| `commit_transaction` | 提交事务 | 确认所有修改 |
| `rollback_transaction` | 回滚事务 | 撤销所有未提交修改 |
| `show_transaction_history` | 显示事务历史 | 查看所有操作记录 |
| `rollback_to_step` | 回滚到指定步骤 | 选择性撤销操作 |
| `full_rollback` | 完全回滚 | 撤销所有事务内操作 |
| `disconnect_database` | 断开数据库连接 | 安全关闭连接 |
| **`list_connections`** | **列出所有数据库连接** | **查看连接状态和来源** |
| **`switch_active_connection`** | **切换活跃连接** | **在多个数据库间切换** |
| **`remove_connection`** | **移除指定连接** | **清理不需要的连接** |

---

## 🛠️ 安装教程

### 📋 环境要求

- ✅ **Node.js 18+** - [下载地址](https://nodejs.org/)
- ✅ **MySQL 5.7+ 或 8.0+** - 确保数据库服务正在运行
- ✅ **MCP 客户端** - Claude Desktop、VSCode Cline 等

### 🚀 方法1: NPM安装（推荐）

```bash
# 全局安装
npm install -g @xingyuchen/mysql-mcp-server

# 验证安装
guangxiang-mysql-mcp --help
```

### 🔧 方法2: 源码安装

```bash
# 1. 下载项目
git clone https://github.com/guangxiangdebizi/MySQL_MCP.git
cd MySQL_MCP

# 2. 安装依赖
npm install

# 3. 构建项目
npm run build
```

---

## ⚙️ 配置方法

### 🔐 方式1: HTTP模式 + Header预配置（最安全，推荐生产环境）

#### 1. 启动 HTTP 服务器

```bash
# 默认端口 3000
npm run start:http

# 或指定端口
PORT=3001 npm run start:http
```

#### 2. 配置 Claude Desktop

编辑配置文件（位置因系统而异）：

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`  
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Linux**: `~/.config/Claude/claude_desktop_config.json`

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

#### 3. 重启 Claude Desktop

配置生效后，数据库连接会自动建立，**无需告诉 AI 你的数据库密码**！

### 📌 方式2: stdio模式 + NPM全局安装（推荐本地开发）

```json
{
  "mcpServers": {
    "mysql-database": {
      "command": "guangxiang-mysql-mcp",
      "env": {}
    }
  }
}
```

### 📌 方式3: stdio模式 + npx（无需安装）

```json
{
  "mcpServers": {
    "mysql-database": {
      "command": "npx",
      "args": ["-y", "@neigezhujiayi/mysql-mcp-server"],
      "env": {}
    }
  }
}
```

### 📌 方式4: 源码安装配置

```json
{
  "mcpServers": {
    "mysql-database": {
      "command": "node",
      "args": ["C:/path/to/MySQL_MCP/dist/index.js"],
      "env": {}
    }
  }
}
```

**📖 详细的 HTTP 配置指南**: 查看 [HTTP_CONFIG_EXAMPLE.md](./HTTP_CONFIG_EXAMPLE.md)

---

## 🎮 使用指南

### 🚀 基础连接

#### 使用 Header 预配置（HTTP 模式）

配置好 Headers 后，直接使用即可，无需连接步骤：

```
User: 显示所有数据库表
AI: [直接使用预配置的连接执行 show_tables]
```

#### 使用工具参数连接（stdio 模式）

```
User: 连接到我的数据库
AI: 请提供数据库连接信息...
User: 
- 主机: localhost
- 端口: 3306  
- 用户名: root
- 密码: your_password
- 数据库: test_db
AI: [使用 connect_database 工具连接]
```

### 🆕 多数据库连接管理

```
# 连接第一个数据库（自动成为活跃连接）
User: 连接到生产数据库：
- 主机: prod.mysql.com
- 数据库: production_db
- 连接ID: prod

# 连接第二个数据库
User: 连接到测试数据库：
- 主机: test.mysql.com  
- 数据库: test_db
- 连接ID: test

# 查看所有连接
User: 请列出所有数据库连接

# 切换活跃连接
User: 请切换到test连接

# 指定连接执行操作
User: 请在prod连接上查询用户表
```

### 📊 查看数据库结构

```
# 查看所有表概览
User: 请显示数据库中的所有表

# 查看特定表详情
User: 请描述users表的结构
```

### 🔄 执行CRUD操作

```sql
-- 查询数据
SELECT * FROM users WHERE age > 25 LIMIT 10

-- 插入数据  
INSERT INTO users (name, email, age) VALUES ('张三', 'zhang@example.com', 28)

-- 更新数据
UPDATE users SET age = 29 WHERE email = 'zhang@example.com'

-- 删除数据
DELETE FROM users WHERE id = 123
```

### 🛡️ 事务安全操作

```
# 查看事务历史
User: 请显示当前事务的操作历史

# 回滚到特定步骤
User: 请回滚到第3步操作之前

# 完全回滚
User: 请完全回滚所有未提交的操作

# 提交事务
User: 请提交当前事务
```

---

## 🔄 事务管理

### 自动事务管理

- **自动开启**: INSERT/UPDATE/DELETE 操作自动开启事务
- **智能记录**: 记录每个操作的详细信息和回滚查询
- **精确回滚**: 支持回滚到任意操作步骤

### 事务历史示例

```
📋 事务历史记录

🔹 步骤 1 (2024-01-15 10:30:15)
   类型: INSERT | 表: users | 影响行数: 1
   描述: 执行 INSERT 操作，影响 1 行
   SQL: INSERT INTO users (name, email) VALUES (?, ?)
   回滚: DELETE FROM users WHERE id = ?

🔹 步骤 2 (2024-01-15 10:31:22)  
   类型: UPDATE | 表: users | 影响行数: 1
   描述: 执行 UPDATE 操作，影响 1 行
   SQL: UPDATE users SET age = ? WHERE id = ?
   回滚: UPDATE users SET age = ? WHERE id = ?

💡 使用 rollback_to_step 可以回滚到任意步骤
```

---

## 📊 日志系统

### 日志文件类型

| 日志文件 | 内容 | 用途 |
|---------|------|------|
| `combined-*.log` | 所有日志信息 | 全面的操作记录 |
| `error-*.log` | 错误信息 | 问题诊断 |
| `database-*.log` | 数据库操作 | SQL执行追踪 |
| `exceptions-*.log` | 异常信息 | 系统异常分析 |

### 查看日志

```bash
# 查看实时日志
npm run logs:tail

# 查看错误日志
npm run logs:errors

# 分析数据库操作
npm run logs:db-analysis

# 查看统计信息
npm run logs:stats
```

---

## 💡 使用技巧

### 🎯 最佳实践

#### 1. 选择合适的部署模式

```
本地开发 → stdio 模式（简单快速）
生产环境 → HTTP 模式 + Header 预配置（安全可靠）
多用户场景 → HTTP 模式（支持并发）
```

#### 2. 数据探索流程

```
1. show_tables 了解整体结构
2. describe_table 查看具体表
3. execute_query 进行操作
```

#### 3. 安全修改策略

```
1. 重要操作前先 SELECT 确认数据
2. 使用事务保护批量修改
3. 及时查看事务历史
4. 必要时使用回滚功能
```

### 🚀 高级用法

```sql
-- 复杂查询
SELECT u.name, COUNT(o.id) as order_count, SUM(o.amount) as total_amount
FROM users u 
LEFT JOIN orders o ON u.id = o.user_id 
WHERE u.created_at >= '2024-01-01'
GROUP BY u.id, u.name
HAVING total_amount > 1000
ORDER BY total_amount DESC
LIMIT 20

-- 批量操作
INSERT INTO products (name, price, category_id) VALUES 
('产品A', 99.99, 1),
('产品B', 149.99, 2),
('产品C', 199.99, 1)

-- 条件更新
UPDATE inventory 
SET stock = stock - 1 
WHERE product_id = 123 AND stock > 0
```

---

## 🔒 安全说明

### ⚠️ 重要提醒

- **完整权限**: 支持完整 CRUD 操作，请谨慎使用
- **事务保护**: 所有修改操作都有事务保护和回滚功能
- **日志记录**: 所有操作都会被详细记录
- **Header 预配置**: 使用 HTTP 模式时，强烈推荐使用 Header 预配置，避免凭证暴露

### 🛡️ 安全建议

#### 1. 数据库用户权限

```sql
-- 创建专用 MCP 用户
CREATE USER 'mcp_user'@'localhost' IDENTIFIED BY 'strong_password';

-- 授予必要权限
GRANT SELECT, INSERT, UPDATE, DELETE ON your_database.* TO 'mcp_user'@'localhost';

-- 生产环境可能只需要只读权限
GRANT SELECT ON your_database.* TO 'mcp_readonly'@'localhost';
```

#### 2. HTTP 模式安全

```
✅ 使用 Header 预配置，避免凭证暴露
✅ 生产环境使用 HTTPS（配合 Nginx 等代理）
✅ 限制访问 IP（防火墙规则）
✅ 定期更新数据库密码
✅ 监控日志，发现异常访问
```

#### 3. 备份策略

```
✅ 重要操作前先备份数据
✅ 定期检查事务历史
✅ 保留操作日志用于审计
✅ 测试回滚功能是否正常
```

---

## ❗ 故障排除

### 常见问题

#### 1. 连接失败

```
问题: 无法连接到数据库
解决:
- 检查 MySQL 服务是否运行
- 确认连接参数正确（Host、Port、User、Password）
- 查看 error 日志获取详细信息
- HTTP 模式检查 Headers 配置是否完整
```

#### 2. Header 连接未生效

```
问题: 配置了 Headers 但仍提示需要连接
解决:
- 确认 Headers 名称正确（X-MySQL-Host, X-MySQL-User 等）
- 检查所有必填字段（host, user, password, database）
- 重启 HTTP 服务器
- 使用 list_connections 查看连接状态
```

#### 3. 权限错误

```
问题: Access denied 或权限不足
解决:
- 确认数据库用户权限
- 检查表的访问权限
- 查看 MySQL 错误日志
- 确认用户可以从当前主机连接
```

#### 4. 事务问题

```
问题: 事务状态异常
解决:
- 使用 show_transaction_history 查看状态
- 必要时使用 full_rollback 重置
- 检查 database 日志分析问题
- 确认连接未意外断开
```

---

## 📦 版本历史

### v3.2.0 (2025-10-20) 🆕
- 🔢 支持多数据库 Header 预配置（X-MySQL-*-1, X-MySQL-*-2...）
- ✨ 一次性配置多个数据库环境（生产、测试、开发等）
- 🔄 自动创建多个 Header 连接（header_db_1, header_db_2...）
- 📋 增强 list_connections 显示多数据库信息
- 🔧 兼容单数据库 Header 配置（向后兼容）

### v3.1.0 (2025-10-20)
- ✨ 新增 StreamableHTTP 模式支持
- 🔐 新增 HTTP Headers 预配置数据库连接
- 🏷️ 连接来源标识（Header预配置 vs 工具参数）
- 📡 健康检查端点
- 🔧 Express + CORS + dotenv 支持

### v3.0.0
- 🔗 多数据库连接管理
- 🎯 连接标识和切换
- 📋 连接列表和监控

### v2.0.0
- 🛠️ 工具简化
- 📊 增强展示
- 🔄 完整回滚
- 📝 日志系统

### v1.0.0
- 🎉 初始版本
- 🔧 基础 CRUD 操作
- 🛡️ 事务管理

---

## 📞 支持与反馈

- 🐛 **问题报告**: [GitHub Issues](https://github.com/guangxiangdebizi/MySQL_MCP/issues)
- 💡 **功能建议**: [GitHub Discussions](https://github.com/guangxiangdebizi/MySQL_MCP/discussions)
- 📧 **联系作者**: guangxiangdebizi@gmail.com
- 💼 **LinkedIn**: [Xingyu Chen](https://www.linkedin.com/in/xingyu-chen-b5b3b0313/)
- 📦 **NPM包**: [@xingyuchen/mysql-mcp-server](https://www.npmjs.com/package/@xingyuchen/mysql-mcp-server)

---

## 📄 License

Apache 2.0 License - 详见 [LICENSE](./LICENSE) 文件

---

**⭐ 如果这个项目对你有帮助，请给个 Star 支持一下！**
