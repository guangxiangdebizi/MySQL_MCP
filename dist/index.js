#!/usr/bin/env node
import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import "dotenv/config";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { DatabaseConnectionManager } from "./database.js";
import { allTools, handleToolCall } from "./tools/index.js";
// ==================== 会话管理 ====================
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
const sessions = new Map();
// ==================== 从 Header 提取数据库配置 ====================
function extractDatabaseConfigsFromHeaders(req) {
    const configs = [];
    // 单数据库配置（不带编号）
    const host = req.headers['x-mysql-host'];
    const port = req.headers['x-mysql-port'];
    const user = req.headers['x-mysql-user'];
    const password = req.headers['x-mysql-password'];
    const database = req.headers['x-mysql-database'];
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
        const hostN = req.headers[`x-mysql-host-${i}`];
        const portN = req.headers[`x-mysql-port-${i}`];
        const userN = req.headers[`x-mysql-user-${i}`];
        const passwordN = req.headers[`x-mysql-password-${i}`];
        const databaseN = req.headers[`x-mysql-database-${i}`];
        if (!hostN)
            break; // 没有 host 则停止搜索
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
// ==================== 创建 MCP Server ====================
function createMCPServer(dbManager) {
    const server = new Server({
        name: "mysql-mcp-server",
        version: "4.0.1"
    }, {
        capabilities: {
            tools: {}
        }
    });
    // 注册工具列表处理器
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return { tools: allTools };
    });
    // 注册工具调用处理器
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        try {
            return await handleToolCall(name, args || {}, dbManager);
        }
        catch (error) {
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
    allowedHeaders.push(`X-MySQL-Host-${i}`, `X-MySQL-Port-${i}`, `X-MySQL-User-${i}`, `X-MySQL-Password-${i}`, `X-MySQL-Database-${i}`);
}
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders,
    exposedHeaders: ['Content-Type', 'Mcp-Session-Id']
}));
app.use(express.json({ limit: "10mb" }));
// ==================== 健康检查 ====================
app.get("/health", (_req, res) => {
    res.json({
        status: "healthy",
        transport: "streamable-http",
        activeSessions: sessions.size,
        version: "4.0.0"
    });
});
// ==================== MCP Endpoint ====================
app.post("/mcp", async (req, res) => {
    const sessionIdHeader = req.headers["mcp-session-id"];
    const body = req.body;
    // 验证请求体
    if (!body || !body.method) {
        return res.status(400).json({
            jsonrpc: "2.0",
            error: { code: -32600, message: "Invalid request" },
            id: null
        });
    }
    let session;
    const isInit = body.method === "initialize";
    if (sessionIdHeader && sessions.has(sessionIdHeader)) {
        // 复用现有会话
        session = sessions.get(sessionIdHeader);
        session.lastActivity = new Date();
    }
    else if (isInit) {
        // 创建新会话
        const newId = randomUUID();
        const dbManager = new DatabaseConnectionManager();
        const server = createMCPServer(dbManager);
        // 创建 transport
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => newId
        });
        session = {
            id: newId,
            server,
            transport,
            dbManager,
            createdAt: new Date(),
            lastActivity: new Date()
        };
        sessions.set(newId, session);
        console.log(`🆕 新会话创建: ${newId}`);
        // 从 Header 自动添加数据库连接
        const dbConfigs = extractDatabaseConfigsFromHeaders(req);
        if (dbConfigs.length > 0) {
            console.log(`📋 检测到 ${dbConfigs.length} 个 Header 预配置`);
            for (const config of dbConfigs) {
                try {
                    await dbManager.addConnection(config);
                    console.log(`✅ Header 连接已添加: ${config.id}`);
                }
                catch (error) {
                    console.error(`❌ Header 连接失败 [${config.id}]:`, error);
                }
            }
        }
        // 连接 server 和 transport
        await server.connect(transport);
    }
    else {
        return res.status(400).json({
            jsonrpc: "2.0",
            error: { code: -32000, message: "Session not found" },
            id: body.id || null
        });
    }
    // 使用 transport 处理所有请求（包括 initialize, tools/list, tools/call 等）
    try {
        await session.transport.handleRequest(req, res, body);
    }
    catch (error) {
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
// ==================== 启动服务器 ====================
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 MySQL MCP Server v4.0.1 已启动                       ║
║                                                           ║
║   📡 MCP Endpoint:  http://localhost:${PORT}/mcp           ║
║   💚 Health Check:  http://localhost:${PORT}/health        ║
║                                                           ║
║   📋 支持的功能:                                           ║
║      • Header 预配置（自动连接）                           ║
║      • AI 动态添加连接                                     ║
║      • 多数据库管理                                        ║
║      • SQL 查询执行                                        ║
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
        }
        catch (error) {
            console.error(`❌ 断开会话 ${sessionId} 失败:`, error);
        }
    }
    console.log("👋 服务器已关闭");
    process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
