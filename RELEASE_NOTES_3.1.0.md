# 🚀 MySQL MCP Server v3.1.0 发布说明

发布日期: 2025-10-20

## 📋 版本信息

- **版本号**: 3.1.0
- **类型**: 功能更新 (Minor Release)
- **兼容性**: 完全向后兼容 v3.0.x

---

## 🆕 新增功能

### 1. 🌐 StreamableHTTP 模式支持

全新的 HTTP 服务器部署模式，支持远程访问和多用户场景：

```bash
# 启动 HTTP 服务器
npm run start:http

# 服务运行在 http://localhost:3000/mcp
```

**特性：**
- ✅ 基于 Express.js 的稳定 HTTP 服务器
- ✅ 支持 JSON-RPC 2.0 协议
- ✅ 会话管理和状态维护
- ✅ CORS 支持，允许跨域访问
- ✅ 健康检查端点 `/health`

### 2. 🔐 HTTP Headers 预配置数据库连接

**最大的安全改进**：通过 HTTP Headers 预先配置数据库连接信息，**凭证不会暴露给 AI**！

#### 配置示例

```json
{
  "mcpServers": {
    "mysql-mcp-http": {
      "type": "streamableHttp",
      "url": "http://localhost:3000/mcp",
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
- 🔐 数据库密码不会在对话中出现
- 🚀 自动建立连接，开箱即用
- 🛡️ 更安全的生产环境部署
- 📦 适合多用户和远程访问场景

### 3. 🏷️ 连接来源标识

`list_connections` 工具现在会显示连接来源：

```
1. 🔗 header_connection_abc123 🔐(Header预配置) 🎯(活跃)
   📍 主机: localhost:3306
   🗄️ 数据库: production_db

2. 🔗 localhost_test_1729401 🔧(工具参数)
   📍 主机: localhost:3306
   🗄️ 数据库: test_db
```

清楚地区分：
- 🔐 **Header预配置**: 通过 HTTP Headers 自动创建的连接
- 🔧 **工具参数**: 通过 `connect_database` 工具创建的连接

### 4. 📡 健康检查端点

HTTP 模式提供健康检查端点用于监控：

```bash
curl http://localhost:3000/health
```

**响应：**
```json
{
  "status": "healthy",
  "transport": "streamable-http",
  "activeSessions": 2,
  "version": "3.1.0"
}
```

---

## 🔧 技术改进

### 依赖更新

新增以下依赖支持 HTTP 模式：

```json
{
  "express": "^4.19.2",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1",
  "@types/express": "^4.17.21",
  "@types/cors": "^2.8.17"
}
```

### 新增脚本命令

```json
{
  "dev:http": "启动 HTTP 开发服务器",
  "start:stdio": "启动 stdio 模式",
  "start:http": "启动 HTTP 模式"
}
```

### 新增可执行文件

```json
{
  "bin": {
    "guangxiang-mysql-mcp": "dist/index.js",
    "guangxiang-mysql-mcp-http": "dist/httpServer.js"
  }
}
```

---

## 📚 文档更新

### 新增文档

1. **HTTP_CONFIG_EXAMPLE.md** - 详细的 HTTP 模式配置指南
   - StreamableHTTP 部署说明
   - Header 预配置详解
   - 客户端配置示例
   - 安全建议
   - 故障排除

2. **test-http-connection.js** - HTTP 模式测试脚本
   - 自动化测试健康检查
   - 测试会话初始化
   - 测试 Header 预配置连接
   - 验证工具列表

3. **.env.example** - 环境变量示例

### 更新文档

- **README.md** - 重写主文档，突出 v3.1 新特性
- **package.json** - 更新版本号和脚本命令

---

## 🔄 兼容性说明

### ✅ 完全向后兼容

所有 v3.0.x 的功能和配置在 v3.1.0 中继续工作：

```json
// v3.0.x 配置（继续有效）
{
  "mcpServers": {
    "mysql-database": {
      "command": "guangxiang-mysql-mcp",
      "env": {}
    }
  }
}
```

### 🆕 新增可选功能

HTTP 模式是**可选的**新功能，不影响现有 stdio 模式用户。

---

## 📦 安装与升级

### 全局升级

```bash
npm install -g @xingyuchen/mysql-mcp-server@3.1.0
```

### 从源码升级

```bash
cd MySQL_MCP
git pull origin master
npm install
npm run build
```

### 验证安装

```bash
# 检查版本
guangxiang-mysql-mcp --version  # 应显示 3.1.0

# 测试 stdio 模式
guangxiang-mysql-mcp

# 测试 HTTP 模式
npm run start:http
```

---

## 🎯 使用建议

### 选择部署模式

| 场景 | 推荐模式 | 原因 |
|-----|---------|------|
| 本地开发 | stdio 模式 | 简单快速，零配置 |
| 生产环境 | HTTP + Header 预配置 | 安全性高，凭证不暴露 |
| 多用户场景 | HTTP 模式 | 支持并发访问 |
| 远程访问 | HTTP 模式 | 可通过网络访问 |
| 快速测试 | stdio 模式 | 即装即用 |

### 迁移建议

#### 从 stdio 迁移到 HTTP 模式

**步骤1**: 启动 HTTP 服务器

```bash
npm run start:http
```

**步骤2**: 更新客户端配置

```json
{
  "mcpServers": {
    "mysql-mcp-http": {
      "type": "streamableHttp",
      "url": "http://localhost:3000/mcp",
      "headers": {
        "X-MySQL-Host": "your_host",
        "X-MySQL-User": "your_user",
        "X-MySQL-Password": "your_password",
        "X-MySQL-Database": "your_database"
      }
    }
  }
}
```

**步骤3**: 重启客户端，享受更安全的连接方式！

---

## 🐛 已知问题

### 1. Windows 文件权限

在 Windows 上，构建脚本中的 `chmodSync` 可能会静默失败，但不影响功能。

**解决方案**: 这是预期行为，Windows 不需要文件权限设置。

### 2. HTTP 模式端口占用

如果端口 3000 被占用，服务器将无法启动。

**解决方案**: 使用环境变量指定其他端口：
```bash
PORT=3001 npm run start:http
```

---

## 🔮 未来计划

### v3.2.0 计划功能

- 🔑 支持更多认证方式（Bearer Token、API Key）
- 📊 WebSocket 支持，实现实时推送
- 🎨 连接池管理和优化
- 📈 性能监控和统计
- 🐳 Docker 镜像和 Docker Compose 配置

### 长期路线图

- 🌍 支持其他数据库（PostgreSQL、MongoDB）
- 🔐 端到端加密
- 👥 多用户权限管理
- 📱 Web 管理界面

---

## 💬 反馈与支持

遇到问题或有建议？欢迎联系：

- 🐛 **Bug 报告**: [GitHub Issues](https://github.com/guangxiangdebizi/MySQL_MCP/issues)
- 💡 **功能请求**: [GitHub Discussions](https://github.com/guangxiangdebizi/MySQL_MCP/discussions)
- 📧 **Email**: guangxiangdebizi@gmail.com
- 💼 **LinkedIn**: [Xingyu Chen](https://www.linkedin.com/in/xingyu-chen-b5b3b0313/)

---

## 🙏 致谢

感谢所有使用和支持 MySQL MCP Server 的用户！你们的反馈和建议让项目不断改进。

特别感谢：
- Model Context Protocol 团队提供的优秀框架
- Express.js 社区
- 所有提出问题和建议的用户

---

**⭐ 如果这个项目对你有帮助，请给个 Star 支持一下！**

[⬆️ 返回顶部](#-mysql-mcp-server-v310-发布说明)

