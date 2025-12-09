# 快速开始指南 🚀

## 1️⃣ 启动服务器

```bash
cd MySQL_MCP
npm install
npm run build
npm start
```

看到以下输出表示成功：
```
╔═══════════════════════════════════════════════════════════╗
║   🚀 MySQL MCP Server v4.0.0 已启动                       ║
║   📡 MCP Endpoint:  http://localhost:3001/mcp             ║
╚═══════════════════════════════════════════════════════════╝
```

---

## 2️⃣ 配置 MCP 客户端

### Cursor 配置

编辑 `~/.cursor/mcp.json`（或 `%APPDATA%/.cursor/mcp.json`）：

```json
{
  "mcpServers": {
    "mysql": {
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

### Claude Desktop 配置

编辑 `claude_desktop_config.json`：

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`  
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mysql": {
      "type": "streamableHttp",
      "url": "http://localhost:3001/mcp",
      "timeout": 600,
      "headers": {
        "X-MySQL-Host": "localhost",
        "X-MySQL-User": "root",
        "X-MySQL-Password": "123456",
        "X-MySQL-Database": "mydb"
      }
    }
  }
}
```

---

## 3️⃣ 测试连接

重启 MCP 客户端，然后测试：

### 自动连接（Header 预配置）

```
你: 显示所有表
AI: [自动使用 Header 配置的连接]
    📊 数据库表列表 (共 3 个表)
    1. users
    2. orders
    3. products
```

### 手动添加连接

```
你: 帮我连接到数据库：localhost，用户 root，密码 123456，数据库 test_db，ID 叫 mydb
AI: [调用 add_connection]
    ✅ 数据库连接已添加
    🆔 ID: mydb
    🖥️  主机: localhost:3306
    📂 数据库: test_db
```

---

## 4️⃣ 常用操作

### 查看所有连接
```
你: 列出所有数据库连接
```

### 切换数据库
```
你: 切换到 mydb
```

### 执行查询
```
你: 查询 users 表的前 10 条数据
你: 插入一条用户数据：name=张三，email=test@example.com
你: 更新 id=1 的用户邮箱为 new@example.com
```

### 查看表结构
```
你: 查看 users 表的结构
```

---

## 🎉 完成！

现在你可以让 AI 帮你管理和查询 MySQL 数据库了！

**更多功能请查看 [README.md](./README.md)**

