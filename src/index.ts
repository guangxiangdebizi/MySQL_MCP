#!/usr/bin/env node

import express, { Request, Response } from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import "dotenv/config";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  CallToolRequest,
  ListToolsRequest
} from "@modelcontextprotocol/sdk/types.js";
import { DatabaseConnectionManager, DatabaseConfig } from "./database.js";
import { allTools, handleToolCall } from "./tools/index.js";

// ==================== 会话管理 ====================
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

interface Session {
  id: string;
  server: Server;
  transport: StreamableHTTPServerTransport;
  dbManager: DatabaseConnectionManager;
  createdAt: Date;
  lastActivity: Date;
}

const sessions = new Map<string, Session>();

// ==================== 从 Header 提取数据库配置 ====================
function extractDatabaseConfigsFromHeaders(req: Request): DatabaseConfig[] {
  const configs: DatabaseConfig[] = [];

  // 单数据库配置（不带编号）
  const host = req.headers['x-mysql-host'] as string | undefined;
  const port = req.headers['x-mysql-port'] as string | undefined;
  const user = req.headers['x-mysql-user'] as string | undefined;
  const password = req.headers['x-mysql-password'] as string | undefined;
  const database = req.headers['x-mysql-database'] as string | undefined;

  if (host && user && password && database) {
    configs.push({
      id: 'header_default',
      host: host.trim(),
      port: port ? parseInt(port) : 3306,
      user: user.trim(),
      password: password.trim(),
      database: database.trim()
    });
  }

  // 多数据库配置（带编号：X-MySQL-Host-1, X-MySQL-Host-2, ...）
  for (let i = 1; i <= 20; i++) {
    const hostN = req.headers[`x-mysql-host-${i}`] as string | undefined;
    const portN = req.headers[`x-mysql-port-${i}`] as string | undefined;
    const userN = req.headers[`x-mysql-user-${i}`] as string | undefined;
    const passwordN = req.headers[`x-mysql-password-${i}`] as string | undefined;
    const databaseN = req.headers[`x-mysql-database-${i}`] as string | undefined;

    if (!hostN) break; // 没有 host 则停止搜索

    if (hostN && userN && passwordN && databaseN) {
      configs.push({
        id: `header_${i}`,
        host: hostN.trim(),
        port: portN ? parseInt(portN) : 3306,
        user: userN.trim(),
        password: passwordN.trim(),
        database: databaseN.trim()
      });
    }
  }

  return configs;
}

// ==================== 初始化数据库连接（同步等待） ====================
async function initializeDatabaseConnections(
  dbManager: DatabaseConnectionManager,
  configs: DatabaseConfig[]
): Promise<void> {
  if (configs.length === 0) return;
  
  console.log(`📋 检测到 ${configs.length} 个 Header 预配置，正在添加...`);
  
  // 使用 for...of 确保顺序等待每个连接完成
  for (const config of configs) {
    try {
      await dbManager.addConnection(config);
      console.log(`✅ Header 连接已添加: ${config.id}`);
    } catch (error) {
      console.error(`❌ Header 连接失败 [${config.id}]:`, error);
    }
  }
  
  console.log(`📋 Header 预配置初始化完成，成功连接 ${dbManager.listConnections().length} 个`);
}

// ==================== 创建 MCP Server ====================
function createMCPServer(dbManager: DatabaseConnectionManager): Server {
  const server = new Server(
    {
      name: "mysql-mcp-server",
      version: "4.0.7"
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // 注册工具列表处理器
  server.setRequestHandler(ListToolsRequestSchema, async (_request: any) => {
    return { tools: allTools };
  });

  // 注册工具调用处理器
  server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
    const { name, arguments: args } = request.params;
    
    try {
      return await handleToolCall(name, args || {}, dbManager);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`❌ 工具执行失败 [${name}]:`, err.message);
      
      return {
        content: [
          {
            type: "text",
            text: `❌ 执行失败: ${err.message}`
          }
        ],
        isError: true
      };
    }
  });

  return server;
}

// ==================== Express HTTP Server ====================
const app = express();
const PORT = Number(process.env.PORT) || 3001;

// CORS 配置
const allowedHeaders = [
  'Content-Type',
  'Accept',
  'Authorization',
  'Mcp-Session-Id',
  'X-MySQL-Host',
  'X-MySQL-Port',
  'X-MySQL-User',
  'X-MySQL-Password',
  'X-MySQL-Database'
];

// 添加带编号的 Header
for (let i = 1; i <= 20; i++) {
  allowedHeaders.push(
    `X-MySQL-Host-${i}`,
    `X-MySQL-Port-${i}`,
    `X-MySQL-User-${i}`,
    `X-MySQL-Password-${i}`,
    `X-MySQL-Database-${i}`
  );
}

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders,
  exposedHeaders: ['Content-Type', 'Mcp-Session-Id']
}));

app.use(express.json({ limit: "10mb" }));

// ==================== 健康检查 ====================
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "healthy",
    transport: "streamable-http",
    activeSessions: sessions.size,
    version: "4.0.7"
  });
});

// ==================== MCP Endpoint ====================

// POST: 处理请求和响应
app.post("/mcp", async (req: Request, res: Response) => {
  const sessionIdHeader = req.headers["mcp-session-id"] as string | undefined;
  const body = req.body;

  // 验证请求体
  if (!body || !body.method) {
    return res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32600, message: "Invalid request" },
      id: null
    });
  }

  let session: Session | undefined;
  const isInit = body.method === "initialize";

  if (sessionIdHeader && sessions.has(sessionIdHeader)) {
    // 复用现有会话
    session = sessions.get(sessionIdHeader)!;
    session.lastActivity = new Date();
  } else if (!sessionIdHeader && isInit) {
    // 创建新会话（只在没有 session ID 且是 initialize 请求时）
    const dbManager = new DatabaseConnectionManager();
    
    // 🔧 关键修复：在创建会话之前，先同步初始化数据库连接
    // 这样确保当 initialize 响应返回时，连接已经建立好了
    const dbConfigs = extractDatabaseConfigsFromHeaders(req);
    await initializeDatabaseConnections(dbManager, dbConfigs);
    
    const server = createMCPServer(dbManager);
    
    // 创建 transport 并使用回调管理会话
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId: string) => {
        // 会话初始化回调 - 此时数据库连接已经建立好了
        const newSession: Session = {
          id: sessionId,
          server,
          transport,
          dbManager,
          createdAt: new Date(),
          lastActivity: new Date()
        };
        sessions.set(sessionId, newSession);
        console.log(`🆕 新会话创建: ${sessionId}`);
        console.log(`📊 当前数据库连接数: ${dbManager.listConnections().length}`);
      }
    });

    // 设置 transport 关闭处理
    transport.onclose = () => {
      if (transport.sessionId && sessions.has(transport.sessionId)) {
        const sessionId = transport.sessionId;
        const session = sessions.get(sessionId)!;
        
        // 清理数据库连接
        session.dbManager.disconnectAll().catch(err => {
          console.error(`❌ Transport 关闭时断开连接失败:`, err);
        });
        
        // 删除会话
        sessions.delete(sessionId);
        console.log(`🗑️  会话已关闭: ${sessionId}`);
      }
    };

    // 连接 server 和 transport
    await server.connect(transport);
    
    // 处理请求
    try {
      await transport.handleRequest(req, res, body);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`❌ 初始化请求处理失败:`, err.message);
      if (!res.headersSent) {
        return res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: err.message },
          id: body.id || null
        });
      }
    }
    return;
  } else {
    return res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Session not found" },
      id: body.id || null
    });
  }

  // 使用 transport 处理所有请求（包括 tools/list, tools/call 等）
  try {
    await session.transport.handleRequest(req, res, body);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`❌ 请求处理失败:`, err.message);
    if (!res.headersSent) {
      return res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: err.message },
        id: body.id || null
      });
    }
  }
});

// GET: 处理 SSE 流（用于服务器推送通知）
app.get("/mcp", async (req: Request, res: Response) => {
  const sessionIdHeader = req.headers["mcp-session-id"] as string | undefined;

  if (!sessionIdHeader || !sessions.has(sessionIdHeader)) {
    return res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Session not found or invalid" },
      id: null
    });
  }

  const session = sessions.get(sessionIdHeader)!;
  session.lastActivity = new Date();

  try {
    // 使用 transport 处理 SSE 流请求
    await session.transport.handleRequest(req, res);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`❌ SSE 流处理失败:`, err.message);
    if (!res.headersSent) {
      return res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: err.message },
        id: null
      });
    }
  }
});

// DELETE: 关闭会话
app.delete("/mcp", async (req: Request, res: Response) => {
  const sessionIdHeader = req.headers["mcp-session-id"] as string | undefined;

  if (!sessionIdHeader || !sessions.has(sessionIdHeader)) {
    return res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Session not found" },
      id: null
    });
  }

  const session = sessions.get(sessionIdHeader)!;

  try {
    // 断开数据库连接
    await session.dbManager.disconnectAll();
    
    // 关闭 transport
    await session.transport.close();
    
    // 删除会话
    sessions.delete(sessionIdHeader);
    
    console.log(`🗑️  会话已关闭: ${sessionIdHeader}`);
    
    return res.status(200).json({
      jsonrpc: "2.0",
      result: { success: true },
      id: null
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`❌ 关闭会话失败:`, err.message);
    return res.status(500).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: err.message },
      id: null
    });
  }
});

// ==================== 启动服务器 ====================
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 MySQL MCP Server v4.0.5 已启动                       ║
║                                                           ║
║   📡 MCP Endpoint:  http://localhost:${PORT}/mcp           ║
║   💚 Health Check:  http://localhost:${PORT}/health        ║
║                                                           ║
║   📋 支持的功能:                                           ║
║      • Header 预配置（自动连接）                           ║
║      • AI 动态添加连接                                     ║
║      • 多数据库管理                                        ║
║      • SQL 查询执行                                        ║
║      • 连接池 + 自动重连                                   ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// ==================== 优雅关闭 ====================
const shutdown = async () => {
  console.log("\n🛑 正在关闭服务器...");
  
  for (const [sessionId, session] of sessions.entries()) {
    try {
      await session.dbManager.disconnectAll();
      console.log(`✅ 会话 ${sessionId} 已断开`);
    } catch (error) {
      console.error(`❌ 断开会话 ${sessionId} 失败:`, error);
    }
  }
  
  console.log("👋 服务器已关闭");
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

