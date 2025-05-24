# Smithery 部署指南 ☁️

本指南将帮助您将MySQL MCP Server部署到Smithery平台，实现云端访问。

## 🚀 Smithery平台简介

[Smithery](https://smithery.ai) 是专门为Model Context Protocol (MCP) 服务器设计的云平台，提供：

- 🌐 全球CDN部署
- 🔄 GitHub集成自动部署
- 📊 实时监控和统计
- 🔒 安全隔离的运行环境
- 💰 免费的基础服务

## 📋 部署前检查

在部署之前，请确保您的项目包含以下文件：

### ✅ 必需文件

| 文件名 | 说明 | 状态 |
|--------|------|------|
| `Dockerfile` | Docker容器构建配置 | ✅ 已包含 |
| `smithery.yaml` | Smithery平台配置 | ✅ 已包含 |
| `package.json` | Node.js项目配置 | ✅ 已包含 |
| `src/index.ts` | MCP服务器主文件 | ✅ 已包含 |
| `src/database.ts` | 数据库管理器 | ✅ 已包含 |

### 📄 配置文件详解

#### Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN npm run build
EXPOSE 3100
CMD ["node", "dist/index.js"]
```

#### smithery.yaml
```yaml
startCommand:
  type: stdio
  configSchema:
    type: object
    properties:
      description:
        type: string
        title: "服务器描述"
        default: "MySQL数据库查询服务器"
  commandFunction: |-
    (config) => ({
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    })
```

## 🔧 详细部署步骤

### 步骤1: 准备GitHub仓库

1. **Fork本项目**
   - 访问：https://github.com/guangxiangdebizi/MySQL_MCP
   - 点击右上角的 "Fork" 按钮
   - 选择您的GitHub账号

2. **验证文件完整性**
   ```bash
   # 克隆您Fork的仓库
   git clone https://github.com/YOUR_USERNAME/MySQL_MCP.git
   cd MySQL_MCP
   
   # 检查必需文件
   ls -la Dockerfile smithery.yaml package.json src/
   ```

### 步骤2: 登录Smithery

1. **访问Smithery平台**
   - 打开浏览器访问：https://smithery.ai
   - 点击 "Login" 或 "Sign up"

2. **GitHub授权**
   - 选择 "Continue with GitHub"
   - 授权Smithery访问您的GitHub仓库

### 步骤3: 创建部署

1. **开始部署**
   - 在Smithery控制台点击 "Deploy Server"
   - 选择 "Import from GitHub"

2. **选择仓库**
   - 在仓库列表中找到 `MySQL_MCP`
   - 点击 "Deploy" 按钮

3. **配置检查**
   - Smithery会自动检测配置文件
   - 确认 `Dockerfile` 和 `smithery.yaml` 被正确识别

### 步骤4: 监控构建

1. **构建过程**
   ```
   ⏳ Building Docker image...
   📦 Installing dependencies...
   🔨 Compiling TypeScript...
   ✅ Build completed successfully!
   ```

2. **部署状态**
   - 构建通常需要2-5分钟
   - 可以在控制台查看实时日志
   - 部署成功后会显示服务器URL

### 步骤5: 获取连接信息

部署成功后，您会获得：

```
🎉 部署成功！

服务器ID: mysql-mcp-abcd1234
服务器URL: https://server.smithery.ai/mysql-mcp-abcd1234/sse
状态: ✅ Running
```

## 🎯 客户端配置

### VSCode Cline

在VSCode的Cline扩展中配置：

```json
{
  "mcpServers": {
    "mysql-database-cloud": {
      "url": "https://server.smithery.ai/your-server-id/sse",
      "type": "sse",
      "name": "MySQL数据库 (云端)",
      "description": "Smithery云端部署的MySQL MCP服务器"
    }
  }
}
```

### Claude Desktop

在Claude Desktop的配置文件中：

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

### 其他客户端

任何支持MCP的客户端都可以使用SSE连接：

- **连接类型**: SSE (Server-Sent Events)
- **URL格式**: `https://server.smithery.ai/{server-id}/sse`
- **认证**: 无需额外认证（公开访问）

## 🔄 自动更新

### Git Push自动部署

每次推送代码到GitHub时，Smithery会自动重新部署：

```bash
# 本地修改代码
git add .
git commit -m "更新MySQL MCP服务器"
git push origin main

# Smithery会自动检测并重新部署
```

### 部署历史

在Smithery控制台可以查看：
- 📈 部署历史记录
- 📊 调用统计
- 🐛 错误日志
- 📝 构建日志

## 💡 使用示例

部署完成后，在AI对话中这样使用：

```
你好！我需要查询MySQL数据库。

请先连接到数据库：
- 主机: db.example.com
- 端口: 3306
- 用户名: readonly_user
- 密码: secure_password
- 数据库: ecommerce

然后显示所有的表。
```

AI会自动调用云端的MCP服务器来执行这些操作。

## 🔒 安全最佳实践

### 数据库安全

1. **创建只读用户**
   ```sql
   CREATE USER 'mcp_readonly'@'%' IDENTIFIED BY 'secure_password';
   GRANT SELECT ON your_database.* TO 'mcp_readonly'@'%';
   FLUSH PRIVILEGES;
   ```

2. **网络限制**
   - 只允许必要的IP地址访问数据库
   - 使用SSL连接加密数据传输

3. **密码管理**
   - 使用强密码
   - 定期轮换密码
   - 避免在日志中记录敏感信息

### 访问控制

- 🔐 Smithery服务器部署后是公开访问的
- 🛡️ 不要在MCP工具中硬编码敏感信息
- 📊 定期检查访问日志和使用统计

## ❗ 故障排除

### 常见部署错误

#### 1. 构建失败
```
错误: npm install failed
解决: 检查package.json依赖版本
```

#### 2. TypeScript编译错误
```
错误: tsc build failed
解决: 检查src/目录下的TypeScript代码语法
```

#### 3. Docker构建失败
```
错误: Dockerfile syntax error
解决: 检查Dockerfile格式和指令
```

### 获取帮助

- 📧 Smithery支持: support@smithery.ai
- 🐛 GitHub Issues: 在项目仓库提交问题
- 📖 文档: https://smithery.ai/docs

## 🎉 部署完成

恭喜！您已经成功将MySQL MCP Server部署到Smithery云平台。

现在您可以：
- ✅ 在任何地方访问您的MCP服务器
- ✅ 享受自动更新和监控功能
- ✅ 与团队成员共享云端服务
- ✅ 无需担心本地环境配置问题

开始享受云端AI数据库助手的便利吧！ 🚀 