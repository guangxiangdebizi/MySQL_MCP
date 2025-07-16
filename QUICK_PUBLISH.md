# 🚀 快速发布到NPM

## ✅ 发布前最终检查

```bash
# 1. 确保构建成功
npm run build

# 2. 检查包内容
npm pack --dry-run

# 3. 测试包是否工作
node dist/index.js --help

# 4. 检查版本号
cat package.json | grep version
```

## 📦 发布命令

```bash
# 如果是首次发布，需要先登录
npm login

# 发布到NPM
npm publish

# 发布成功后验证
npm view @neigezhujiayi/mysql-mcp-server
```

## 🎯 发布后用户安装

用户现在可以通过以下方式安装：

```bash
# 全局安装
npm install -g @neigezhujiayi/mysql-mcp-server

# 验证安装
guangxiang-mysql-mcp --help

# 在VSCode Cline中配置
{
  "mcpServers": {
    "mysql-database": {
      "command": "guangxiang-mysql-mcp",
      "env": {}
    }
  }
}
```

## 📈 版本更新流程

```bash
# 更新补丁版本并发布
npm version patch && npm publish

# 更新小版本并发布  
npm version minor && npm publish

# 更新大版本并发布
npm version major && npm publish
```

---

**🎉 就是这么简单！你的MySQL MCP Server现在可以让全世界的开发者轻松使用了！** 