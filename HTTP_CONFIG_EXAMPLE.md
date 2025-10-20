# MySQL MCP HTTP 模式配置指南

## 🌐 StreamableHTTP 模式支持

从 v3.0.0 开始，MySQL MCP 支持 StreamableHTTP 模式部署，提供两种数据库连接方式：

### 🔐 方式1：Header 预配置（推荐 - 更安全）

通过 MCP 客户端配置的 `headers` 传递数据库连接信息，连接信息不会暴露给 AI。

#### Claude Desktop 配置示例

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

**优点：**
- ✅ 数据库凭证不会暴露给 AI
- ✅ 预先配置，无需每次连接
- ✅ 更安全的部署方式
- ✅ 自动建立连接

**使用说明：**
1. 启动 HTTP 服务器：`npm run start:http`
2. 配置客户端 headers（如上所示）
3. 直接使用工具，无需 `connect_database`

---

### 🔧 方式2：工具参数连接（原有方式 - 保留兼容性）

通过 `connect_database` 工具让 AI 获取连接信息后动态连接。

#### Claude Desktop 配置示例

```json
{
  "mcpServers": {
    "mysql-mcp-http": {
      "type": "streamableHttp",
      "url": "http://localhost:3000/mcp",
      "timeout": 600
    }
  }
}
```

**使用说明：**
1. 启动 HTTP 服务器：`npm run start:http`
2. 使用 `connect_database` 工具连接数据库
3. AI 可以询问用户数据库信息后连接

**示例对话：**
```
User: 连接到我的数据库
AI: 请提供数据库连接信息：主机地址、端口、用户名、密码和数据库名
User: host: localhost, port: 3306, user: root, password: 123456, database: mydb
AI: [使用 connect_database 工具连接]
```

---

## 🚀 启动 HTTP 服务器

### 本地开发

```bash
# 安装依赖
npm install

# 编译项目
npm run build

# 启动 HTTP 服务器（默认端口 3000）
npm run start:http

# 或者使用自定义端口
PORT=3001 npm run start:http
```

### 生产部署

```bash
# 使用 PM2 部署
pm2 start dist/httpServer.js --name mysql-mcp-http

# 使用环境变量指定端口
PORT=3000 pm2 start dist/httpServer.js --name mysql-mcp-http

# Docker 部署
docker build -t mysql-mcp-http .
docker run -d -p 3000:3000 mysql-mcp-http
```

---

## 📋 支持的 Headers

| Header 名称 | 说明 | 必填 |
|------------|------|-----|
| `X-MySQL-Host` | 数据库主机地址 | ✅ |
| `X-MySQL-Port` | 数据库端口号 | ❌ (默认 3306) |
| `X-MySQL-User` | 数据库用户名 | ✅ |
| `X-MySQL-Password` | 数据库密码 | ✅ |
| `X-MySQL-Database` | 数据库名称 | ✅ |

---

## 🔍 查看连接信息

使用 `list_connections` 工具可以查看所有连接，包括：
- 🔐 Header 预配置的连接（标记为 "Header预配置"）
- 🔧 通过工具参数创建的连接（标记为 "工具参数"）

**示例输出：**
```
📋 数据库连接列表

📊 总连接数: 2

1. 🔗 header_connection_abc123 🔐(Header预配置) 🎯(活跃)
   📍 主机: localhost:3306
   🗄️ 数据库: mydb
   👤 用户: root
   ⏰ 连接时间: 2025-10-20 10:30:00

2. 🔗 localhost_testdb_1729401234567 🔧(工具参数)
   📍 主机: localhost:3306
   🗄️ 数据库: testdb
   👤 用户: testuser
   ⏰ 连接时间: 2025-10-20 10:35:00
```

---

## 📡 API 端点

### Health Check
```bash
GET http://localhost:3000/health
```

**响应：**
```json
{
  "status": "healthy",
  "transport": "streamable-http",
  "activeSessions": 1,
  "version": "3.0.0"
}
```

### MCP Endpoint
```bash
POST http://localhost:3000/mcp
Content-Type: application/json
Mcp-Session-Id: <session-id>
X-MySQL-Host: localhost
X-MySQL-Port: 3306
X-MySQL-User: root
X-MySQL-Password: 123456
X-MySQL-Database: mydb

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

---

## ⚙️ 环境变量

| 变量名 | 说明 | 默认值 |
|-------|------|-------|
| `PORT` | HTTP 服务器端口 | 3000 |

---

## 🔒 安全建议

1. **使用 HTTPS**：生产环境建议使用 HTTPS 代理（如 Nginx）
2. **限制访问**：配置防火墙规则，只允许信任的 IP 访问
3. **使用 Header 预配置**：避免在对话中暴露数据库凭证
4. **定期更新密码**：定期更新数据库密码
5. **日志监控**：定期检查日志文件，发现异常访问

---

## 📝 stdio 模式（本地使用）

如果你只是本地使用，推荐使用 stdio 模式（更简单）：

```json
{
  "mcpServers": {
    "mysql-mcp": {
      "command": "npx",
      "args": ["-y", "@neigezhujiayi/mysql-mcp-server"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

然后通过 `connect_database` 工具连接数据库即可。

---

## 🤔 选择哪种模式？

| 场景 | 推荐模式 | 连接方式 |
|-----|---------|---------|
| 本地个人使用 | stdio | 工具参数 |
| 服务器部署 | HTTP | Header 预配置 |
| 多用户共享 | HTTP | Header 预配置 |
| 测试开发 | stdio/HTTP | 工具参数 |

---

## 🐛 故障排除

### 问题：无法连接到数据库

**解决方案：**
1. 检查 MySQL 服务是否运行
2. 验证 Header 中的连接信息是否正确
3. 确认数据库用户有相应权限
4. 查看日志文件：`npm run logs:errors`

### 问题：Header 连接未生效

**解决方案：**
1. 确认 headers 配置完整（host, user, password, database 都必填）
2. 检查 Header 名称是否正确（大小写敏感）
3. 重启 HTTP 服务器
4. 使用 `list_connections` 查看连接状态

---

## 📚 相关文档

- [README.md](./README.md) - 项目主文档
- [README_ENHANCED.md](./README_ENHANCED.md) - 增强功能文档
- [SMITHERY_DEPLOY.md](./SMITHERY_DEPLOY.md) - Smithery 部署指南

