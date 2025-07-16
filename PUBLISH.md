# 📦 MySQL MCP Server - NPM发布指南

## 🚀 发布到NPM

### 📋 发布前检查清单

1. **确保代码已提交到Git**
   ```bash
   git add .
   git commit -m "Release v2.0.0"
   git push origin master
   ```

2. **测试构建**
   ```bash
   npm run build
   ```

3. **检查包内容**
   ```bash
   npm pack --dry-run
   ```

### 🔑 发布步骤

#### 1. 登录NPM（首次发布需要）
```bash
npm login
```
输入你的NPM用户名、密码和邮箱。

#### 2. 发布包
```bash
# 发布正式版本
npm publish

# 或发布测试版本
npm publish --tag beta
```

#### 3. 验证发布
访问：https://www.npmjs.com/package/@neigezhujiayi/mysql-mcp-server

### 📈 版本管理

```bash
# 发布补丁版本 (2.0.0 -> 2.0.1)
npm version patch
npm publish

# 发布小版本 (2.0.0 -> 2.1.0)
npm version minor
npm publish

# 发布大版本 (2.0.0 -> 3.0.0)
npm version major
npm publish
```

---

## 👥 用户安装指南

### 🎯 全局安装（推荐）

```bash
# 全局安装
npm install -g @neigezhujiayi/mysql-mcp-server

# 验证安装
guangxiang-mysql-mcp --help
```

### 📍 项目本地安装

```bash
# 本地安装
npm install @neigezhujiayi/mysql-mcp-server

# 运行
npx @neigezhujiayi/mysql-mcp-server
```

### ⚙️ 在MCP客户端中配置

#### VSCode + Cline配置
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

#### 使用本地安装的版本
```json
{
  "mcpServers": {
    "mysql-database": {
      "command": "npx",
      "args": ["@neigezhujiayi/mysql-mcp-server"],
      "env": {}
    }
  }
}
```

### 🔧 快速开始

1. **安装包**
   ```bash
   npm install -g @neigezhujiayi/mysql-mcp-server
   ```

2. **配置Cline**
   在VSCode的Cline设置中添加上面的配置

3. **开始使用**
   ```
   请帮我连接到MySQL数据库：
   - 主机: localhost
   - 端口: 3306
   - 用户名: root
   - 密码: your_password
   - 数据库: test_db
   ```

---

## 📊 包信息

- **包名**: `@neigezhujiayi/mysql-mcp-server`
- **版本**: `2.0.0`
- **主页**: https://github.com/guangxiangdebizi/MySQL_MCP
- **问题反馈**: https://github.com/guangxiangdebizi/MySQL_MCP/issues

## 🔄 更新日志

### v2.0.0
- ✨ 新增智能事务管理
- 🔄 增强回滚功能
- 📊 改进表结构展示
- 🛡️ 自动事务保护
- 📝 完整操作日志

---

## 🤝 贡献指南

欢迎提交PR和Issue！请确保：
1. 代码通过`npm run build`测试
2. 更新版本号
3. 添加必要的文档

感谢使用MySQL MCP Server！🚀 