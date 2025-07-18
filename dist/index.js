#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, McpError, ErrorCode, } from "@modelcontextprotocol/sdk/types.js";
import { ConnectionManager } from "./connection-manager.js";
import { logger } from "./logger.js";
const server = new Server({
    name: "mysql-mcp-server",
    version: "0.1.0",
}, {
    capabilities: {
        tools: {},
    },
});
// 全局连接管理器实例
const connectionManager = new ConnectionManager();
// 辅助函数：获取数据库管理器
function getTargetManager(connection_id) {
    const targetManager = connection_id
        ? connectionManager.getConnection(connection_id)
        : connectionManager.getActiveConnection();
    if (!targetManager || !targetManager.isConnected()) {
        const errorMsg = connection_id
            ? `❌ 连接 '${connection_id}' 不存在或未连接`
            : "❌ 没有活跃的数据库连接，请先使用 connect_database 工具连接到数据库";
        throw new McpError(ErrorCode.InvalidRequest, errorMsg);
    }
    return targetManager;
}
// 列出可用工具
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
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
        ],
    };
});
// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    // 记录工具调用
    logger.info(`工具调用开始`, { tool: name, args });
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
                const targetManager = connection_id
                    ? connectionManager.getConnection(connection_id)
                    : connectionManager.getActiveConnection();
                if (!targetManager || !targetManager.isConnected()) {
                    const errorMsg = connection_id
                        ? `❌ 连接 '${connection_id}' 不存在或未连接`
                        : "❌ 没有活跃的数据库连接，请先使用 connect_database 工具连接到数据库";
                    throw new McpError(ErrorCode.InvalidRequest, errorMsg);
                }
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
                const targetManager = getTargetManager(connection_id);
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
                const targetManager = getTargetManager(connection_id);
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
                const targetManager = getTargetManager(connection_id);
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
                const targetManager = getTargetManager(connection_id);
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
                const targetManager = getTargetManager(connection_id);
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
                const targetManager = getTargetManager(connection_id);
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
                const targetManager = getTargetManager(connection_id);
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
                const targetManager = getTargetManager(connection_id);
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
                const targetManager = connection_id
                    ? connectionManager.getConnection(connection_id)
                    : connectionManager.getActiveConnection();
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
                    result += `${index + 1}. 🔗 **${conn.id}**${conn.isActive ? ' 🎯(活跃)' : ''}\n`;
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
        logger.error(`工具调用失败`, {
            tool: name,
            args,
            error: err.message,
            stack: err.stack
        });
        throw new McpError(ErrorCode.InternalError, `❌ 工具执行失败: ${err.message}`);
    }
    finally {
        // 记录工具调用结束
        logger.info(`工具调用结束`, { tool: name });
    }
});
// 启动服务器
async function main() {
    try {
        // 记录服务器启动
        logger.info("MySQL MCP Server 正在启动...");
        const transport = new StdioServerTransport();
        await server.connect(transport);
        logger.info("MySQL MCP Server 已启动并等待连接", {
            version: "2.0.0",
            capabilities: ["connect_database", "execute_query", "show_tables", "describe_table", "begin_transaction", "commit_transaction", "rollback_transaction", "show_transaction_history", "rollback_to_step", "full_rollback", "disconnect_database"]
        });
        console.error("MySQL MCP Server 已启动并等待连接...");
    }
    catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error("服务器启动失败", { error: err.message, stack: err.stack });
        throw err;
    }
}
// 优雅关闭处理
process.on("SIGINT", async () => {
    logger.info("接收到SIGINT信号，正在关闭服务器...");
    // 断开所有连接
    connectionManager.disconnectAll();
    logger.info("服务器已关闭");
    process.exit(0);
});
process.on("SIGTERM", async () => {
    logger.info("接收到SIGTERM信号，正在关闭服务器...");
    // 断开所有连接
    connectionManager.disconnectAll();
    logger.info("服务器已关闭");
    process.exit(0);
});
// 处理未捕获的异常
process.on("uncaughtException", (error) => {
    logger.error("未捕获的异常", { error: error.message, stack: error.stack });
    process.exit(1);
});
process.on("unhandledRejection", (reason, promise) => {
    logger.error("未处理的Promise拒绝", { reason, promise });
    process.exit(1);
});
main().catch((error) => {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("启动服务器时发生错误", { error: err.message, stack: err.stack });
    console.error("启动服务器时发生错误:", err.message);
    process.exit(1);
});
