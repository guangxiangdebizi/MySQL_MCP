# MySQL MCP Server - 增强版 🚀

一个功能强大的MySQL数据库MCP服务器，支持**完整的CRUD操作**和**智能日志系统**。

## 🆕 新版本亮点

### 🔥 完整的数据库操作权限
- ✅ **增加数据** (INSERT) - 支持向任何表插入数据
- ✅ **查询数据** (SELECT) - 支持复杂查询和条件筛选  
- ✅ **更新数据** (UPDATE) - 支持条件更新和批量修改
- ✅ **删除数据** (DELETE) - 支持条件删除和批量删除
- ✅ **创建表** (CREATE TABLE) - 动态创建数据库表
- ✅ **删除表** (DROP TABLE) - 删除不需要的表

### 📊 智能日志系统
- 🔍 **详细操作记录** - 记录每个SQL操作的详细信息
- ⏱️ **性能监控** - 记录每个操作的执行时间
- 🚨 **错误追踪** - 自动记录和分析错误信息
- 📈 **统计分析** - 提供操作统计和趋势分析
- 🔎 **日志搜索** - 强大的日志搜索和过滤功能

### 🔄 事务支持
- 🚀 **开始事务** - 支持数据库事务操作
- ✅ **提交事务** - 确保数据一致性
- ↩️ **回滚事务** - 出错时自动回滚

## 📋 可用工具列表

### 🔗 连接管理
| 工具名 | 功能 | 参数 |
|--------|------|------|
| `connect_database` | 连接MySQL数据库 | host, port, user, password, database |
| `disconnect_database` | 断开数据库连接 | 无 |

### 📊 数据操作
| 工具名 | 功能 | 参数 |
|--------|------|------|
| `execute_query` | 执行任意SQL语句 | query, params (可选) |
| `insert_data` | 插入数据到表 | table_name, data |
| `update_data` | 更新表中数据 | table_name, data, where_clause, where_params |
| `delete_data` | 删除表中数据 | table_name, where_clause, where_params |
| `select_data` | 查询表中数据 | table_name, columns, where_clause, where_params, limit |

### 🏗️ 表管理
| 工具名 | 功能 | 参数 |
|--------|------|------|
| `create_table` | 创建新表 | table_name, columns |
| `drop_table` | 删除表 | table_name |
| `show_tables` | 显示所有表 | 无 |
| `describe_table` | 查看表结构 | table_name |
| `get_table_info` | 获取表详细信息 | table_name |

### 🔄 事务管理
| 工具名 | 功能 | 参数 |
|--------|------|------|
| `begin_transaction` | 开始事务 | 无 |
| `commit_transaction` | 提交事务 | 无 |
| `rollback_transaction` | 回滚事务 | 无 |

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 构建项目
```bash
npm run build
```

### 3. 配置Cline
在Cline的MCP设置中添加：

```json
{
  "mcpServers": {
    "mysql-database": {
      "command": "node",
      "args": ["你的项目路径/dist/index.js"],
      "env": {}
    }
  }
}
```

### 4. 开始使用
在Cline中说：
```
请连接到我的MySQL数据库：
- 主机: localhost
- 端口: 3306  
- 用户名: root
- 密码: your_password
- 数据库: your_database
```

## 💡 使用示例

### 📝 插入数据示例
```
请向users表插入一条新用户数据：
- name: "张三"
- email: "zhangsan@example.com"
- age: 25
```

### ✏️ 更新数据示例
```
请更新users表中id=1的用户信息：
- name: "李四"
- email: "lisi@example.com"
设置条件为 id = 1
```

### 🗑️ 删除数据示例
```
请删除users表中age大于60的所有用户
```

### 🔍 查询数据示例
```
请查询users表中age在20-30之间的所有用户，只显示name和email字段，限制10条记录
```

### 🏗️ 创建表示例
```
请创建一个名为products的表，包含以下字段：
- id (主键，自增)
- name (varchar(100), 不能为空)
- price (decimal(10,2))
- created_at (timestamp, 默认当前时间)
```

## 📊 日志系统使用

### 查看日志
```bash
# 查看所有可用的日志文件
npm run logs list

# 查看今天的完整日志
npm run logs:tail

# 查看错误日志
npm run logs:errors

# 查看日志统计
npm run logs:stats

# 分析数据库操作
npm run logs:db
```

### 日志文件说明
- `combined-YYYY-MM-DD.log` - 完整的操作日志
- `error-YYYY-MM-DD.log` - 错误日志
- `database-YYYY-MM-DD.log` - 数据库专用日志
- `exceptions-YYYY-MM-DD.log` - 异常日志
- `rejections-YYYY-MM-DD.log` - Promise拒绝日志

### 搜索日志
```bash
# 搜索包含"连接失败"的日志
npm run logs search "连接失败"

# 查看指定日志文件
npm run logs view combined-2024-01-15.log
```

## 🔒 安全特性

### 🛡️ 安全措施
- ✅ **参数化查询** - 防止SQL注入攻击
- ✅ **表名验证** - 验证表名格式，防止恶意输入
- ✅ **连接管理** - 安全的连接建立和断开
- ✅ **错误处理** - 详细的错误信息和安全的错误响应

### 🔐 建议的安全配置
1. **创建专用数据库用户**
   ```sql
   CREATE USER 'mcp_user'@'localhost' IDENTIFIED BY 'strong_password';
   GRANT SELECT, INSERT, UPDATE, DELETE ON your_database.* TO 'mcp_user'@'localhost';
   ```

2. **限制网络访问**
   - 仅允许本地连接或信任的IP地址

3. **定期审查日志**
   - 使用日志系统监控异常操作

## 📈 性能监控

### 执行时间监控
每个操作都会记录执行时间，帮助你：
- 🔍 **识别慢查询** - 找出性能瓶颈
- 📊 **优化数据库** - 基于实际使用数据优化
- 📈 **趋势分析** - 了解性能变化趋势

### 操作统计
日志系统提供详细的操作统计：
- 📊 各类操作的执行次数
- ⏱️ 平均执行时间
- 🚨 错误率统计
- 📈 使用趋势分析

## 🛠️ 故障排除

### 常见问题

#### 1. 连接失败
```bash
# 查看连接错误日志
npm run logs:errors

# 检查数据库服务状态
mysql -u root -p -e "SELECT 1"
```

#### 2. 权限不足
```bash
# 检查用户权限
mysql -u your_user -p -e "SHOW GRANTS"
```

#### 3. 日志文件过多
```bash
# 清理旧日志文件（保留最近7天）
find logs/ -name "*.log" -mtime +7 -delete
```

## 🔧 高级配置

### 自定义日志级别
在启动时设置环境变量：
```bash
# 设置为调试模式
NODE_ENV=development npm start

# 设置为生产模式
NODE_ENV=production npm start
```

### 日志轮转配置
默认配置：
- 每个日志文件最大20MB
- 错误日志保留14天
- 其他日志保留30天
- 自动压缩旧文件

## 📞 支持和反馈

如果你遇到问题或有建议：

1. 🔍 **查看日志** - 使用日志系统分析问题
2. 📋 **检查文档** - 参考本文档的故障排除部分
3. 🐛 **报告问题** - 在GitHub仓库提交Issue
4. 💡 **功能建议** - 欢迎提出改进建议

## 📄 更新日志

### v2.0.0 (当前版本)
- ✨ 新增完整CRUD操作支持
- 📊 新增智能日志系统
- 🔄 新增事务管理
- 🛡️ 增强安全防护
- 📈 新增性能监控

### v1.0.0
- 🔗 基础数据库连接
- 🔍 只读查询支持
- 📋 表结构查看

---

**🎉 享受强大的数据库操作体验！** 