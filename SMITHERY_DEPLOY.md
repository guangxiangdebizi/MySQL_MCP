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
| `Dockerfile` | Docker容器构建配置 | ✅ 已包含（已修复构建问题） |
| `smithery.yaml` | Smithery平台配置 | ✅ 已包含 |
| `package.json` | Node.js项目配置 | ✅ 已包含 |
| `src/index.ts` | MCP服务器主文件 | ✅ 已包含 |
| `src/database.ts` | 数据库管理器 | ✅ 已包含 |

### 📄 配置文件详解

#### Dockerfile（已修复）
```dockerfile
FROM node:18-alpine
WORKDIR /app

# 复制package文件以优化Docker层缓存
COPY package*.json ./

# 安装所有依赖（包括devDependencies以便构建）
RUN npm install

# 复制应用代码
COPY . .

# 构建TypeScript代码
RUN npm run build

# 确保dist目录存在并包含index.js
RUN ls -la dist/ && test -f dist/index.js

# 删除devDependencies以减小镜像大小（保留构建产物）
RUN npm prune --production

# 暴露端口（如果需要HTTP模式）
EXPOSE 3100

# 设置默认命令
CMD ["node", "dist/index.js"]
```

> **🔧 修复说明**: 之前的Dockerfile使用了`npm install --production`，这导致TypeScript编译器无法安装，造成构建失败。现在的版本先安装所有依赖进行构建，然后删除开发依赖以减小镜像大小。

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

#### 1. TypeScript编译器找不到（tsc: not found）⚠️ 最常见问题

**错误信息**:
```
#17 [stage-1  6/12] RUN npm run build
#17 0.726 > my-awesome-mcp@1.0.0 build
#17 0.726 > tsc
#17 0.733 sh: tsc: not found
Error: process "/bin/sh -c npm run build" did not complete successfully: exit code: 127
```

**原因**: Dockerfile使用了`npm install --production`，只安装production依赖，而TypeScript编译器在devDependencies中。

**✅ 解决方案**: 已修复！现在的Dockerfile正确安装了所有依赖。如果您仍遇到此问题，请确保使用最新的Dockerfile：

```dockerfile
# 正确的Dockerfile配置
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./

# ✅ 安装所有依赖（包括devDependencies）
RUN npm install

COPY . .
RUN npm run build

# 删除devDependencies以减小镜像大小
RUN npm prune --production

CMD ["node", "dist/index.js"]
```

#### 2. 依赖安装失败

**错误信息**:
```
npm ERR! code ENOTFOUND
npm ERR! network request failed
```

**解决方案**:
- 检查package.json中的依赖版本
- 确保npm registry可访问
- 检查网络连接

#### 3. 文件权限错误

**错误信息**:
```
permission denied while trying to connect to the Docker daemon
```

**解决方案**:
- 确保Docker服务正在运行
- 检查用户权限
- 在Smithery平台上这个问题通常不会出现

#### 4. 构建超时

**错误信息**:
```
Build timeout after 10 minutes
```

**解决方案**:
- 检查.dockerignore文件是否正确排除了不必要的文件
- 确保依赖版本稳定
- 联系Smithery支持

### 🔧 本地测试构建

在推送到Smithery之前，建议在本地测试Docker构建：

```bash
# 1. 构建Docker镜像
docker build -t mysql-mcp-test .

# 2. 测试运行
docker run --rm mysql-mcp-test node --version

# 3. 检查构建产物
docker run --rm mysql-mcp-test ls -la dist/

# 4. 测试MCP服务器启动
docker run --rm mysql-mcp-test node dist/index.js --help
```

### 📊 构建日志分析

如果遇到构建问题，请注意以下关键阶段：

1. **依赖安装**:
   ```
   ✅ #4 [stage-1  4/12] RUN npm install
   ```

2. **TypeScript编译**:
   ```
   ✅ #6 [stage-1  6/12] RUN npm run build
   ```

3. **文件验证**:
   ```
   ✅ #7 [stage-1  7/12] RUN ls -la dist/ && test -f dist/index.js
   ```

### 🆘 获取帮助

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