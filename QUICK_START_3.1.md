# 🚀 MySQL MCP Server v3.1 快速开始指南

## 📌 5分钟上手

### 🎯 选择部署方式

#### 方式1: HTTP 模式 + Header 预配置（推荐生产环境）

**特点**: 最安全，数据库密码不暴露给 AI

```bash
# 1. 安装
npm install -g @xingyuchen/mysql-mcp-server

# 2. 启动 HTTP 服务器
npm run start:http
```

**3. 配置 Claude Desktop** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "mysql-http": {
      "type": "streamableHttp",
      "url": "http://localhost:3000/mcp",
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

**4. 重启 Claude Desktop，完成！** 🎉

---

#### 方式2: stdio 模式（推荐本地开发）

**特点**: 简单快速，零配置

```bash
# 1. 安装
npm install -g @xingyuchen/mysql-mcp-server
```

**2. 配置 Claude Desktop** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "mysql": {
      "command": "guangxiang-mysql-mcp"
    }
  }
}
```

**3. 重启 Claude Desktop，对话连接：**

```
User: 连接数据库
AI: 请提供连接信息...
User: localhost, 3306, root, password, dbname
```

---

## 🔍 验证安装

### 检查 HTTP 服务器

```bash
# 健康检查
curl http://localhost:3000/health

# 应该返回
{
  "status": "healthy",
  "transport": "streamable-http",
  "version": "3.1.0"
}
```

### 在 Claude Desktop 中测试

```
User: 显示所有数据库表
AI: [调用 show_tables 工具，显示表列表]
```

---

## 📋 常用命令

```bash
# stdio 模式（本地）
guangxiang-mysql-mcp

# HTTP 模式（服务器）
npm run start:http

# 自定义端口
PORT=3001 npm run start:http

# 查看日志
npm run logs:tail
```

---

## 🎯 使用示例

### 查看数据库结构

```
User: 显示所有表
User: 描述 users 表的结构
```

### 查询数据

```
User: 查询所有年龄大于25岁的用户
User: 统计订单总数和总金额
```

### 修改数据（自动事务保护）

```
User: 插入一个新用户
User: 更新用户的邮箱
User: 显示事务历史
User: 如果有问题，请回滚
```

### 多数据库管理

```
User: 列出所有连接
User: 切换到测试数据库连接
User: 在生产数据库连接上执行查询
```

---

## 🔐 安全提示

### ✅ 推荐做法

- **生产环境**: 使用 HTTP + Header 预配置
- **开发环境**: 使用 stdio 模式
- **数据库用户**: 创建专用用户，限制权限
- **密码管理**: 使用强密码，定期更新

### ❌ 避免做法

- ❌ 在生产环境使用 root 用户
- ❌ 在对话中直接说出数据库密码（使用 Header 预配置）
- ❌ 不备份直接执行危险操作
- ❌ 忽略事务历史和回滚功能

---

## ❓ 常见问题

### Q: HTTP 模式启动失败？

```bash
# 检查端口是否被占用
PORT=3001 npm run start:http
```

### Q: Header 连接未生效？

- 检查所有必填字段（host, user, password, database）
- 确认 Header 名称正确（X-MySQL-*）
- 重启 HTTP 服务器和客户端

### Q: 如何查看连接来源？

```
User: 列出所有连接
AI: [显示连接列表，标记来源：Header预配置 / 工具参数]
```

### Q: 如何切换数据库？

```
User: 切换到测试数据库
或
User: 在生产连接上执行查询
```

---

## 📚 更多文档

- **完整文档**: [README.md](./README.md)
- **HTTP 配置**: [HTTP_CONFIG_EXAMPLE.md](./HTTP_CONFIG_EXAMPLE.md)
- **发布说明**: [RELEASE_NOTES_3.1.0.md](./RELEASE_NOTES_3.1.0.md)
- **发布指南**: [PUBLISH.md](./PUBLISH.md)

---

## 💬 获取帮助

- GitHub Issues: https://github.com/guangxiangdebizi/MySQL_MCP/issues
- Email: guangxiangdebizi@gmail.com
- NPM: https://www.npmjs.com/package/@xingyuchen/mysql-mcp-server

---

**🎉 开始使用 MySQL MCP Server 3.1！**

