# MySQL MCP Server 🚀

> **v4.0.0** - 全新架构重写，更简洁、更强大！

一个功能强大且易用的 MySQL 数据库 MCP（Model Context Protocol）服务器，支持 AI 助手安全地操作 MySQL 数据库。

## 🌟 核心特性

- 🌐 **StreamableHTTP 协议** - 基于最新 MCP 规范实现
- 🔐 **Header 预配置** - 凭证不暴露给 AI，安全可靠
- 🤖 **AI 动态管理** - AI 可以帮你添加/切换数据库连接
- 🔗 **多数据库支持** - 同时管理多个数据库，随时切换
- 📊 **完整 CRUD** - 支持所有 SQL 操作
- 🏗️ **模块化架构** - 清晰的目录结构，易于扩展

---

## 📦 安装

### 环境要求

- Node.js 18+
- MySQL 5.7+ 或 8.0+
- MCP 客户端（Claude Desktop、Cursor 等）

### 安装步骤

```bash
# 克隆项目
git clone https://github.com/guangxiangdebizi/MySQL_MCP.git
cd MySQL_MCP

# 安装依赖
npm install

# 编译
npm run build

# 启动服务器
npm start
```

---

## ⚙️ 配置方法

### 方式一：Header 预配置（推荐）

编辑 MCP 配置文件：

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`  
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Linux**: `~/.config/Claude/claude_desktop_config.json`

#### 单数据库配置

```json
{
  "mcpServers": {
    "mysql-mcp": {
      "type": "streamableHttp",
      "url": "http://localhost:3001/mcp",
      "timeout": 600,
      "headers": {
        "X-MySQL-Host": "localhost",
        "X-MySQL-Port": "3306",
        "X-MySQL-User": "root",
        "X-MySQL-Password": "your_password",
        "X-MySQL-Database": "your_database"
      }
    }
  }
}
```

#### 多数据库配置

```json
{
  "mcpServers": {
    "mysql-mcp": {
      "type": "streamableHttp",
      "url": "http://localhost:3001/mcp",
      "timeout": 600,
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

**优势：**
- ✅ 数据库凭证不暴露给 AI
- ✅ 启动即连接，无需手动操作
- ✅ 支持多数据库同时连接

### 方式二：AI 动态添加（灵活）

不配置 Header，让 AI 在对话中帮你添加连接：

```json
{
  "mcpServers": {
    "mysql-mcp": {
      "type": "streamableHttp",
      "url": "http://localhost:3001/mcp",
      "timeout": 600
    }
  }
}
```

**使用示例：**
```
你: 帮我连接到本地 MySQL，用户名 root，密码 123456，数据库 mydb
AI: [调用 add_connection 工具]
```

---

## 🔧 工具列表

### 连接管理

| 工具名称 | 功能说明 | 使用场景 |
|---------|---------|---------|
| `add_connection` | 添加数据库连接 | AI 帮你动态添加新连接 |
| `list_connections` | 列出所有连接 | 查看当前有哪些数据库 |
| `select_database` | 选择活跃数据库 | 切换到其他数据库 |
| `remove_connection` | 移除连接 | 清理不需要的连接 |

### 查询操作

| 工具名称 | 功能说明 | 使用场景 |
|---------|---------|---------|
| `execute_query` | 执行 SQL | 任何 SQL 操作（SELECT、INSERT、UPDATE、DELETE） |
| `show_tables` | 显示所有表 | 快速了解数据库结构 |
| `describe_table` | 查看表结构 | 查看字段、类型、样本数据 |
| `show_databases` | 显示所有数据库 | 查看可访问的数据库列表 |

---

## 🎮 使用示例

### 场景一：使用 Header 预配置

```
你: 显示所有表
AI: [调用 show_tables] 
    📊 数据库表列表 (共 5 个表)
    1. users
    2. orders
    3. products
    ...

你: 查看 users 表的结构
AI: [调用 describe_table，参数：users]
    📋 表结构: users
    字段信息:
    - id (INT, 主键)
    - name (VARCHAR)
    - email (VARCHAR)
    ...
```

### 场景二：AI 动态添加连接

```
你: 帮我连接两个数据库：
    1. 生产库：prod.mysql.com，用户 admin，密码 xxx，数据库 shop
    2. 测试库：test.mysql.com，用户 tester，密码 yyy，数据库 shop_test

AI: [调用 add_connection，参数：id=prod, host=prod.mysql.com...]
    [调用 add_connection，参数：id=test, host=test.mysql.com...]
    ✅ 两个数据库连接已添加

你: 列出所有连接
AI: [调用 list_connections]
    📊 当前数据库连接列表 (共 2 个)
    🟢 [1] prod
       └─ prod.mysql.com:3306/shop
       └─ ✅ 当前活跃连接
    ⚪ [2] test
       └─ test.mysql.com:3306/shop_test

你: 切换到测试库
AI: [调用 select_database，参数：test]
    ✅ 已选择数据库: test

你: 查询用户表前 10 条
AI: [调用 execute_query，SQL: SELECT * FROM users LIMIT 10]
    ✅ 查询成功，返回 10 行数据
    [显示 JSON 格式数据]
```

---

## 🏗️ 项目架构

```
MySQL_MCP/
├── src/
│   ├── index.ts              # 主入口（HTTP Server + 会话管理）
│   ├── database.ts           # 数据库连接管理器
│   └── tools/                # 工具模块
│       ├── index.ts          # 工具统一导出和路由
│       ├── connection.ts     # 连接管理工具
│       └── query.ts          # 查询工具
├── dist/                     # 编译后的 JS 文件
├── package.json
├── tsconfig.json
└── README.md
```

**核心设计：**
- **index.ts** - Express HTTP 服务器 + MCP Server 初始化
- **database.ts** - 封装数据库连接池和查询逻辑
- **tools/** - 每个文件负责一类工具的定义和处理

---

## 🔒 安全建议

### 数据库权限配置

为 MCP 创建专用数据库用户，限制权限：

```sql
-- 创建专用用户
CREATE USER 'mcp_user'@'%' IDENTIFIED BY 'strong_password';

-- 授予必要权限
GRANT SELECT, INSERT, UPDATE, DELETE ON your_database.* TO 'mcp_user'@'%';

-- 生产环境只读用户
GRANT SELECT ON your_database.* TO 'mcp_readonly'@'%';
```

### HTTP 模式安全

- ✅ 使用 Header 预配置，避免凭证暴露给 AI
- ✅ 生产环境使用 HTTPS（Nginx 反向代理）
- ✅ 限制访问 IP（防火墙规则）
- ✅ 定期更新数据库密码
- ✅ 监控日志，发现异常访问

---

## 🚀 NPM 脚本

```bash
# 开发模式（TypeScript 直接运行）
npm run dev

# 编译
npm run build

# 生产模式（运行编译后的 JS）
npm start

# 全局安装
npm run install-global
```

---

## 📝 环境变量

创建 `.env` 文件（可选）：

```env
# HTTP 服务器端口
PORT=3001

# Node 环境
NODE_ENV=production
```

---

## ❗ 常见问题

### 1. 端口被占用

**错误：** `EADDRINUSE: address already in use :::3001`

**解决：** 修改 `.env` 文件中的 `PORT`，或终止占用进程

```bash
# Windows
netstat -ano | findstr :3001
taskkill /F /PID <PID>

# Linux/Mac
lsof -ti:3001 | xargs kill -9
```

### 2. 连接失败

**错误：** `数据库连接失败`

**检查：**
- MySQL 服务是否运行
- 主机、端口、用户名、密码是否正确
- 防火墙是否允许连接

### 3. 会话丢失

**问题：** 重启服务器后提示 "Session not found"

**原因：** 会话存储在内存中，重启后清空

**解决：** 刷新 MCP 客户端（重新初始化）

### 4. 连接已关闭错误

**错误：** `Can't add new command when connection is in closed state`

**原因：** 
- 数据库连接长时间空闲，MySQL 服务器关闭了连接
- 网络中断导致连接断开

**解决方案：** 
- ✅ v4.0.5+ 已使用连接池替代单连接，自动支持：
  - 连接保活（Keep-Alive）机制
  - 自动重连功能
  - 并发查询支持
- 如果仍遇到问题，请重启 MCP 服务器

---

## 📦 版本历史

### v4.0.5 (2025-12-09) - 连接池优化

- 🎯 使用连接池替代单连接
- 🔄 自动连接保活（Keep-Alive）
- 🔌 自动重连机制
- 🚀 支持并发查询
- 🐛 修复 "connection in closed state" 错误

### v4.0.0 (2025-12-09) - 全新架构

- 🔥 完全重写，全新模块化架构
- ✨ 基于最新 MCP StreamableHTTP 协议
- 🎯 简化工具：连接管理 + 查询操作
- 🏗️ 清晰的目录结构：`tools/` 模块化
- 🚀 更快的响应速度
- 📖 更清晰的代码注释

### v3.x - 旧版本

- 支持事务管理、回滚等复杂功能
- 较为复杂的架构

---

## 📞 支持与反馈

- 🐛 **问题报告**: [GitHub Issues](https://github.com/guangxiangdebizi/MySQL_MCP/issues)
- 💡 **功能建议**: [GitHub Discussions](https://github.com/guangxiangdebizi/MySQL_MCP/discussions)
- 📧 **联系作者**: guangxiangdebizi@gmail.com

---

## 🔧 故障排除

### 问题：`ERR_MODULE_NOT_FOUND` 错误

**错误信息**：
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '...@modelcontextprotocol/sdk...'
```

**解决方案**：

1. **删除并重新安装依赖**：
```bash
# 删除旧依赖
rm -rf node_modules package-lock.json  # Linux/Mac
# 或
rmdir /s /q node_modules && del package-lock.json  # Windows

# 清理缓存
npm cache clean --force

# 重新安装
npm install
```

2. **检查 Node.js 版本**：
```bash
node --version  # 需要 >= 18.0.0
```

3. **使用全局安装**：
```bash
npm install -g @xingyuchen/mysql-mcp-server@latest
```

### 问题：SSE 流断开

**错误信息**：
```
SSE stream disconnected: TypeError: terminated
```

**解决方案**：

在 `mcp.json` 中设置更长的超时或禁用超时：
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

### 问题：安全漏洞警告

**警告信息**：
```
npm audit: vulnerabilities found
```

**解决方案**：
```bash
# 自动修复
npm audit fix

# 如果还有问题，强制修复
npm audit fix --force

# 重新构建
npm run build
```

### 问题：端口被占用

**错误信息**：
```
Error: listen EADDRINUSE: address already in use :::3002
```

**解决方案**：

1. **更改端口**（在 `.env` 文件中）：
```env
PORT=3003
```

2. **或者关闭占用端口的进程**：
```bash
# Windows
netstat -ano | findstr :3002
taskkill /PID <进程ID> /F

# Linux/Mac
lsof -i :3002
kill -9 <进程ID>
```

### 获取更多帮助

- 🐛 [提交 Issue](https://github.com/guangxiangdebizi/MySQL_MCP/issues)
- 📖 [查看文档](https://github.com/guangxiangdebizi/MySQL_MCP#readme)
- 💬 [讨论区](https://github.com/guangxiangdebizi/MySQL_MCP/discussions)

---

## 📄 License

Apache 2.0 License - 详见 [LICENSE](./LICENSE) 文件

---

**⭐ 如果这个项目对你有帮助，请给个 Star 支持一下！**
