#!/usr/bin/env node
import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import "dotenv/config";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema, McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { ConnectionManager } from "./connection-manager.js";
import { logger } from "./logger.js";
const sessions = new Map();
// 从 headers 中提取数据库配置（支持多个数据库）
function extractDatabaseConfigsFromHeaders(req) {
    const configs = [];
    // 尝试提取不带编号的配置（单数据库模式，兼容旧版）
    const host = req.headers['x-mysql-host'];
    const port = req.headers['x-mysql-port'];
    const user = req.headers['x-mysql-user'];
    const password = req.headers['x-mysql-password'];
    const database = req.headers['x-mysql-database'];
    if (host && user && password && database) {
        configs.push({
            id: 'default',
            host: host.trim(),
            port: port ? parseInt(port) : 3306,
            user: user.trim(),
            password: password.trim(),
            database: database.trim()
        });
    }
    // 尝试提取带编号的配置（多数据库模式）
    // 支持 X-MySQL-Host-1, X-MySQL-Host-2, ... X-MySQL-Host-99
    for (let i = 1; i <= 99; i++) {
        const hostKey = `x-mysql-host-${i}`;
        const portKey = `x-mysql-port-${i}`;
        const userKey = `x-mysql-user-${i}`;
        const passwordKey = `x-mysql-password-${i}`;
        const databaseKey = `x-mysql-database-${i}`;
        const hostN = req.headers[hostKey];
        const portN = req.headers[portKey];
        const userN = req.headers[userKey];
        const passwordN = req.headers[passwordKey];
        const databaseN = req.headers[databaseKey];
        // 如果找不到 host，说明这个编号的配置不存在
        if (!hostN) {
            // 如果连续3个编号都没有配置，则停止搜索
            if (i > 3 && !req.headers[`x-mysql-host-${i - 1}`] && !req.headers[`x-mysql-host-${i - 2}`]) {
                break;
            }
            continue;
        }
        // 检查必填字段
        if (hostN && userN && passwordN && databaseN) {
            configs.push({
                id: String(i),
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
// 创建 MCP Server (每个会话一个实例)
function createMCPServer(connectionManager) {
    const server = new Server({
        name: "mysql-mcp-server",
        version: "3.2.1"
    }, {
        capabilities: {
            tools: {}
        }
    });
    // 辅助函数：获取数据库管理器
    async function getTargetManager(connection_id) {
        const targetManager = connection_id
            ? connectionManager.getConnection(connection_id)
            : connectionManager.getActiveConnection();
        if (!targetManager) {
            const errorMsg = connection_id
                ? `❌ 连接 '${connection_id}' 不存在`
                : "❌ 没有活跃的数据库连接，请先使用 connect_database 工具连接到数据库";
            throw new McpError(ErrorCode.InvalidRequest, errorMsg);
        }
        // 检查连接状态（使用同步检查，实际的重连会在 executeQuery 等方法中自动处理）
        if (!targetManager.isConnectedSync()) {
            const errorMsg = connection_id
                ? `❌ 连接 '${connection_id}' 未连接`
                : "❌ 没有活跃的数据库连接，请先使用 connect_database 工具连接到数据库";
            throw new McpError(ErrorCode.InvalidRequest, errorMsg);
        }
        return targetManager;
    }
    // 列出可用工具
    const tools = [
        {
            name: "connect_database",
            description: "连接到MySQL数据库",
            inputSchema: {
                type: "object",
                properties: {
                    host: {
                        type: "string",
                        description: "数据库主机地址（例如：localhost 或 127.0.0.1）",
                    },
                    port: {
                        type: "number",
                        description: "数据库端口号（默认：3306）",
                        default: 3306,
                    },
                    user: {
                        type: "string",
                        description: "数据库用户名",
                    },
                    password: {
                        type: "string",
                        description: "数据库密码",
                    },
                    database: {
                        type: "string",
                        description: "要连接的数据库名称",
                    },
                    connection_id: {
                        type: "string",
                        description: "连接标识符（可选，用于管理多个数据库连接）",
                    },
                },
                required: ["host", "user", "password", "database"],
            },
        },
        {
            name: "execute_query",
            description: "执行SQL查询语句（支持增删改查所有操作）",
            inputSchema: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "要执行的SQL查询语句",
                    },
                    params: {
                        type: "array",
                        description: "SQL参数（可选，用于参数化查询）",
                        items: {
                            type: "string"
                        }
                    },
                    connection_id: {
                        type: "string",
                        description: "连接标识符（可选，不指定则使用当前活跃连接）",
                    },
                },
                required: ["query"],
            },
        },
        {
            name: "begin_transaction",
            description: "开始数据库事务",
            inputSchema: {
                type: "object",
                properties: {
                    connection_id: {
                        type: "string",
                        description: "连接标识符（可选，不指定则使用当前活跃连接）",
                    },
                },
            },
        },
        {
            name: "commit_transaction",
            description: "提交数据库事务",
            inputSchema: {
                type: "object",
                properties: {
                    connection_id: {
                        type: "string",
                        description: "连接标识符（可选，不指定则使用当前活跃连接）",
                    },
                },
            },
        },
        {
            name: "rollback_transaction",
            description: "回滚数据库事务",
            inputSchema: {
                type: "object",
                properties: {
                    connection_id: {
                        type: "string",
                        description: "连接标识符（可选，不指定则使用当前活跃连接）",
                    },
                },
            },
        },
        {
            name: "show_transaction_history",
            description: "显示当前事务的操作历史",
            inputSchema: {
                type: "object",
                properties: {
                    connection_id: {
                        type: "string",
                        description: "连接标识符（可选，不指定则使用当前活跃连接）",
                    },
                },
            },
        },
        {
            name: "rollback_to_step",
            description: "回滚到指定的操作步骤",
            inputSchema: {
                type: "object",
                properties: {
                    step_number: {
                        type: "number",
                        description: "要回滚到的步骤号（从操作历史中选择）",
                    },
                    connection_id: {
                        type: "string",
                        description: "连接标识符（可选，不指定则使用当前活跃连接）",
                    },
                },
                required: ["step_number"],
            },
        },
        {
            name: "full_rollback",
            description: "完全回滚当前事务的所有操作",
            inputSchema: {
                type: "object",
                properties: {
                    connection_id: {
                        type: "string",
                        description: "连接标识符（可选，不指定则使用当前活跃连接）",
                    },
                },
            },
        },
        {
            name: "show_tables",
            description: "显示数据库中的所有表及其结构信息",
            inputSchema: {
                type: "object",
                properties: {
                    connection_id: {
                        type: "string",
                        description: "连接标识符（可选，不指定则使用当前活跃连接）",
                    },
                },
            },
        },
        {
            name: "describe_table",
            description: "显示指定表的详细结构信息和样本数据",
            inputSchema: {
                type: "object",
                properties: {
                    table_name: {
                        type: "string",
                        description: "要查看结构的表名",
                    },
                    connection_id: {
                        type: "string",
                        description: "连接标识符（可选，不指定则使用当前活跃连接）",
                    },
                },
                required: ["table_name"],
            },
        },
        {
            name: "disconnect_database",
            description: "断开数据库连接",
            inputSchema: {
                type: "object",
                properties: {
                    connection_id: {
                        type: "string",
                        description: "要断开的连接标识符（可选，不指定则断开当前活跃连接）",
                    },
                },
            },
        },
        {
            name: "list_connections",
            description: "列出所有数据库连接",
            inputSchema: {
                type: "object",
                properties: {},
            },
        },
        {
            name: "switch_active_connection",
            description: "切换当前活跃的数据库连接",
            inputSchema: {
                type: "object",
                properties: {
                    connection_id: {
                        type: "string",
                        description: "要切换到的连接标识符",
                    },
                },
                required: ["connection_id"],
            },
        },
        {
            name: "remove_connection",
            description: "移除指定的数据库连接",
            inputSchema: {
                type: "object",
                properties: {
                    connection_id: {
                        type: "string",
                        description: "要移除的连接标识符",
                    },
                },
                required: ["connection_id"],
            },
        },
    ];
    server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        // 记录工具调用
        logger.info(`工具调用开始 (HTTP)`, { tool: name, args });
        try {
            switch (name) {
                case "connect_database": {
                    const { host, port = 3306, user, password, database, connection_id } = args;
                    // 生成连接ID（如果未提供）
                    const connId = connection_id || `${host}_${database}_${Date.now()}`;
                    // 添加新连接
                    await connectionManager.addConnection(connId, { host, port, user, password, database });
                    const totalConnections = connectionManager.getConnectionCount();
                    const isActive = connectionManager.getActiveConnectionId() === connId;
                    return {
                        content: [
                            {
                                type: "text",
                                text: `✅ 成功连接到MySQL数据库！\n📍 连接ID: ${connId}\n📍 主机: ${host}:${port}\n🗄️ 数据库: ${database}\n👤 用户: ${user}\n🎯 活跃连接: ${isActive ? '是' : '否'}\n📊 总连接数: ${totalConnections}`,
                            },
                        ],
                    };
                }
                case "execute_query": {
                    const { query, params = [], connection_id } = args;
                    // 获取目标数据库管理器
                    const targetManager = await getTargetManager(connection_id);
                    const result = await targetManager.executeQuery(query, params);
                    const activeConnId = connectionManager.getActiveConnectionId();
                    const usedConnId = connection_id || activeConnId;
                    return {
                        content: [
                            {
                                type: "text",
                                text: `✅ SQL执行成功！\n🔗 使用连接: ${usedConnId}\n📊 操作类型: ${result.type}\n⏱️ 执行时间: ${result.duration}ms\n\n📋 结果:\n${JSON.stringify(result, null, 2)}`,
                            },
                        ],
                    };
                }
                case "begin_transaction": {
                    const { connection_id } = args;
                    const targetManager = await getTargetManager(connection_id);
                    await targetManager.beginTransaction();
                    return {
                        content: [
                            {
                                type: "text",
                                text: `✅ 事务已开始！\n🔗 连接: ${connection_id || connectionManager.getActiveConnectionId()}\n\n⚠️ 请记得在操作完成后提交或回滚事务`,
                            },
                        ],
                    };
                }
                case "commit_transaction": {
                    const { connection_id } = args;
                    const targetManager = await getTargetManager(connection_id);
                    const transactionManager = targetManager.getTransactionManager();
                    const result = await transactionManager.commitTransaction(async () => {
                        return await targetManager.commitTransaction();
                    });
                    return {
                        content: [
                            {
                                type: "text",
                                text: result,
                            },
                        ],
                    };
                }
                case "rollback_transaction": {
                    const { connection_id } = args;
                    const targetManager = await getTargetManager(connection_id);
                    const transactionManager = targetManager.getTransactionManager();
                    const result = await transactionManager.fullRollback(async (query, params) => {
                        return await targetManager.executeQuery(query, params || []);
                    });
                    return {
                        content: [
                            {
                                type: "text",
                                text: result,
                            },
                        ],
                    };
                }
                case "show_transaction_history": {
                    const { connection_id } = args;
                    const targetManager = await getTargetManager(connection_id);
                    const transactionManager = targetManager.getTransactionManager();
                    const historyText = transactionManager.getRollbackOptions();
                    return {
                        content: [
                            {
                                type: "text",
                                text: `📋 事务操作历史\n🔗 连接: ${connection_id || connectionManager.getActiveConnectionId()}\n\n${historyText}`,
                            },
                        ],
                    };
                }
                case "rollback_to_step": {
                    const { step_number, connection_id } = args;
                    const targetManager = await getTargetManager(connection_id);
                    const transactionManager = targetManager.getTransactionManager();
                    const result = await transactionManager.rollbackToStep(step_number, async (query, params) => {
                        return await targetManager.executeQuery(query, params || []);
                    });
                    return {
                        content: [
                            {
                                type: "text",
                                text: result,
                            },
                        ],
                    };
                }
                case "full_rollback": {
                    const { connection_id } = args;
                    const targetManager = await getTargetManager(connection_id);
                    const transactionManager = targetManager.getTransactionManager();
                    const result = await transactionManager.fullRollback(async (query, params) => {
                        return await targetManager.executeQuery(query, params || []);
                    });
                    return {
                        content: [
                            {
                                type: "text",
                                text: result,
                            },
                        ],
                    };
                }
                case "show_tables": {
                    const { connection_id } = args;
                    const targetManager = await getTargetManager(connection_id);
                    const tables = await targetManager.showTables();
                    let result = `📋 数据库概览\n🔗 连接: ${connection_id || connectionManager.getActiveConnectionId()}\n\n`;
                    if (tables.length === 0) {
                        result += "🔍 数据库中没有找到任何表";
                    }
                    else {
                        result += `📊 总共找到 ${tables.length} 个表:\n\n`;
                        for (const table of tables) {
                            const tableName = Object.values(table)[0];
                            try {
                                // 获取表的行数
                                const countResult = await targetManager.executeQuery(`SELECT COUNT(*) as count FROM \`${tableName}\``);
                                const rowCount = countResult.data[0]?.count || 0;
                                // 获取表结构（只显示列名和类型）
                                const structure = await targetManager.describeTable(tableName);
                                const columnInfo = structure.map((col) => `${col.Field}(${col.Type})`).slice(0, 5).join(', ');
                                const moreColumns = structure.length > 5 ? `... +${structure.length - 5}列` : '';
                                result += `🗂️ **${tableName}**\n`;
                                result += `   📊 行数: ${rowCount}\n`;
                                result += `   🏗️ 列: ${columnInfo}${moreColumns}\n\n`;
                            }
                            catch (error) {
                                result += `🗂️ **${tableName}**\n`;
                                result += `   ⚠️ 无法获取详细信息\n\n`;
                            }
                        }
                        result += `💡 提示: 使用 describe_table 工具查看具体表的详细结构和样本数据`;
                    }
                    return {
                        content: [
                            {
                                type: "text",
                                text: result,
                            },
                        ],
                    };
                }
                case "describe_table": {
                    const { table_name, connection_id } = args;
                    const targetManager = await getTargetManager(connection_id);
                    // 获取表结构
                    const structure = await targetManager.describeTable(table_name);
                    // 获取表的行数
                    const countResult = await targetManager.executeQuery(`SELECT COUNT(*) as count FROM \`${table_name}\``);
                    const totalRows = countResult.data[0]?.count || 0;
                    // 获取样本数据（最多5行）
                    let sampleData = [];
                    if (totalRows > 0) {
                        const sampleResult = await targetManager.executeQuery(`SELECT * FROM \`${table_name}\` LIMIT 5`);
                        sampleData = sampleResult.data;
                    }
                    // 格式化表结构
                    const structureText = structure
                        .map((col) => `${col.Field.padEnd(20)} | ${col.Type.padEnd(15)} | ${col.Null.padEnd(8)} | ${col.Key.padEnd(8)} | ${(col.Default || 'NULL').toString().padEnd(10)} | ${col.Extra || ''}`)
                        .join("\n");
                    let result = `🔍 表 "${table_name}" 的详细信息\n\n`;
                    result += `📊 基本信息:\n`;
                    result += `   总行数: ${totalRows}\n`;
                    result += `   总列数: ${structure.length}\n\n`;
                    result += `🏗️ 表结构:\n`;
                    result += `${"=".repeat(80)}\n`;
                    result += `字段名               | 类型            | 可为空   | 键      | 默认值     | 额外信息\n`;
                    result += `${"=".repeat(80)}\n`;
                    result += `${structureText}\n\n`;
                    if (sampleData.length > 0) {
                        result += `📄 样本数据 (前${sampleData.length}行):\n`;
                        result += `${"=".repeat(80)}\n`;
                        result += JSON.stringify(sampleData, null, 2);
                    }
                    else {
                        result += `📄 样本数据:\n`;
                        result += `   表中暂无数据`;
                    }
                    result += `\n\n💡 提示: 使用 execute_query 工具可以执行更复杂的查询操作`;
                    return {
                        content: [
                            {
                                type: "text",
                                text: result,
                            },
                        ],
                    };
                }
                case "disconnect_database": {
                    const { connection_id } = args;
                    if (connection_id) {
                        // 移除指定连接
                        await connectionManager.removeConnection(connection_id);
                    }
                    else if (connectionManager.hasActiveConnection()) {
                        // 移除活跃连接
                        const activeId = connectionManager.getActiveConnectionId();
                        if (activeId) {
                            await connectionManager.removeConnection(activeId);
                        }
                    }
                    return {
                        content: [
                            {
                                type: "text",
                                text: "✅ 数据库连接已断开",
                            },
                        ],
                    };
                }
                case "list_connections": {
                    const connections = connectionManager.listConnections();
                    if (connections.length === 0) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `📋 数据库连接列表\n\n🔍 当前没有任何数据库连接`,
                                },
                            ],
                        };
                    }
                    let result = `📋 数据库连接列表\n\n📊 总连接数: ${connections.length}\n\n`;
                    connections.forEach((conn, index) => {
                        // 判断是否是通过 Header 创建的连接
                        const isHeaderConnection = conn.id.startsWith('header_connection_');
                        const connectionSource = isHeaderConnection ? '🔐(Header预配置)' : '🔧(工具参数)';
                        result += `${index + 1}. 🔗 **${conn.id}** ${connectionSource}${conn.isActive ? ' 🎯(活跃)' : ''}\n`;
                        result += `   📍 主机: ${conn.host}:${conn.port}\n`;
                        result += `   🗄️ 数据库: ${conn.database}\n`;
                        result += `   👤 用户: ${conn.user}\n`;
                        result += `   ⏰ 连接时间: ${new Date(conn.connectedAt).toLocaleString()}\n\n`;
                    });
                    return {
                        content: [
                            {
                                type: "text",
                                text: result,
                            },
                        ],
                    };
                }
                case "switch_active_connection": {
                    const { connection_id } = args;
                    await connectionManager.switchActiveConnection(connection_id);
                    const connection = connectionManager.listConnections().find(c => c.id === connection_id);
                    return {
                        content: [
                            {
                                type: "text",
                                text: `✅ 已切换活跃连接到: ${connection_id}\n📍 数据库: ${connection?.database}\n📊 当前总连接数: ${connectionManager.getConnectionCount()}`,
                            },
                        ],
                    };
                }
                case "remove_connection": {
                    const { connection_id } = args;
                    await connectionManager.removeConnection(connection_id);
                    return {
                        content: [
                            {
                                type: "text",
                                text: `✅ 已移除连接: ${connection_id}\n📊 剩余连接数: ${connectionManager.getConnectionCount()}`,
                            },
                        ],
                    };
                }
                default:
                    throw new McpError(ErrorCode.MethodNotFound, `未知的工具: ${name}`);
            }
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            // 记录错误
            logger.error(`工具调用失败 (HTTP)`, {
                tool: name,
                args,
                error: err.message,
                stack: err.stack
            });
            throw new McpError(ErrorCode.InternalError, `❌ 工具执行失败: ${err.message}`);
        }
        finally {
            // 记录工具调用结束
            logger.info(`工具调用结束 (HTTP)`, { tool: name });
        }
    });
    return server;
}
const app = express();
const PORT = Number(process.env.PORT) || 3000;
// 生成允许的 Headers 列表（包括带编号的多数据库配置）
function generateAllowedHeaders() {
    const baseHeaders = [
        'Content-Type',
        'Accept',
        'Authorization',
        'Mcp-Session-Id',
        // 单数据库配置（兼容性）
        'X-MySQL-Host',
        'X-MySQL-Port',
        'X-MySQL-User',
        'X-MySQL-Password',
        'X-MySQL-Database'
    ];
    // 添加带编号的多数据库配置（1-20，足够应对大多数场景）
    const mysqlHeaders = [];
    for (let i = 1; i <= 20; i++) {
        mysqlHeaders.push(`X-MySQL-Host-${i}`, `X-MySQL-Port-${i}`, `X-MySQL-User-${i}`, `X-MySQL-Password-${i}`, `X-MySQL-Database-${i}`);
    }
    return [...baseHeaders, ...mysqlHeaders];
}
// CORS 配置 - 允许自定义 Header（包括带编号的多数据库配置）
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: generateAllowedHeaders(),
    exposedHeaders: ['Content-Type', 'Mcp-Session-Id']
}));
app.use(express.json({ limit: "10mb" }));
// 健康检查
app.get("/health", (_req, res) => {
    res.json({
        status: "healthy",
        transport: "streamable-http",
        activeSessions: sessions.size,
        version: "3.2.1"
    });
});
// Streamable HTTP 主端点：POST /mcp（JSON-RPC）
app.all("/mcp", async (req, res) => {
    const sessionIdHeader = req.headers["mcp-session-id"];
    const method = req.method.toUpperCase();
    if (method === "POST") {
        const body = req.body;
        if (!body) {
            return res.status(400).json({
                jsonrpc: "2.0",
                error: { code: -32600, message: "Empty body" },
                id: null
            });
        }
        // 忽略通知（如 notifications/initialized）
        const isNotification = (body.id === undefined || body.id === null) &&
            typeof body.method === "string" &&
            body.method.startsWith("notifications/");
        if (isNotification) {
            if (sessionIdHeader && sessions.has(sessionIdHeader)) {
                sessions.get(sessionIdHeader).lastActivity = new Date();
            }
            return res.status(204).end();
        }
        // 初始化/会话管理
        const isInit = body.method === "initialize";
        let session;
        if (sessionIdHeader && sessions.has(sessionIdHeader)) {
            session = sessions.get(sessionIdHeader);
            session.lastActivity = new Date();
        }
        else if (isInit) {
            const newId = randomUUID();
            const connectionManager = new ConnectionManager();
            const server = createMCPServer(connectionManager);
            session = {
                id: newId,
                server,
                connectionManager,
                headerConnectionIds: [],
                createdAt: new Date(),
                lastActivity: new Date()
            };
            sessions.set(newId, session);
            res.setHeader("Mcp-Session-Id", newId);
            logger.info("新会话已创建", { sessionId: newId });
        }
        else {
            return res.status(400).json({
                jsonrpc: "2.0",
                error: { code: -32000, message: "No session and not initialize" },
                id: null
            });
        }
        // 检查并处理 Header 中的数据库配置（仅在会话初始化或Header连接为空时创建）
        if (session && (isInit || session.headerConnectionIds.length === 0)) {
            const dbConfigs = extractDatabaseConfigsFromHeaders(req);
            if (dbConfigs.length > 0) {
                logger.info(`检测到 ${dbConfigs.length} 个数据库配置`, {
                    sessionId: session.id,
                    configIds: dbConfigs.map(c => c.id),
                    isInitialize: isInit
                });
                for (const config of dbConfigs) {
                    // 生成连接 ID（不包含sessionId，确保跨请求复用）
                    const headerConnId = config.id === 'default'
                        ? `header_default`
                        : `header_${config.id}`;
                    try {
                        // 检查是否已经创建了这个连接
                        const existingConn = session.connectionManager.getConnection(headerConnId);
                        if (!existingConn) {
                            await session.connectionManager.addConnection(headerConnId, {
                                host: config.host,
                                port: config.port,
                                user: config.user,
                                password: config.password,
                                database: config.database
                            });
                            session.headerConnectionIds.push(headerConnId);
                            logger.info("从 Header 自动创建数据库连接", {
                                sessionId: session.id,
                                connectionId: headerConnId,
                                configId: config.id,
                                host: config.host,
                                database: config.database
                            });
                        }
                        else {
                            logger.debug("Header 连接已存在，跳过创建", {
                                sessionId: session.id,
                                connectionId: headerConnId
                            });
                        }
                    }
                    catch (error) {
                        logger.error("从 Header 创建数据库连接失败", {
                            sessionId: session.id,
                            connectionId: headerConnId,
                            configId: config.id,
                            error: error instanceof Error ? error.message : String(error)
                        });
                    }
                }
                if (session.headerConnectionIds.length > 0) {
                    logger.info(`当前会话拥有 ${session.headerConnectionIds.length} 个 Header 预配置连接`, {
                        sessionId: session.id,
                        connectionIds: session.headerConnectionIds,
                        activeConnections: session.connectionManager.getConnectionCount()
                    });
                }
            }
        }
        // 处理核心方法
        if (body.method === "initialize") {
            return res.json({
                jsonrpc: "2.0",
                result: {
                    protocolVersion: "2024-11-05",
                    capabilities: { tools: {} },
                    serverInfo: { name: "mysql-mcp-server", version: "3.2.1" }
                },
                id: body.id
            });
        }
        if (body.method === "tools/list") {
            const tools = [
                {
                    name: "connect_database",
                    description: "连接到MySQL数据库",
                    inputSchema: {
                        type: "object",
                        properties: {
                            host: { type: "string", description: "数据库主机地址" },
                            port: { type: "number", description: "数据库端口号（默认：3306）", default: 3306 },
                            user: { type: "string", description: "数据库用户名" },
                            password: { type: "string", description: "数据库密码" },
                            database: { type: "string", description: "要连接的数据库名称" },
                            connection_id: { type: "string", description: "连接标识符（可选）" },
                        },
                        required: ["host", "user", "password", "database"],
                    },
                },
                {
                    name: "execute_query",
                    description: "执行SQL查询语句（支持增删改查所有操作）",
                    inputSchema: {
                        type: "object",
                        properties: {
                            query: { type: "string", description: "要执行的SQL查询语句" },
                            params: { type: "array", description: "SQL参数（可选）", items: { type: "string" } },
                            connection_id: { type: "string", description: "连接标识符（可选）" },
                        },
                        required: ["query"],
                    },
                },
                // ... 其他工具的定义可以类似添加
            ];
            return res.json({ jsonrpc: "2.0", result: { tools }, id: body.id });
        }
        if (body.method === "tools/call" && session) {
            const { name, arguments: args } = body.params;
            try {
                const result = await session.server.request({ method: "tools/call", params: { name, arguments: args } }, CallToolRequestSchema);
                return res.json({ jsonrpc: "2.0", result, id: body.id });
            }
            catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                return res.status(500).json({
                    jsonrpc: "2.0",
                    error: { code: -32000, message: err.message },
                    id: body.id
                });
            }
        }
        return res.status(400).json({
            jsonrpc: "2.0",
            error: { code: -32601, message: `Method not found: ${body.method}` },
            id: body.id
        });
    }
    return res.status(405).json({
        jsonrpc: "2.0",
        error: { code: -32600, message: "Method Not Allowed" },
        id: null
    });
});
// 启动服务器
app.listen(PORT, () => {
    logger.info(`StreamableHTTP MCP Server 已启动`, { port: PORT });
    console.log(`🚀 StreamableHTTP MCP Server 已启动`);
    console.log(`📡 MCP endpoint: http://localhost:${PORT}/mcp`);
    console.log(`💚 Health: http://localhost:${PORT}/health`);
    console.log(`\n📋 支持的 Header 配置:`);
    console.log(`   - X-MySQL-Host: 数据库主机地址`);
    console.log(`   - X-MySQL-Port: 数据库端口号`);
    console.log(`   - X-MySQL-User: 数据库用户名`);
    console.log(`   - X-MySQL-Password: 数据库密码`);
    console.log(`   - X-MySQL-Database: 数据库名称`);
});
// 优雅关闭处理
process.on("SIGINT", async () => {
    logger.info("接收到SIGINT信号，正在关闭服务器...");
    // 断开所有会话的连接
    for (const [sessionId, session] of sessions.entries()) {
        try {
            await session.connectionManager.disconnectAll();
            logger.info(`会话 ${sessionId} 的连接已断开`);
        }
        catch (error) {
            logger.error(`断开会话 ${sessionId} 连接失败`, {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    logger.info("服务器已关闭");
    process.exit(0);
});
process.on("SIGTERM", async () => {
    logger.info("接收到SIGTERM信号，正在关闭服务器...");
    // 断开所有会话的连接
    for (const [sessionId, session] of sessions.entries()) {
        try {
            await session.connectionManager.disconnectAll();
        }
        catch (error) {
            logger.error(`断开会话 ${sessionId} 连接失败`, {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    logger.info("服务器已关闭");
    process.exit(0);
});
