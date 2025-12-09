# MySQL MCP Server Bug 修复报告

## 🐛 问题描述

**错误信息**: `❌ 工具列表请求失败: Not connected`

**症状**:
- ✅ 数据库连接成功添加
- ✅ Header 预配置连接成功
- ❌ 但是工具列表请求失败，提示 "Not connected"

## 🔍 根本原因分析

通过查阅 Model Context Protocol 官方文档（`@modelcontextprotocol/sdk`），发现了代码中的**架构性错误**：

### 错误实现（修复前）

```typescript
// ❌ 错误：试图使用 server.request() 处理客户端请求
if (body.method === "tools/list") {
  const result = await session.server.request(body, ListToolsRequestSchema);
  return res.json({ jsonrpc: "2.0", result, id: body.id });
}
```

**为什么错误？**
- `server.request()` 是用于**服务器向客户端发起请求**的方法（如 LLM sampling）
- 不是用来处理来自客户端的请求的
- 由于 server 没有连接到任何客户端，所以抛出 "Not connected" 错误

### 正确实现（修复后）

```typescript
// ✅ 正确：使用 transport.handleRequest() 处理所有请求
await session.transport.handleRequest(req, res, body);
```

**为什么正确？**
- `StreamableHTTPServerTransport.handleRequest()` 会自动将请求路由到正确的处理器
- 所有通过 `setRequestHandler()` 注册的处理器都会被正确调用
- 符合 MCP SDK 的标准实现模式

## 🔧 修复内容

### 1. 添加 Transport 导入

```typescript
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
```

### 2. 更新 Session 接口

```typescript
interface Session {
  id: string;
  server: Server;
  transport: StreamableHTTPServerTransport;  // ✅ 新增
  dbManager: DatabaseConnectionManager;
  createdAt: Date;
  lastActivity: Date;
}
```

### 3. 重构 /mcp 端点逻辑

**关键变化**:
1. 创建会话时同时创建 `StreamableHTTPServerTransport`
2. 调用 `server.connect(transport)` 建立连接
3. 使用 `transport.handleRequest()` 统一处理所有请求

```typescript
// 创建 transport
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => newId
});

// 连接 server 和 transport
await server.connect(transport);

// 使用 transport 处理所有请求
await session.transport.handleRequest(req, res, body);
```

## 📚 参考文档

根据 MCP 官方 TypeScript SDK 文档：

> **Session Management with Streamable HTTP and Express**
> 
> Implements a stateful HTTP server using Express that manages multiple MCP sessions via Streamable HTTP transport. The transport automatically routes requests to registered handlers.

**正确的请求流程**:
```
客户端请求 → Express /mcp 端点 → transport.handleRequest() 
→ 自动路由到 setRequestHandler() 注册的处理器 → 返回响应
```

## ✅ 验证结果

修复后应该看到：
- ✅ 连接已添加成功
- ✅ Header 连接已添加成功  
- ✅ 工具列表请求成功（不再报错）
- ✅ 所有 MCP 工具可以正常调用

## 📝 设计模式总结

**MCP Server 正确实现模式**:
1. 创建 `Server` 实例
2. 注册请求处理器（`setRequestHandler`）
3. 创建 `Transport` 实例（如 `StreamableHTTPServerTransport`）
4. 连接 server 和 transport (`server.connect(transport)`)
5. 使用 `transport.handleRequest()` 处理所有 HTTP 请求

**不要做**:
- ❌ 不要手动调用 `server.request()` 来处理客户端请求
- ❌ 不要手动解析和路由 MCP 方法（initialize, tools/list, tools/call 等）
- ❌ 不要绕过 transport 层直接访问 server

## 🚀 下一步

运行修复后的代码：
```bash
npm run start
```

应该不再看到 "Not connected" 错误，所有功能正常运行。

