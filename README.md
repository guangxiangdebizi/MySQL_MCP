# MySQL MCP Server 2.0 🚀

一个功能强大且易用的MySQL数据库MCP（Model Context Protocol）服务器，让你的AI助手可以安全地进行完整的数据库操作，包括增删改查、事务管理和智能回滚功能。

> **🎯 目标用户**: 希望在VSCode的Cline中使用AI助手进行完整MySQL数据库操作的开发者

## 📖 目录

- [🌟 功能特性](#-功能特性)
- [🔧 工具概览](#-工具概览)
- [☁️ Smithery云部署](#️-smithery云部署)
- [🛠️ 安装教程](#️-安装教程)
- [⚙️ 配置方法](#️-配置方法)
- [🎮 使用指南](#-使用指南)
- [🔄 事务管理](#-事务管理)
- [📊 日志系统](#-日志系统)
- [❗ 故障排除](#-故障排除)
- [💡 使用技巧](#-使用技巧)
- [🔒 安全说明](#-安全说明)

## 🌟 功能特性

### ✨ 核心功能
- 🔗 **智能数据库连接**: 支持动态连接MySQL数据库，参数灵活配置
- 🔄 **完整CRUD操作**: 支持INSERT、UPDATE、DELETE、SELECT等所有SQL操作
- 🛡️ **自动事务管理**: 修改操作自动开启事务，支持智能回滚
- 📊 **增强表查看**: 显示表结构概览、行数统计和样本数据
- 📝 **智能日志系统**: 详细记录所有操作，支持错误追踪和性能分析
- 🔙 **历史回滚功能**: 查看操作历史，选择性回滚到任意步骤
- 🚀 **双模式部署**: 支持stdio模式和HTTP/SSE模式

### 🎯 使用场景
- ✅ 完整的数据库CRUD操作（增删改查）
- ✅ 数据库结构分析和优化建议
- ✅ 批量数据处理和迁移
- ✅ 事务安全的数据修改
- ✅ 数据备份前的安全测试
- ✅ 复杂查询的构建和调试

### 🆕 2.0版本新特性
- 🎯 **工具简化**: 删除重复工具，保留万能的`execute_query`
- 📈 **增强展示**: `show_tables`显示表概览，`describe_table`包含样本数据
- 🔄 **完整回滚**: 自动生成精确的回滚查询，支持INSERT/UPDATE/DELETE回滚
- 📊 **实时监控**: 详细的操作统计和性能监控
- 🛡️ **安全升级**: 移除安全限制，支持完整数据库操作权限

## 🔧 工具概览

### 核心工具 (11个)

| 工具名称 | 功能描述 | 使用场景 |
|---------|----------|----------|
| `connect_database` | 连接MySQL数据库 | 建立数据库连接 |
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

### 🎯 主要改进

#### 1. 工具简化
```
旧版本: 15个工具 (insert_data, update_data, delete_data, select_data, create_table, drop_table, get_table_info...)
新版本: 11个工具 (保留万能的execute_query，删除重复功能)
```

#### 2. 增强展示
```
show_tables 输出示例:
📋 数据库概览
📊 总共找到 3 个表:

🗂️ **users**
   📊 行数: 1250
   🏗️ 列: id(int), name(varchar), email(varchar), created_at(datetime)

🗂️ **orders**
   📊 行数: 3420
   🏗️ 列: id(int), user_id(int), amount(decimal), status(enum), order_date(datetime)
```

#### 3. 样本数据展示
```
describe_table 输出示例:
🔍 表 "users" 的详细信息

📊 基本信息:
   总行数: 1250
   总列数: 4

🏗️ 表结构:
字段名               | 类型            | 可为空   | 键      | 默认值     | 额外信息
================================================================================
id                   | int(11)         | NO       | PRI     | NULL       | auto_increment
name                 | varchar(100)    | NO       |         | NULL       |
email                | varchar(255)    | YES      | UNI     | NULL       |
created_at           | datetime        | YES      |         | NULL       |

📄 样本数据 (前5行):
[
  {
    "id": 1,
    "name": "张三",
    "email": "zhangsan@example.com",
    "created_at": "2024-01-15T10:30:00.000Z"
  },
  ...
]
```

#### 4. 智能事务管理
```
自动功能:
- INSERT/UPDATE/DELETE操作自动开启事务
- 自动生成精确的回滚查询
- 记录每个操作的详细信息
- 支持选择性回滚到任意步骤

回滚查询示例:
INSERT → DELETE FROM table WHERE id = ?
UPDATE → UPDATE table SET col1=?, col2=? WHERE condition
DELETE → INSERT INTO table (col1, col2) VALUES (?, ?)
```

## ☁️ Smithery云部署

### 🚀 快速部署到Smithery

[Smithery](https://smithery.ai) 是专门为MCP服务器设计的云平台，可以一键部署您的MySQL MCP Server。

#### 🔧 部署步骤

1. **Fork项目到您的GitHub**
   ```bash
   https://github.com/guangxiangdebizi/MySQL_MCP
   ```

2. **登录Smithery平台**
   - 访问 [Smithery.ai](https://smithery.ai)
   - 使用GitHub账号登录

3. **连接GitHub仓库**
   - 点击 "Deploy Server"
   - 选择您Fork的 `MySQL_MCP` 仓库
   - 确认部署配置

4. **使用部署的服务器**
   ```json
   {
     "mcpServers": {
       "mysql-database": {
         "url": "https://server.smithery.ai/your-server-id/sse",
         "type": "sse"
       }
     }
   }
   ```

## 🛠️ 安装教程

### 📋 环境要求

- ✅ **Node.js 18+** - [下载地址](https://nodejs.org/)
- ✅ **MySQL 5.7+ 或 8.0+** - 确保数据库服务正在运行
- ✅ **VSCode** - [下载地址](https://code.visualstudio.com/)
- ✅ **Cline扩展** - 在VSCode扩展市场搜索"Cline"安装

### 🔧 快速安装

```bash
# 下载项目
git clone https://github.com/guangxiangdebizi/MySQL_MCP.git
cd MySQL_MCP

# 2. 安装依赖
npm install

# 3. 构建项目
npm run build

# 4. 测试安装
npm test
```

## ⚙️ 配置方法

### 📌 方法1: stdio模式配置（推荐）

在Cline设置中添加：

```json
{
  "mcpServers": {
    "mysql-database": {
      "command": "node",
      "args": ["C:/path/to/my-awesome-mcp/dist/index.js"],
      "env": {}
    }
  }
}
```

### 📌 方法2: HTTP/SSE模式配置

```json
{
  "mcpServers": {
    "mysql-database": {
      "url": "http://localhost:3101/sse",
      "type": "sse"
    }
  }
}
```

启动服务器：
```bash
npm run start:gateway
```

## 🎮 使用指南

### 🚀 基础连接

```
请帮我连接到MySQL数据库：
- 主机: localhost
- 端口: 3306  
- 用户名: root
- 密码: your_password
- 数据库: test_db
```

### 📊 查看数据库结构

```
# 查看所有表概览
请显示数据库中的所有表

# 查看特定表详情
请描述users表的结构
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
请显示当前事务的操作历史

# 回滚到特定步骤
请回滚到第3步操作之前

# 完全回滚
请完全回滚所有未提交的操作

# 提交事务
请提交当前事务
```

## 🔄 事务管理

### 自动事务管理

- **自动开启**: INSERT/UPDATE/DELETE操作自动开启事务
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
```

## 💡 使用技巧

### 🎯 最佳实践

1. **数据探索**
   ```
   先用show_tables了解整体结构
   再用describe_table查看具体表
   最后用execute_query进行操作
   ```

2. **安全修改**
   ```
   重要操作前先SELECT确认数据
   使用事务保护批量修改
   及时查看事务历史
   ```

3. **性能优化**
   ```
   使用LIMIT限制结果集大小
   添加WHERE条件过滤数据
   查看日志分析慢查询
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

## 🔒 安全说明

### ⚠️ 重要提醒

- **完整权限**: 2.0版本支持完整CRUD操作，请谨慎使用
- **事务保护**: 所有修改操作都有事务保护和回滚功能
- **日志记录**: 所有操作都会被详细记录
- **用户权限**: 建议创建专门的数据库用户，限制必要权限

### 🛡️ 安全建议

1. **数据库用户**
   ```sql
   CREATE USER 'mcp_user'@'localhost' IDENTIFIED BY 'strong_password';
   GRANT SELECT, INSERT, UPDATE, DELETE ON your_database.* TO 'mcp_user'@'localhost';
   ```

2. **备份策略**
   ```
   重要操作前先备份数据
   定期检查事务历史
   保留操作日志用于审计
   ```

## ❗ 故障排除

### 常见问题

1. **连接失败**
   ```
   检查MySQL服务是否运行
   确认连接参数正确
   查看error日志获取详细信息
   ```

2. **权限错误**
   ```
   确认数据库用户权限
   检查表的访问权限
   查看MySQL错误日志
   ```

3. **事务问题**
   ```
   使用show_transaction_history查看状态
   必要时使用full_rollback重置
   检查database日志分析问题
   ```

---

## 📞 支持与反馈

- 🐛 **问题报告**: [GitHub Issues](https://github.com/guangxiangdebizi/MySQL_MCP/issues)
- 💡 **功能建议**: [GitHub Discussions](https://github.com/guangxiangdebizi/MySQL_MCP/discussions)
- 📧 **联系作者**: 通过GitHub私信

---

**⭐ 如果这个项目对你有帮助，请给个Star支持一下！**
