# MySQL MCP Server 🚀

一个功能强大的MySQL数据库MCP（Model Context Protocol）服务器，让你的AI助手可以安全地连接和查询MySQL数据库。

> **🎯 目标用户**: 希望在VSCode的Cline中使用AI助手操作MySQL数据库的开发者

## 📖 目录

- [🌟 功能特性](#-功能特性)
- [☁️ Smithery云部署](#️-smithery云部署)
- [🛠️ 安装教程](#️-安装教程)
- [⚙️ 配置方法](#️-配置方法)
- [🎮 使用指南](#-使用指南)
- [🔧 高级配置](#-高级配置)
- [❗ 故障排除](#-故障排除)
- [💡 使用技巧](#-使用技巧)
- [🔒 安全说明](#-安全说明)
- [📋 常见问题](#-常见问题)

## 🌟 功能特性

### ✨ 核心功能
- 🔗 **智能数据库连接**: 支持动态连接MySQL数据库，参数灵活配置
- 🔍 **安全查询执行**: 仅支持SELECT查询，自动过滤危险操作
- 📊 **表结构查看**: 快速查看数据库表列表和详细结构
- 🛡️ **内置安全防护**: SQL注入防护和危险操作过滤
- 🚀 **双模式部署**: 支持stdio模式和HTTP/SSE模式

### 🎯 使用场景
- ✅ 在AI对话中查询数据库数据
- ✅ 快速了解数据库表结构
- ✅ 让AI助手帮你分析数据
- ✅ 生成数据报告和见解
- ✅ 数据库内容搜索和过滤

## ☁️ Smithery云部署

### 🚀 快速部署到Smithery

[Smithery](https://smithery.ai) 是专门为MCP服务器设计的云平台，可以一键部署您的MySQL MCP Server。

#### 📋 部署前准备

确保您的项目包含以下文件：
- ✅ `Dockerfile` - Docker容器构建配置
- ✅ `smithery.yaml` - Smithery平台配置
- ✅ 完整的项目源码

#### 🔧 部署步骤

1. **Fork项目到您的GitHub**
   ```bash
   # 访问项目页面并点击Fork按钮
   https://github.com/guangxiangdebizi/MySQL_MCP
   ```

2. **登录Smithery平台**
   - 访问 [Smithery.ai](https://smithery.ai)
   - 使用GitHub账号登录

3. **连接GitHub仓库**
   - 点击 "Deploy Server"
   - 选择您Fork的 `MySQL_MCP` 仓库
   - 确认部署配置

4. **等待构建完成**
   - Smithery会自动构建Docker镜像
   - 构建过程大约需要2-3分钟

#### 🎯 使用部署的服务器

部署成功后，您可以在任何支持MCP的AI客户端中使用：

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

#### 💡 云部署优势

- 🌐 **全球访问**: 无需本地安装，任何地方都能使用
- 🔄 **自动更新**: 推送代码后自动重新部署
- 📈 **高可用性**: 专业的云基础设施保障
- 🔒 **安全隔离**: 每个部署独立运行，数据安全
- 📊 **使用统计**: 详细的调用统计和监控

#### ⚙️ 配置说明

部署后，您需要在AI客户端中提供数据库连接信息：

```
请帮我连接到MySQL数据库：
- 主机: your-mysql-host.com
- 端口: 3306
- 用户名: your-username
- 密码: your-password
- 数据库: your-database
```

> **🔐 安全提示**: 建议为MCP服务器创建专门的只读数据库用户，限制权限范围。

## 🛠️ 安装教程

### 📋 环境要求

确保你的电脑满足以下要求：

- ✅ **Node.js 18+** - [下载地址](https://nodejs.org/)
- ✅ **MySQL 5.7+ 或 8.0+** - 确保数据库服务正在运行
- ✅ **VSCode** - [下载地址](https://code.visualstudio.com/)
- ✅ **Cline扩展** - 在VSCode扩展市场搜索"Cline"安装

### 🔧 一键安装脚本

我们提供了一键安装脚本，帮你自动完成所有安装步骤：

```bash
# 下载项目
git clone <项目地址>
cd my-awesome-mcp

# 运行一键安装脚本
./test-install.bat   # Windows用户
# 或
npm run quick-setup  # 跨平台
```

### 📝 手动安装步骤

#### 步骤1: 解决PowerShell权限（Windows用户）

如果遇到执行策略错误，请先运行：

```powershell
# 在PowerShell中运行（管理员权限）
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### 步骤2: 安装项目依赖

```bash
# 安装所有依赖包（包括supergateway）
npm install

# 如果安装失败，可以尝试清除缓存
npm cache clean --force
npm install
```

#### 步骤3: 构建项目

```bash
# 编译TypeScript代码
npm run build

# 验证构建是否成功
ls dist/  # 应该能看到index.js文件
```

## ⚙️ 配置方法

### 🎯 配置方式选择

我们提供了两种配置方式，根据你的需求选择：

| 配置方式 | 优点 | 缺点 | 推荐场景 |
|---------|------|------|----------|
| **stdio模式** | 简单、直接、无需端口 | 每次重启VSCode需要重新启动 | 个人开发、简单使用 |
| **HTTP/SSE模式** | 服务持久运行、支持autoApprove | 需要管理端口、稍微复杂 | 频繁使用、团队协作 |

### 📌 方法1: stdio模式配置（推荐新手）

#### 步骤1: 打开Cline配置

1. 打开VSCode
2. 按 `Ctrl+Shift+P` (Windows) 或 `Cmd+Shift+P` (Mac)
3. 输入 `Cline: Open MCP Settings`
4. 回车打开配置文件

#### 步骤2: 添加配置

将以下配置复制到Cline设置中：

```json
{
  "mcpServers": {
    "mysql-database": {
      "command": "node",
      "args": ["C:/Users/你的用户名/Desktop/my-awesome-mcp/dist/index.js"],
      "env": {}
    }
  }
}
```

> ⚠️ **重要**: 请将路径中的 `你的用户名` 替换为你的实际用户名！

#### 步骤3: 重启VSCode

保存配置后，重启VSCode，配置即生效。

### 🌐 方法2: HTTP/SSE模式配置（推荐高级用户）

#### 步骤1: 启动Gateway服务

```bash
# 启动HTTP/SSE服务
npm run start-gateway

# 服务启动后会显示：
# ✅ MySQL MCP Server running on http://localhost:3100
```

#### 步骤2: 配置Cline

```json
{
  "mcpServers": {
    "mysql-database": {
      "url": "http://localhost:3100/sse",
      "type": "sse",
      "disabled": false,
      "autoApprove": [
        "connect_database",
        "execute_query",
        "show_tables",
        "describe_table",
        "disconnect_database"
      ]
    }
  }
}
```

#### 步骤3: 重启VSCode

配置完成后重启VSCode。

### 🔄 验证配置是否成功

配置成功后，在Cline对话中输入：

```
你好，请显示一下当前可用的数据库工具
```

如果配置成功，Cline会显示以下工具：

- ✅ `connect_database` - 连接MySQL数据库
- ✅ `execute_query` - 执行SQL查询
- ✅ `show_tables` - 显示所有表
- ✅ `describe_table` - 显示表结构
- ✅ `disconnect_database` - 断开数据库连接

## 🎮 使用指南

### 🔌 第一步: 连接数据库

在Cline对话中输入：

```
请帮我连接到MySQL数据库：
- 主机: localhost
- 端口: 3306
- 用户名: root
- 密码: 你的密码
- 数据库: 你的数据库名
```

### 📊 第二步: 探索数据库

```
请显示这个数据库中的所有表
```

```
请显示users表的结构信息
```

### 🔍 第三步: 查询数据

```
请查询users表中的前10条记录
```

```
请查询年龄大于25岁的用户，按创建时间排序
```

```
请统计每个部门的用户数量
```

### 📈 第四步: 数据分析

```
请分析sales表中过去30天的销售趋势
```

```
请找出购买金额最高的前5名客户
```

## 🔧 高级配置

### 🛠️ 自定义端口

如果3100端口被占用，可以修改：

```json
// package.json
{
  "scripts": {
    "start-gateway": "npm run build && npx supergateway --stdio \"node dist/index.js\" --port 3200"
  }
}
```

```json
// Cline配置
{
  "mcpServers": {
    "mysql-database": {
      "url": "http://localhost:3200/sse",
      "type": "sse"
    }
  }
}
```

### 🔐 环境变量配置

创建 `.env` 文件来管理敏感信息：

```bash
# .env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=your_database
```

### 🚀 全局安装

```bash
# 全局安装
npm run install-global

# 然后可以在任何地方使用
mysql-mcp-server
```

## ❗ 故障排除

### 🔥 常见错误及解决方案

#### ❌ npm install失败

**错误信息**: `execution policy error` 或 `cannot run scripts`

**解决方案**:
```powershell
# 方案1: 修改PowerShell策略
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 方案2: 使用管理员权限运行PowerShell
# 右键点击PowerShell -> "以管理员身份运行"

# 方案3: 使用yarn代替npm
npm install -g yarn
yarn install
```

#### ❌ 找不到dist/index.js

**错误信息**: `Cannot find module 'dist/index.js'`

**解决方案**:
```bash
# 确保构建成功
npm run build

# 检查dist目录是否存在
ls dist/

# 如果没有dist目录，重新构建
rm -rf dist/
npm run build
```

#### ❌ Cline无法加载MCP服务器

**错误信息**: Cline显示"MCP server failed to start"

**解决方案**:
1. **检查路径**: 确保配置中的路径使用正斜杠 `/`
2. **检查权限**: 确保文件有执行权限
3. **查看日志**: 
   ```bash
   # 手动运行服务器查看错误
   node dist/index.js
   ```
4. **重启VSCode**: 有时需要完全重启VSCode

#### ❌ 数据库连接失败

**错误信息**: `Access denied` 或 `Connection refused`

**解决方案**:
- ✅ 确保MySQL服务正在运行
- ✅ 检查用户名和密码是否正确
- ✅ 确认数据库名称存在
- ✅ 检查MySQL用户权限
- ✅ 测试连接：
  ```bash
  mysql -h localhost -u root -p
  ```

#### ❌ 端口被占用

**错误信息**: `Port 3100 is already in use`

**解决方案**:
```bash
# 查找占用端口的进程
netstat -ano | findstr :3100

# 终止进程（替换<PID>为实际进程ID）
taskkill /PID <PID> /F

# 或者使用不同端口
npm run start-gateway -- --port 3200
```

### 🔍 调试模式

启用详细日志输出：

```bash
# 设置调试环境变量
set DEBUG=mysql-mcp:*
npm run start-gateway

# Linux/Mac用户
DEBUG=mysql-mcp:* npm run start-gateway
```

## 💡 使用技巧

### 🎯 最佳实践

1. **连接管理**
   ```
   # 好的做法：连接前先断开之前的连接
   请先断开当前数据库连接，然后连接到新的数据库
   ```

2. **查询优化**
   ```
   # 大表查询时限制结果数量
   请查询users表，限制100条记录并按ID排序
   ```

3. **安全查询**
   ```
   # 避免查询敏感信息
   请查询用户表，但不要显示密码字段
   ```

### 🚀 高效使用

1. **批量操作**
   ```
   请依次执行以下操作：
   1. 连接到数据库
   2. 显示所有表
   3. 查询每个表的记录数
   4. 断开连接
   ```

2. **数据分析**
   ```
   请分析sales表，我需要了解：
   - 总销售额
   - 平均订单金额
   - 最畅销的产品
   - 销售趋势
   ```

## 🔒 安全说明

### 🛡️ 内置安全特性

1. **只读模式**: 默认只允许SELECT查询
2. **SQL注入防护**: 自动过滤危险字符和语句
3. **操作限制**: 禁止DROP、DELETE、UPDATE、INSERT等危险操作
4. **参数验证**: 严格验证所有输入参数

### 🔐 安全建议

1. **数据库用户权限**
   ```sql
   -- 创建只读用户（推荐）
   CREATE USER 'mcp_user'@'localhost' IDENTIFIED BY 'strong_password';
   GRANT SELECT ON your_database.* TO 'mcp_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

2. **网络安全**
   - 仅在可信网络环境中使用
   - 避免在公共网络中暴露数据库端口

3. **密码管理**
   - 使用强密码
   - 定期更换密码
   - 考虑使用环境变量存储敏感信息

## 📋 常见问题

### ❓ Q1: MCP是什么？为什么不使用普通的API？

**A**: MCP（Model Context Protocol）是Anthropic开发的协议，专门为AI助手访问外部工具而设计。相比普通API，MCP提供：
- 标准化的工具描述格式
- 更好的AI集成体验
- 自动的权限管理
- 内置的安全机制

### ❓ Q2: 为什么选择stdio模式而不是HTTP API？

**A**: stdio模式的优势：
- 🔒 更安全：不需要开放网络端口
- 🚀 更简单：无需配置网络和认证
- 📦 更轻量：直接进程通信，性能更好
- 🛡️ 更隔离：每个客户端独立进程

### ❓ Q3: 可以连接远程MySQL数据库吗？

**A**: 可以！只需要在连接时指定远程主机地址：
```
请连接到远程数据库：
- 主机: 192.168.1.100
- 端口: 3306
- 用户名: remote_user
- 密码: remote_password
- 数据库: remote_db
```

### ❓ Q4: 支持其他数据库吗？

**A**: 目前只支持MySQL，但架构设计支持扩展。未来计划支持：
- PostgreSQL
- SQLite
- SQL Server
- Oracle

### ❓ Q5: 如何备份和恢复配置？

**A**: 
```bash
# 备份配置
cp ~/.vscode/mcp-settings.json ~/mcp-backup.json

# 恢复配置
cp ~/mcp-backup.json ~/.vscode/mcp-settings.json
```

### ❓ Q6: 能否支持写操作？

**A**: 出于安全考虑，默认只支持读操作。如果需要写操作，可以：
1. 修改 `src/database.ts` 中的安全限制
2. 重新构建项目
3. ⚠️ **注意**: 这会增加数据风险，请谨慎操作

### ❓ Q7: 如何监控MCP服务器状态？

**A**: 
```bash
# 检查进程
ps aux | grep "mysql-mcp"

# 检查端口（HTTP模式）
netstat -an | grep 3100

# 查看日志
tail -f ~/.vscode/logs/mcp-mysql.log
```

## 🏗️ 项目结构

```
my-awesome-mcp/
├── src/
│   ├── index.ts              # 🚀 MCP服务器入口点
│   └── database.ts           # 🗄️ 数据库管理器类
├── dist/                     # 📦 编译后的JavaScript文件
├── node_modules/             # 📚 依赖包
├── package.json              # ⚙️ 项目配置和脚本
├── tsconfig.json            # 🔧 TypeScript编译配置
├── README.md                # 📖 详细使用说明（本文件）
├── test-install.bat         # 🛠️ Windows一键安装脚本
└── .env.example            # 🔐 环境变量示例文件
```

## 🔄 版本更新

### 当前版本: v1.0.0

#### 更新日志
- ✅ 修复supergateway包名错误
- ✅ 添加HTTP/SSE模式支持
- ✅ 增强安全性检查
- ✅ 优化错误处理
- ✅ 完善文档说明

#### 更新方法
```bash
# 获取最新代码
git pull origin main

# 更新依赖
npm install

# 重新构建
npm run build
```

## 📞 技术支持

### 🐛 遇到问题？

1. **查看错误日志**: 在VSCode开发者控制台查看详细错误信息
2. **检查配置**: 确保所有路径和参数正确
3. **重新安装**: 删除node_modules后重新安装
4. **查看文档**: 本README包含了大部分常见问题的解决方案

### 📧 联系方式

- **GitHub Issues**: 在项目仓库提交issue
- **讨论交流**: 在GitHub Discussions中讨论
- **快速帮助**: 在Cline中询问："如何使用MySQL MCP服务器？"

## 🙏 致谢

感谢以下开源项目的支持：
- [Model Context Protocol](https://modelcontextprotocol.io/) - Anthropic的MCP协议
- [mysql2](https://github.com/sidorares/node-mysql2) - Node.js MySQL客户端
- [supergateway](https://github.com/supercorp-ai/supergateway) - MCP传输层网关

## 📄 许可证

本项目采用 ISC 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

---

> 💡 **提示**: 如果这个README帮助到了你，请给项目点个⭐Star！有问题欢迎提Issue！

**🎉 现在就开始在AI对话中使用MySQL数据库吧！** 